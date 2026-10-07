'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fonte = fs.readFileSync(path.join(__dirname, 'Central.gs'), 'utf8');
const original = fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8');
let verificacoes = 0;
function ok(condicao, mensagem) { verificacoes++; assert.ok(condicao, mensagem); }
function falha(acao, texto) { verificacoes++; assert.throws(acao, new RegExp(texto)); }
function igual(a, b) { verificacoes++; assert.equal(JSON.stringify(a), JSON.stringify(b)); }
const ID_REAL = '10LjwNEblKPbqYZokshSbRxAZKt7BmjidEL4Vb9a66ac';
const EMAIL_ADMIN = 'ouvidoriaspublicasbrasileiras@gmail.com';
const tokenFicticio = 'github_pat_SOMENTE_TESTE_SEM_VALOR';

function ambiente(producao = false) {
  const estado = {
    props: { CENTRAL_PLANILHA_ID: producao ? ID_REAL : 'COPIA_TESTE', CENTRAL_MODO: producao ? 'PRODUCAO' : 'SIMULACAO' },
    usuario: EMAIL_ADMIN, escritas: 0, chamadas: [], leituras: [], ocupado: false,
    liberacoes: 0, gatilhos: [], criacoes: 0, pausas: 0, itens: [], ramo: new Set(), logs: [], planilhasCriadas: 0,
    falharHttp: false, falharMerge: false, alterarDepoisDoEnvio: null,
  };
  if (producao) Object.assign(estado.props, {
    CENTRAL_CONFIRMAR_ATIVACAO: 'ATIVAR_ENVIO_CENTRAL_OCULTO',
    CENTRAL_PROJETO_PRIVADO: 'CONFERIDO', CENTRAL_GITHUB_TOKEN: tokenFicticio,
  });
  function aba(nome) {
    const tabela = { nome, linhas: [Array(29).fill('')], regras: {}, maxColunas: 29 };
    return Object.assign(tabela, {
      getName: () => tabela.nome, setName: (novo) => { tabela.nome = novo; return tabela; }, getLastRow: () => tabela.linhas.length,
      getMaxRows: () => 10, getMaxColumns: () => tabela.maxColunas,
      insertColumnsAfter: (inicio, quantidade) => { estado.escritas++; tabela.maxColunas = inicio + quantidade; },
      getRange: (linha, coluna, numLinhas = 1, numColunas = 1) => {
        if (coluna + numColunas - 1 > tabela.maxColunas) throw new Error('Coluna inexistente');
        function valor(l, c) { return tabela.linhas[l - 1]?.[c - 1] ?? ''; }
        function escrever(l, c, v) {
          estado.escritas++; tabela.linhas[l - 1] ||= Array(29).fill(''); tabela.linhas[l - 1][c - 1] = v;
        }
        return {
          getValue: () => valor(linha, coluna),
          getValues: () => Array.from({ length: numLinhas }, (_, i) => Array.from({ length: numColunas }, (_, j) => valor(linha + i, coluna + j))),
          getDisplayValues: () => [Array.from({ length: numColunas }, (_, j) => String(valor(linha, coluna + j)))],
          setValue: (v) => escrever(linha, coluna, v),
          setValues: (valores) => valores.forEach((r, i) => r.forEach((v, j) => escrever(linha + i, coluna + j, v))),
          getDataValidation: () => tabela.regras[coluna] || null,
          setDataValidation: (regra) => { estado.escritas++; tabela.regras[coluna] = regra; },
          setNote: () => { estado.escritas++; },
          setRichTextValue: (v) => escrever(linha, coluna, v),
        };
      },
    });
  }
  const moderacao = aba('Moderação');
  const respostas = aba('Respostas ao formulário 1');
  const planilha = {
    getSheetByName: (nome) => nome === 'Moderação' ? moderacao : nome === respostas.nome ? respostas : null,
    getSpreadsheetTimeZone: () => 'America/Sao_Paulo',
    getSheets: () => [respostas], getId: () => 'COPIA_TESTE', getUrl: () => 'https://docs.google.com/spreadsheets/d/COPIA_TESTE/edit',
    insertSheet: () => { moderacao.linhas = [Array(29).fill('')]; moderacao.regras = {}; return moderacao; },
  };
  const regra = (tipo, valores = []) => ({ getCriteriaType: () => tipo, getCriteriaValues: () => [valores] });
  const contexto = {
    console: { log: (mensagem) => estado.logs.push(mensagem) },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (chave) => estado.props[chave] || null, setProperty: (chave, valor) => { estado.props[chave] = valor; } }),
      getUserProperties: () => { throw new Error('Credenciais do operador não podem ser consultadas'); },
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => estado.usuario }) },
    SpreadsheetApp: {
      DataValidationCriteria: { VALUE_IN_LIST: 'LISTA', CHECKBOX: 'CHECKBOX' },
      openById: (id) => { estado.leituras.push(id); assert.equal(id, estado.props.CENTRAL_PLANILHA_ID); return planilha; },
      create: () => { estado.planilhasCriadas++; respostas.linhas = [Array(29).fill('')]; return planilha; },
      newDataValidation: () => { let tipo = 'CHECKBOX', valores = []; const r = { requireCheckbox: () => r,
        requireValueInList: (lista) => { tipo = 'LISTA'; valores = lista; return r; },
        setAllowInvalid: () => r, build: () => regra(tipo, valores) }; return r; },
      newRichTextValue: () => { const r = { setText: (v) => { r.text = v; return r; }, setLinkUrl: (v) => { r.url = v; return r; }, build: () => ({ text: r.text, url: r.url }) }; return r; },
      flush: () => { if (estado.alterarNoFlush) estado.alterarNoFlush(moderacao); },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => !estado.ocupado, releaseLock: () => estado.liberacoes++ }) },
    ScriptApp: {
      getProjectTriggers: () => estado.gatilhos.map((nome) => ({ getHandlerFunction: () => nome })),
      newTrigger: (nome) => { const r = { timeBased: () => r, everyMinutes: (n) => { assert.equal(n, 1); return r; }, create: () => { estado.criacoes++; estado.gatilhos.push(nome); } }; return r; },
      deleteTrigger: () => { throw new Error('Não apagar gatilhos existentes'); },
    },
    Utilities: {
      formatDate: () => '2026-10-07', base64Decode: (v) => Buffer.from(v, 'base64'),
      base64Encode: (v) => Buffer.from(v).toString('base64'),
      newBlob: (v) => ({ getDataAsString: () => Buffer.from(v).toString('utf8'), getBytes: () => Buffer.from(v) }),
      sleep: () => { estado.pausas++; },
    },
    UrlFetchApp: { fetch: (url, opcoes) => {
      assert.equal(opcoes.headers.Authorization, 'Bearer ' + tokenFicticio);
      const caminho = url.replace('https://api.github.com/repos/clmschwartz-droid/ouvidorias-portal', '');
      const metodo = opcoes.method;
      estado.chamadas.push({ caminho, metodo });
      let codigo = 200, dados = {};
      const payload = opcoes.payload && JSON.parse(opcoes.payload);
      if (estado.falharHttp) { codigo = 401; dados = { message: 'Credencial recusada ' + tokenFicticio }; }
      else if (caminho === '/git/ref/heads/main') dados = { object: { sha: 'BASE' } };
      else if (caminho.startsWith('/contents/') && metodo === 'get') dados = { sha: 'ARQUIVO', content: Buffer.from(JSON.stringify({ items: estado.itens })).toString('base64') };
      else if (caminho === '/git/refs') {
        if (estado.ramo.has(payload.ref)) { codigo = 422; dados = { message: 'Reference already exists' }; }
        else { codigo = 201; estado.ramo.add(payload.ref); }
      }
      else if (caminho.startsWith('/contents/') && metodo === 'put') {
        estado.escritoGitHub = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
      }
      else if (caminho === '/pulls') { codigo = 201; dados = { number: 1, html_url: 'https://github.com/clmschwartz-droid/ouvidorias-portal/pull/1' }; }
      else if (caminho === '/pulls/1/merge') {
        if (estado.falharMerge) { codigo = 405; dados = { merged: false }; }
        else { estado.itens = estado.escritoGitHub.items; dados = { merged: true }; if (estado.alterarDepoisDoEnvio) estado.alterarDepoisDoEnvio(moderacao); }
      }
      else if (caminho.startsWith('/git/refs/heads/') && metodo === 'delete') { codigo = 204; estado.ramo.clear(); }
      else throw new Error('Chamada inesperada: ' + metodo + ' ' + caminho);
      return { getResponseCode: () => codigo, getContentText: () => JSON.stringify(dados) };
    } },
  };
  vm.createContext(contexto);
  vm.runInContext(fonte + '\nthis.api = { CENTRAL, COL, CABECALHOS_RESPOSTAS, CABECALHOS_MODERACAO, DECISOES_EDITORIAIS, CATEGORIAS_PUBLICAS, SITUACOES_PUBLICAS, FLUXOS_DECAP, prepararTesteInicialCentral, simularPedidosCentrais, processarPedidosCentrais, prepararColunaDePedidosCentral, instalarTemporizadorCentral, pausarEnvioCentral, montarPayloadPublico_ };', contexto);
  const api = contexto.api;
  respostas.linhas[0] = Array.from(api.CABECALHOS_RESPOSTAS);
  moderacao.linhas[0] = [...Array.from(api.CABECALHOS_MODERACAO), api.CENTRAL.cabecalhoPedido];
  for (const [coluna, valores] of [[2, api.DECISOES_EDITORIAIS], [6, api.CATEGORIAS_PUBLICAS], [11, api.SITUACOES_PUBLICAS], [15, api.FLUXOS_DECAP]]) moderacao.regras[coluna] = regra('LISTA', Array.from(valores));
  for (const coluna of [3, 14, 29]) moderacao.regras[coluna] = regra('CHECKBOX');
  function adicionar(alteracoes = {}) {
    const linha = ['FO-20261007-' + String(moderacao.linhas.length).padStart(3, '0'), 'Aprovado para Decap', true,
      'Relato de teste', '2026-10-07', 'Relato institucional', 'Ouvidoria de teste', 'PR', 'Texto público moderado.',
      'Identidade preservada', 'Em acompanhamento', '', '', false, 'Aguardando moderação', '', '',
      2, '2026-10-07', 'João da Silva', 'joao@example.com', 'Instituição original privada', 'PR', 'Relato institucional',
      'Título original privado', 'Relato original privado', 'Identidade preservada', 'Confirmações originais privadas', true];
    for (const [coluna, valor] of Object.entries(alteracoes)) linha[Number(coluna) - 1] = valor;
    moderacao.linhas.push(linha); return linha;
  }
  return { estado, api, moderacao, adicionar };
}

