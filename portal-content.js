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

  const rawSafeUrl = (value = '') => {
    const url = String(value || '').trim();
    if (!url) return '';
    if (/^(https?:\/\/|\/|[a-zA-Z0-9_.-]+\/)/.test(url)) return url;
    return '';
  };

  const safeUrl = (value = '') => esc(rawSafeUrl(value));

  const newTabAttrs = (value) => value === false ? '' : ' target="_blank" rel="noopener"';

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

  function actionButton({ label, url, icon = 'external-link', newTab = true, download = false }) {
    const href = safeUrl(url);
    if (!href) return '';
    const behavior = download ? ' download' : newTabAttrs(newTab);
    return `<a href="${href}"${behavior} class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 transition" style="background-color:#4B9DAB;"><i data-lucide="${esc(icon)}" class="w-4 h-4"></i>${esc(label || 'Acessar')}</a>`;
  }

  function relatedLinkButtons(item) {
    if (!Array.isArray(item.links)) return '';
    return item.links.map((link) => {
      if (!link || !link.url) return '';
      return actionButton({
        label: link.label || 'Acessar',
        url: link.url,
        icon: link.icon || (link.download === true ? 'file-down' : 'external-link'),
        newTab: link.nova_aba !== false,
        download: link.download === true
      });
    }).join('');
  }

  function linkButtons(item) {
    const links = [];
    if (item.arquivo) {
      links.push({
        label: item.arquivo_label || 'Baixar arquivo',
        url: item.arquivo,
        icon: 'file-down',
        download: true
      });
    }
    if (item.link) {
      links.push({
        label: item.link_label || 'Acessar fonte',
        url: item.link,
        icon: 'external-link',
        newTab: item.link_nova_aba !== false
      });
    }
    if (Array.isArray(item.links)) {
      item.links.forEach((l) => {
        if (l && l.url) {
          links.push({
            label: l.label || 'Acessar',
            url: l.url,
            icon: l.icon || (l.download === true ? 'file-down' : 'external-link'),
            newTab: l.nova_aba !== false,
            download: l.download === true
          });
        }
      });
    }
    return links.map(actionButton).join('');
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
        ${item.destaque ? `<div class="p-3 text-white text-xs font-bold uppercase tracking-wider" style="background-color:#4B9DAB;">${esc(item.tipo || 'Notícia')} em destaque</div>` : ''}
        <div class="p-6 md:p-8">
          ${image ? `<figure class="mb-5 overflow-hidden rounded-lg bg-slate-50"><img src="${image}" alt="${esc(item.imagem_alt || item.title)}" class="w-full h-auto block">${item.imagem_legenda ? `<figcaption class="px-3 py-2 text-[11px] leading-relaxed text-slate-500 border-t border-slate-100">${esc(item.imagem_legenda)}</figcaption>` : ''}</figure>` : ''}
          <div class="text-[10px] font-bold uppercase tracking-wider mb-2" style="color:#3d7f8c;">${esc(item.tipo || 'Notícia')}</div>
          <h3 class="text-xl font-bold text-slate-800 mb-1">${esc(item.title)}</h3>
          ${item.subtitulo ? `<p class="text-sm text-slate-500 mb-4">${esc(item.subtitulo)}</p>` : ''}
          ${meta ? `<p class="text-xs text-slate-500 mb-4">${meta}</p>` : ''}
          ${item.texto ? `<p class="text-sm text-slate-600 leading-relaxed mb-4">${esc(item.texto)}</p>` : ''}
          ${item.autor ? `<p class="text-xs text-slate-500${item.fonte ? ' mb-1' : ' mb-4'}">Por ${esc(item.autor)}</p>` : ''}
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
    const file = safeUrl(item.arquivo);
    const relatedButtons = relatedLinkButtons(item);
    const downloadButton = file ? actionButton({
      label: item.arquivo_label || 'Baixar documento',
      url: item.arquivo,
      icon: 'download',
      download: true
    }) : '';
    const buttons = `${downloadButton}${relatedButtons}`;
    const icon = item.tipo === 'Carta' ? 'file-signature' : (item.tipo === 'Moção' ? 'scroll-text' : 'globe');
    return `<article class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div class="flex items-start gap-3">
        ${file ? `<a href="${file}" class="bg-indigo-100 text-indigo-700 p-2.5 rounded-lg shrink-0 hover:bg-indigo-200 transition" aria-label="Abrir ${esc(item.title)} na mesma aba"><i data-lucide="${icon}" class="w-5 h-5"></i></a>` : `<div class="bg-indigo-100 text-indigo-700 p-2.5 rounded-lg shrink-0"><i data-lucide="${icon}" class="w-5 h-5"></i></div>`}
        <div class="min-w-0 flex-1">
          <h4 class="font-bold text-slate-800 text-sm">${file ? `<a href="${file}" class="hover:underline">${esc(item.title)}</a>` : esc(item.title)}</h4>
          ${item.date ? `<p class="text-[11px] text-slate-400 mt-1">${datePt(item.date)}</p>` : ''}
          ${item.descricao ? `<p class="text-xs text-slate-500 mt-2 leading-relaxed">${esc(item.descricao)}</p>` : ''}
          ${item.fonte ? `<p class="text-[11px] text-slate-400 mt-2">${esc(item.fonte)}</p>` : ''}
          ${file ? `<a href="${file}" class="inline-flex items-center gap-1.5 text-[11px] font-semibold mt-3 hover:underline" style="color:#3d7f8c"><i data-lucide="eye" class="w-3.5 h-3.5"></i>Abrir no navegador</a>` : ''}
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

  function videoEmbedUrl(value) {
    const raw = rawSafeUrl(value);
    if (!/^https?:\/\//i.test(raw)) return '';

    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      let videoId = '';

      if (host === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
      } else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
        if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || '';
        if (!videoId && /^\/(embed|shorts)\//.test(parsed.pathname)) {
          videoId = parsed.pathname.split('/').filter(Boolean)[1] || '';
        }
      }

      if (/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
      }

      if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const vimeoId = parsed.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part));
        if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
      }

      return parsed.href;
    } catch (_) {
      return '';
    }
  }

  function autoplayVideoUrl(value) {
    const raw = videoEmbedUrl(value);
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      parsed.searchParams.set('autoplay', host.includes('youtube') || host.includes('vimeo') ? '1' : 'true');
      return parsed.href;
    } catch (_) {
      return raw;
    }
  }

  function videoFrame(embed, title, autoplay = false) {
    const src = safeUrl(autoplay ? autoplayVideoUrl(embed) : videoEmbedUrl(embed));
    if (!src) return '';
    return `<iframe src="${src}" title="${esc(title)}" class="absolute inset-0 w-full h-full border-0" loading="lazy" allow="accelerometer; autoplay *; clipboard-write; encrypted-media *; fullscreen *; gyroscope; picture-in-picture *; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>`;
  }

  function videoFullscreenButton(title) {
    const safeTitle = esc(title || 'vídeo');
    return `<button type="button" class="portal-video-fullscreen absolute top-3 right-3 z-20 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/25 bg-black/70 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white" data-video-fullscreen aria-label="Exibir ${safeTitle} em tela cheia" aria-pressed="false"><i data-lucide="maximize-2" data-video-enter-icon class="w-4 h-4" aria-hidden="true"></i><i data-lucide="minimize-2" data-video-exit-icon class="hidden w-4 h-4" aria-hidden="true"></i><span data-video-fullscreen-label>Tela cheia</span></button>`;
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateVideoFullscreenControls() {
    document.querySelectorAll('[data-video-shell]').forEach((shell) => {
      const expanded = fullscreenElement() === shell || shell.classList.contains('portal-video-expanded');
      const control = shell.querySelector('[data-video-fullscreen]');
      if (!control) return;
      const label = control.querySelector('[data-video-fullscreen-label]');
      const enterIcon = control.querySelector('[data-video-enter-icon]');
      const exitIcon = control.querySelector('[data-video-exit-icon]');
      control.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      control.setAttribute('aria-label', expanded ? 'Sair da tela cheia' : 'Exibir o vídeo em tela cheia');
      if (label) label.textContent = expanded ? 'Sair da tela cheia' : 'Tela cheia';
      if (enterIcon) enterIcon.classList.toggle('hidden', expanded);
      if (exitIcon) exitIcon.classList.toggle('hidden', !expanded);
    });
  }

  function enterViewportFullscreen(shell) {
    document.querySelectorAll('.portal-video-expanded').forEach((expandedShell) => {
      expandedShell.classList.remove('portal-video-expanded');
    });
    shell.classList.add('portal-video-expanded');
    document.documentElement.classList.add('portal-video-lock');
    updateVideoFullscreenControls();
  }

  function exitViewportFullscreen(shell) {
    if (shell) shell.classList.remove('portal-video-expanded');
    if (!document.querySelector('.portal-video-expanded')) {
      document.documentElement.classList.remove('portal-video-lock');
    }
    updateVideoFullscreenControls();
  }

  function renderMultimidia(items) {
    const host = document.getElementById('multimidia-dinamica');
    if (!host || !items.length) return;
    const ordered = [...items].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    host.innerHTML = ordered.map((item) => {
      const url = safeUrl(item.url);
      const image = safeUrl(item.imagem);
      const isVideo = String(item.tipo || '').toLocaleLowerCase('pt-BR') === 'vídeo';
      const embed = isVideo ? videoEmbedUrl(item.embed_url || item.url) : '';
      const meta = [item.plataforma, item.duracao, datePt(item.date)].filter(Boolean).map(esc).join(' · ');
      const embeddedMedia = embed ? `<div class="aspect-video relative overflow-hidden bg-slate-950" data-video-shell>${image ? `<button type="button" class="absolute inset-0 w-full h-full flex items-center justify-center group text-left" data-video-embed="${safeUrl(embed)}" data-video-title="${esc(item.title)}" aria-label="Reproduzir ${esc(item.title)}"><img src="${image}" alt="${esc(item.imagem_alt || '')}" class="absolute inset-0 w-full h-full object-cover"><span class="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition" aria-hidden="true"></span><span class="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-black/55 px-2 py-1 rounded"><i data-lucide="video" class="w-3.5 h-3.5"></i>${esc(item.plataforma || 'Vídeo')}</span><span class="relative z-10 w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition" aria-hidden="true"><i data-lucide="play" class="w-8 h-8 ml-1" style="color:#3d7f8c;"></i></span></button>` : videoFrame(embed, item.title)}${videoFullscreenButton(item.title)}</div>` : '';
      return `<article class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        ${item.destaque ? '<div class="px-4 py-2 text-white text-[10px] font-bold uppercase tracking-wider" style="background-color:#4B9DAB;">Conteúdo em destaque</div>' : ''}
        ${embeddedMedia || (url ? `<a href="${url}"${newTabAttrs(item.nova_aba)} class="aspect-video relative flex items-center justify-center group overflow-hidden" style="background:#142d31;" aria-label="Acessar ${esc(item.title)}">${image ? `<img src="${image}" alt="${esc(item.imagem_alt || '')}" class="absolute inset-0 w-full h-full object-cover">` : ''}${image ? '<div class="absolute inset-0 bg-black/20"></div>' : ''}<div class="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/90 bg-black/45 px-2 py-1 rounded"><i data-lucide="${isVideo ? 'video' : 'external-link'}" class="w-3.5 h-3.5"></i>${esc(item.plataforma || item.tipo || 'Multimídia')}</div><div class="relative z-10 w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition"><i data-lucide="${isVideo ? 'play' : 'arrow-up-right'}" class="w-8 h-8${isVideo ? ' ml-1' : ''}" style="color:#3d7f8c;"></i></div></a>` : `<div class="aspect-video relative flex items-center justify-center overflow-hidden" style="background:#142d31;">${image ? `<img src="${image}" alt="${esc(item.imagem_alt || '')}" class="absolute inset-0 w-full h-full object-cover">` : '<i data-lucide="image" class="w-10 h-10 text-white/70"></i>'}</div>`)}
        <div class="p-5">
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style="background:#e8f2f4;color:#3d7f8c">${esc(item.tipo || 'Vídeo')}</span>
          <h3 class="font-bold text-slate-800 mt-2 leading-snug">${esc(item.title)}</h3>
          ${meta ? `<p class="text-[11px] text-slate-400 mt-1">${meta}</p>` : ''}
          ${item.descricao ? `<p class="text-xs text-slate-500 mt-2 leading-relaxed">${esc(item.descricao)}</p>` : ''}
          ${item.fonte ? `<p class="text-[11px] text-slate-400 mt-2">Fonte: ${esc(item.fonte)}</p>` : ''}
          ${url ? `<a href="${url}"${newTabAttrs(item.nova_aba)} class="inline-flex items-center gap-2 text-xs font-semibold mt-4 hover:underline" style="color:#3d7f8c"><i data-lucide="external-link" class="w-4 h-4"></i>${esc(item.link_label || (isVideo ? 'Abrir página oficial' : 'Acessar conteúdo'))}</a>` : ''}
        </div>
      </article>`;
    }).join('');

    host.querySelectorAll('[data-video-embed]').forEach((button) => {
      button.addEventListener('click', () => {
        const shell = button.closest('[data-video-shell]');
        if (!shell) return;
        const frame = videoFrame(button.dataset.videoEmbed, button.dataset.videoTitle || 'Vídeo', true);
        if (frame) {
          shell.innerHTML = `${frame}${videoFullscreenButton(button.dataset.videoTitle || 'Vídeo')}`;
          try { if (window.lucide) window.lucide.createIcons(); } catch (_) {}
          updateVideoFullscreenControls();
        }
      }, { once: true });
    });

    host.addEventListener('click', async (event) => {
      const control = event.target.closest('[data-video-fullscreen]');
      if (!control || !host.contains(control)) return;
      const shell = control.closest('[data-video-shell]');
      if (!shell) return;

      if (shell.classList.contains('portal-video-expanded')) {
        exitViewportFullscreen(shell);
        return;
      }

      const activeFullscreen = fullscreenElement();
      if (activeFullscreen === shell) {
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFullscreen) {
          try { await exitFullscreen.call(document); } catch (_) { exitViewportFullscreen(shell); }
        }
        return;
      }

      const requestFullscreen = shell.requestFullscreen || shell.webkitRequestFullscreen || shell.webkitRequestFullScreen;
      if (!requestFullscreen) {
        enterViewportFullscreen(shell);
        return;
      }

      try {
        await requestFullscreen.call(shell);
        updateVideoFullscreenControls();
      } catch (_) {
        enterViewportFullscreen(shell);
      }
    });

    document.addEventListener('fullscreenchange', updateVideoFullscreenControls);
    document.addEventListener('webkitfullscreenchange', updateVideoFullscreenControls);
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const expandedShell = document.querySelector('.portal-video-expanded');
      if (expandedShell) exitViewportFullscreen(expandedShell);
    });

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
