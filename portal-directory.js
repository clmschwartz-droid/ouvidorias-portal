/* Diretório independente: não participa dos formulários ou do Fala Ouvidor. */
(() => {
  'use strict';
  const SIZE = 20;
  const normal = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const text = (tag, value, cls) => {
    const el = document.createElement(tag);
    el.textContent = value;
    if (cls) el.className = cls;
    return el;
  };
  const url = (s) => {
    try {
      const u = new URL(String(s || ''));
      return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';
    } catch (_) { return ''; }
  };
  const email = (s) => /^ouvidoria[a-z0-9._+-]*@[a-z0-9.-]+\.[a-z]{2,}$/i.test(String(s || '')) ? s : '';

  async function init() {
    const host = document.getElementById('directory-results');
    if (!host) return;
    const count = document.getElementById('directory-count');
    const form = document.getElementById('directory-filters');
    const query = document.getElementById('directory-query');
    const fields = ['uf', 'municipio', 'esfera', 'poder'];
    const selects = Object.fromEntries(fields.map((key) => [key, document.getElementById('directory-' + key)]));
    const pagination = document.getElementById('directory-pagination');
    const prev = document.getElementById('directory-prev');
    const next = document.getElementById('directory-next');
    let page = 0;
    let items = [];
    const link = (label, href) => {
      const a = text('a', label);
      a.href = href;
      if (href.startsWith('https:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      return a;
    };
    function card(item) {
      const article = text('article', '', 'directory-row');
      const identity = text('div', '', 'directory-identity');
      identity.append(text('h3', item.nome));
      if (item.orgao && item.orgao !== item.nome) identity.append(text('p', item.orgao));
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.atualizado_em || '')) {
        identity.append(text('p', 'Atualizado em ' + item.atualizado_em.split('-').reverse().join('/'), 'directory-date'));
      }
      const scope = text('div', '', 'directory-scope');
      scope.append(text('p', item.municipio + ' / ' + item.uf));
      scope.append(text('p', [item.esfera, item.poder].filter(Boolean).join(' · '), 'directory-nature'));
      const contacts = text('div', '', 'directory-contacts');
      const site = url(item.site);
      const address = email(item.email);
      if (site) contacts.append(link('Site da ouvidoria ↗', site));
      if (address) contacts.append(link(address, 'mailto:' + address));
      if (item.telefone && /^[\d\s()+.,-]+(?:\s*\(?WhatsApp\)?)?(?:,?\s*ramal\s*\d+)?$/i.test(item.telefone)) {
        const digits = item.telefone.replace(/\D/g, '');
        if (!/ramal/i.test(item.telefone) && digits.length >= 10 && digits.length <= 11) {
          contacts.append(link(item.telefone, 'tel:' + (digits.startsWith('0800') ? digits : '+55' + digits)));
        } else contacts.append(text('p', item.telefone));
      }
      if (!contacts.childElementCount) contacts.append(text('p', 'Contato não divulgado'));
      article.append(identity, scope, contacts);
      return article;
    }
    function options() {
      fields.forEach((field) => {
        const select = selects[field];
        const previous = select.value;
        const pool = field === 'municipio' && selects.uf.value ? items.filter((item) => item.uf === selects.uf.value) : items;
        while (select.options.length > 1) select.remove(1);
        [...new Set(pool.map((item) => item[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
          .forEach((value) => { const opt = text('option', value); opt.value = value; select.append(opt); });
        select.value = [...select.options].some((opt) => opt.value === previous) ? previous : '';
      });
    }
    function render() {
      const terms = normal(query.value).trim().split(/\s+/).filter(Boolean);
      const filtered = items.filter((item) => {
        const haystack = normal([item.nome, item.orgao, item.municipio, item.uf].join(' '));
        return terms.every((term) => haystack.includes(term)) && fields.every((key) => !selects[key].value || item[key] === selects[key].value);
      });
      const pages = Math.max(1, Math.ceil(filtered.length / SIZE));
      page = Math.min(page, pages - 1);
      count.textContent = filtered.length === items.length ? `${items.length} ouvidoria${items.length === 1 ? '' : 's'} cadastrada${items.length === 1 ? '' : 's'}` : `${filtered.length} de ${items.length} ouvidorias cadastradas`;
      host.replaceChildren();
      if (!filtered.length) host.append(text('p', items.length ? 'Nenhuma ouvidoria encontrada. Experimente outros filtros.' : 'As primeiras inscrições estão em conferência.', 'directory-empty'));
      else filtered.slice(page * SIZE, (page + 1) * SIZE).forEach((item) => host.append(card(item)));
      pagination.hidden = pages === 1;
      document.getElementById('directory-page').textContent = `Página ${page + 1} de ${pages}`;
      prev.disabled = page === 0;
      next.disabled = page === pages - 1;
    }
    form.addEventListener('submit', (event) => event.preventDefault());
    form.addEventListener('input', (event) => { page = 0; if (event.target === selects.uf) options(); render(); });
    form.addEventListener('change', (event) => { page = 0; if (event.target === selects.uf) options(); render(); });
    form.addEventListener('reset', () => { setTimeout(() => { page = 0; options(); render(); }, 0); });
    const turn = (offset) => { page += offset; render(); count.scrollIntoView({ block: 'nearest' }); };
    prev.addEventListener('click', () => turn(-1));
    next.addEventListener('click', () => turn(1));
    const deepLink = () => {
      if (window.location.hash === '#ouvidorias-cadastradas' && typeof window.navigate === 'function') window.navigate('ouvidorias-cadastradas');
    };
    deepLink();
    window.addEventListener('hashchange', deepLink);
    try {
      const response = await fetch('conteudo/ouvidorias-cadastradas.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('directory unavailable');
      const data = await response.json();
      if (!data || !Array.isArray(data.items)) throw new Error('invalid directory');
      const ids = new Set();
      items = data.items.filter((item) => {
        if (!item || typeof item.nome !== 'string' || !item.nome.trim() || !item.municipio || !/^[A-Z]{2}$/.test(item.uf) || !item.id || ids.has(item.id)) return false;
        ids.add(item.id); return true;
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      options(); render();
    } catch (_) {
      form.querySelectorAll('input,select,button').forEach((control) => { control.disabled = true; });
      count.textContent = 'Não foi possível carregar a lista agora.';
      host.replaceChildren(text('p', 'Tente novamente em alguns instantes.', 'directory-empty'));
      const retry = text('button', 'Tentar novamente', 'directory-link');
      retry.type = 'button';
      retry.addEventListener('click', () => window.location.reload());
      host.append(retry);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
