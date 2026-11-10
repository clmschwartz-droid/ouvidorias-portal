/** Módulo independente. Acrescentar ao projeto administrativo privado existente.
 * Não substitui arquivos, gatilhos, menus ou funções do Fala Ouvidor.
 * A aprovação é feita na planilha; este gatilho executa como a conta titular.
 */
const DIRETORIO_PORTAL = Object.freeze({
  planilha: '1_AVcWgVnQla7JhRf8nb2KnEV5EsSSt4-y8pVRCcTTRo',
  respostas: 'Form Responses 1', respostasGid: 1817621009, fila: 'Diretório — aprovação',
  repositorio: 'clmschwartz-droid/ouvidorias-portal',
  arquivo: 'conteudo/ouvidorias-cadastradas.json',
  orientacao: 'Dados fornecidos pela ouvidoria. Revise campos ambíguos; não copie contatos pessoais do ouvidor. Fonte externa é opcional.',
  campos: ['id', 'nome', 'orgao', 'municipio', 'uf', 'esfera', 'poder', 'site', 'email', 'telefone'],
  cabecalhos: ['ID', 'Aprovar publicação', 'Nome da ouvidoria', 'Órgão / instituição', 'Município', 'UF', 'Esfera', 'Poder / natureza', 'Site da ouvidoria', 'E-mail institucional público', 'Telefone institucional público', 'Divulgar contatos', 'Fonte dos contatos (opcional)', 'Fluxo site', 'Observações internas', 'Linha de origem', 'Assinatura publicada', 'Atualizado em'],
  ufs: 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '),
  esferas: ['Federal', 'Estadual', 'Municipal', 'Privada', 'Outra'],
  poderes: ['Executivo', 'Legislativo', 'Judiciário', 'Ministério Público', 'Defensoria Pública', 'Ensino superior', 'Outra'],
});

function ativarDiretorioCadastradas() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== 'ouvidoriaspublicasbrasileiras@gmail.com') {
    throw new Error('Execute esta instalação na conta administrativa titular.');
  }
  if (!PropertiesService.getScriptProperties().getProperty('CENTRAL_GITHUB_TOKEN')) {
    throw new Error('Use o projeto administrativo privado que já contém a configuração do Fala Ouvidor.');
  }
  sincronizarDiretorioCadastradas();
  if (!ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'sincronizarDiretorioCadastradas')) {
    ScriptApp.newTrigger('sincronizarDiretorioCadastradas').timeBased().everyMinutes(5).create();
  }
  console.log('Diretório ativado: importação e publicação a cada cinco minutos.');
}

