/* Nº5 Clara | PostHog (nuvem da UE): como as pessoas usam a página do inquérito, para afinar a mensagem.
   - Com a estatística aceite (cookies.js → window.N5Cookies / evento "n5:cookies"): cliques, scroll, passos do inquérito
     e gravações das sessões, com tudo o que se escreve escondido.
   - Com a estatística rejeitada: só contagem anónima, sem cookies nem nada guardado no navegador (cookieless on_reject).
   - Sem escolha feita: não sai nenhum evento; ficam à espera e saem quando a pessoa escolher.
   Os pedidos saem pelo próprio domínio (/r, proxy no netlify.toml), por isso os bloqueadores de anúncios não os cortam
   e a página não faz pedidos diretos a terceiros.
   A chave phc_ é pública por desenho (só permite enviar eventos). Nunca ponhas aqui uma chave pessoal (phx_).
   Só liga nos endereços reais, para os testes locais não entrarem nos números.
   Expõe window.N5Analytics.track(evento, propriedades). */
(() => {
  'use strict';
  const TOKEN = 'phc_knF2fZccBcGVgHcayHbPfcYfXguFx3jzxaBksdduz9R3';
  const HOST = '/r';
  const DOMINIOS = ['inquerito.clara.numerocinco.pt', 'inqueritoclara.netlify.app'];

  const fila = [];
  let ph = null;
  let escolha = null; // { estatistica, marketing } depois de a pessoa decidir

  const ligado = DOMINIOS.includes(window.location.hostname);
  const lerEscolha = () => { try { return window.N5Cookies ? window.N5Cookies.get() : null; } catch (_) { return null; } };

  function aplicar() {
    if (!ph || !escolha) return;
    if (escolha.estatistica) ph.opt_in_capturing(); else ph.opt_out_capturing();
    for (const [nome, props] of fila.splice(0)) ph.capture(nome, props);
  }

  window.N5Analytics = {
    track(nome, props = {}) {
      if (!ligado) return;
      if (ph && escolha) ph.capture(nome, props);
      else fila.push([nome, props]);
    },
  };
  if (!ligado) return;

  function carregar() {
    const s = document.createElement('script');
    s.async = true;
    s.src = HOST + '/static/array.js';
    s.onload = () => {
      if (!window.posthog || typeof window.posthog.init !== 'function') return;
      window.posthog.init(TOKEN, {
        api_host: HOST,
        ui_host: 'https://eu.posthog.com',
        defaults: '2026-08-30',
        cookieless_mode: 'on_reject',
        person_profiles: 'identified_only',
        capture_pageleave: true,
        session_recording: { maskAllInputs: true },
      });
      ph = window.posthog;
      aplicar();
    };
    s.onerror = () => { /* sem PostHog a página continua igual */ };
    document.head.appendChild(s);
  }

  document.addEventListener('n5:cookies', e => { escolha = e.detail; aplicar(); });
  escolha = lerEscolha();
  // só depois de a página carregar, para não atrasar quem chega pelo anúncio
  if (document.readyState === 'complete') carregar();
  else window.addEventListener('load', carregar, { once: true });
})();
