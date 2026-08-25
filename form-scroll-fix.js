/*
 * Corrige a posição da página ao avançar entre etapas do Google Form incorporado.
 * Não acessa o conteúdo do iframe (que é de outro domínio); apenas reage ao
 * recarregamento do próprio iframe e reposiciona o contêiner principal.
 */
document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('inscreva-se');
  const iframe = section ? section.querySelector('iframe') : null;
  const main = document.getElementById('main-content');
  if (!section || !iframe || !main) return;

  let firstLoad = true;

  iframe.addEventListener('load', () => {
    // O carregamento inicial do formulário não deve deslocar quem estiver em outra seção.
    if (firstLoad) {
      firstLoad = false;
      return;
    }
    if (section.classList.contains('hidden')) return;

    // Aguarda o Google Form terminar de montar a nova etapa antes de reposicionar a tela.
    window.setTimeout(() => {
      const mainRect = main.getBoundingClientRect();
      const iframeRect = iframe.getBoundingClientRect();
      const target = main.scrollTop + iframeRect.top - mainRect.top - 12;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      main.scrollTo({ top: Math.max(0, target), behavior });
    }, 80);
  });
});
