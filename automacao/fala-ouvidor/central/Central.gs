// GERADO. Projeto administrativo SEPARADO e PRIVADO.
// Code.gs original SHA-256: 5862f5130bdce71c54e9370b36e81dc1152b519cc7b3ceef3cceff444d1d0686
// Não inclui instaladores antigos, GmailApp nem gatilhos de formulários.

const FALA_OUVIDOR = Object.freeze({
  planilhaId: String(PropertiesService.getScriptProperties().getProperty('CENTRAL_PLANILHA_ID') || '').trim(),
  respostas: 'Respostas ao formulário 1',
  moderacao: 'Moderação',
  emailAvisos: 'ouvidoriaspublicasbrasileiras@gmail.com',
  emailRespostas: 'ouvidorias@camargoegomes.com',
  repositorio: 'clmschwartz-droid/ouvidorias-portal',
  adminDecap: 'https://ouvidoriasbrasileiras.com.br/admin/#/collections/manifestacoes/entries/itens',
});

const COL = Object.freeze({
  id: 1,
  decisao: 2,
  consentimentos: 3,
  titulo: 4,
  dataPublicacao: 5,
  categoria: 6,
  instituicao: 7,
  local: 8,
  texto: 9,
  identificacaoPublica: 10,
  situacao: 11,
  resposta: 12,
  dataResposta: 13,
  destaque: 14,
  fluxo: 15,
  link: 16,
  observacoes: 17,
  linhaOrigem: 18,
  timestamp: 19,
  nomePrivado: 20,
  emailPrivado: 21,
  instituicaoOriginal: 22,
  ufOriginal: 23,
  tipoOriginal: 24,
  tituloOriginal: 25,
  relatoOriginal: 26,
  identificacaoOriginal: 27,
  confirmacoesOriginais: 28,
});

const CABECALHOS_RESPOSTAS = Object.freeze([
  'Carimbo de data/hora',
  'Nome completo',
  'E-mail',
  'Ouvidoria, órgão ou instituição',
  'UF',
  'Tipo de manifestação',
  'Título da manifestação',
  'Manifestação',
  'Identificação em eventual publicação',
  'Confirmações',
]);

const CABECALHOS_MODERACAO = Object.freeze([
  'ID interno',
  'Decisão editorial',
  'Consentimentos válidos',
  'Título público',
  'Data de publicação',
  'Categoria pública',
  'Instituição pública',
  'Local ou UF',
  'Texto público moderado',
  'Identificação pública',
  'Situação',
  'Resposta ou atualização',
  'Data da resposta',
  'Destaque',
  'Fluxo Decap',
  'Link',
  'Observações internas',
  'Linha da resposta privada',
  'Carimbo de data/hora',
  'Nome completo (privado)',
  'E-mail (privado)',
  'Instituição original',
  'UF original',
  'Tipo original',
  'Título original',
  'Manifestação original',
  'Preferência de identificação',
  'Confirmações',
]);

const TIPOS_FORMULARIO = Object.freeze([
  'Interrupção de mandato',
  'Afastamento ou demissão',
  'Prejuízo ao funcionamento da ouvidoria',
  'Relato institucional',
  'Sugestão, correção ou atualização do portal',
  'Envio de documento ou referência',
  'Outro assunto relacionado às ouvidorias',
]);

const CATEGORIAS_PUBLICAS = Object.freeze([
  'Interrupção de mandato',
  'Afastamento ou demissão',
  'Prejuízo ao funcionamento de ouvidoria',
  'Relato institucional',
  'Sugestão ou atualização',
  'Outro',
]);

const IDENTIFICACOES_FORMULARIO = Object.freeze([
  'Nome completo',
  'Somente iniciais',
  'Identidade preservada',
]);

const SITUACOES_PUBLICAS = Object.freeze([
  'Relato publicado',
  'Em acompanhamento',
  'Resposta recebida',
  'Encerrado',
]);

const DECISOES_EDITORIAIS = Object.freeze([
  'Em análise',
  'Aprovado para Decap',
  'Não publicar',
]);

const FLUXOS_DECAP = Object.freeze([
  'Aguardando moderação',
  'Envio solicitado',
  'Disponível no Decap',
  'Publicado',
  'Ocultado no portal',
  'Erro no envio',
  'Não publicar',
]);

