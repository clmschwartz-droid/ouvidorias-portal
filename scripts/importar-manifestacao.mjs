import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CATEGORIAS = new Set([
  'Interrupção de mandato',
  'Afastamento ou demissão',
  'Prejuízo ao funcionamento de ouvidoria',
  'Relato institucional',
  'Sugestão ou atualização',
  'Outro',
]);

const SITUACOES = new Set([
  'Relato publicado',
  'Em acompanhamento',
  'Resposta recebida',
  'Encerrado',
]);

const CHAVES_PRIVADAS = new Set([
  'nome',
  'nome_completo',
  'email',
  'e_mail',
  'confirmacoes',
  'identificacao_original',
  'relato_original',
]);

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function texto(valor, campo, { obrigatorio = false, maximo = 1000 } = {}) {
  const resultado = String(valor ?? '')
    .replaceAll('\u0000', '')
    .replace(/\r\n?/g, '\n')
    .trim();

  if (obrigatorio && !resultado) {
    throw new Error(`Campo obrigatório ausente: ${campo}`);
  }
  if (resultado.length > maximo) {
    throw new Error(`Campo excede o limite de ${maximo} caracteres: ${campo}`);
  }
  return resultado;
}

function dataIso(valor, campo, { obrigatorio = false } = {}) {
  const resultado = texto(valor, campo, { obrigatorio, maximo: 10 });
  if (!resultado) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resultado)) {
    throw new Error(`Data inválida em ${campo}; use AAAA-MM-DD.`);
  }
  const data = new Date(`${resultado}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== resultado) {
    throw new Error(`Data inexistente em ${campo}.`);
  }
  return resultado;
}

function booleano(valor) {
  return valor === true || String(valor).toLowerCase() === 'true';
}

function semEmail(campo, valor) {
  if (EMAIL.test(valor)) {
    throw new Error(`O campo público ${campo} contém um endereço de e-mail.`);
  }
}

export function montarItemPublico(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload inválido.');
  }

  for (const chave of Object.keys(payload)) {
    if (CHAVES_PRIVADAS.has(chave)) {
      throw new Error(`Dado privado não pode sair do Google: ${chave}`);
    }
  }

  const idInterno = texto(payload.id_interno, 'id_interno', { obrigatorio: true, maximo: 80 });
  if (!/^[A-Za-z0-9._-]+$/.test(idInterno)) {
    throw new Error('ID interno contém caracteres não permitidos.');
  }

  const categoria = texto(payload.categoria, 'categoria', { obrigatorio: true, maximo: 80 });
  if (!CATEGORIAS.has(categoria)) {
    throw new Error(`Categoria pública não reconhecida: ${categoria}`);
  }

  const situacao = texto(payload.status, 'status', { maximo: 80 }) || 'Em acompanhamento';
  if (!SITUACOES.has(situacao)) {
    throw new Error(`Situação pública não reconhecida: ${situacao}`);
  }

  const item = {
    id_interno: idInterno,
    title: texto(payload.title, 'title', { obrigatorio: true, maximo: 220 }),
    date: dataIso(payload.date, 'date', { obrigatorio: true }),
    categoria,
    instituicao: texto(payload.instituicao, 'instituicao', { maximo: 300 }),
    local: texto(payload.local, 'local', { maximo: 120 }),
    texto: texto(payload.texto, 'texto', { obrigatorio: true, maximo: 12000 }),
    autor_exibicao: texto(payload.autor_exibicao, 'autor_exibicao', { maximo: 200 }) || 'Identidade preservada',
    status: situacao,
    resposta: texto(payload.resposta, 'resposta', { maximo: 8000 }),
    resposta_data: dataIso(payload.resposta_data, 'resposta_data'),
    destaque: booleano(payload.destaque),
    publicado: false,
  };

  for (const campo of ['title', 'instituicao', 'local', 'texto', 'autor_exibicao', 'resposta']) {
    semEmail(campo, item[campo]);
  }

  return item;
}

export function importarRascunho({ evento, manifesto }) {
  const payload = evento?.client_payload ?? evento;
  const item = montarItemPublico(payload);

  if (!manifesto || !Array.isArray(manifesto.items)) {
    throw new Error('conteudo/manifestacoes.json não possui uma lista items válida.');
  }

  const existente = manifesto.items.find((entrada) => entrada?.id_interno === item.id_interno);
  if (existente) {
    return { alterado: false, item: existente, manifesto };
  }

  return {
    alterado: true,
    item,
    manifesto: { ...manifesto, items: [item, ...manifesto.items] },
  };
}

function gravarSaida(nome, valor) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${nome}=${valor}\n`, 'utf8');
}

function executar() {
  const eventoPath = process.argv[2] || process.env.GITHUB_EVENT_PATH;
  const manifestoPath = process.argv[3] || 'conteudo/manifestacoes.json';
  if (!eventoPath) throw new Error('Informe o caminho do evento do GitHub.');

  const evento = JSON.parse(fs.readFileSync(eventoPath, 'utf8'));
  const manifesto = JSON.parse(fs.readFileSync(manifestoPath, 'utf8'));
  const resultado = importarRascunho({ evento, manifesto });

  gravarSaida('changed', String(resultado.alterado));
  gravarSaida('internal_id', resultado.item.id_interno);
  gravarSaida('safe_slug', resultado.item.id_interno.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'));

  if (!resultado.alterado) {
    console.log(`Rascunho ${resultado.item.id_interno} já existe; nenhuma alteração necessária.`);
    return;
  }

  fs.writeFileSync(
    manifestoPath,
    `${JSON.stringify(resultado.manifesto, null, 2)}\n`,
    'utf8',
  );
  console.log(`Rascunho oculto ${resultado.item.id_interno} preparado com sucesso.`);
}

const executadoDiretamente = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (executadoDiretamente) {
  try {
    executar();
  } catch (erro) {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  }
}