const digest = crypto.createHash('sha256').update(original).digest('hex');
ok(fonte.includes(digest), 'Pacote deve registrar a base imutável.');
for (const proibido of ['GmailApp', 'function onOpen(', 'function instalarAutomacao(', 'function aoReceberManifestacao(', 'getUserProperties()']) {
  ok(!fonte.includes(proibido) || proibido === 'GmailApp' && !fonte.includes('GmailApp.'), 'Pacote não pode incluir ' + proibido);
}

let e = ambiente(); e.adicionar();
igual(e.api.simularPedidosCentrais(), [{ linha: 2, valido: true, id: 'FO-20261007-001' }]);
igual(e.estado.escritas, 0); igual(e.estado.chamadas.length, 0);
e = ambiente(); delete e.estado.props.CENTRAL_PLANILHA_ID;
igual(e.api.prepararTesteInicialCentral(), { id: 'COPIA_TESTE', jaExistia: false });
igual(e.estado.planilhasCriadas, 1); igual(e.estado.chamadas.length, 0); igual(e.estado.criacoes, 0);
igual(e.estado.props.CENTRAL_GITHUB_TOKEN, undefined); igual(e.moderacao.linhas[1].length, 29);
igual(e.api.simularPedidosCentrais().map((item) => item.valido), [true, false]);
const criacaoAntes = e.estado.escritas; e.api.prepararTesteInicialCentral(); igual(e.estado.planilhasCriadas, 1); igual(e.estado.escritas, criacaoAntes);
e = ambiente(true); falha(() => e.api.prepararTesteInicialCentral(), 'bloqueada'); igual(e.estado.planilhasCriadas, 0);
e = ambiente(); e.estado.usuario = 'estagiario@example.com'; falha(() => e.api.prepararTesteInicialCentral(), 'administrativa'); igual(e.estado.planilhasCriadas, 0);
e = ambiente(); e.estado.props.CENTRAL_PLANILHA_ID = ID_REAL; falha(() => e.api.prepararTesteInicialCentral(), 'cópia'); igual(e.estado.planilhasCriadas, 0);
e = ambiente(); e.adicionar();
igual(e.api.processarPedidosCentrais(), { processados: 0, pausado: true });
igual(e.estado.escritas, 0); igual(e.estado.chamadas.length, 0);
e.estado.usuario = 'estagiario@example.com'; falha(() => e.api.simularPedidosCentrais(), 'exclusiva');
e = ambiente(); e.estado.props.CENTRAL_PLANILHA_ID = ID_REAL;
falha(() => e.api.simularPedidosCentrais(), 'cópia');
falha(() => e.api.prepararColunaDePedidosCentral(), 'cópia'); igual(e.estado.escritas, 0);
e = ambiente(true); delete e.estado.props.CENTRAL_CONFIRMAR_ATIVACAO;
falha(() => e.api.processarPedidosCentrais(), 'bloqueada'); igual(e.estado.chamadas.length, 0);
e = ambiente(true); delete e.estado.props.CENTRAL_PROJETO_PRIVADO;
falha(() => e.api.processarPedidosCentrais(), 'bloqueada');
e = ambiente(true); e.estado.props.CENTRAL_GITHUB_TOKEN = 'ghp_CLASSICO_NAO_PERMITIDO';
falha(() => e.api.processarPedidosCentrais(), 'fine-grained');

