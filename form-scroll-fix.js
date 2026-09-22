/*
 * Reposiciona a página quando qualquer Google Form incorporado avança de
 * etapa ou mostra a confirmação de envio. O conteúdo do iframe pertence ao
 * Google e não é acessado; o script reage apenas ao evento de carregamento.
 */
document.addEventListener('DOMContentLoaded', () => {
  const main = document.getElementById('main-content');
  const shells = document.querySelectorAll('[data-google-form-shell]');
  if (!main || !shells.length) return;

  shells.forEach((shell) => {
    const section = shell.closest('.section-content');
    const iframe = shell.querySelector('[data-google-form-frame]');
    if (!section || !iframe) return;

    let firstLoad = true;

    iframe.addEventListener('load', () => {
      // O carregamento inicial não deve deslocar quem estiver em outra seção.
      if (firstLoad) {
        firstLoad = false;
        return;
      }
      if (section.classList.contains('hidden')) return;

      // Aguarda o Google montar a etapa seguinte ou a mensagem de confirmação.
      window.setTimeout(() => {
        const mainRect = main.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const target = main.scrollTop + shellRect.top - mainRect.top - 12;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        main.scrollTo({ top: Math.max(0, target), behavior: reducedMotion ? 'auto' : 'smooth' });
      }, 120);
    });
  });
});