function normalizarCategoria_(valor) {
  const categoria = String(valor || '').trim();
  const mapa = {
    'Interrupção de mandato': 'Interrupção de mandato',
    'Afastamento ou demissão': 'Afastamento ou demissão',
    'Prejuízo ao funcionamento da ouvidoria': 'Prejuízo ao funcionamento de ouvidoria',
    'Prejuízo ao funcionamento de ouvidoria': 'Prejuízo ao funcionamento de ouvidoria',
    'Relato institucional': 'Relato institucional',
    'Sugestão, correção ou atualização do portal': 'Sugestão ou atualização',
    'Sugestão ou atualização': 'Sugestão ou atualização',
    'Envio de documento ou referência': 'Outro',
    'Outro assunto relacionado às ouvidorias': 'Outro',
    Outro: 'Outro',
  };
  const normalizada = mapa[categoria] || 'Outro';
  return CATEGORIAS_PUBLICAS.includes(normalizada) ? normalizada : 'Outro';
}

function opcaoReconhecida_(valor, opcoes) {
  const normalizado = normalizar_(valor);
  return opcoes.some((opcao) => normalizar_(opcao) === normalizado);
}

function identificacaoPublicaPadrao_(nome, preferencia) {
  const opcao = normalizar_(preferencia);
  if (opcao.includes('somente iniciais')) {
    return gerarIniciais_(nome) || 'Identidade preservada';
  }
  if (opcao.includes('nome completo')) {
    return String(nome || '').trim() || 'Identidade preservada';
  }
  return 'Identidade preservada';
}

function gerarIniciais_(nome) {
  const particulas = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
  return String(nome || '')
    .trim()
    .split(/\s+/)
    .filter((parte) => parte && !particulas.has(normalizar_(parte)))
    .map((parte) => `${parte.charAt(0).toUpperCase()}.`)
    .join(' ');
}

function montarPayloadPublico_(valores) {
  if (valores[COL.decisao - 1] !== 'Aprovado para Decap') {
    throw new Error('Altere “Decisão editorial” para “Aprovado para Decap” antes do envio.');
  }
  if (valores[COL.consentimentos - 1] !== true) {
    throw new Error('Os consentimentos obrigatórios não foram reconhecidos.');
  }

  const emailPrivado = String(valores[COL.emailPrivado - 1] || '').trim().toLowerCase();
  const nomePrivado = String(valores[COL.nomePrivado - 1] || '').trim();
  const preferencia = normalizar_(valores[COL.identificacaoOriginal - 1]);
  const identificacao = String(valores[COL.identificacaoPublica - 1] || 'Identidade preservada').trim();
  const camposPublicos = [
    valores[COL.titulo - 1],
    valores[COL.instituicao - 1],
    valores[COL.local - 1],
    valores[COL.texto - 1],
    identificacao,
    valores[COL.resposta - 1],
  ].map((item) => String(item || '').trim());

  if (!camposPublicos[0] || !camposPublicos[3]) {
    throw new Error('Título público e texto público moderado são obrigatórios.');
  }
  if (camposPublicos.some((item) => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(item))) {
    throw new Error('Há um endereço de e-mail em um campo público. Remova-o antes do envio.');
  }
  if (emailPrivado && camposPublicos.some((item) => item.toLowerCase().includes(emailPrivado))) {
    throw new Error('O e-mail privado do manifestante aparece na versão pública.');
  }
  const identificacaoEsperada = identificacaoPublicaPadrao_(nomePrivado, valores[COL.identificacaoOriginal - 1]);
  if (preferencia.includes('identidade preservada')
      && normalizar_(identificacao) !== normalizar_('Identidade preservada')) {
    throw new Error('O formulário solicita identidade preservada; mantenha “Identidade preservada” na identificação pública.');
  }
  if (preferencia.includes('somente iniciais')
      && ![normalizar_(identificacaoEsperada), normalizar_('Identidade preservada')]
        .includes(normalizar_(identificacao))) {
    throw new Error(`O formulário autoriza no máximo as iniciais; use “${identificacaoEsperada}” ou “Identidade preservada” na identificação pública.`);
  }
  if (preferencia.includes('nome completo')) {
    const permitidas = [
      nomePrivado,
      gerarIniciais_(nomePrivado),
      'Identidade preservada',
    ].filter(Boolean).map(normalizar_);
    if (!permitidas.includes(normalizar_(identificacao))) {
      throw new Error('A identificação pública deve ser o nome autorizado, suas iniciais ou “Identidade preservada”.');
    }
  }
  if (!opcaoReconhecida_(valores[COL.identificacaoOriginal - 1], IDENTIFICACOES_FORMULARIO)
      && normalizar_(identificacao) !== normalizar_('Identidade preservada')) {
    throw new Error('A preferência de identificação original não foi reconhecida; use “Identidade preservada”.');
  }
  const nomeNormalizado = normalizar_(nomePrivado).replace(/\s+/g, ' ');
  if (!preferencia.includes('nome completo')
      && nomeNormalizado
      && camposPublicos.some((item) => normalizar_(item).replace(/\s+/g, ' ').includes(nomeNormalizado))) {
    throw new Error('O nome completo do manifestante aparece em um campo público. Remova-o antes do envio.');
  }

  const situacao = String(valores[COL.situacao - 1] || 'Em acompanhamento').trim();
  if (!SITUACOES_PUBLICAS.includes(situacao)) {
    throw new Error('A situação pública não corresponde a uma opção válida do Decap.');
  }

  const payload = {
    id_interno: String(valores[COL.id - 1] || '').trim(),
    title: camposPublicos[0],
    date: dataIso_(valores[COL.dataPublicacao - 1]),
    categoria: normalizarCategoria_(valores[COL.categoria - 1]),
    instituicao: camposPublicos[1],
    local: camposPublicos[2],
    texto: camposPublicos[3],
    autor_exibicao: identificacao || 'Identidade preservada',
    status: situacao,
    resposta: camposPublicos[5],
    resposta_data: dataIso_(valores[COL.dataResposta - 1], true),
    destaque: valores[COL.destaque - 1] === true,
  };
  validarPayloadDecap_(payload);
  return payload;
}

