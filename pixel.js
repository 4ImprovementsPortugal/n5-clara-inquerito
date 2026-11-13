/* Nº5 Clara | Meta Pixel 2995898050758755.
   Só carrega com os cookies de marketing aceites (cookies.js → window.N5Cookies / evento "n5:cookies"),
   como diz a política de privacidade. Expõe window.N5Pixel.track(evento, dados, opcoes). */
(() => {
  'use strict';
  const PIXEL_ID = '2995898050758755';
  let ativo = false;
  const pendentes = [];

  function carregar() {
    if (ativo) return;
    ativo = true;
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
    pendentes.splice(0).forEach(args => fbq('track', ...args));
  }

  const marketingAceite = () => {
    try { return !!(window.N5Cookies && window.N5Cookies.get()?.marketing); } catch (_) { return false; }
  };

  window.N5Pixel = {
    track(evento, dados, opcoes) {
      const args = [evento, dados || {}, opcoes || {}];
      if (ativo && window.fbq) fbq('track', ...args);
      else pendentes.push(args); /* só é enviado se a pessoa aceitar o marketing nesta página */
    }
  };

  document.addEventListener('n5:cookies', e => { if (e.detail?.marketing) carregar(); });
  const verificar = () => { if (marketingAceite()) carregar(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', verificar);
  else verificar();
})();
