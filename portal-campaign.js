/* Um único aviso de campanha, independente dos formulários e da automação. */
(() => {
  'use strict';
  const DEFAULT_TEXT = 'Cadastre gratuitamente sua ouvidoria e ajude a manter o portal atualizado';

  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function setup(config = {}) {
    const popup = document.getElementById('newsletter-popup');
    if (!popup || popup.dataset.campaignReady) return;
    popup.dataset.campaignReady = 'true';

    // A entrada permanente da newsletter independe da campanha do aviso.
    const newsletterUrl = safeExternalUrl(config.newsletter_url);
    const signupNav = document.querySelector('.nav-link[data-target="inscreva-se"]');
    if (config.newsletter_publicada === true && newsletterUrl && signupNav) {
      const nav = document.createElement('a');
      nav.id = 'newsletter-nav';
      nav.href = newsletterUrl;
      nav.target = '_blank';
      nav.rel = 'noopener';
      nav.className = 'nav-link text-left px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-3 shrink-0';
      nav.innerHTML = '<i data-lucide="newspaper" class="w-5 h-5"></i> <span>Newsletter</span>';
      signupNav.insertAdjacentElement('afterend', nav);
    }

    const campaign = config.popup_campanha || (config.newsletter_popup_ativo === true ? 'newsletter' : 'desativada');
    if (!['inscricoes', 'newsletter'].includes(campaign)) return;
    if (campaign === 'newsletter' && !newsletterUrl) return;

    const title = popup.querySelector('[data-newsletter-title]');
    const text = popup.querySelector('[data-newsletter-text]');
    const link = popup.querySelector('[data-newsletter-link]');
    const closeButton = popup.querySelector('[data-newsletter-close]');
    if (!title || !text || !link || !closeButton) return;

    const isSignup = campaign === 'inscricoes';
    title.textContent = isSignup
      ? config.popup_inscricoes_titulo || 'Faça parte do Portal das Ouvidorias'
      : config.newsletter_titulo || 'Acompanhe as novidades do portal';
    const message = isSignup ? config.popup_inscricoes_texto || DEFAULT_TEXT : config.newsletter_texto || '';
    text.textContent = '';
    const highlight = 'Cadastre gratuitamente';
    if (isSignup && message.startsWith(highlight)) {
      const strong = document.createElement('strong');
      strong.textContent = highlight;
      text.append(strong, document.createTextNode(message.slice(highlight.length)));
    } else {
      text.textContent = message;
    }
    link.textContent = isSignup ? config.popup_inscricoes_botao || 'Inscrever minha ouvidoria' : config.newsletter_botao || 'Assinar newsletter';
    link.href = isSignup ? '#inscreva-se' : newsletterUrl;
    if (isSignup) {
      link.removeAttribute('target');
      link.removeAttribute('rel');
    } else {
      link.target = '_blank';
      link.rel = 'noopener';
    }

    const bounded = (value, fallback, min, max) => {
      const number = Number(value);
      return value == null || !Number.isFinite(number) ? fallback : Math.max(min, Math.min(max, number));
    };
    const days = bounded(config.popup_intervalo_dias, 30, 1, 365);
    const seconds = bounded(config.popup_atraso_segundos ?? config.newsletter_atraso_segundos, 8, 0, 60);
    const version = String(config.popup_versao || '1').replace(/[^a-zA-Z0-9_.-]/g, '') || '1';
    const storageKey = `portal-campaign-shown-${campaign}-${version}`;
    const ttl = days * 24 * 60 * 60 * 1000;
    const dueAt = Date.now() + seconds * 1000;
    let shownThisPage = false;
    let lastFocused = null;
    let timer;

    const visible = (element) => element && !element.classList.contains('hidden');
    const formSections = ['inscreva-se', 'fala-ouvidor'].map(id => document.getElementById(id)).filter(Boolean);
    const blocked = () => document.visibilityState === 'hidden'
      || formSections.some(visible)
      || visible(document.getElementById('mapa-modal'));
    const seenRecently = () => {
      try {
        const stamp = Number(window.localStorage.getItem(storageKey));
        return stamp > 0 && Date.now() - stamp < ttl;
      } catch (_) { return false; }
    };

    const close = (restoreFocus = true) => {
      if (!visible(popup)) return;
      popup.classList.add('hidden');
      popup.setAttribute('aria-hidden', 'true');
      if (restoreFocus && lastFocused instanceof HTMLElement && lastFocused.isConnected) lastFocused.focus({ preventScroll: true });
    };
    const maybeOpen = () => {
      window.clearTimeout(timer);
      if (shownThisPage || seenRecently() || blocked()) return;
      const remaining = dueAt - Date.now();
      if (remaining > 0) {
        timer = window.setTimeout(maybeOpen, remaining);
        return;
      }
      lastFocused = document.activeElement;
      shownThisPage = true;
      try { window.localStorage.setItem(storageKey, String(Date.now())); } catch (_) {}
      popup.classList.remove('hidden');
      popup.setAttribute('aria-hidden', 'false');
      closeButton.focus({ preventScroll: true });
    };

    popup.querySelectorAll('[data-newsletter-close]').forEach(button => button.addEventListener('click', () => close()));
    popup.addEventListener('click', event => { if (event.target === popup) close(); });
    popup.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const focusable = [...popup.querySelectorAll('button, a[href]')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    link.addEventListener('click', event => {
      close(false);
      if (isSignup) {
        event.preventDefault();
        if (typeof window.navigate === 'function') window.navigate('inscreva-se');
        signupNav?.focus({ preventScroll: true });
      }
    });

    // Observa somente a visibilidade; não modifica formulários, iframes ou navegação.
    const observer = new MutationObserver(() => {
      if (blocked()) close(false);
      else maybeOpen();
    });
    [...formSections, document.getElementById('mapa-modal')].filter(Boolean).forEach(element => {
      observer.observe(element, { attributes: true, attributeFilter: ['class'] });
    });
    document.addEventListener('visibilitychange', maybeOpen);
    window.addEventListener('storage', event => { if (event.key === storageKey && seenRecently()) close(false); });
    maybeOpen();
  }

  window.PortalCampaign = { setup };
})();
