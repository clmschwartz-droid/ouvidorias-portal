/*
 * Reposiciona a página quando qualquer Google Form incorporado avança de
 * etapa ou mostra a confirmação de envio. O conteúdo do iframe pertence ao
 * Google e não é acessado; o script reage apenas ao evento de carregamento.
 */
(() => {
  const main = document.getElementById('main-content');
  const shells = document.querySelectorAll('[data-google-form-shell]');
  if (!main || !shells.length) return;

  // O evento load da janela só ocorre depois do carregamento inicial de todos
  // os iframes. Assim, qualquer load posterior de um formulário corresponde a
  // uma mudança provocada pela pessoa (próxima etapa, envio ou nova resposta),
  // mesmo quando o load inicial do iframe aconteceu antes deste script rodar.
  let portalReady = document.readyState === 'complete';
  window.addEventListener('load', () => {
    portalReady = true;
  }, { once: true });

  shells.forEach((shell) => {
    const section = shell.closest('.section-content');
    const iframe = shell.querySelector('[data-google-form-frame]');
    if (!section || !iframe) return;

    let responseVisible = false;
    let userInteracted = false;

    // O Google pode recarregar internamente o iframe logo após a abertura,
    // inclusive depois do evento load da página principal. Esse carregamento
    // técnico não é uma confirmação de envio. Só reagimos a um load depois de
    // a pessoa efetivamente focar o formulário incorporado.
    const markInteraction = () => {
      userInteracted = true;
    };
    iframe.addEventListener('focus', markInteraction);
    window.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (document.activeElement === iframe) markInteraction();
      }, 0);
    });

    iframe.addEventListener('load', () => {
      // O carregamento inicial não deve deslocar quem estiver em outra seção.
      // Não contamos eventos: o primeiro load observado pode já ser o envio.
      if (!portalReady) return;
      if (section.classList.contains('hidden')) return;
      if (!userInteracted) return;

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