function diretorioTexto_(value) { return String(value == null ? '' : value).trim(); }
function diretorioNormal_(value) { return diretorioTexto_(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' '); }
function diretorioHttps_(value) {
  const s = diretorioTexto_(value);
  return /^https?:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::(?:80|443))?(?:[/?#][^\s<>"\\]*)?$/i.test(s) ? s : '';
}
function diretorioEmail_(value) {
  const s = diretorioTexto_(value).toLowerCase();
  // A generic ouvidoria mailbox can be institutional even on a free provider.
  // Personal mailbox fields from the form are never read or exported.
  return /^ouvidoria[a-z0-9._+-]*@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s) ? s : '';
}
function diretorioTelefones_(value) {
  const ddds = /^(?:1[1-9]|2[12478]|3[1-578]|4[1-9]|5[1345]|6[1-9]|7[134579]|8[1-9]|9[1-9])$/;
  const contatos = new Set();
  const numeros = new Set();
  const linhas = new Set();
  const partes = diretorioTexto_(value).split(/[/;|\r\n]+|,(?=(?:[ +().\t-]*\d){7})/).map((p) => p.trim()).filter(Boolean);
  const invalidos = [];
  for (const [index, s] of partes.entries()) {
    const match = s.match(/^(\+?[\d(). \t-]+)(\s*\(?WhatsApp\)?)?(?:[ ,\t]*(?:ramal|ramais|r\.|ext\.)\s*[:.]?\s*(\d{1,6}(?:\s*(?:,|\be\b)\s*\d{1,6})*))?$/i);
    invalidos.push(index + 1);
    if (!match) continue;
    let digits = match[1].replace(/\D/g, '');
    if (match[1].startsWith('+') && !/^\+\s*55/.test(match[1])) continue;
    if (/^55\d{10,11}$/.test(digits)) digits = digits.slice(2);
    else if (match[1].startsWith('+')) continue;
    let formatado;
    if (/^0?800\d{7}$/.test(digits)) {
      digits = digits.padStart(11, '0');
      formatado = digits.slice(0,4) + ' ' + digits.slice(4,7) + ' ' + digits.slice(7);
    } else if (ddds.test(digits.slice(0,2)) && /^(?:\d{2}[2-5]\d{7}|\d{2}9\d{8})$/.test(digits)) {
      formatado = '(' + digits.slice(0,2) + ') ' + digits.slice(2,-4) + '-' + digits.slice(-4);
    } else continue;
    invalidos.pop();
    numeros.add(digits);
    const label = formatado + (match[2] ? ' (WhatsApp)' : '');
    const ramais = match[3] ? match[3].match(/\d+/g) : [];
    if (ramais.length) ramais.forEach((ramal) => {
      contatos.add(label + ' ramal ' + ramal);
      linhas.add(digits + ';' + ramal);
    });
    else { contatos.add(label); linhas.add(digits); }
  }
  return { texto: [...contatos].join('; '), numeros, linhas, invalidos };
}
function diretorioIdentidade_(row) {
  const nome = diretorioNormal_(row[2]).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const generico = /^(?:fala\s*br|ouvidoria(?: geral| municipal| central| institucional)?|camara(?: municipal| de vereadores)?|prefeitura(?: municipal)?)$/.test(nome);
  const site = diretorioHttps_(row[8]).replace(/^https?:\/\/(?:www\.)?/i, '').replace(/\/$/, '');
  return {
    id: diretorioTexto_(row[0]), nome, generico,
    contexto: row.slice(3,8).map(diretorioNormal_),
    email: diretorioEmail_(row[9]),
    site: /^(?:falabr\.cgu\.gov\.br|gov\.br)(?:[/:?#]|$)/i.test(site) ? '' : site,
    telefones: diretorioTelefones_(row[10]),
  };
}
function diretorioComparar_(a, b) {
  const mesmoNome = !!a.nome && a.nome === b.nome && !a.generico && !b.generico;
  const conflito = a.contexto.some((s,i) => s && b.contexto[i] && s !== b.contexto[i]);
  const orgaoIgual = !!a.contexto[0] && a.contexto[0] === b.contexto[0];
  const email = !!a.email && a.email === b.email;
  const site = !!a.site && a.site === b.site;
  const telefone = [...a.telefones.numeros].some((numero) => b.telefones.numeros.has(numero));
  const linhaIgual = [...a.telefones.linhas].some((linha) => !linha.startsWith('0800') && b.telefones.linhas.has(linha));
  const forte = !conflito && ((mesmoNome && (email || site || (orgaoIgual && linhaIgual))) ||
    (orgaoIgual && email && site && (a.generico || b.generico)));
  return forte ? 'forte' : (email || site || telefone || (mesmoNome && !conflito)) ? 'aviso' : '';
}
function diretorioAssinatura_(item) {
  const publicos = {};
  DIRETORIO_PORTAL.campos.forEach((campo) => { publicos[campo] = diretorioTexto_(item[campo]); });
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(publicos), Utilities.Charset.UTF_8)
    .map((b) => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}
function diretorioPublico_(row, anterior, avisos = [], telefoneOrigem) {
  const item = { id: diretorioTexto_(row[0]), nome: diretorioTexto_(row[2]), orgao: diretorioTexto_(row[3]), municipio: diretorioTexto_(row[4]), uf: diretorioTexto_(row[5]).toUpperCase(), esfera: diretorioTexto_(row[6]), poder: diretorioTexto_(row[7]), site: diretorioHttps_(row[8]), email: '', telefone: '' };
  if (!/^OUV-\d{6,}$/.test(item.id)) throw new Error('Restaure o ID original do cadastro.');
  // A complete administrative classification is useful, but never a prerequisite.
  // A contact may remain private when Divulgar contatos is unchecked.
  const telefoneBruto = diretorioTexto_(row[10]);
  const telefones = diretorioTelefones_(telefoneBruto);
  // Do not rewrite a reviewed contact or reveal an untouched original previously omitted.
  const preservarTelefone = anterior && (telefoneBruto === anterior.telefone || (!anterior.telefone && telefoneBruto === telefoneOrigem));
  const telefone = preservarTelefone ? anterior.telefone : telefones.texto;
  const email = diretorioEmail_(row[9]);
  const contato = item.site || email || telefone;
  const pendentes = [['nome da ouvidoria',!!item.nome],['ao menos um contato institucional válido (site, e-mail ou telefone)',!!contato],['UF',!item.uf || DIRETORIO_PORTAL.ufs.includes(item.uf)],['esfera',!item.esfera || DIRETORIO_PORTAL.esferas.includes(item.esfera)],['poder / natureza',!item.poder || DIRETORIO_PORTAL.poderes.includes(item.poder)]].filter((campo) => !campo[1]).map((campo) => campo[0]);
  if (pendentes.length) throw new Error('Preencha ou confira: ' + pendentes.join(', ') + '.');
  if (diretorioTexto_(row[8]) && !item.site) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(diretorioTexto_(row[8]))) throw new Error('O Site da ouvidoria deve ser um endereço http ou https válido ou ficar em branco.');
    avisos.push('Site omitido: foi informado um e-mail. A coluna I pode ser apagada.');
  }
  if (row[11] === true) {
    item.email = email;
    item.telefone = telefone;
    if (diretorioTexto_(row[9]) && !item.email) throw new Error('Use apenas endereço institucional genérico da ouvidoria; contato pessoal não pode ser publicado.');
    if (!preservarTelefone && telefone && telefones.invalidos.length) {
      throw new Error('Confira a coluna K: telefone(s) na posição ' + telefones.invalidos.join(', ') + ' sem formato válido. Corrija ou retire da fila apenas os números que não devem ser divulgados.');
    }
    if (!preservarTelefone && telefoneBruto && !telefone) avisos.push('Telefone omitido: confira o número e o DDD. Foi usado outro contato válido.');
  }
  return item;
}

