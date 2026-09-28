'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '../..');
const codigo = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8');
const contexto = {
  Utilities: {
    formatDate: (_data, _fuso, formato) => formato === 'yyyyMMdd' ? '20260924' : '2026-09-24',
  },
  SpreadsheetApp: {
    openById: () => ({ getSpreadsheetTimeZone: () => 'America/Sao_Paulo' }),
    DataValidationCriteria: {
      VALUE_IN_LIST: 'VALUE_IN_LIST',
      CHECKBOX: 'CHECKBOX',
    },
  },
};
vm.createContext(contexto);
vm.runInContext(`${codigo}\nthis.apiTeste = {
  consentimentosValidos_,
  identificacaoPublicaPadrao_,
  montarPayloadPublico_,
  montarRegistroModeracao_,
  normalizarCategoria_,
  validarEstruturaPlanilha_,
};`, contexto);

const api = contexto.apiTeste;
let verificacoes = 0;

function afirmar(condicao, mensagem) {
  verificacoes += 1;
  if (!condicao) throw new Error(mensagem);
}

function iguais(atual, esperado, mensagem) {
  afirmar(JSON.stringify(atual) === JSON.stringify(esperado), `${mensagem}\nEsperado: ${JSON.stringify(esperado)}\nObtido: ${JSON.stringify(atual)}`);
}

function deveFalhar(rotulo, trecho, executar) {
  let mensagem = '';
  try {
    executar();
  } catch (erro) {
    mensagem = String(erro.message || erro);
  }
  afirmar(mensagem.includes(trecho), `${rotulo}: falha esperada não ocorreu (${mensagem || 'sem erro'}).`);
}

const tipos = [
  ['Interrupção de mandato', 'Interrupção de mandato'],
  ['Afastamento ou demissão', 'Afastamento ou demissão'],
  ['Prejuízo ao funcionamento da ouvidoria', 'Prejuízo ao funcionamento de ouvidoria'],
  ['Relato institucional', 'Relato institucional'],
  ['Sugestão, correção ou atualização do portal', 'Sugestão ou atualização'],
  ['Envio de documento ou referência', 'Outro'],
  ['Outro assunto relacionado às ouvidorias', 'Outro'],
];
const identificacoes = [
  ['Nome completo', 'João da Silva'],
  ['Somente iniciais', 'J. S.'],
  ['Identidade preservada', 'Identidade preservada'],
];
const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const confirmacao1 = 'Estou ciente de que a manifestação será submetida a moderação e de que seu envio não garante publicação.';
const confirmacao2 = 'Autorizo o tratamento dos dados fornecidos para análise, contato, moderação e eventual publicação nos termos informados acima.';
const confirmacoes = `${confirmacao1}, ${confirmacao2}`;
const data = new Date('2026-09-24T12:00:00Z');

let combinacoes = 0;
for (const [tipo, categoria] of tipos) {
  for (const uf of ufs) {
    for (const [preferencia, identificacao] of identificacoes) {
      const origem = [
        data,
        'João da Silva',
        'joao@example.com',
        'Ouvidoria de Teste',
        uf,
        tipo,
        'Título de teste',
        'Texto público já moderado.',
        preferencia,
        confirmacoes,
      ];
      const registro = api.montarRegistroModeracao_(origem, 42, data, 'America/Sao_Paulo');
      iguais(registro.length, 28, 'O registro de moderação deve ter 28 colunas.');
      iguais(registro.slice(0, 11), [
        'FO-20260924-042', 'Em análise', true, 'Título de teste', data, categoria,
        'Ouvidoria de Teste', uf, 'Texto público já moderado.', identificacao, 'Em acompanhamento',
      ], `Mapeamento público incorreto para ${tipo} / ${uf} / ${preferencia}.`);
      iguais(registro.slice(17), [
        42, data, 'João da Silva', 'joao@example.com', 'Ouvidoria de Teste', uf,
        tipo, 'Título de teste', 'Texto público já moderado.', preferencia, confirmacoes,
      ], `Mapeamento privado incorreto para ${tipo} / ${uf} / ${preferencia}.`);

      registro[1] = 'Aprovado para Decap';
      const payload = api.montarPayloadPublico_(registro);
      iguais(Object.keys(payload), [
        'id_interno', 'title', 'date', 'categoria', 'instituicao', 'local', 'texto',
        'autor_exibicao', 'status', 'resposta', 'resposta_data', 'destaque',
      ], 'O payload do Decap contém chave ausente, extra ou privada.');
      iguais(payload.categoria, categoria, 'Categoria divergente no payload do Decap.');
      iguais(payload.autor_exibicao, identificacao, 'Identificação divergente no payload do Decap.');
      iguais(payload.local, uf, 'UF divergente no payload do Decap.');
      iguais(payload.date, '2026-09-24', 'Data divergente no payload do Decap.');
      combinacoes += 1;
    }
  }
}