function validarPayloadDecap_(payload) {
  const chaves = [
    'id_interno', 'title', 'date', 'categoria', 'instituicao', 'local', 'texto',
    'autor_exibicao', 'status', 'resposta', 'resposta_data', 'destaque',
  ];
  const inesperadas = Object.keys(payload).filter((chave) => !chaves.includes(chave));
  if (inesperadas.length) {
    throw new Error(`O envio ao Decap contém campos inesperados: ${inesperadas.join(', ')}.`);
  }
  if (!payload.id_interno || !payload.title || !payload.texto) {
    throw new Error('ID interno, título público e texto público são obrigatórios para o Decap.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    throw new Error('A data de publicação não está no formato aceito pelo Decap.');
  }
  if (payload.resposta_data && !/^\d{4}-\d{2}-\d{2}$/.test(payload.resposta_data)) {
    throw new Error('A data da resposta não está no formato aceito pelo Decap.');
  }
  if (!CATEGORIAS_PUBLICAS.includes(payload.categoria)) {
    throw new Error('A categoria pública não corresponde a uma opção válida do Decap.');
  }
  if (!SITUACOES_PUBLICAS.includes(payload.status)) {
    throw new Error('A situação pública não corresponde a uma opção válida do Decap.');
  }
  if (typeof payload.destaque !== 'boolean') {
    throw new Error('O campo de destaque deve ser verdadeiro ou falso.');
  }
}

function incorporarRascunhoNoGitHub_(payload) {
  const token = PropertiesService.getScriptProperties().getProperty('CENTRAL_GITHUB_TOKEN');
  if (!token) throw new Error('Configure primeiro a credencial GitHub pelo menu Fala Ouvidor.');

  const referencia = requisicaoGitHub_('/git/ref/heads/main', { codigos: [200] }).dados;
  const baseSha = referencia.object.sha;
  const arquivo = requisicaoGitHub_(
    `/contents/conteudo/manifestacoes.json?ref=${encodeURIComponent(baseSha)}`,
    { codigos: [200] },
  ).dados;
  const bytes = Utilities.base64Decode(String(arquivo.content || '').replace(/\s/g, ''));
  const manifesto = JSON.parse(Utilities.newBlob(bytes).getDataAsString());
  if (!manifesto || !Array.isArray(manifesto.items)) {
    throw new Error('O arquivo público de manifestações possui formato inesperado.');
  }

  const existente = manifesto.items.find((item) => item.id_interno === payload.id_interno);
  if (existente) return { jaExistia: true, publicado: existente.publicado === true, prUrl: '' };

  const item = {
    id_interno: payload.id_interno,
    title: payload.title,
    date: payload.date,
    categoria: payload.categoria,
    instituicao: payload.instituicao,
    local: payload.local,
    texto: payload.texto,
    autor_exibicao: payload.autor_exibicao,
    status: payload.status,
    resposta: payload.resposta,
    resposta_data: payload.resposta_data,
    destaque: payload.destaque,
    publicado: false,
  };
  const atualizado = { ...manifesto, items: [item, ...manifesto.items] };
  const conteudo = `${JSON.stringify(atualizado, null, 2)}\n`;
  const slug = payload.id_interno.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const ramo = `central/fala-ouvidor/${slug}`;

  requisicaoGitHub_('/git/refs', {
    method: 'post',
    codigos: [201],
    payload: { ref: `refs/heads/${ramo}`, sha: baseSha },
  });

  requisicaoGitHub_('/contents/conteudo/manifestacoes.json', {
    method: 'put',
    codigos: [200, 201],
    payload: {
      message: `[skip netlify] Importa rascunho Fala Ouvidor ${payload.id_interno}`,
      content: Utilities.base64Encode(Utilities.newBlob(conteudo, 'application/json').getBytes()),
      branch: ramo,
      sha: arquivo.sha,
    },
  });

  const pull = requisicaoGitHub_('/pulls', {
    method: 'post',
    codigos: [201],
    payload: {
      title: `[skip netlify] Importa rascunho Fala Ouvidor ${payload.id_interno}`,
      head: ramo,
      base: 'main',
      body: 'Rascunho público já moderado, importado como oculto. Nenhum dado privado do formulário integra este pull request.',
    },
  }).dados;

  for (let tentativa = 0; tentativa < 12; tentativa += 1) {
    const fusao = requisicaoGitHub_(`/pulls/${pull.number}/merge`, {
      method: 'put',
      codigos: [200, 405, 409],
      payload: {
        merge_method: 'merge',
        commit_title: `[skip netlify] Importa rascunho Fala Ouvidor ${payload.id_interno} (#${pull.number})`,
        commit_message: 'Versão pública moderada; entrada mantida oculta até a conferência final no Decap.',
      },
    });
    if (fusao.codigo === 200 && fusao.dados.merged === true) {
      try {
        requisicaoGitHub_(`/git/refs/heads/${ramo}`, { method: 'delete', codigos: [204] });
      } catch (erro) {
        // A limpeza do ramo temporário é desejável, mas não impede a moderação.
      }
      return { jaExistia: false, prUrl: pull.html_url };
    }
    Utilities.sleep(2500);
  }

  throw new Error(`O rascunho foi preparado, mas o PR ${pull.html_url} precisa ser incorporado manualmente.`);
}

function requisicaoGitHub_(caminho, opcoes) {
  const token = PropertiesService.getScriptProperties().getProperty('CENTRAL_GITHUB_TOKEN');
  if (!token) throw new Error('Configure primeiro a credencial GitHub pelo menu Fala Ouvidor.');

  const ajustes = opcoes || {};
  const parametros = {
    method: ajustes.method || 'get',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    muteHttpExceptions: true,
  };
  if (Object.prototype.hasOwnProperty.call(ajustes, 'payload')) {
    parametros.contentType = 'application/json';
    parametros.payload = JSON.stringify(ajustes.payload);
  }

  const resposta = UrlFetchApp.fetch(
    `https://api.github.com/repos/${FALA_OUVIDOR.repositorio}${caminho}`,
    parametros,
  );
  const codigo = resposta.getResponseCode();
  const texto = resposta.getContentText();
  let dados = {};
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch (erro) {
      dados = { message: texto };
    }
  }

  const codigos = ajustes.codigos || [200];
  if (!codigos.includes(codigo)) {
    throw new Error(`O GitHub recusou a operação (${codigo}): ${dados.message || 'resposta inesperada'}.`);
  }
  return { codigo, dados };
}

