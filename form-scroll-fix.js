/*
 * Reposiciona a página quando qualquer Google Form incorporado avança de
 * etapa ou mostra a confirmação de envio. O conteúdo do iframe pertence ao
 * Google e não é acessado; o script reage apenas ao evento de carregamento.
 */
(() => {
  const main = document.getElementById('main-content');
  const shells = document.querySelectorAll('[data-google-form-shell]');
  if (!main || !shells.length) return;

  // O Google Forms pode fazer mais de um carregamento técnico logo depois de
  // abrir. Só passamos a interpretar novos loads como navegação/envio depois
  // de oito segundos sem nenhum carregamento do iframe. Isso evita que o Fala
  // Ouvidor nasça indevidamente com a altura curta da confirmação.
  const INITIAL_SETTLE_MS = 8000;

  shells.forEach((shell) => {
    const section = shell.closest('.section-content');
    const iframe = shell.querySelector('[data-google-form-frame]');
    if (!section || !iframe) return;

    let responseVisible = false;
    let initialLoadsSettled = false;
    let settleTimer;

    const postponeActivation = () => {
      initialLoadsSettled = false;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        initialLoadsSettled = true;
      }, INITIAL_SETTLE_MS);
    };

    // Protege também o caso em que o iframe terminou o primeiro carregamento
    // antes de este script ser executado.
    postponeActivation();

    iframe.addEventListener('load', () => {
      // Todos os loads agrupados na abertura pertencem à inicialização do
      // Google Form. Cada um reinicia a janela de estabilização.
      if (!initialLoadsSettled) {
        postponeActivation();
        return;
      }

      // O carregamento inicial não deve deslocar quem estiver em outra seção.
      if (section.classList.contains('hidden')) return;

      // O Fala Ouvidor tem uma única página. Após o envio, o Google mostra
      // uma confirmação curta dentro do iframe; a altura do formulário inteiro
      // deixaria centenas de pixels brancos abaixo da mensagem. O link nativo
      // "Enviar outra resposta" provoca o carregamento seguinte e restaura a altura.
      if (section.id === 'fala-ouvidor') {
        responseVisible = !responseVisible;
        shell.classList.toggle('form-response-view', responseVisible);
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
})();