e = ambiente(true); const linhaBoa = e.adicionar(); e.api.processarPedidosCentrais();
igual(linhaBoa[14], 'Disponível no Decap'); igual(linhaBoa[28], false);
igual(e.estado.itens.length, 1); igual(e.estado.itens[0].publicado, false);
for (const privado of ['joao@example.com', 'João da Silva', 'Relato original privado', 'Confirmações originais privadas']) ok(!JSON.stringify(e.estado.escritoGitHub).includes(privado), 'Vazamento: ' + privado);
igual(e.estado.liberacoes, 1);
const antes = e.estado.chamadas.length; e.api.processarPedidosCentrais(); igual(e.estado.chamadas.length, antes);
linhaBoa[28] = true; e.api.processarPedidosCentrais(); igual(e.estado.chamadas.length, antes); igual(linhaBoa[14], 'Disponível no Decap');

for (const alteracoes of [{ 2: 'Em análise' }, { 2: 'Não publicar' }, { 3: false }, { 9: 'Contato: joao@example.com' }, { 9: 'Relato de João da Silva' }, { 10: 'João da Silva' }, { 1: 'ID-arbitrario' }, { 4: '' }, { 5: 'inválida' }, { 11: 'Situação futura' }]) {
  e = ambiente(true); const linha = e.adicionar(alteracoes); e.api.processarPedidosCentrais();
  igual(e.estado.chamadas.length, 0); igual(linha[14], 'Erro no envio'); igual(linha[28], false);
}
for (const status of ['Publicado', 'Disponível no Decap', 'Ocultado no portal', 'Não publicar']) {
  e = ambiente(true); const linha = e.adicionar({ 15: status }); e.api.processarPedidosCentrais();
  igual(e.estado.chamadas.length, 0); igual(linha[14], status); igual(linha[28], false);
}
e = ambiente(true); e.adicionar({ 29: false }); e.api.processarPedidosCentrais(); igual(e.estado.chamadas.length, 0); igual(e.estado.escritas, 0);
e = ambiente(true); e.adicionar(); e.moderacao.linhas[0][3] = 'Cabeçalho alterado';
falha(() => e.api.processarPedidosCentrais(), 'estrutura'); igual(e.estado.escritas, 0); igual(e.estado.liberacoes, 1);
e = ambiente(true); e.adicionar(); delete e.moderacao.regras[29]; falha(() => e.api.processarPedidosCentrais(), 'caixa de seleção');
e = ambiente(true); e.adicionar(); e.estado.ocupado = true; igual(e.api.processarPedidosCentrais(), { processados: 0, ocupado: true }); igual(e.estado.chamadas.length, 0);