afirmar(api.consentimentosValidos_(confirmacoes), 'Os dois consentimentos deveriam ser válidos.');
afirmar(api.consentimentosValidos_(`${confirmacao2}, ${confirmacao1}`), 'A ordem dos consentimentos não deveria importar.');
afirmar(!api.consentimentosValidos_(confirmacao1), 'Um único consentimento não pode ser válido.');
afirmar(!api.consentimentosValidos_(confirmacao2), 'Um único consentimento não pode ser válido.');
afirmar(!api.consentimentosValidos_(''), 'Consentimento vazio não pode ser válido.');

const desconhecida = [data, 'João da Silva', 'joao@example.com', '', 'PR', 'Categoria futura', 'Título', 'Texto', 'Preferência futura', confirmacoes];
const registroSeguro = api.montarRegistroModeracao_(desconhecida, 43, data, 'America/Sao_Paulo');
iguais(registroSeguro[5], 'Outro', 'Categoria desconhecida deve cair preventivamente em Outro.');
iguais(registroSeguro[9], 'Identidade preservada', 'Preferência desconhecida deve preservar a identidade.');
afirmar(registroSeguro[16].includes('não reconhecido'), 'Opções desconhecidas devem gerar alerta interno.');

function registroBase(preferencia, identificacao) {
  const origem = [data, 'João da Silva', 'joao@example.com', 'Ouvidoria', 'PR', tipos[0][0], 'Título', 'Texto', preferencia, confirmacoes];
  const registro = api.montarRegistroModeracao_(origem, 44, data, 'America/Sao_Paulo');
  registro[1] = 'Aprovado para Decap';
  registro[9] = identificacao;
  return registro;
}

api.montarPayloadPublico_(registroBase('Somente iniciais', 'Identidade preservada'));
api.montarPayloadPublico_(registroBase('Nome completo', 'J. S.'));
api.montarPayloadPublico_(registroBase('Nome completo', 'Identidade preservada'));
deveFalhar('Nome sob identidade preservada', 'mantenha “Identidade preservada”', () => api.montarPayloadPublico_(registroBase('Identidade preservada', 'J. S.')));
deveFalhar('Nome sob autorização de iniciais', 'no máximo as iniciais', () => api.montarPayloadPublico_(registroBase('Somente iniciais', 'João da Silva')));
deveFalhar('Identificação arbitrária', 'nome autorizado', () => api.montarPayloadPublico_(registroBase('Nome completo', 'Outro nome')));

const comEmail = registroBase('Somente iniciais', 'J. S.');
comEmail[8] = 'Contato: joao@example.com';
deveFalhar('E-mail em campo público', 'endereço de e-mail', () => api.montarPayloadPublico_(comEmail));
const comNome = registroBase('Somente iniciais', 'J. S.');
comNome[8] = 'Relato de João da Silva';
deveFalhar('Nome completo em campo público', 'nome completo', () => api.montarPayloadPublico_(comNome));
const semConsentimento = registroBase('Somente iniciais', 'J. S.');
semConsentimento[2] = false;
deveFalhar('Consentimento inválido', 'consentimentos obrigatórios', () => api.montarPayloadPublico_(semConsentimento));
const situacaoInvalida = registroBase('Somente iniciais', 'J. S.');
situacaoInvalida[10] = 'Situação futura';
deveFalhar('Situação incompatível', 'opção válida do Decap', () => api.montarPayloadPublico_(situacaoInvalida));

const configuracao = fs.readFileSync(path.join(raiz, 'admin/config.yml'), 'utf8');
const inicioManifestacoes = configuracao.indexOf('  - name: "manifestacoes"');
const fimManifestacoes = configuracao.indexOf('  - name: "conselho_curador"');
const secaoManifestacoes = configuracao.slice(inicioManifestacoes, fimManifestacoes);
for (const categoria of [...new Set(tipos.map(([, destino]) => destino))]) {
  afirmar(secaoManifestacoes.includes(`"${categoria}"`), `Categoria ausente no Decap: ${categoria}.`);
}
for (const situacao of ['Relato publicado', 'Em acompanhamento', 'Resposta recebida', 'Encerrado']) {
  afirmar(secaoManifestacoes.includes(`"${situacao}"`), `Situação ausente no Decap: ${situacao}.`);
}
for (const campoPrivado of ['emailPrivado', 'nomePrivado', 'relatoOriginal', 'confirmacoesOriginais']) {
  afirmar(!secaoManifestacoes.includes(`name: "${campoPrivado}"`), `Campo privado indevido no Decap: ${campoPrivado}.`);
}
const codigoPortal = fs.readFileSync(path.join(raiz, 'portal-content.js'), 'utf8');
afirmar(codigoPortal.includes('item.publicado !== false'), 'O portal deve ocultar rascunhos com publicado=false.');
afirmar(codigo.includes('publicado: false'), 'A automação deve criar rascunhos ocultos no Decap.');