function diretorioFila_(ss) {
  let sheet = ss.getSheetByName(DIRETORIO_PORTAL.fila);
  if (!sheet) {
    sheet = ss.insertSheet(DIRETORIO_PORTAL.fila);
    sheet.getRange(1, 1, 1, 18).setValues([DIRETORIO_PORTAL.cabecalhos]);
    sheet.setFrozenRows(1); sheet.setFrozenColumns(2);
    sheet.getRange(1, 1, 1, 18).setFontWeight('bold').setBackground('#1c2b2e').setFontColor('#ffffff').setWrap(true);
    sheet.setColumnWidths(1, 18, 150); sheet.setColumnWidths(3, 2, 300); sheet.setColumnWidth(15, 300);
    sheet.hideColumns(16, 2);
  }
  const headers = sheet.getRange(1, 1, 1, 18).getDisplayValues()[0];
  const migrated = [...headers];
  if (migrated[8] === 'Site oficial') migrated[8] = 'Site da ouvidoria';
  if (migrated[11] === 'Contato conferido' && migrated[12] === 'Fonte dos contatos') {
    migrated[11] = 'Divulgar contatos'; migrated[12] = 'Fonte dos contatos (opcional)';
  }
  if (JSON.stringify(migrated) !== JSON.stringify(DIRETORIO_PORTAL.cabecalhos)) throw new Error('Cabeçalhos da fila foram alterados. Nenhum dado foi publicado.');
  if (JSON.stringify(headers) !== JSON.stringify(migrated)) sheet.getRange(1,1,1,18).setValues([migrated]);
  return sheet;
}
function diretorioTemRegistro_(row) {
  // Unchecked checkboxes and automatic status cells are not registrations.
  return row[1] === true || row[11] === true || row.some((value, col) =>
    ![1, 11, 13, 16, 17].includes(col) && diretorioTexto_(value) !== '');
}
function diretorioLinhas_(sheet) {
  const last = sheet.getLastRow();
  const rows = last > 1 ? sheet.getRange(2, 1, last - 1, 18).getValues() : [];
  // Keep internal gaps to preserve physical row numbers; ignore the unused tail.
  while (rows.length && !diretorioTemRegistro_(rows[rows.length - 1])) rows.pop();
  return rows;
}
function diretorioDadosOrigem_(r) {
  // Only institutional answers are read. Never infer a state from a phone DDD,
  // or silently replace information already reviewed by an operator.
  const nome = diretorioTexto_(r[1]); const local = diretorioNormal_(r[2]);
  const endereco = diretorioTexto_(r[3]);
  const email = diretorioEmail_(r[4]);
  const ufEmail = email.match(/\.([a-z]{2})\.gov\.br$/i);
  // Ignore compass labels such as "nº 28 - SE"; the suffix of the address is
  // the municipality/UF pair, not an earlier street or building identifier.
  const paresUf = [...endereco.matchAll(/[-/–—]\s*([A-Z]{2})\s*(?:[.,]|$|[-–—]\s*CEP\b)/gi)];
  const finalUf = paresUf.length ? paresUf[paresUf.length - 1] : null;
  const ufs = [ufEmail && ufEmail[1].toUpperCase(), finalUf && finalUf[1].toUpperCase()].filter((uf) => DIRETORIO_PORTAL.ufs.includes(uf));
  const uf = new Set(ufs).size === 1 ? ufs[0] : '';
  const cidadeNome = nome.match(/(?:município|municipio|municipal)\s+de\s+([^/(),]+?)(?:\s*[-–—]\s*[A-Z]{2})?\s*$/i);
  let municipio = cidadeNome ? cidadeNome[1].trim() : '';
  if (!municipio && finalUf) {
    const cidade = endereco.slice(0, finalUf.index).split(/[,\n–—]|\s+-\s+/).pop().trim();
    if (/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s'’-]+$/.test(cidade) && !/\b(?:rua|avenida|bairro|centro|rodovia|estrada|cep)\b/i.test(cidade)) municipio = cidade;
  }
  const classificacao = diretorioNormal_([nome,r[2],r[6],r[7]].join(' '));
  let esfera = /\b(?:municipal|municipio)\b/.test(classificacao) ? 'Municipal' : /\bfederal\b/.test(classificacao) ? 'Federal' : /\b(?:estadual|estado de|estado do)\b/.test(classificacao) ? 'Estadual' : /\bprivad[ao]\b/.test(classificacao) ? 'Privada' : '';
  const poder = DIRETORIO_PORTAL.poderes.find((p) => local === diretorioNormal_(p) || local === 'poder ' + diretorioNormal_(p)) || '';
  let orgao = '';
  if (cidadeNome && esfera === 'Municipal' && municipio && ['Executivo','Legislativo'].includes(poder)) {
    orgao = (poder === 'Executivo' ? 'Prefeitura Municipal de ' : 'Câmara Municipal de ') + municipio;
  } else {
    const instituicao = nome.replace(/^ouvidoria(?:[-\s]+(?:geral|seccional))?\s+(?:(?:do|da|de)\s+)?/i, '').trim();
    if (instituicao !== nome && instituicao && !/^(?:geral|municipal|central)$/i.test(instituicao)) orgao = instituicao;
  }
  return [orgao,municipio,uf,esfera,poder];
}
function diretorioNotaOrigem_(linha) {
  return 'Cadastro completo (todos os campos do formulário): https://docs.google.com/spreadsheets/d/' + DIRETORIO_PORTAL.planilha + '/edit#gid=' + DIRETORIO_PORTAL.respostasGid + '&range=A' + linha + ':V' + linha + '\nDados identificados nas respostas são pré-preenchidos. Campos ambíguos permanecem vazios. Site e contatos institucionais informados pela ouvidoria podem ser divulgados sem conferência externa. Site é opcional; marque Divulgar contatos para e-mail/telefone e Aprovar publicação.';
}
function diretorioRespostas_(origem) {
  const n = Math.max(1, origem.getLastRow());
  const raw = origem.getRange(1,1,n,8).getDisplayValues();
  // Locate the new field by its header: Google Forms may move its response
  // column. Read that column alone, never personal contact answer columns.
  const headers = origem.getRange(1,1,1,origem.getLastColumn()).getDisplayValues()[0];
  const sites = headers.map((header,index) => header === 'Site da ouvidoria' ? index : -1).filter((index) => index >= 0);
  if (sites.length > 1) throw new Error('Há mais de uma coluna Site da ouvidoria; confira o formulário.');
  if (sites.length === 1) {
    const values = origem.getRange(1,sites[0]+1,n,1).getDisplayValues();
    raw.forEach((row,index) => row.push(values[index][0]));
  }
  return raw;
}
function diretorioPreparar_(sheet, raw) {
  const expected = ['Timestamp', 'Nome da Ouvidoria', 'Localização Institucional', 'Endereço completo da Ouvidoria', 'E-mail da Ouvidoria', 'Telefone da Ouvidoria', 'Ato de Criação — natureza do ato', 'Ato de Criação — número/identificação'];
  const validHeader = JSON.stringify(raw[0]) === JSON.stringify(expected) || JSON.stringify(raw[0]) === JSON.stringify([...expected,'Site da ouvidoria']);
  if (!validHeader) throw new Error('Cabeçalhos do formulário divergentes; confira antes de importar.');
  const existing = diretorioLinhas_(sheet);
  const ids = new Set(existing.map((r) => diretorioTexto_(r[0])));
  const novas = [];
  raw.slice(1).forEach((r, i) => {
    const nome = diretorioTexto_(r[1]);
    const id = 'OUV-' + String(i + 2).padStart(6, '0');
    if (!nome || /^(teste|test)\b/i.test(diretorioNormal_(nome))) return;
    const dados = diretorioDadosOrigem_(r);
    if (ids.has(id)) {
      const index = existing.findIndex((row) => diretorioTexto_(row[0]) === id);
      if (index < 0 || existing.filter((row) => diretorioTexto_(row[0]) === id).length !== 1) return;
      if (existing[index][14] === 'Confira os dados institucionais e os contatos em fonte oficial. Não copie contatos pessoais do ouvidor.') {
        const atual = sheet.getRange(index + 2,1,1,18).getValues()[0];
        if (diretorioTexto_(atual[0]) === id && atual[14] === existing[index][14]) sheet.getRange(index + 2,15).setValue(DIRETORIO_PORTAL.orientacao);
      }
      // Previously published rows are reviewed records, including intentionally
      // empty cells. Preserve them, and fill only still-empty fields in drafts.
      if (!diretorioTexto_(existing[index][16])) {
        const fresh = sheet.getRange(index + 2,1,1,18).getValues()[0];
        if (diretorioTexto_(fresh[0]) !== id) return;
        dados.forEach((value,col) => {
          if (value && !diretorioTexto_(fresh[col + 3])) sheet.getRange(index + 2,col + 4).setValue(/^[=+@-]/.test(value) ? "'" + value : value);
        });
      }
      return;
    }
    const site = diretorioHttps_(r[8]);
    const orientacao = DIRETORIO_PORTAL.orientacao + (diretorioTexto_(r[8]) && !site ? ' Site original não importado: informe uma URL ou deixe a coluna I em branco.' : '');
    novas.push([id, false, nome, ...dados, site, diretorioEmail_(r[4]), diretorioTexto_(r[5]), false, '', 'Em análise', orientacao, i + 2, '', '']);
    ids.add(id);
  });
  if (novas.length) {
    const start = existing.length + 2;
    if (start + novas.length - 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), start + novas.length - 1 - sheet.getMaxRows());
    // Plain text prevents a malicious form answer from becoming a Sheets formula.
    const safeRows = novas.map((r) => r.map((v) => typeof v === 'string' && /^[=+@-]/.test(v) ? "'" + v : v));
    sheet.getRange(start, 1, novas.length, 18).setValues(safeRows);
  }
  const n = existing.length + novas.length;
  if (n > 0) {
    [2, 12].forEach((col) => sheet.getRange(2, col, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build()));
    [[6,DIRETORIO_PORTAL.ufs],[7,DIRETORIO_PORTAL.esferas],[8,DIRETORIO_PORTAL.poderes]].forEach(([col,values]) => sheet.getRange(2,col,n,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values,true).setAllowInvalid(false).build()));
    const rows = sheet.getRange(2,1,n,18).getValues();
    const notes = sheet.getRange(2,3,n,1).getNotes(); let changed = false;
    rows.forEach((row,index) => {
      const id = diretorioTexto_(row[0]); const linha = Number(row[15]);
      if (!notes[index][0] && /^OUV-\d{6,}$/.test(id) && linha >= 2 && id === 'OUV-' + String(linha).padStart(6,'0')) { notes[index][0] = diretorioNotaOrigem_(linha); changed = true; }
    });
    if (changed) sheet.getRange(2,3,n,1).setNotes(notes);
  }
}