for (const publicado of [false, true]) {
  e = ambiente(true); const linha = e.adicionar(); e.estado.itens = [{ id_interno: linha[0], publicado, title: 'Existente' }];
  e.api.processarPedidosCentrais(); igual(linha[14], publicado ? 'Publicado' : 'Disponível no Decap');
  igual(e.estado.itens, [{ id_interno: linha[0], publicado, title: 'Existente' }]); ok(e.estado.chamadas.every((c) => c.metodo === 'get'), 'Duplicata não deve ser escrita.');
}
e = ambiente(true); const comFalha = e.adicionar(); e.estado.falharHttp = true; e.api.processarPedidosCentrais();
igual(comFalha[14], 'Erro no envio'); igual(comFalha[28], false); ok(!comFalha[16].includes(tokenFicticio), 'Não expor token em erro.');
e = ambiente(true); const mudouAntes = e.adicionar(); e.estado.alterarNoFlush = () => { mudouAntes[8] = 'Texto alterado'; };
e.api.processarPedidosCentrais(); igual(e.estado.chamadas.length, 0); igual(mudouAntes[14], 'Erro no envio');
e = ambiente(true); const mudouDepois = e.adicionar(); e.estado.alterarDepoisDoEnvio = () => { mudouDepois[1] = 'Não publicar'; mudouDepois[14] = 'Não publicar'; };
e.api.processarPedidosCentrais(); igual(mudouDepois[14], 'Não publicar'); igual(e.estado.itens[0].publicado, false);
e = ambiente(true); const mudouId = e.adicionar();
e.estado.alterarDepoisDoEnvio = () => { mudouId[0] = 'FO-OUTRA-LINHA'; mudouId[14] = 'Publicado'; };
falha(() => e.api.processarPedidosCentrais(), 'reorganizada');
igual(mudouId[14], 'Publicado'); igual(mudouId[28], true); igual(mudouId[16], '');
e = ambiente(true); const parcial = e.adicionar(); e.estado.falharMerge = true; e.api.processarPedidosCentrais();
igual(parcial[14], 'Erro no envio'); igual(e.estado.pausas, 12);
parcial[28] = true; e.api.processarPedidosCentrais();
igual(e.estado.chamadas.filter((c) => c.caminho === '/pulls').length, 1); igual(e.estado.itens.length, 0);
e = ambiente(true); for (let i = 0; i < 4; i++) e.adicionar();
igual(e.api.processarPedidosCentrais(), { processados: 3 }); igual(e.estado.itens.length, 3); igual(e.moderacao.linhas[4][28], true);

