/* Gera cópias explícitas dos validadores existentes; nunca modifica Code.gs. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const original = fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8');
const nomes = [
  'normalizarCategoria_', 'opcaoReconhecida_', 'identificacaoPublicaPadrao_',
  'gerarIniciais_', 'montarPayloadPublico_', 'validarPayloadDecap_',
  'incorporarRascunhoNoGitHub_', 'requisicaoGitHub_', 'dataIso_',
  'validarEstruturaPlanilha_', 'validarCabecalhos_', 'validarValidacoesModeracao_',
  'validarListaModeracao_', 'validarCheckboxModeracao_', 'normalizar_', 'definirLink_',
];
const funcoes = [...original.matchAll(/^function ([A-Za-z0-9_]+)\(/gm)];
const partes = nomes.map((nome) => {
  const indice = funcoes.findIndex((item) => item[1] === nome);
  if (indice < 0) throw new Error('Função-base ausente: ' + nome);
  return original.slice(funcoes[indice].index, funcoes[indice + 1]?.index || original.length).trim();
});
let base = original.slice(0, funcoes[0].index).trim() + '\n\n' + partes.join('\n\n');
function trocarUmaVez(de, para) {
  if (base.split(de).length !== 2) throw new Error('A base mudou: revisar adaptação de ' + de);
  base = base.replace(de, para);
}
trocarUmaVez("planilhaId: '10LjwNEblKPbqYZokshSbRxAZKt7BmjidEL4Vb9a66ac'",
  "planilhaId: String(PropertiesService.getScriptProperties().getProperty('CENTRAL_PLANILHA_ID') || '').trim()");
if ((base.match(/PropertiesService\.getUserProperties\(\)/g) || []).length !== 2) throw new Error('Revisar leitura da credencial-base.');
base = base.replaceAll('PropertiesService.getUserProperties()', 'PropertiesService.getScriptProperties()')
  .replaceAll('FALA_OUVIDOR_GITHUB_TOKEN', 'CENTRAL_GITHUB_TOKEN');
trocarUmaVez('manifesto.items.some((item) => item.id_interno === payload.id_interno)',
  'manifesto.items.find((item) => item.id_interno === payload.id_interno)');
trocarUmaVez("if (existente) return { jaExistia: true, prUrl: '' };",
  "if (existente) return { jaExistia: true, publicado: existente.publicado === true, prUrl: '' };");
// Nome determinístico: falha parcial não cria outro ramo/PR em cada tentativa.
trocarUmaVez('`automacao/fala-ouvidor/${slug}-${Date.now()}`', '`central/fala-ouvidor/${slug}`');
const digest = crypto.createHash('sha256').update(original).digest('hex');
const pacote = '// GERADO. Projeto administrativo SEPARADO e PRIVADO.\n'
  + '// Code.gs original SHA-256: ' + digest + '\n'
  + '// Não inclui instaladores antigos, GmailApp nem gatilhos de formulários.\n\n'
  + base + '\n\n' + fs.readFileSync(path.join(__dirname, 'Processador.gs'), 'utf8');
new vm.Script(pacote, { filename: 'Central.gs' });
fs.writeFileSync(path.join(__dirname, 'Central.gs'), pacote);
console.log('Pacote administrativo gerado; Code.gs original preservado.');
