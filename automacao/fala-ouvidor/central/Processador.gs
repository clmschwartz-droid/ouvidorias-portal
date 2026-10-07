/* Projeto Apps Script SEPARADO e PRIVADO da administração. Nunca colar na planilha. */
const CENTRAL = Object.freeze({
  administrador: 'ouvidoriaspublicasbrasileiras@gmail.com',
  planilhaReal: '10LjwNEblKPbqYZokshSbRxAZKt7BmjidEL4Vb9a66ac',
  colunaPedido: 29,
  cabecalhoPedido: 'Solicitar envio central ao Decap',
  maximoPorExecucao: 3,
  confirmacao: 'ATIVAR_ENVIO_CENTRAL_OCULTO',
});

// Configuração inicial única, com dados totalmente fictícios e sem credencial.
function prepararTesteInicialCentral() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== CENTRAL.administrador) {
    throw new Error('Use a conta administrativa para criar o teste privado.');
  }
  const propriedades = PropertiesService.getScriptProperties();
  if ((propriedades.getProperty('CENTRAL_MODO') || 'SIMULACAO') !== 'SIMULACAO') {
    throw new Error('Criação de teste bloqueada fora de SIMULACAO.');
  }
  if (propriedades.getProperty('CENTRAL_PLANILHA_ID')) {
    const config = configuracaoCentral_(false);
    const aba = filaCentral_(config);
    validarColunaPedidoCentral_(aba);
    console.log('Teste já preparado. Execute simularPedidosCentrais.');
    return { id: config.id, jaExistia: true };
  }
  const planilha = SpreadsheetApp.create('Fala Ouvidor — TESTE FICTÍCIO do envio central');
  const respostas = planilha.getSheets()[0].setName(FALA_OUVIDOR.respostas);
  const moderacao = planilha.insertSheet(FALA_OUVIDOR.moderacao);
  if (moderacao.getMaxColumns() < CENTRAL.colunaPedido) {
    moderacao.insertColumnsAfter(moderacao.getMaxColumns(), CENTRAL.colunaPedido - moderacao.getMaxColumns());
  }
  respostas.getRange(1, 1, 1, CABECALHOS_RESPOSTAS.length).setValues([Array.from(CABECALHOS_RESPOSTAS)]);
  moderacao.getRange(1, 1, 1, CABECALHOS_MODERACAO.length).setValues([Array.from(CABECALHOS_MODERACAO)]);
  const origem = ['2026-10-07', 'Pessoa Fictícia', 'dados-ficticios@example.com', 'Ouvidoria fictícia', 'PR',
    'Relato institucional', 'Título fictício original', 'Relato fictício original', 'Identidade preservada',
    'Confirmações fictícias: dado exclusivo de teste'];
  respostas.getRange(2, 1, 2, origem.length).setValues([origem, [...origem]]);
  const linha = ['FO-20261007-002', 'Aprovado para Decap', true, 'Teste de envio central', '2026-10-07',
    'Relato institucional', 'Ouvidoria fictícia', 'PR', 'Texto público fictício já moderado.', 'Identidade preservada',
    'Em acompanhamento', '', '', false, 'Aguardando moderação', '', '', 2, '2026-10-07',
    ...origem.slice(1)];
  const semConsentimento = [...linha];
  semConsentimento[0] = 'FO-20261007-003'; semConsentimento[2] = false; semConsentimento[17] = 3;
  moderacao.getRange(2, 1, 2, COL.confirmacoesOriginais).setValues([linha, semConsentimento]);
  const quantidade = moderacao.getMaxRows() - 1;
  for (const [coluna, opcoes] of [[COL.decisao, DECISOES_EDITORIAIS], [COL.categoria, CATEGORIAS_PUBLICAS],
    [COL.situacao, SITUACOES_PUBLICAS], [COL.fluxo, FLUXOS_DECAP]]) {
    const regra = SpreadsheetApp.newDataValidation().requireValueInList(Array.from(opcoes), true)
      .setAllowInvalid(false).build();
    moderacao.getRange(2, coluna, quantidade, 1).setDataValidation(regra);
  }
  for (const coluna of [COL.consentimentos, COL.destaque]) {
    const regra = SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build();
    moderacao.getRange(2, coluna, quantidade, 1).setDataValidation(regra);
  }
  propriedades.setProperty('CENTRAL_PLANILHA_ID', planilha.getId());
  propriedades.setProperty('CENTRAL_MODO', 'SIMULACAO');
  prepararColunaDePedidosCentral();
  moderacao.getRange(2, CENTRAL.colunaPedido, 2, 1).setValues([[true], [true]]);
  console.log('Teste fictício criado: ' + planilha.getUrl());
  console.log('Nenhum token ou temporizador instalado. Execute simularPedidosCentrais em uma nova execução.');
  return { id: planilha.getId(), jaExistia: false };
}

