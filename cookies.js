/* Nº5 Clara | Definições de cookies.
   Guarda a escolha no navegador (localStorage) e emite o evento "n5:cookies".
   Estatística (PostHog) e marketing (Meta) só devem ser carregados quando o respetivo valor for true:
   escuta o evento ou chama window.N5Cookies.get(). */
(() => {
  'use strict';
  const KEY = 'n5_clara_cookies';
  const VERSION = 1;

  const read = () => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      return data && data.v === VERSION ? data : null;
    } catch (_) { return null; }
  };
  const save = (stats, marketing) => {
    const data = { v: VERSION, estatistica: !!stats, marketing: !!marketing, ts: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
    document.dispatchEvent(new CustomEvent('n5:cookies', { detail: data }));
    return data;
  };

  let root = null;
  let opener = null;

  function build() {
    root = document.createElement('div');
    root.className = 'cookie-panel';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'false');
    root.setAttribute('aria-labelledby', 'cookie-title');
    root.hidden = true;
    root.innerHTML =
      '<h2 id="cookie-title">Cookies</h2>' +
      '<p class="cookie-intro">Usamos cookies essenciais e, se aceitares, de estatística e da Meta, para melhorar o site e os nossos anúncios. <a href="privacidade.html#cookies">Saber mais</a></p>' +
      '<div class="cookie-options">' +
        '<label class="cookie-option is-locked"><input type="checkbox" checked disabled><span><strong>Essenciais</strong><small>Guardam a tua escolha sobre cookies. Sempre ativos.</small></span></label>' +
        '<label class="cookie-option"><input type="checkbox" id="cookie-stats"><span><strong>Estatística</strong><small>Como o site é usado (PostHog, na UE), com gravações das visitas em que tudo o que escreves fica escondido.</small></span></label>' +
        '<label class="cookie-option"><input type="checkbox" id="cookie-marketing"><span><strong>Marketing</strong><small>Medição e publicidade da Meta (Facebook e Instagram).</small></span></label>' +
      '</div>' +
      '<div class="cookie-actions">' +
        '<button type="button" class="cookie-btn" data-cookie="reject">Rejeitar</button>' +
        '<button type="button" class="cookie-btn cookie-btn-outline" data-cookie="save">Guardar escolha</button>' +
        '<button type="button" class="cookie-btn" data-cookie="accept">Aceitar</button>' +
      '</div>';
    document.body.appendChild(root);

    const stats = root.querySelector('#cookie-stats');
    const marketing = root.querySelector('#cookie-marketing');
    root.addEventListener('click', event => {
      const action = event.target.closest('[data-cookie]')?.dataset.cookie;
      if (!action) return;
      if (action === 'reject') save(false, false);
      else if (action === 'accept') save(true, true);
      else save(stats.checked, marketing.checked);
      close();
    });
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && read()) close();
    });
  }

  function open() {
    if (!root) build();
    const current = read();
    root.querySelector('#cookie-stats').checked = current ? current.estatistica : false;
    root.querySelector('#cookie-marketing').checked = current ? current.marketing : false;
    opener = document.activeElement;
    root.hidden = false;
    root.querySelector('input:not([disabled])').focus({ preventScroll: true });
  }

  function close() {
    if (!root) return;
    root.hidden = true;
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }

  function addFooterLink() {
    const footer = document.querySelector('.footer');
    if (!footer || footer.querySelector('[data-cookie-settings]')) return;
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'cookie-settings-link';
    link.dataset.cookieSettings = '';
    link.textContent = 'Definições de cookies';
    const links = footer.querySelector('.footer-links');
    if (links) links.appendChild(link);
    else (footer.querySelector('.footer-inner') || footer).appendChild(link);
  }

  function init() {
    addFooterLink();
    document.addEventListener('click', event => {
      if (event.target.closest('[data-cookie-settings]')) { event.preventDefault(); open(); }
    });
    if (!read()) open();
  }

  window.N5Cookies = { get: read, open };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
