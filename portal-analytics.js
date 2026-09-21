(function () {
  'use strict';

  const OFFICIAL_HOSTS = new Set([
    'ouvidoriasbrasileiras.com.br',
    'www.ouvidoriasbrasileiras.com.br'
  ]);

  const noop = function () {};
  if (!OFFICIAL_HOSTS.has(window.location.hostname.toLowerCase())) {
    window.PortalAnalytics = { section: noop, event: noop, enabled: false };
    return;
  }

  const endpoint = 'https://ouvidoriasbrasileiras.goatcounter.com/count';
  const pending = [];
  let ready = false;
  let currentSection = '';

  function slug(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'sem-identificacao';
  }

  function count(payload) {
    if (!ready || !window.goatcounter || typeof window.goatcounter.count !== 'function') {
      pending.push(payload);
      return;
    }
    window.goatcounter.count(payload);
  }

  function sectionTitle(id) {
    const section = document.getElementById(id);
    const heading = section && section.querySelector('h1, h2');
    return heading ? heading.textContent.trim() : id;
  }

  function section(id) {
    const clean = slug(id);
    if (clean === currentSection) return;
    currentSection = clean;
    count({
      path: '/secao/' + clean,
      title: 'Seção: ' + sectionTitle(id)
    });
  }

  function trackEvent(name, title) {
    count({
      path: '/evento/' + String(name || '').split('/').map(slug).join('/'),
      title: String(title || name || 'Interação'),
      event: true
    });
  }

  window.PortalAnalytics = { section: section, event: trackEvent, enabled: true };
  window.goatcounter = Object.assign(window.goatcounter || {}, { no_onload: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = endpoint;
  script.addEventListener('load', function () {
    ready = Boolean(window.goatcounter && typeof window.goatcounter.count === 'function');
    if (!ready) return;
    while (pending.length) window.goatcounter.count(pending.shift());
    const visible = document.querySelector('.section-content:not(.hidden)');
    section(visible ? visible.id : 'inicio');
  });
  document.head.appendChild(script);

  document.addEventListener('click', function (clickEvent) {
    const link = clickEvent.target.closest && clickEvent.target.closest('a[href]');
    if (!link) return;

    let url;
    try { url = new URL(link.href, window.location.href); } catch (_) { return; }
    const label = (link.textContent || link.getAttribute('aria-label') || url.pathname).trim().replace(/\s+/g, ' ').slice(0, 160);
    const filename = decodeURIComponent(url.pathname.split('/').pop() || 'arquivo');
    const isDocument = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|zip)$/i.test(url.pathname);

    if (isDocument) {
      const action = link.hasAttribute('download') ? 'baixar' : 'abrir';
      trackEvent('documento/' + action + '/' + filename, label || filename);
      return;
    }

    if (url.hostname && url.hostname !== window.location.hostname) {
      trackEvent('link-externo/' + url.hostname, label || url.hostname);
    }
  });
})();