function configuracaoCentral_(permitirProducao) {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== CENTRAL.administrador) {
    throw new Error('Esta rotina é exclusiva da conta administrativa.');
  }
  const propriedades = PropertiesService.getScriptProperties();
  const id = String(propriedades.getProperty('CENTRAL_PLANILHA_ID') || '').trim();
  const modo = propriedades.getProperty('CENTRAL_MODO') || 'SIMULACAO';
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Defina a planilha de teste nas propriedades do projeto privado.');
  if (!['SIMULACAO', 'PRODUCAO'].includes(modo)) throw new Error('Modo central inválido.');
  if (!permitirProducao && (modo !== 'SIMULACAO' || id === CENTRAL.planilhaReal)) {
    throw new Error('Os testes exigem uma cópia da planilha e o modo SIMULACAO.');
  }
  if (modo === 'PRODUCAO') {
    if (id !== CENTRAL.planilhaReal
        || propriedades.getProperty('CENTRAL_CONFIRMAR_ATIVACAO') !== CENTRAL.confirmacao
        || propriedades.getProperty('CENTRAL_PROJETO_PRIVADO') !== 'CONFERIDO') {
      throw new Error('Produção bloqueada: confira o projeto privado e confirme a ativação administrativa.');
    }
    const token = propriedades.getProperty('CENTRAL_GITHUB_TOKEN') || '';
    if (!/^github_pat_[A-Za-z0-9_]+$/.test(token)) {
      throw new Error('Configure a credencial administrativa fine-grained no projeto privado.');
    }
  }
  return { id, modo };
}

function filaCentral_(configuracao) {
  const planilha = SpreadsheetApp.openById(configuracao.id);
  const abas = validarEstruturaPlanilha_(planilha);
  return abas.moderacao;
}

// Em SIMULACAO, esta instalação só aceita uma cópia, nunca a planilha real.
// Em PRODUCAO, exige as duas confirmações administrativas acima.
function prepararColunaDePedidosCentral() {
  const config = configuracaoCentral_(true);
  if (config.modo === 'SIMULACAO' && config.id === CENTRAL.planilhaReal) {
    throw new Error('Use uma cópia para preparar e testar a coluna de pedidos.');
  }
  const aba = filaCentral_(config);
  const faltaColuna = aba.getMaxColumns() < CENTRAL.colunaPedido;
  const atual = faltaColuna ? '' : String(aba.getRange(1, CENTRAL.colunaPedido).getValue() || '').trim();
  if (atual && atual !== CENTRAL.cabecalhoPedido) {
    throw new Error('A coluna AC já contém outro campo; nenhuma alteração foi feita.');
  }
  if (atual === CENTRAL.cabecalhoPedido) {
    validarColunaPedidoCentral_(aba);
    return;
  }
  // Não sobrescrever dados já existentes, mesmo se o cabeçalho estiver vazio.
  if (!faltaColuna && aba.getRange(2, CENTRAL.colunaPedido, Math.max(aba.getMaxRows() - 1, 1), 1)
    .getValues().some((linha) => linha[0] !== '' && linha[0] !== false)) {
    throw new Error('A coluna AC contém dados; nenhuma alteração foi feita.');
  }
  if (faltaColuna) aba.insertColumnsAfter(aba.getMaxColumns(), CENTRAL.colunaPedido - aba.getMaxColumns());
  aba.getRange(1, CENTRAL.colunaPedido).setValue(CENTRAL.cabecalhoPedido);
  const regra = SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build();
  aba.getRange(2, CENTRAL.colunaPedido, aba.getMaxRows() - 1, 1).setDataValidation(regra);
  aba.getRange(1, CENTRAL.colunaPedido).setNote(
    'Depois de revisar os campos públicos e selecionar Aprovado para Decap, marque esta caixa. '
    + 'A administração enviará o rascunho oculto. Não use simultaneamente o envio pelo menu.'
  );
}

