import test from 'node:test';
import assert from 'node:assert/strict';
import { importarRascunho, montarItemPublico } from './importar-manifestacao.mjs';

const payloadValido = {
  id_interno: 'FO-20260922-004',
  title: 'Relato moderado',
  date: '2026-09-22',
  categoria: 'Relato institucional',
  instituicao: 'Instituição de teste',
  local: 'PR',
  texto: 'Versão pública sem dados pessoais.',
  autor_exibicao: 'Identidade preservada',
  status: 'Em acompanhamento',
  resposta: '',
  resposta_data: '',
  destaque: false,
};

test('monta somente a versão pública e sempre a mantém oculta', () => {
  const item = montarItemPublico(payloadValido);
  assert.equal(item.id_interno, payloadValido.id_interno);
  assert.equal(item.publicado, false);
  assert.equal(item.autor_exibicao, 'Identidade preservada');
});

test('recusa dados privados no payload', () => {
  assert.throws(
    () => montarItemPublico({ ...payloadValido, email: 'pessoa@example.com' }),
    /Dado privado não pode sair do Google/,
  );
});

test('recusa e-mail dentro do texto público', () => {
  assert.throws(
    () => montarItemPublico({ ...payloadValido, texto: 'Contato pessoa@example.com' }),
    /contém um endereço de e-mail/,
  );
});

test('não duplica um ID já importado', () => {
  const item = montarItemPublico(payloadValido);
  const resultado = importarRascunho({
    evento: { client_payload: payloadValido },
    manifesto: { items: [item] },
  });
  assert.equal(resultado.alterado, false);
  assert.equal(resultado.manifesto.items.length, 1);
});

test('insere o novo rascunho no topo', () => {
  const resultado = importarRascunho({
    evento: { client_payload: payloadValido },
    manifesto: { items: [{ id_interno: 'ANTERIOR' }] },
  });
  assert.equal(resultado.alterado, true);
  assert.equal(resultado.manifesto.items[0].id_interno, payloadValido.id_interno);
  assert.equal(resultado.manifesto.items[0].publicado, false);
});