e = ambiente(); e.moderacao.linhas[0][28] = ''; e.moderacao.maxColunas = 28;
e.api.prepararColunaDePedidosCentral(); igual(e.moderacao.maxColunas, 29); igual(e.moderacao.linhas[0][28], e.api.CENTRAL.cabecalhoPedido);
const escritasInstalacao = e.estado.escritas; e.api.prepararColunaDePedidosCentral(); igual(e.estado.escritas, escritasInstalacao);
e = ambiente(); e.moderacao.linhas[0][28] = 'Outra coluna'; falha(() => e.api.prepararColunaDePedidosCentral(), 'outro campo'); igual(e.estado.escritas, 0);
e = ambiente(); e.moderacao.linhas[0][28] = ''; e.adicionar({ 29: 'Dado existente' });
falha(() => e.api.prepararColunaDePedidosCentral(), 'contém dados'); igual(e.estado.escritas, 0);
e = ambiente(); falha(() => e.api.instalarTemporizadorCentral(), 'bloqueado'); igual(e.estado.criacoes, 0);
e = ambiente(true); e.estado.gatilhos.push('aoReceberManifestacao');
e.api.instalarTemporizadorCentral(); e.api.instalarTemporizadorCentral(); igual(e.estado.criacoes, 1); ok(e.estado.gatilhos.includes('aoReceberManifestacao'), 'Não remover gatilho antigo.');
e.api.pausarEnvioCentral(); igual(e.estado.props.CENTRAL_MODO, 'SIMULACAO'); igual(e.api.processarPedidosCentrais(), { processados: 0, pausado: true });

// Comparação direta de todos os campos públicos com os validadores originais.
const contextoOriginal = {
  SpreadsheetApp: { openById: () => ({ getSpreadsheetTimeZone: () => 'America/Sao_Paulo' }) },
  Utilities: { formatDate: () => '2026-10-07' },
};
vm.createContext(contextoOriginal); vm.runInContext(original + '\nthis.payload = montarPayloadPublico_;', contextoOriginal);
e = ambiente();
const categorias = ['Interrupção de mandato', 'Afastamento ou demissão', 'Prejuízo ao funcionamento da ouvidoria', 'Relato institucional', 'Sugestão, correção ou atualização do portal', 'Envio de documento ou referência', 'Outro assunto relacionado às ouvidorias'];
const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
let combinacoes = 0;
for (const categoria of categorias) for (const uf of ufs) for (const [preferencia, identificacao] of [['Nome completo', 'João da Silva'], ['Somente iniciais', 'J. S.'], ['Identidade preservada', 'Identidade preservada']]) {
  const linha = e.adicionar({ 6: categoria, 8: uf, 27: preferencia, 10: identificacao });
  igual(e.api.montarPayloadPublico_(linha), contextoOriginal.payload(linha)); combinacoes++;
}
console.log(`OK central: ${verificacoes} verificações; ${combinacoes} combinações idênticas à base; APIs e planilhas inteiramente simuladas.`);