function validarColunaPedidoCentral_(aba) {
  if (aba.getRange(1, CENTRAL.colunaPedido).getValue() !== CENTRAL.cabecalhoPedido) {
    throw new Error('A coluna de pedidos centrais não está preparada.');
  }
  validarCheckboxModeracao_(aba, CENTRAL.colunaPedido, CENTRAL.cabecalhoPedido);
}

function pedidosCentrais_(aba) {
  const quantidade = aba.getLastRow() - 1;
  if (quantidade < 1) return [];
  return aba.getRange(2, CENTRAL.colunaPedido, quantidade, 1).getValues()
    .map((linha, indice) => linha[0] === true ? indice + 2 : 0).filter(Boolean);
}

function lerPedidoCentral_(aba, linha) {
  const valores = aba.getRange(linha, 1, 1, COL.confirmacoesOriginais).getValues()[0];
  if (aba.getRange(linha, CENTRAL.colunaPedido).getValue() !== true) {
    throw new Error('O pedido de envio foi cancelado.');
  }
  const fluxo = String(valores[COL.fluxo - 1] || '');
  if (!['Aguardando moderação', 'Envio solicitado', 'Erro no envio'].includes(fluxo)) {
    throw new Error('O fluxo desta linha não admite um novo envio central.');
  }
  const payload = montarPayloadPublico_(valores);
  if (!/^FO-[A-Za-z0-9_-]+$/.test(payload.id_interno)) {
    throw new Error('O ID interno não corresponde a uma manifestação do Fala Ouvidor.');
  }
  return { payload, assinatura: assinaturaPedidoCentral_(valores) };
}

function assinaturaPedidoCentral_(valores) {
  // Detecta alterações nos campos públicos e nos dados usados para privacidade.
  // Fluxo/link/observações são atualizados pela automação e não fazem parte da assinatura.
  return JSON.stringify(valores.map((valor, indice) =>
    [COL.fluxo, COL.link, COL.observacoes].includes(indice + 1) ? null : valor));
}

function erroCentralSeguro_(erro) {
  return String(erro.message || erro)
    .replace(/(?:github_pat_|ghp_)[A-Za-z0-9_]+/g, '[credencial protegida]')
    .slice(0, 1200);
}

function anotarCentral_(aba, linha, mensagem) {
  const celula = aba.getRange(linha, COL.observacoes);
  const atual = String(celula.getValue() || '').trim();
  celula.setValue([atual, '[Envio central] ' + mensagem].filter(Boolean).join('\n'));
}

// Leitura e validação SOMENTE. Não chama GitHub, não grava células, não exige token.
function simularPedidosCentrais() {
  const config = configuracaoCentral_(false);
  const aba = filaCentral_(config);
  validarColunaPedidoCentral_(aba);
  const resultado = pedidosCentrais_(aba).map((linha) => {
    try {
      const pedido = lerPedidoCentral_(aba, linha);
      return { linha, valido: true, id: pedido.payload.id_interno };
    } catch (erro) {
      return { linha, valido: false, erro: erroCentralSeguro_(erro) };
    }
  });
  console.log(JSON.stringify(resultado));
  return resultado;
}

