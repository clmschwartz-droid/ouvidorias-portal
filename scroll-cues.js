(function () {
  'use strict';

  const SELECTOR = '[data-scroll-cues]';
  const instances = new WeakMap();

  const arrow = (direction) => direction === 'previous'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

  function makeButton(direction, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `horizontal-scroll-cue horizontal-scroll-cue-${direction}`;
    button.setAttribute('aria-label', `${direction === 'previous' ? 'Ver conteúdo anterior' : 'Ver mais conteúdo'} em ${label}`);
    button.innerHTML = arrow(direction);
    return button;
  }

  function enhance(scroller) {
    if (!scroller || instances.has(scroller)) return;

    const label = scroller.dataset.scrollLabel || 'esta faixa';
    const shell = document.createElement('div');
    shell.className = 'horizontal-scroll-shell';
    if (scroller.id === 'main-nav-scroll') shell.classList.add('nav-scroll-shell');
    if (scroller.id === 'map-actions-scroll') shell.classList.add('map-actions-scroll-shell');
    if (scroller.classList.contains('news-card-rail') || scroller.classList.contains('news-archive-grid')) {
      shell.classList.add('news-scroll-shell');
    }

    scroller.parentNode.insertBefore(shell, scroller);
    shell.appendChild(scroller);

    const previous = makeButton('previous', label);
    const next = makeButton('next', label);
    shell.append(previous, next);

    let frame = 0;
    const update = () => {
      frame = 0;
      const overflow = scroller.scrollWidth - scroller.clientWidth > 5;
      const canGoBack = overflow && scroller.scrollLeft > 5;
      const canGoForward = overflow && scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 5;

      previous.classList.toggle('is-visible', canGoBack);
      next.classList.toggle('is-visible', canGoForward);
      previous.tabIndex = canGoBack ? 0 : -1;
      next.tabIndex = canGoForward ? 0 : -1;
      previous.setAttribute('aria-hidden', String(!canGoBack));
      next.setAttribute('aria-hidden', String(!canGoForward));
      shell.classList.toggle('can-scroll-previous', canGoBack);
      shell.classList.toggle('can-scroll-next', canGoForward);
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const move = (direction) => {
      const amount = Math.max(220, scroller.clientWidth * 0.76);
      scroller.scrollBy({ left: direction * amount, behavior: 'smooth' });
    };

    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    scroller.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(scroller);
      Array.from(scroller.children).forEach((child) => resizeObserver.observe(child));
    }

    instances.set(scroller, { update: scheduleUpdate });
    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 120);
  }

  function scan(root) {
    if (root instanceof Element && root.matches(SELECTOR)) enhance(root);
    if (root.querySelectorAll) root.querySelectorAll(SELECTOR).forEach(enhance);
  }

  function init() {
    scan(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
