(function () {
  'use strict';

  const DATA = {
    noticias: 'conteudo/noticias.json',
    documentos: 'conteudo/documentos.json',
    multimidia: 'conteudo/multimidia.json'
  };

  const esc = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const safeUrl = (value = '') => {
    const url = String(value || '').trim();
    if (!url) return '';
    if (/^(https?:\/\/|\/|[a-zA-Z0-9_.-]+\/)/.test(url)) return esc(url);
    return '';
  };

  const datePt = (value) => {
    if (!value) return '';
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return esc(value);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    }).format(d);
  };

  async function fetchItems(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn(`[Portal] Não foi possível carregar ${url}:`, err);
      return [];
    }
  }

  function linkButtons(item) {
    const links = [];
    if (item.arquivo) {
      links.push({
        label: item.arquivo_label || 'Abrir documento',
        url: item.arquivo,
        icon: 'file-down'
      });
    }
    if (Array.isArray(item.links)) {
      item.links.forEach((l) => {
        if (l && l.url) links.push({ label: l.label || 'Acessar', url: l.url, icon: 'external-link' });
      });
    } else if (item.link) {
      links.push({ label: item.link_label || 'Acessar fonte', url: item.link, icon: 'external-link' });
    }
    return links
      .filter((l) => safeUrl(l.url))
      .map((l) => `<a href="${safeUrl(l.url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 transition" style="background-color:#4B9DAB;"><i data-lucide="${esc(l.icon)}" class="w-4 h-4"></i>${esc(l.label)}</a>`)
      .join('');
  }

  function renderNoticias(items) {
    const host = document.getElementById('noticias-dinamicas');
    if (!host || !items.length) return;

    const ordered = [...items].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    host.innerHTML = ordered.map((item) => {
      const image = safeUrl(item.imagem);
      const meta = [datePt(item.date), item.local ? esc(item.local) : ''].filter(Boolean).join(' · ');
      const buttons = linkButtons(item);
      return `<article class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        ${item.destaque ? '<div class="p-3 text-white text-xs font-bold uppercase tracking-wider" style="background-color:#4B9DAB;">Notícia em destaque</div>' : ''}
        <div class="p-6 md:p-8">
          ${image ? `<div class="mb-5 overflow-hidden rounded-lg"><img src="${image}" alt="${esc(item.imagem_alt || item.title)}" class="w-full h-auto block"></div>` : ''}
          <div class="text-[10px] font-bold uppercase tracking-wider mb-2" style="color:#3d7f8c;">${esc(item.tipo || 'Notícia')}</div>
          <h3 class="text-xl font-bold text-slate-800 mb-1">${esc(item.title)}</h3>
          ${item.subtitulo ? `<p class="text-sm text-slate-500 mb-4">${esc(item.subtitulo)}</p>` : ''}
          ${meta ? `<p class="text-xs text-slate-500 mb-4">${meta}</p>` : ''}
          ${item.texto ? `<p class="text-sm text-slate-600 leading-relaxed mb-4">${esc(item.texto)}</p>` : ''}
          ${item.fonte ? `<p class="text-xs text-slate-500 mb-4">Fonte: ${esc(item.fonte)}</p>` : ''}
          ${buttons ? `<div class="flex flex-wrap gap-2 pt-2">${buttons}</div>` : ''}
        </div>
      </article>`;
    }).join('');

    ordered.forEach((item) => {
      if (!item.substitui) return;
      const id = String(item.substitui).replace(/"/g, '\\"');
      document.querySelectorAll(`[data-legacy-id="${id}"]`).forEach((el) => el.classList.add('hidden'));
    });
  }

  function docCard(item) {
    const buttons = linkButtons(item);
    return `<article class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div class="flex items-start gap-3">
        <div class="bg-indigo-100 text-indigo-700 p-2.5 rounded-lg shrink-0"><i data-lucide="${item.tipo === 'Carta' ? 'file-signature' : 'globe'}" class="w-5 h-5"></i></div>
        <div class="min-w-0 flex-1">
          <h4 class="font-bold text-slate-800 text-sm">${esc(item.title)}</h4>
          ${item.date ? `<p class="text-[11px] text-slate-400 mt-1">${datePt(item.date)}</p>` : ''}
          ${item.descricao ? `<p class="text-xs text-slate-500 mt-2 leading-relaxed">${esc(item.descricao)}</p>` : ''}
          ${item.fonte ? `<p class="text-[11px] text-slate-400 mt-2">${esc(item.fonte)}</p>` : ''}
          ${buttons ? `<div class="flex flex-wrap gap-2 mt-3">${buttons}</div>` : ''}
        </div>
      </div>
    </article>`;
  }

  function renderDocumentos(items) {
    if (!items.length) return;

    const ordered = [...items].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const recentes = ordered.filter((item) => item.recente === true);
    const internacionais = ordered.filter((item) => item.categoria === 'Documentos internacionais' && item.recente !== true);

    const recentSection = document.getElementById('documentos-recentes-section');
    const recentGrid = document.getElementById('documentos-recentes-grid');
    if (recentSection && recentGrid && recentes.length) {
      recentGrid.innerHTML = recentes.map(docCard).join('');
      recentSection.classList.remove('hidden');
    }

    const intHost = document.getElementById('documentos-internacionais-dinamicos');
    if (intHost && internacionais.length) {
      intHost.innerHTML = internacionais.map(docCard).join('');
    }
  }

  function renderMultimidia(items) {
    const host = document.getElementById('multimidia-dinamica');
    if (!host || !items.length) return;
    const ordered = [...items].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    host.innerHTML = ordered.map((item) => {
      const url = safeUrl(item.url);
      const meta = [item.plataforma, item.duracao, datePt(item.date)].filter(Boolean).map(esc).join(' · ');
      return `<article class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <a href="${url}" target="_blank" rel="noopener" class="aspect-video relative flex items-center justify-center group" style="background:#142d31;" aria-label="Assistir ${esc(item.title)}">
          <div class="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/85 bg-black/25 px-2 py-1 rounded"><i data-lucide="video" class="w-3.5 h-3.5"></i>${esc(item.plataforma || 'Vídeo')}</div>
          <div class="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition"><i data-lucide="play" class="w-8 h-8 ml-1" style="color:#3d7f8c;"></i></div>
        </a>
        <div class="p-5">
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style="background:#e8f2f4;color:#3d7f8c">${esc(item.tipo || 'Vídeo')}</span>
          <h3 class="font-bold text-slate-800 mt-2 leading-snug">${esc(item.title)}</h3>
          ${meta ? `<p class="text-[11px] text-slate-400 mt-1">${meta}</p>` : ''}
          ${item.descricao ? `<p class="text-xs text-slate-500 mt-2 leading-relaxed">${esc(item.descricao)}</p>` : ''}
          ${url ? `<a href="${url}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-xs font-semibold mt-4 hover:underline" style="color:#3d7f8c"><i data-lucide="external-link" class="w-4 h-4"></i>${esc(item.link_label || 'Assistir ao vídeo')}</a>` : ''}
        </div>
      </article>`;
    }).join('');

    const badge = document.getElementById('multimidia-em-construcao');
    const placeholders = document.querySelectorAll('.multimidia-placeholder');
    if (badge) badge.classList.add('hidden');
    placeholders.forEach((el) => el.classList.add('hidden'));
  }

  async function init() {
    const [noticias, documentos, multimidia] = await Promise.all([
      fetchItems(DATA.noticias),
      fetchItems(DATA.documentos),
      fetchItems(DATA.multimidia)
    ]);
    renderNoticias(noticias);
    renderDocumentos(documentos);
    renderMultimidia(multimidia);
    try { if (window.lucide) window.lucide.createIcons(); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
