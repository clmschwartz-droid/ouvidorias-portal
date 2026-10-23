'use strict';

const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { isDeepStrictEqual: equal } = require('node:util');

const FILE = 'conteudo/manifestacoes.json';
const DRAFT = 'cms/manifestacoes/itens';
const ABSENT = Symbol('absent');
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function mergeValue(base, current, draft, path) {
  if (equal(current, draft)) return current;
  if (equal(base, draft)) return current;
  if (equal(base, current)) return draft;
  if ((object(base) || base === ABSENT) && object(current) && object(draft)) {
    const result = {};
    for (const key of new Set([...Object.keys(current), ...Object.keys(draft), ...Object.keys(base === ABSENT ? {} : base)])) {
      const value = mergeValue(
        base !== ABSENT && Object.hasOwn(base, key) ? base[key] : ABSENT,
        Object.hasOwn(current, key) ? current[key] : ABSENT,
        Object.hasOwn(draft, key) ? draft[key] : ABSENT,
        `${path}.${key}`,
      );
      if (value !== ABSENT) result[key] = value;
    }
    return result;
  }
  throw new Error(`Conflito editorial em ${path}; nenhuma alteração foi sobrescrita.`);
}

function itemKey(item) {
  if (!object(item) || !item.title || !item.date) throw new Error('Manifestação sem título ou data.');
  // Registros antigos não tinham ID; a dupla data/título só é aceita se única.
  return item.id_interno ? `id:${item.id_interno}` : `legacy:${JSON.stringify([item.date, item.title])}`;
}

function indexItems(document) {
  if (!object(document) || !Array.isArray(document.items)) throw new Error('Lista de manifestações inválida.');
  const result = new Map();
  for (const item of document.items) {
    const key = itemKey(item);
    if (result.has(key)) throw new Error(`Identificador duplicado: ${key}.`);
    result.set(key, item);
  }
  return result;
}

function mergeDocuments(base, current, draft) {
  const indices = [base, current, draft].map(indexItems);
  const [b, c, d] = indices;
  const items = [];
  // As importações recentes entram no início; o conteúdo editorial é mesclado por ID.
  for (const key of new Set([...c.keys(), ...d.keys(), ...b.keys()])) {
    const value = mergeValue(b.get(key) ?? ABSENT, c.get(key) ?? ABSENT, d.get(key) ?? ABSENT, key);
    if (value !== ABSENT) items.push(value);
  }
  const withoutItems = ({ items: _, ...rest }) => rest;
  return { ...mergeValue(withoutItems(base), withoutItems(current), withoutItems(draft), 'documento'), items };
}

function defaultGit(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options }).trim();
}

function remoteSha(git, branch) {
  return git(['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s/)[0] || '';
}

function synchronize({ git = defaultGit, beforePush = () => {} } = {}) {
  // Nunca cria uma revisão nem publica o conteúdo. Só atualiza a revisão existente.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!remoteSha(git, DRAFT)) return { status: 'no-draft' };
    git(['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main', `+refs/heads/${DRAFT}:refs/remotes/origin/${DRAFT}`]);
    const main = git(['rev-parse', 'refs/remotes/origin/main']);
    const draft = git(['rev-parse', `refs/remotes/origin/${DRAFT}`]);
    const base = git(['merge-base', main, draft]);
    if (base === main) return { status: 'up-to-date' };

    const changed = git(['diff', '--name-only', base, draft]).split('\n').filter(Boolean);
    if (changed.some((path) => path !== FILE)) throw new Error('A revisão contém alterações fora das manifestações; sincronização interrompida.');
    const read = (ref) => JSON.parse(git(['show', `${ref}:${FILE}`]));
    const content = `${JSON.stringify(mergeDocuments(read(base), read(main), read(draft)), null, 2)}\n`;
    const directory = mkdtempSync(join(tmpdir(), 'fala-decap-'));
    let commit;
    try {
      const env = { ...process.env, GIT_INDEX_FILE: join(directory, 'index') };
      git(['read-tree', main], { env });
      const blob = git(['hash-object', '-w', '--stdin'], { input: content });
      git(['update-index', '--add', '--cacheinfo', `100644,${blob},${FILE}`], { env });
      const tree = git(['write-tree'], { env });
      commit = git(['commit-tree', tree, '-p', draft, '-p', main], {
        input: '[skip netlify] Sincroniza novas manifestações com a revisão aberta do Decap\n',
        env: { ...process.env, GIT_AUTHOR_NAME: 'Portal — sincronização editorial', GIT_AUTHOR_EMAIL: 'actions@users.noreply.github.com', GIT_COMMITTER_NAME: 'Portal — sincronização editorial', GIT_COMMITTER_EMAIL: 'actions@users.noreply.github.com' },
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    beforePush({ attempt, main, draft, commit });
    if (remoteSha(git, 'main') !== main || remoteSha(git, DRAFT) !== draft) continue;
    try {
      // O novo commit descende de draft. A lease também impede recriar uma
      // revisão que tenha sido publicada/excluída no intervalo entre as chamadas.
      git(['push', `--force-with-lease=refs/heads/${DRAFT}:${draft}`, 'origin', `${commit}:refs/heads/${DRAFT}`]);
      return { status: 'synchronized', commit };
    } catch (error) {
      if (!remoteSha(git, DRAFT)) return { status: 'draft-closed' };
      if (remoteSha(git, DRAFT) === draft) throw error;
    }
  }
  throw new Error('A revisão mudou durante as quatro tentativas; nenhuma edição foi sobrescrita.');
}

if (require.main === module) {
  try { console.log(JSON.stringify(synchronize())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { mergeDocuments, synchronize, FILE, DRAFT };
