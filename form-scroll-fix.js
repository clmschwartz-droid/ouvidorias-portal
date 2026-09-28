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

    let loads = 0;

    iframe.addEventListener('load', () => {
      // O carregamento inicial não deve deslocar quem estiver em outra seção.
      loads += 1;
      if (loads === 1) {
        return;
      }
      if (section.classList.contains('hidden')) return;

      // O Fala Ouvidor tem uma única página. Após o envio, o Google mostra
      // uma confirmação curta dentro do iframe; a altura do formulário inteiro
      // deixaria centenas de pixels brancos abaixo da mensagem. O link nativo
      // "Enviar outra resposta" provoca o carregamento seguinte e restaura a altura.
      if (section.id === 'fala-ouvidor') {
        shell.classList.toggle('form-response-view', loads % 2 === 0);
      }

      // Aguarda o Google montar a etapa seguinte ou a mensagem de confirmação.
      window.setTimeout(() => {
        const mainRect = main.getBoundingClientRect();
        const showFullSection = section.id === 'fala-ouvidor'
          && shell.classList.contains('form-response-view')
          && window.innerWidth >= 768;
        const anchor = showFullSection ? section : shell;
        const target = main.scrollTop + anchor.getBoundingClientRect().top - mainRect.top - 12;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        main.scrollTo({ top: Math.max(0, target), behavior: reducedMotion ? 'auto' : 'smooth' });
      }, 120);
    });
  });
});