const cabecalhosRespostas = [
  'Carimbo de data/hora', 'Nome completo', 'E-mail', 'Ouvidoria, órgão ou instituição', 'UF',
  'Tipo de manifestação', 'Título da manifestação', 'Manifestação',
  'Identificação em eventual publicação', 'Confirmações',
];
const cabecalhosModeracao = [
  'ID interno', 'Decisão editorial', 'Consentimentos válidos', 'Título público', 'Data de publicação',
  'Categoria pública', 'Instituição pública', 'Local ou UF', 'Texto público moderado',
  'Identificação pública', 'Situação', 'Resposta ou atualização', 'Data da resposta', 'Destaque',
  'Fluxo Decap', 'Link', 'Observações internas', 'Linha da resposta privada', 'Carimbo de data/hora',
  'Nome completo (privado)', 'E-mail (privado)', 'Instituição original', 'UF original', 'Tipo original',
  'Título original', 'Manifestação original', 'Preferência de identificação', 'Confirmações',
];
const validacoesModeracao = {
  2: { tipo: 'VALUE_IN_LIST', valores: ['Em análise', 'Aprovado para Decap', 'Não publicar'] },
  3: { tipo: 'CHECKBOX', valores: [] },
  6: { tipo: 'VALUE_IN_LIST', valores: ['Interrupção de mandato', 'Afastamento ou demissão', 'Prejuízo ao funcionamento de ouvidoria', 'Relato institucional', 'Sugestão ou atualização', 'Outro'] },
  11: { tipo: 'VALUE_IN_LIST', valores: ['Relato publicado', 'Em acompanhamento', 'Resposta recebida', 'Encerrado'] },
  14: { tipo: 'CHECKBOX', valores: [] },
  15: { tipo: 'VALUE_IN_LIST', valores: ['Aguardando moderação', 'Envio solicitado', 'Disponível no Decap', 'Publicado', 'Ocultado no portal', 'Erro no envio', 'Não publicar'] },
};
function regraMock(configuracao) {
  if (!configuracao) return null;
  return {
    getCriteriaType: () => configuracao.tipo,
    getCriteriaValues: () => [configuracao.valores],
  };
}
function abaMock(nome, cabecalhos, validacoes) {
  return {
    getName: () => nome,
    getRange: (_linha, coluna) => ({
      getDisplayValues: () => [cabecalhos],
      getDataValidation: () => regraMock(validacoes && validacoes[coluna]),
    }),
  };
}
function planilhaMock(cabecalhosDaModeracao, validacoes = validacoesModeracao) {
  const abas = {
    'Respostas ao formulário 1': abaMock('Respostas ao formulário 1', cabecalhosRespostas),
    'Moderação': abaMock('Moderação', cabecalhosDaModeracao, validacoes),
  };
  return { getSheetByName: (nome) => abas[nome] || null };
}
api.validarEstruturaPlanilha_(planilhaMock(cabecalhosModeracao));
const cabecalhoAlterado = [...cabecalhosModeracao];
cabecalhoAlterado[9] = 'Identificação';
deveFalhar('Alteração estrutural', 'estrutura da aba', () => api.validarEstruturaPlanilha_(planilhaMock(cabecalhoAlterado)));
const validacoesAlteradas = JSON.parse(JSON.stringify(validacoesModeracao));
validacoesAlteradas[6].valores[2] = 'Categoria incompatível';
deveFalhar('Alteração de dropdown', 'opções da coluna “Categoria pública”', () => api.validarEstruturaPlanilha_(planilhaMock(cabecalhosModeracao, validacoesAlteradas)));
const validacoesSemCheckbox = { ...validacoesModeracao, 14: null };
deveFalhar('Remoção de checkbox', 'deve ser uma caixa de seleção', () => api.validarEstruturaPlanilha_(planilhaMock(cabecalhosModeracao, validacoesSemCheckbox)));

console.log(`OK: ${combinacoes} combinações formulário → moderação → Decap; ${verificacoes} verificações concluídas.`);