// Chamado apenas pelo temporizador do projeto privado. SIMULACAO não faz nada.
function processarPedidosCentrais() {
  const config = configuracaoCentral_(true);
  if (config.modo !== 'PRODUCAO') return { processados: 0, pausado: true };
  const bloqueio = LockService.getScriptLock();
  if (!bloqueio.tryLock(1000)) return { processados: 0, ocupado: true };
  try {
    const aba = filaCentral_(config);
    validarColunaPedidoCentral_(aba);
    const linhas = pedidosCentrais_(aba).slice(0, CENTRAL.maximoPorExecucao);
    linhas.forEach((linha) => processarLinhaCentral_(aba, linha));
    return { processados: linhas.length };
  } finally {
    bloqueio.releaseLock();
  }
}

function processarLinhaCentral_(aba, linha) {
  const idAntes = String(aba.getRange(linha, COL.id).getValue() || '');
  const fluxoAntes = String(aba.getRange(linha, COL.fluxo).getValue() || '');
  try {
    const pedido = lerPedidoCentral_(aba, linha);
    aba.getRange(linha, COL.fluxo).setValue('Envio solicitado');
    SpreadsheetApp.flush();
    const atual = lerPedidoCentral_(aba, linha);
    if (atual.assinatura !== pedido.assinatura) throw new Error('A linha mudou durante a solicitação; revise antes de tentar novamente.');
    const resultado = incorporarRascunhoNoGitHub_(pedido.payload);
    const depois = aba.getRange(linha, 1, 1, COL.confirmacoesOriginais).getValues()[0];
    if (assinaturaPedidoCentral_(depois) !== pedido.assinatura) {
      throw new Error('O rascunho foi enviado, mas a linha mudou durante o processamento. Confira no Decap antes de publicar.');
    }
    const status = resultado.publicado ? 'Publicado' : 'Disponível no Decap';
    aba.getRange(linha, COL.fluxo).setValue(status);
    definirLink_(aba.getRange(linha, COL.link), FALA_OUVIDOR.adminDecap, 'Abrir no Decap');
    anotarCentral_(aba, linha, resultado.jaExistia
      ? 'ID já existente no Decap; não foi duplicado nem republicado.'
      : 'Rascunho oculto incorporado. Conferência final pela administração. ' + resultado.prUrl);
  } catch (erro) {
    if (String(aba.getRange(linha, COL.id).getValue() || '') !== idAntes) {
      throw new Error('A fila foi reorganizada durante o envio. Confira o rascunho no Decap; nenhuma outra linha foi alterada pelo retorno.');
    }
    // Nunca rebaixar uma linha já publicada/disponível por um pedido indevido.
    const fluxoAtual = String(aba.getRange(linha, COL.fluxo).getValue() || '');
    if (['Aguardando moderação', 'Envio solicitado', 'Erro no envio'].includes(fluxoAntes)
        && ['Aguardando moderação', 'Envio solicitado', 'Erro no envio'].includes(fluxoAtual)) {
      aba.getRange(linha, COL.fluxo).setValue('Erro no envio');
    }
    anotarCentral_(aba, linha, erroCentralSeguro_(erro));
  } finally {
    // Erros não são reenviados automaticamente: exigem revisão e novo pedido explícito.
    if (String(aba.getRange(linha, COL.id).getValue() || '') === idAntes) {
      aba.getRange(linha, CENTRAL.colunaPedido).setValue(false);
    }
  }
}

function instalarTemporizadorCentral() {
  const config = configuracaoCentral_(true);
  if (config.modo !== 'PRODUCAO') throw new Error('Temporizador bloqueado fora de produção confirmada.');
  validarColunaPedidoCentral_(filaCentral_(config));
  if (!ScriptApp.getProjectTriggers().some((gatilho) => gatilho.getHandlerFunction() === 'processarPedidosCentrais')) {
    ScriptApp.newTrigger('processarPedidosCentrais').timeBased().everyMinutes(1).create();
  }
  // Não apaga nem reinstala gatilhos de formulários, Gmail ou planilhas.
}

function pausarEnvioCentral() {
  configuracaoCentral_(true);
  PropertiesService.getScriptProperties().setProperty('CENTRAL_MODO', 'SIMULACAO');
}