function diretorioGithub_(method, path, body, extraCodes) {
  const token = PropertiesService.getScriptProperties().getProperty('CENTRAL_GITHUB_TOKEN');
  if (!token) throw new Error('Configuração administrativa ausente.');
  const args = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } };
  if (body) { args.contentType = 'application/json'; args.payload = JSON.stringify(body); }
  const response = UrlFetchApp.fetch('https://api.github.com/repos/' + DIRETORIO_PORTAL.repositorio + path, args);
  const code = response.getResponseCode();
  if ((code < 200 || code >= 300) && !(extraCodes || []).includes(code)) throw new Error('Falha na publicação do diretório (GitHub HTTP ' + code + '). Tente novamente; não altere o Fala Ouvidor.');
  return response.getContentText() ? JSON.parse(response.getContentText()) : {};
}
function diretorioLerSite_() {
  const file = diretorioGithub_('get', '/contents/' + DIRETORIO_PORTAL.arquivo + '?ref=main');
  const data = JSON.parse(Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\s/g, ''))).getDataAsString('UTF-8'));
  if (!data || !Array.isArray(data.items)) throw new Error('Formato inesperado no diretório publicado.');
  return { sha: file.sha, items: data.items };
}
function diretorioPublicar_(items, oldFile) {
  const main = diretorioGithub_('get', '/git/ref/heads/main').object.sha;
  const branch = 'diretorio/automatico-' + Utilities.getUuid();
  diretorioGithub_('post', '/git/refs', { ref: 'refs/heads/' + branch, sha: main });
  const commit = diretorioGithub_('put', '/contents/' + DIRETORIO_PORTAL.arquivo, { branch: branch, sha: oldFile.sha, message: 'Atualiza ouvidorias aprovadas na planilha', content: Utilities.base64Encode(JSON.stringify({items: items}, null, 2) + '\n', Utilities.Charset.UTF_8) });
  const pr = diretorioGithub_('post', '/pulls', { title: 'Atualiza diretório de ouvidorias cadastradas', head: branch, base: 'main', body: 'Exportação dos campos institucionais aprovados na planilha. Sem dados pessoais e sem alterações no Fala Ouvidor.' });
  // Do not overwrite a concurrent edit to the directory.
  if (diretorioLerSite_().sha !== oldFile.sha) {
    diretorioGithub_('patch', '/pulls/' + pr.number, { state: 'closed' });
    throw new Error('O diretório foi atualizado durante a publicação. A fila será reavaliada no próximo ciclo.');
  }
  let merged = {};
  for (let attempt = 0; attempt < 6; attempt++) {
    merged = diretorioGithub_('put', '/pulls/' + pr.number + '/merge', { merge_method: 'squash', sha: commit.commit.sha }, [405,409]);
    if (merged.merged === true) break;
    if (diretorioLerSite_().sha !== oldFile.sha) break;
    Utilities.sleep(1000);
  }
  if (merged.merged !== true) {
    diretorioGithub_('patch', '/pulls/' + pr.number, { state: 'closed' });
    throw new Error('A atualização não foi incorporada; o próximo ciclo reavaliará a fila.');
  }
  const confirmed = diretorioLerSite_();
  if (JSON.stringify(confirmed.items) !== JSON.stringify(items)) throw new Error('Não foi possível confirmar o arquivo publicado. O próximo ciclo verificará novamente.');
  try { diretorioGithub_('delete', '/git/refs/heads/' + branch); } catch (_) { /* A limpeza do ramo não altera o resultado publicado. */ }
  return confirmed.items;
}

