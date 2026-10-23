'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { mergeDocuments, synchronize, FILE, DRAFT } = require('./sync-decap');

let checks = 0;
function test(name, fn) { fn(); checks += 1; console.log(`OK — ${name}`); }
const item = (id, extra = {}) => ({ id_interno: id, title: `Manifestação ${id}`, date: '2026-10-23', texto: 'Texto moderado', publicado: false, ...extra });
const document = (...items) => ({ items });
const merge = (base, current, draft) => mergeDocuments(document(...base), document(...current), document(...draft)).items;

test('várias entradas novas se acumulam sem perder edição ou antecipar publicação', () => {
  const base = [item('A')];
  const draft = [item('A', { texto: 'Revisão editorial', publicado: true })];
  const result = merge(base, [item('C'), item('B'), ...base], draft);
  assert.deepEqual(result.map((entry) => entry.id_interno), ['C', 'B', 'A']);
  assert.equal(result[0].publicado, false);
  assert.equal(result[1].publicado, false);
  assert.deepEqual(result[2], draft[0]);
});
test('importações sucessivas não duplicam entradas', () => {
  const base = [item('A')];
  const current = [item('B'), ...base];
  const draft = merge(base, current, [item('A', { texto: 'Editado' })]);
  assert.equal(merge(current, [item('C'), ...current], draft).length, 3);
});
test('alterações em campos independentes são preservadas dos dois lados', () => {
  assert.deepEqual(merge([item('A')], [item('A', { title: 'Atualizado' })], [item('A', { texto: 'Revisado' })]), [item('A', { title: 'Atualizado', texto: 'Revisado' })]);
});
test('conflito real não sobrescreve nenhum lado', () => {
  assert.throws(() => merge([item('A')], [item('A', { texto: 'Um' })], [item('A', { texto: 'Outro' })]), /Conflito editorial/);
});
test('exclusão editorial explícita de item antigo é mantida', () => {
  assert.deepEqual(merge([item('A')], [item('B'), item('A')], []), [item('B')]);
});
test('exclusão versus alteração concorrente exige resolução', () => {
  assert.throws(() => merge([item('A')], [item('A', { texto: 'Atualizado' })], []), /Conflito/);
});
test('registros legados e metadados não são perdidos', () => {
  const old = { title: 'Sem ID', date: '2026-09-22', publicado: false };
  assert.deepEqual(merge([old], [item('B'), old], [old]), [item('B'), old]);
});
test('IDs duplicados não são mesclados silenciosamente', () => {
  assert.throws(() => merge([], [item('A'), item('A')], []), /duplicado/);
});

const directory = mkdtempSync(join(tmpdir(), 'fala-sync-test-'));
try {
  const remote = join(directory, 'remote.git');
  const repo = join(directory, 'repo');
  const env = { ...process.env, GIT_AUTHOR_NAME: 'Teste', GIT_AUTHOR_EMAIL: 'teste@example.invalid', GIT_COMMITTER_NAME: 'Teste', GIT_COMMITTER_EMAIL: 'teste@example.invalid' };
  const git = (args, options = {}) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', env, stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim();
  execFileSync('git', ['init', '--bare', remote], { stdio: 'pipe' });
  execFileSync('git', ['init', '-b', 'main', repo], { stdio: 'pipe' });
  git(['remote', 'add', 'origin', remote]);
  mkdirSync(join(repo, 'conteudo'));
  const save = (items) => { writeFileSync(join(repo, FILE), JSON.stringify(document(...items))); git(['add', FILE]); git(['commit', '-m', 'fixture']); };
  save([item('A')]);
  git(['push', 'origin', 'main']);
  test('sem revisão aberta não cria branch nem publica', () => {
    assert.equal(synchronize({ git }).status, 'no-draft');
  });
  git(['checkout', '-b', DRAFT]);
  save([item('A', { texto: 'Edição preservada', publicado: true })]);
  git(['push', 'origin', DRAFT]);
  git(['checkout', 'main']);
  save([item('C'), item('B'), item('A')]);
  git(['push', 'origin', 'main']);
  const mainBefore = git(['rev-parse', 'main']);
  test('sincronização real com Git preserva main e revisão', () => {
    assert.equal(synchronize({ git }).status, 'synchronized');
    const result = JSON.parse(git(['show', `refs/remotes/origin/${DRAFT}:${FILE}`]));
    // A remote-tracking ref pode só avançar no próximo fetch.
    git(['fetch', 'origin']);
    const updated = JSON.parse(git(['show', `refs/remotes/origin/${DRAFT}:${FILE}`]));
    assert.deepEqual(updated.items.map((entry) => entry.id_interno), ['C', 'B', 'A']);
    assert.equal(updated.items[2].texto, 'Edição preservada');
    assert.equal(updated.items[2].publicado, true);
    assert.equal(updated.items[0].publicado, false);
    assert.equal(git(['rev-parse', 'refs/remotes/origin/main']), mainBefore);
    assert.equal(result.items.length > 0, true);
  });
  test('reexecução é idempotente', () => assert.equal(synchronize({ git }).status, 'up-to-date'));
  save([item('D'), item('C'), item('B'), item('A')]);
  git(['push', 'origin', 'main']);
  let raced = false;
  test('edição concorrente entre leitura e envio é relida e preservada', () => {
    const result = synchronize({ git, beforePush: ({ draft }) => {
      if (raced) return;
      raced = true;
      git(['checkout', '--detach', draft]);
      const contents = JSON.parse(git(['show', `HEAD:${FILE}`]));
      contents.items.find((entry) => entry.id_interno === 'B').texto = 'Editado durante sincronização';
      save(contents.items);
      git(['push', 'origin', `HEAD:refs/heads/${DRAFT}`]);
      git(['checkout', 'main']);
    } });
    assert.equal(result.status, 'synchronized');
    git(['fetch', 'origin']);
    const updated = JSON.parse(git(['show', `refs/remotes/origin/${DRAFT}:${FILE}`]));
    assert.equal(updated.items.length, 4);
    assert.equal(updated.items.find((entry) => entry.id_interno === 'B').texto, 'Editado durante sincronização');
    assert.equal(updated.items.find((entry) => entry.id_interno === 'A').publicado, true);
  });
  save([item('E'), item('D'), item('C'), item('B'), item('A')]);
  git(['push', 'origin', 'main']);
  test('revisão encerrada durante o envio não é recriada', () => {
    let closed = false;
    const result = synchronize({ git, beforePush: () => {
      if (!closed) { closed = true; git(['push', 'origin', `:refs/heads/${DRAFT}`]); }
    } });
    assert.equal(result.status, 'no-draft');
    assert.equal(git(['ls-remote', 'origin', `refs/heads/${DRAFT}`]), '');
  });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log(`${checks} cenários de sincronização aprovados.`);