function dataIso_(valor, opcional) {
  if (!valor && opcional) return '';
  const planilha = SpreadsheetApp.openById(FALA_OUVIDOR.planilhaId);
  if (Object.prototype.toString.call(valor) === '[object Date]' && !Number.isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, planilha.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  const texto = String(valor || '').trim();
  if (!texto && opcional) return '';
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  throw new Error('Informe uma data válida no formato DD/MM/AAAA.');
}

function validarEstruturaPlanilha_(planilha) {
  const respostas = planilha.getSheetByName(FALA_OUVIDOR.respostas);
  const moderacao = planilha.getSheetByName(FALA_OUVIDOR.moderacao);
  if (!respostas || !moderacao) {
    throw new Error('As abas de respostas ou moderação não foram localizadas.');
  }
  validarCabecalhos_(respostas, CABECALHOS_RESPOSTAS);
  validarCabecalhos_(moderacao, CABECALHOS_MODERACAO);
  validarValidacoesModeracao_(moderacao);
  return { respostas, moderacao };
}

function validarCabecalhos_(aba, esperados) {
  const atuais = aba.getRange(1, 1, 1, esperados.length).getDisplayValues()[0]
    .map((valor) => String(valor || '').trim());
  const divergencias = esperados
    .map((esperado, indice) => atuais[indice] === esperado ? '' : `${indice + 1}: “${atuais[indice] || '(vazio)'}”`)
    .filter(Boolean);
  if (divergencias.length) {
    throw new Error(
      `A estrutura da aba “${aba.getName()}” foi alterada. Coluna(s) divergente(s): ${divergencias.join('; ')}. `
      + 'Restaure os cabeçalhos antes de executar a automação.',
    );
  }
}

function validarValidacoesModeracao_(aba) {
  validarListaModeracao_(aba, COL.decisao, 'Decisão editorial', DECISOES_EDITORIAIS);
  validarCheckboxModeracao_(aba, COL.consentimentos, 'Consentimentos válidos');
  validarListaModeracao_(aba, COL.categoria, 'Categoria pública', CATEGORIAS_PUBLICAS);
  validarListaModeracao_(aba, COL.situacao, 'Situação', SITUACOES_PUBLICAS);
  validarCheckboxModeracao_(aba, COL.destaque, 'Destaque');
  validarListaModeracao_(aba, COL.fluxo, 'Fluxo Decap', FLUXOS_DECAP);
}

function validarListaModeracao_(aba, coluna, rotulo, esperadas) {
  const regra = aba.getRange(2, coluna).getDataValidation();
  if (!regra || regra.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    throw new Error(`A validação da coluna “${rotulo}” foi removida ou alterada. Restaure-a antes de executar a automação.`);
  }
  const argumentos = regra.getCriteriaValues();
  const atuais = Array.isArray(argumentos[0]) ? argumentos[0].map(String) : [];
  if (JSON.stringify(atuais) !== JSON.stringify(Array.from(esperadas))) {
    throw new Error(
      `As opções da coluna “${rotulo}” foram alteradas. Restaure exatamente: ${Array.from(esperadas).join('; ')}.`,
    );
  }
}

function validarCheckboxModeracao_(aba, coluna, rotulo) {
  const regra = aba.getRange(2, coluna).getDataValidation();
  if (!regra || regra.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.CHECKBOX) {
    throw new Error(`A validação da coluna “${rotulo}” deve ser uma caixa de seleção.`);
  }
}

function normalizar_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function definirLink_(celula, url, rotulo) {
  celula.setRichTextValue(
    SpreadsheetApp.newRichTextValue()
      .setText(rotulo)
      .setLinkUrl(url)
      .build(),
  );
}

/* Projeto Apps Script SEPARADO e PRIVADO da administração. Nunca colar na planilha. */
const CENTRAL = Object.freeze({
  administrador: 'ouvidoriaspublicasbrasileiras@gmail.com',
  planilhaReal: '10LjwNEblKPbqYZokshSbRxAZKt7BmjidEL4Vb9a66ac',
  colunaPedido: 29,
  cabecalhoPedido: 'Solicitar envio central ao Decap',
  maximoPorExecucao: 3,
  confirmacao: 'ATIVAR_ENVIO_CENTRAL_OCULTO',
});

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
  return pedidosCentrais_(aba).map((linha) => {
    try {
      const pedido = lerPedidoCentral_(aba, linha);
      return { linha, valido: true, id: pedido.payload.id_interno };
    } catch (erro) {
      return { linha, valido: false, erro: erroCentralSeguro_(erro) };
    }
  });
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
