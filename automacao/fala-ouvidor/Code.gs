const FALA_OUVIDOR = Object.freeze({
  planilhaId: '10LjwNEblKPbqYZokshSbRxAZKt7BmjidEL4Vb9a66ac',
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

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Fala Ouvidor')
    .addItem('Instalar ou atualizar automação', 'instalarAutomacao')
    .addItem('Configurar credencial GitHub', 'abrirConfiguracaoGitHub')
    .addItem('Verificar configuração', 'verificarConfiguracao')
    .addSeparator()
    .addItem('Enviar linha selecionada ao Decap', 'enviarRascunhoSelecionadoAoDecap')
    .addItem('Criar rascunho de resposta privada', 'criarRascunhoRespostaPrivada')
    .addToUi();
}

function instalarAutomacao() {
  const planilha = SpreadsheetApp.openById(FALA_OUVIDOR.planilhaId);
  ScriptApp.getProjectTriggers()
    .filter((gatilho) => gatilho.getHandlerFunction() === 'aoReceberManifestacao')
    .forEach((gatilho) => ScriptApp.deleteTrigger(gatilho));

  ScriptApp.newTrigger('aoReceberManifestacao')
    .forSpreadsheet(planilha)
    .onFormSubmit()
    .create();

  planilha.toast(
    `As novas manifestações entrarão automaticamente na fila e gerarão aviso para ${FALA_OUVIDOR.emailAvisos}.`,
    'Automação instalada',
    8,
  );
}

function abrirConfiguracaoGitHub() {
  const html = HtmlService.createHtmlOutput(`
    <div style="font:14px Arial,sans-serif;padding:16px;line-height:1.45">
      <p><strong>Credencial GitHub restrita</strong></p>
      <p>Cole um token fine-grained com acesso somente ao repositório <code>${FALA_OUVIDOR.repositorio}</code> e permissões <em>Contents: read and write</em> e <em>Pull requests: read and write</em>.</p>
      <input id="token" type="password" autocomplete="off" style="box-sizing:border-box;width:100%;padding:9px" />
      <button style="margin-top:12px;padding:8px 14px" onclick="salvar()">Salvar com segurança</button>
      <p id="status" style="color:#475569"></p>
      <script>
        function salvar() {
          const token = document.getElementById('token').value.trim();
          document.getElementById('status').textContent = 'Salvando…';
          google.script.run
            .withSuccessHandler(() => {
              document.getElementById('token').value = '';
              document.getElementById('status').textContent = 'Credencial salva para este usuário.';
            })
            .withFailureHandler((erro) => {
              document.getElementById('status').textContent = erro.message || String(erro);
            })
            .salvarTokenGitHub(token);
        }
      </script>
    </div>
  `).setWidth(500).setHeight(290);
  SpreadsheetApp.getUi().showModalDialog(html, 'Integração com o Decap');
}

function salvarTokenGitHub(token) {
  const valor = String(token || '').trim();
  if (!/^(github_pat_|ghp_)[A-Za-z0-9_]+$/.test(valor)) {
    throw new Error('A credencial não parece ser um token GitHub válido.');
  }
  PropertiesService.getUserProperties().setProperty('FALA_OUVIDOR_GITHUB_TOKEN', valor);
}

function verificarConfiguracao() {
  const gatilho = ScriptApp.getProjectTriggers()
    .some((item) => item.getHandlerFunction() === 'aoReceberManifestacao');
  const token = Boolean(PropertiesService.getUserProperties().getProperty('FALA_OUVIDOR_GITHUB_TOKEN'));
  const alias = GmailApp.getAliases()
    .map((item) => item.toLowerCase())
    .includes(FALA_OUVIDOR.emailRespostas.toLowerCase());

  SpreadsheetApp.getUi().alert(
    'Configuração do Fala Ouvidor',
    [
      `Aviso automático: ${gatilho ? 'pronto' : 'não instalado'}`,
      `Envio de rascunhos ao GitHub: ${token ? 'pronto' : 'falta configurar a credencial'}`,
      `Resposta privada por ${FALA_OUVIDOR.emailRespostas}: ${alias ? 'pronta' : 'falta adicionar como endereço de envio no Gmail'}`,
    ].join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

function aoReceberManifestacao(evento) {
  if (!evento || !evento.range || evento.range.getSheet().getName() !== FALA_OUVIDOR.respostas) return;

  const bloqueio = LockService.getDocumentLock();
  bloqueio.waitLock(30000);
  try {
    const linhaOrigem = evento.range.getRow();
    const valores = (evento.values || evento.range.getSheet().getRange(linhaOrigem, 1, 1, 10).getValues()[0]).slice(0, 10);
    const linhaModeracao = criarLinhaModeracao_(valores, linhaOrigem);
    notificarNovaManifestacao_(linhaModeracao);
  } finally {
    bloqueio.releaseLock();
  }
}

function criarLinhaModeracao_(originais, linhaOrigem) {
  const planilha = SpreadsheetApp.openById(FALA_OUVIDOR.planilhaId);
  const moderacao = planilha.getSheetByName(FALA_OUVIDOR.moderacao);
  if (!moderacao) throw new Error('A aba Moderação não foi localizada.');

  const ultimaLinha = Math.max(moderacao.getLastRow(), 1);
  if (ultimaLinha > 1) {
    const fontes = moderacao.getRange(2, COL.linhaOrigem, ultimaLinha - 1, 1).getDisplayValues().flat();
    const existente = fontes.findIndex((valor) => Number(valor) === Number(linhaOrigem));
    if (existente >= 0) return existente + 2;
  }

  const agora = new Date();
  const id = `FO-${Utilities.formatDate(agora, planilha.getSpreadsheetTimeZone(), 'yyyyMMdd')}-${String(linhaOrigem).padStart(3, '0')}`;
  const confirmacoes = String(originais[9] || '');
  const consentimentos = consentimentosValidos_(confirmacoes);
  const linha = Math.max(moderacao.getLastRow() + 1, 2);
  const registro = [
    id,
    'Em análise',
    consentimentos,
    String(originais[6] || '').trim(),
    agora,
    normalizarCategoria_(originais[5]),
    String(originais[3] || '').trim(),
    String(originais[4] || '').trim(),
    String(originais[7] || '').trim(),
    'Identidade preservada',
    'Em acompanhamento',
    '',
    '',
    false,
    'Aguardando moderação',
    '',
    'Entrada automática a partir do Google Forms.',
    linhaOrigem,
    originais[0] || agora,
    originais[1] || '',
    originais[2] || '',
    originais[3] || '',
    originais[4] || '',
    originais[5] || '',
    originais[6] || '',
    originais[7] || '',
    originais[8] || '',
    originais[9] || '',
  ];

  moderacao.getRange(linha, 1, 1, registro.length).setValues([registro]);
  moderacao.getRange(linha, COL.dataPublicacao).setNumberFormat('dd/mm/yyyy');
  moderacao.getRange(linha, COL.dataResposta).setNumberFormat('dd/mm/yyyy');
  moderacao.getRange(linha, COL.timestamp).setNumberFormat('dd/mm/yyyy hh:mm:ss');
  return linha;
}

function consentimentosValidos_(valor) {
  const texto = normalizar_(valor);
  return texto.includes('envio nao garante publicacao')
    && texto.includes('autorizo o tratamento dos dados');
}

function normalizarCategoria_(valor) {
  const categoria = String(valor || '').trim();
  const mapa = {
    'Sugestão, correção ou atualização do portal': 'Sugestão ou atualização',
    'Envio de documento ou referência': 'Outro',
    'Outro assunto relacionado às ouvidorias': 'Outro',
  };
  return mapa[categoria] || categoria || 'Outro';
}

function notificarNovaManifestacao_(linha) {
  const planilha = SpreadsheetApp.openById(FALA_OUVIDOR.planilhaId);
  const aba = planilha.getSheetByName(FALA_OUVIDOR.moderacao);
  const valores = aba.getRange(linha, 1, 1, COL.confirmacoesOriginais).getDisplayValues()[0];
  const link = `${planilha.getUrl()}#gid=${aba.getSheetId()}&range=A${linha}`;
  const id = valores[COL.id - 1];
  const titulo = valores[COL.titulo - 1] || 'Sem título';
  const instituicao = valores[COL.instituicao - 1] || 'Não informada';
  const categoria = valores[COL.categoria - 1] || 'Outro';

  MailApp.sendEmail({
    to: FALA_OUVIDOR.emailAvisos,
    subject: `[Fala Ouvidor] Nova manifestação — ${id}`,
    name: 'Portal das Ouvidorias Públicas do Brasil',
    body: [
      `Nova manifestação recebida: ${id}`,
      `Título: ${titulo}`,
      `Categoria: ${categoria}`,
      `Instituição: ${instituicao}`,
      '',
      `Abrir a fila de moderação: ${link}`,
      '',
      `Se houver resposta privada, use exclusivamente ${FALA_OUVIDOR.emailRespostas}.`,
    ].join('\n'),
    htmlBody: `
      <p><strong>Nova manifestação recebida: ${escaparHtml_(id)}</strong></p>
      <p>Título: ${escaparHtml_(titulo)}<br>
      Categoria: ${escaparHtml_(categoria)}<br>
      Instituição: ${escaparHtml_(instituicao)}</p>
      <p><a href="${link}">Abrir a fila de moderação</a></p>
      <p style="color:#64748b">O relato completo e os dados pessoais não foram incluídos neste e-mail. Se houver resposta privada, use exclusivamente ${FALA_OUVIDOR.emailRespostas}.</p>
    `,
  });
}

function enviarRascunhoSelecionadoAoDecap() {
  const ui = SpreadsheetApp.getUi();
  const aba = SpreadsheetApp.getActiveSheet();
  const linha = aba.getActiveRange().getRow();
  if (aba.getName() !== FALA_OUVIDOR.moderacao || linha < 2) {
    ui.alert('Selecione uma célula da manifestação desejada na aba Moderação.');
    return;
  }

  try {
    const valores = aba.getRange(linha, 1, 1, COL.confirmacoesOriginais).getValues()[0];
    const payload = montarPayloadPublico_(valores);
    aba.getRange(linha, COL.fluxo).setValue('Envio solicitado');
    SpreadsheetApp.flush();

    const resultado = incorporarRascunhoNoGitHub_(payload);
    aba.getRange(linha, COL.fluxo).setValue('Disponível no Decap');
    definirLink_(aba.getRange(linha, COL.link), FALA_OUVIDOR.adminDecap, 'Abrir no Decap');
    if (resultado.prUrl) {
      const celula = aba.getRange(linha, COL.observacoes);
      const anterior = String(celula.getValue() || '').trim();
      celula.setValue([anterior, `Rascunho incorporado pelo PR ${resultado.prUrl}.`].filter(Boolean).join('\n'));
    }

    ui.alert(
      resultado.jaExistia ? 'Rascunho já existente' : 'Rascunho pronto',
      'A versão moderada está oculta no portal e disponível no Decap. Abra o link da coluna P para a conferência final e a publicação.',
      ui.ButtonSet.OK,
    );
  } catch (erro) {
    aba.getRange(linha, COL.fluxo).setValue('Erro no envio');
    ui.alert('Não foi possível enviar', erro.message || String(erro), ui.ButtonSet.OK);
  }
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
  if (preferencia.includes('identidade preservada')
      && nomePrivado
      && normalizar_(identificacao) === normalizar_(nomePrivado)) {
    throw new Error('O formulário solicita identidade preservada; não publique o nome completo.');
  }

  return {
    id_interno: String(valores[COL.id - 1] || '').trim(),
    title: camposPublicos[0],
    date: dataIso_(valores[COL.dataPublicacao - 1]),
    categoria: normalizarCategoria_(valores[COL.categoria - 1]),
    instituicao: camposPublicos[1],
    local: camposPublicos[2],
    texto: camposPublicos[3],
    autor_exibicao: identificacao || 'Identidade preservada',
    status: String(valores[COL.situacao - 1] || 'Em acompanhamento').trim(),
    resposta: camposPublicos[5],
    resposta_data: dataIso_(valores[COL.dataResposta - 1], true),
    destaque: valores[COL.destaque - 1] === true,
  };
}

function incorporarRascunhoNoGitHub_(payload) {
  const token = PropertiesService.getUserProperties().getProperty('FALA_OUVIDOR_GITHUB_TOKEN');
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

  const existente = manifesto.items.some((item) => item.id_interno === payload.id_interno);
  if (existente) return { jaExistia: true, prUrl: '' };

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
  const ramo = `automacao/fala-ouvidor/${slug}-${Date.now()}`;

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
  const token = PropertiesService.getUserProperties().getProperty('FALA_OUVIDOR_GITHUB_TOKEN');
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

function criarRascunhoRespostaPrivada() {
  const ui = SpreadsheetApp.getUi();
  const aba = SpreadsheetApp.getActiveSheet();
  const linha = aba.getActiveRange().getRow();
  if (aba.getName() !== FALA_OUVIDOR.moderacao || linha < 2) {
    ui.alert('Selecione uma célula da manifestação desejada na aba Moderação.');
    return;
  }

  const valores = aba.getRange(linha, 1, 1, COL.confirmacoesOriginais).getDisplayValues()[0];
  const destinatario = String(valores[COL.emailPrivado - 1] || '').trim();
  if (!destinatario) {
    ui.alert('Esta manifestação não possui e-mail para resposta privada.');
    return;
  }

  const aliases = GmailApp.getAliases().map((item) => item.toLowerCase());
  if (!aliases.includes(FALA_OUVIDOR.emailRespostas.toLowerCase())) {
    ui.alert(
      'Endereço oficial ainda não configurado',
      `Adicione ${FALA_OUVIDOR.emailRespostas} em Gmail → Configurações → Contas e importação → Enviar e-mail como. O sistema não criará uma resposta a partir do Gmail administrativo para evitar expor esse endereço.`,
      ui.ButtonSet.OK,
    );
    return;
  }

  const nome = String(valores[COL.nomePrivado - 1] || '').trim();
  const id = valores[COL.id - 1];
  const titulo = valores[COL.titulo - 1];
  GmailApp.createDraft(
    destinatario,
    `Fala Ouvidor — ${id}: ${titulo}`,
    [
      nome ? `Olá, ${nome},` : 'Olá,',
      '',
      'Recebemos sua manifestação enviada ao Portal das Ouvidorias Públicas do Brasil.',
      '',
      '[Escreva aqui a resposta privada.]',
      '',
      'Atenciosamente,',
      'Portal das Ouvidorias Públicas do Brasil',
    ].join('\n'),
    {
      from: FALA_OUVIDOR.emailRespostas,
      replyTo: FALA_OUVIDOR.emailRespostas,
      name: 'Portal das Ouvidorias Públicas do Brasil',
    },
  );

  const celula = aba.getRange(linha, COL.observacoes);
  const anterior = String(celula.getValue() || '').trim();
  const registro = `Rascunho de resposta privada criado em ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}.`;
  celula.setValue([anterior, registro].filter(Boolean).join('\n'));
  ui.alert('Rascunho criado no Gmail. Revise-o antes de enviar.');
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

function escaparHtml_(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