function sincronizarDiretorioCadastradas() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  let sheet;
  try {
    const ss = SpreadsheetApp.openById(DIRETORIO_PORTAL.planilha);
    sheet = diretorioFila_(ss);
    const origem = ss.getSheetByName(DIRETORIO_PORTAL.respostas);
    if (!origem) throw new Error('Aba de respostas não encontrada.');
    const respostas = diretorioRespostas_(origem);
    diretorioPreparar_(sheet, respostas);
    const file = diretorioLerSite_();
    const previous = new Map(file.items.map((item) => [item.id, item]));
    const rows = diretorioLinhas_(sheet);
    const today = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
    const results = new Map(); const approved = [];
    const idCounts = new Map();
    rows.filter(diretorioTemRegistro_).forEach((row) => { const id = diretorioTexto_(row[0]); idCounts.set(id, (idCounts.get(id) || 0) + 1); });
    const candidatos = rows.filter((row) => row[1] === true && idCounts.get(diretorioTexto_(row[0])) === 1).map(diretorioIdentidade_);
    const identidades = new Map(candidatos.map((item) => [item.id, item]));
    rows.forEach((row) => {
      if (!diretorioTemRegistro_(row)) return;
      const id = diretorioTexto_(row[0]);
      if (idCounts.get(id) !== 1) { if (previous.has(id) && !approved.some((x) => x.id === id)) approved.push(previous.get(id)); results.set(id, { status: 'Erro: ID repetido; restaure o identificador original.' }); return; }
      if (row[1] !== true) { results.set(id, { status: previous.has(id) ? 'Retirado do diretório' : 'Em análise' }); return; }
      try {
        const old = previous.get(id);
        const avisos = [];
        const resposta = /^OUV-\d+$/.test(id) ? respostas[Number(id.slice(4)) - 1] : null;
        const item = diretorioPublico_(row, old, avisos, resposta ? diretorioTexto_(resposta[5]) : undefined);
        const relacionados = candidatos.filter((x) => x.id !== id)
          .map((x) => [x.id, diretorioComparar_(identidades.get(id), x)]).filter((x) => x[1]);
        const fortes = relacionados.filter((x) => x[1] === 'forte').map((x) => x[0]);
        if (!old && fortes.length) throw new Error('Possível duplicidade com ' + fortes.slice(0,3).join(', ') + '. Confira o cadastro correspondente.');
        if (relacionados.length) avisos.push('Confira possível coincidência com ' + relacionados.slice(0,3).map((x) => x[0]).join(', ') + '.');
        const signature = diretorioAssinatura_(item);
        item.atualizado_em = old && diretorioAssinatura_(old) === signature ? old.atualizado_em : today;
        approved.push(item); results.set(id, { status: 'Publicado', signature: signature, date: item.atualizado_em, avisos });
      } catch (error) {
        // A validation error must not erase a previously published institution.
        if (previous.has(id)) approved.push(previous.get(id));
        results.set(id, { status: 'Erro: ' + error.message });
      }
    });
    approved.sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR') || a.id.localeCompare(b.id));
    if (JSON.stringify(approved) !== JSON.stringify(file.items)) diretorioPublicar_(approved, file);
    // Re-read after publishing: an editor may have sorted or changed rows meanwhile.
    const fresh = diretorioLinhas_(sheet);
    const initial = new Map(rows.filter(diretorioTemRegistro_).map((row) => [diretorioTexto_(row[0]), JSON.stringify(row.slice(0,13))]));
    let statusChanged = false; let signatureChanged = false;
    const statusValues = fresh.map((row) => [row[13]]);
    const signatureValues = fresh.map((row) => [row[16],row[17]]);
    const statusRange = fresh.length ? sheet.getRange(2,14,fresh.length,1) : null;
    const statusNotes = statusRange ? statusRange.getNotes() : [];
    let notesChanged = false;
    fresh.forEach((row,index) => {
      if (!diretorioTemRegistro_(row)) return;
      const id = diretorioTexto_(row[0]); const result = results.get(id);
      if (!result || initial.get(id) !== JSON.stringify(row.slice(0,13))) return;
      if (row[13] !== result.status) { statusValues[index] = [result.status]; statusChanged = true; }
      const antes = statusNotes[index][0];
      const linhas = antes.split('\n').filter((linha) => !linha.startsWith('Diretório — aviso: '));
      (result.avisos || []).forEach((aviso) => linhas.push('Diretório — aviso: ' + aviso));
      const nota = linhas.filter(Boolean).join('\n');
      if (nota !== antes) { statusNotes[index] = [nota]; notesChanged = true; }
      if (result.signature && (row[16] !== result.signature || row[17] !== result.date)) {
        signatureValues[index] = [result.signature,result.date]; signatureChanged = true;
      }
    });
    if (statusChanged) sheet.getRange(2,14,fresh.length,1).setValues(statusValues);
    if (notesChanged) statusRange.setNotes(statusNotes);
    if (signatureChanged) sheet.getRange(2,17,fresh.length,2).setValues(signatureValues);
  } catch (error) {
    // No credentials, personal form answers or private comments in execution logs.
    console.error('Diretório não sincronizado: ' + String(error.message).replace(/(?:github_pat_|ghp_)[A-Za-z0-9_]+/g, '[credencial protegida]'));
    throw error;
  } finally { lock.releaseLock(); }
}
