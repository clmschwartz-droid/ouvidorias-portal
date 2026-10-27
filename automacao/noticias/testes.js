'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'portal-content.js'), 'utf8');
const folder = '_data/noticias';

function readItems(directory) {
  return fs.readdirSync(path.join(directory, folder)).filter((name) => name.endsWith('.json'))
    .sort().map((name) => JSON.parse(fs.readFileSync(path.join(directory, folder, name), 'utf8')));
}

async function render(items) {
  const host = { innerHTML: '', querySelector: () => null };
  let ready;
  const context = {
    console, Intl, Date,
    window: { location: { hostname: 'ouvidoriasbrasileiras.com.br' } },
    document: {
      readyState: 'loading',
      addEventListener: (name, callback) => { if (name === 'DOMContentLoaded') ready = callback; },
      getElementById: (id) => id === 'noticias-dinamicas' ? host : null,
      querySelectorAll: () => [],
    },
    fetch: async (url) => ({ ok: true, json: async () => url === 'conteudo/noticias.json' ? { items } : {} }),
  };
  vm.runInNewContext(source, context);
  await ready();
  return host.innerHTML;
}

async function main() {
  const config = fs.readFileSync(path.join(root, 'admin/config.yml'), 'utf8');
  const collection = config.split('  - name: "noticias"')[1].split('  - name: "documentos"')[0];
  assert.match(collection, /folder: "_data\/noticias"/);
  assert.match(collection, /format: "json"/);
  assert.doesNotMatch(collection, /^\s*files:/m, 'Não voltar à entrada compartilhada de notícias.');
  const items = readItems(root);
  for (const item of items) {
    assert.equal(typeof item.title, 'string');
    assert.ok(item.title.trim());
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    if (Object.hasOwn(item, 'publicado')) assert.equal(typeof item.publicado, 'boolean');
  }
  const actualHtml = await render(items);
  const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  for (const item of items) {
    assert.equal(actualHtml.includes(`<h3 class="news-card-title text-xl font-bold text-slate-800 mb-1">${escape(item.title)}</h3>`), item.publicado !== false);
  }
  console.log('OK: configuração por matéria; dados válidos; renderização e visibilidade.');

  const titles = (html) => [...html.matchAll(/<h3 class="news-card-title[^\"]*">(.*?)<\/h3>/g)].map((match) => match[1]);
  const highlights = (html) => [...html.matchAll(/<article\b[\s\S]*?<\/article>/g)]
    .filter(([card]) => card.includes(' em destaque</div>')).map(([card]) => titles(card)[0]);
  const old = { title: 'Relatório antigo', date: '2026-09-22', publicado: true, destaque: true };
  const middle = { title: 'Evento intermediário', date: '2026-10-19', publicado: true, destaque: true };
  const recent = { title: 'Plantão recente', date: '2026-10-27', publicado: true, destaque: true };
  const hidden = { title: 'Notícia oculta', date: '2026-10-28', publicado: false, destaque: true };
  const several = await render([old, hidden, recent, middle]);
  assert.deepEqual(highlights(several), [recent.title], 'Marcações antigas não podem gerar várias faixas.');
  assert.deepEqual(titles(several), [recent.title, middle.title, old.title]);
  const republished = await render([{ ...old, destaque: false }, middle, recent, hidden]);
  assert.deepEqual(titles(republished), titles(several), 'Retirar destaque antigo e republicar não muda a ordem por data.');
  assert.deepEqual(highlights(republished), [recent.title]);
  const prior = await render([old, { ...recent, destaque: false }]);
  assert.deepEqual(highlights(prior), [old.title]);
  const replacement = await render([old, recent]);
  assert.deepEqual(highlights(replacement), [recent.title], 'Novo destaque mais recente substitui o chapéu anterior sozinho.');
  const automatic = await render([{ ...old, destaque: false }, { ...recent, destaque: false }]);
  assert.deepEqual(highlights(automatic), [recent.title]);
  assert.deepEqual(highlights(await render([old, { ...recent, publicado: false }])), [old.title]);
  assert.deepEqual(old, { title: 'Relatório antigo', date: '2026-09-22', publicado: true, destaque: true }, 'Renderizar não deve alterar os dados editoriais.');
  console.log('OK: destaque único, troca automática do chapéu, reserva, ocultação e republicação sem reordenar.');

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'noticias-editorial-'));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const save = (name, item) => fs.writeFileSync(path.join(directory, folder, `${name}.json`), JSON.stringify(item));
    const commit = (message) => { git('add', '.'); git('commit', '-m', message); };
    fs.mkdirSync(path.join(directory, folder), { recursive: true });
    git('init', '-b', 'main');
    git('config', 'user.name', 'Teste editorial');
    git('config', 'user.email', 'teste@example.invalid');
    const a = { title: 'Rede de teste', date: '2026-10-26', publicado: false, texto: 'Original preservado' };
    const b = { title: 'Plantão de teste', date: '2026-10-27', publicado: true, texto: 'Primeira versão' };
    save('a', a); save('b', b); commit('base');
    const base = git('rev-parse', 'HEAD');

    git('checkout', '-b', 'cms/noticias/a');
    save('a', { ...a, publicado: true, texto: 'Revisão ainda não aprovada' });
    save('c', { ...a, title: 'Notícia nova apenas em rascunho', publicado: true });
    commit('revisão A e rascunho novo fora de main');
    git('checkout', 'main');
    git('checkout', '-b', 'cms/noticias/b');
    save('b', { ...b, texto: 'Plantão aprovado separadamente' });
    commit('publicar B');
    git('checkout', 'main'); git('merge', '--no-edit', 'cms/noticias/b');
    assert.equal(git('diff', '--name-only', base, 'HEAD'), `${folder}/b.json`);
    assert.deepEqual(readItems(directory).find((item) => item.title === a.title), a);
    assert.match(git('show', `cms/noticias/a:${folder}/a.json`), /Revisão ainda não aprovada/);
    const publishedHtml = await render(readItems(directory));
    assert.match(publishedHtml, /Plantão aprovado separadamente/);
    assert.doesNotMatch(publishedHtml, /Rede de teste|Revisão ainda não aprovada|Notícia nova apenas em rascunho/);
    console.log('OK: publicar B preserva revisão de A e não publica notícia nova em rascunho.');

    git('checkout', '-b', 'cms/noticias/ocultar-b');
    const approvedB = readItems(directory).find((item) => item.title === b.title);
    save('b', { ...approvedB, publicado: false }); commit('ocultação pendente');
    git('checkout', 'main');
    assert.match(await render(readItems(directory)), /Plantão aprovado separadamente/);
    git('merge', '--no-edit', 'cms/noticias/ocultar-b');
    assert.doesNotMatch(await render(readItems(directory)), /Plantão aprovado separadamente/);
    assert.equal(readItems(directory).find((item) => item.title === b.title).texto, approvedB.texto);
    save('b', approvedB); commit('reexibir B sem perder conteúdo');
    assert.match(await render(readItems(directory)), /Plantão aprovado separadamente/);
    console.log('OK: salvar não altera main; publicar ocultação retira do ar; reexibição preserva conteúdo.');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }

  const siteIndex = process.argv.indexOf('--site');
  if (siteIndex !== -1) {
    const generated = JSON.parse(fs.readFileSync(path.resolve(root, process.argv[siteIndex + 1], 'conteudo/noticias.json'), 'utf8'));
    assert.deepEqual(Object.keys(generated), ['items']);
    assert.ok(Array.isArray(generated.items));
    const ordered = (list) => [...list].sort((a, b) => `${a.date} ${a.title}`.localeCompare(`${b.date} ${b.title}`));
    assert.deepEqual(ordered(generated.items), ordered(items), 'O JSON do Pages deve conservar todos os campos e não incluir rascunhos de outras branches.');
    assert.equal(await render(generated.items), actualHtml);
    console.log('OK: JSON produzido pelo build real do Pages igual aos arquivos editoriais, campo a campo.');
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
