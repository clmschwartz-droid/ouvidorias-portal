(function () {
  'use strict';

  const form = document.getElementById('fala-ouvidor-form');
  if (!form) return;

  const submit = document.getElementById('fala-ouvidor-submit');
  const status = document.getElementById('fala-ouvidor-status');
  const endpoint = String(form.dataset.endpoint || '').trim();
  let readyButtonHtml = submit ? submit.innerHTML : '';

  function endpointAtivo(value) {
    try {
      return new URL(value).protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  function setStatus(message, type) {
    if (!status) return;
    status.textContent = message;
    status.className = 'rounded-lg border px-4 py-3 text-sm';
    if (type === 'success') {
      status.classList.add('border-emerald-200', 'bg-emerald-50', 'text-emerald-800');
    } else if (type === 'error') {
      status.classList.add('border-red-200', 'bg-red-50', 'text-red-800');
    } else {
      status.classList.add('border-sky-200', 'bg-sky-50', 'text-slate-700');
    }
  }

  function setSending(sending) {
    if (!submit) return;
    submit.disabled = sending;
    submit.classList.toggle('opacity-50', sending);
    submit.classList.toggle('cursor-not-allowed', sending);
    submit.innerHTML = sending
      ? '<span aria-hidden="true">Aguarde…</span><span class="sr-only">Enviando manifestação</span>'
      : readyButtonHtml;
  }

  if (endpointAtivo(endpoint) && submit) {
    submit.disabled = false;
    submit.classList.remove('opacity-50', 'cursor-not-allowed');
    readyButtonHtml = '<i data-lucide="send" class="w-4 h-4"></i> Enviar manifestação';
    submit.innerHTML = readyButtonHtml;
    try { if (window.lucide) window.lucide.createIcons(); } catch (_) {}
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!endpointAtivo(endpoint)) {
      setStatus('O recebimento de manifestações ainda está em fase de ativação.', 'info');
      return;
    }

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    if (String(data.get('website') || '').trim()) return;

    const payload = {
      nome: String(data.get('nome') || '').trim(),
      email: String(data.get('email') || '').trim(),
      instituicao: String(data.get('instituicao') || '').trim(),
      uf: String(data.get('uf') || '').trim(),
      categoria: String(data.get('categoria') || '').trim(),
      titulo: String(data.get('titulo') || '').trim(),
      mensagem: String(data.get('mensagem') || '').trim(),
      identificacao_publica: String(data.get('identificacao_publica') || '').trim(),
      ciencia_moderacao: data.get('ciencia_moderacao') === 'on',
      consentimento_dados: data.get('consentimento_dados') === 'on',
      versao_formulario: '2026-09-15'
    };

    setSending(true);
    setStatus('Enviando sua manifestação com segurança…', 'info');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let result = {};
      try { result = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error('Falha no recebimento');

      const protocolo = result && result.protocolo ? ` Protocolo: ${result.protocolo}.` : '';
      setStatus(`Manifestação recebida. Ela será analisada antes de qualquer publicação.${protocolo}`, 'success');
      form.reset();
    } catch (_) {
      setStatus('Não foi possível enviar agora. Nenhum dado foi publicado. Tente novamente mais tarde.', 'error');
    } finally {
      setSending(false);
      if (submit) {
        submit.disabled = false;
        submit.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      try { if (window.lucide) window.lucide.createIcons(); } catch (_) {}
    }
  });
})();
