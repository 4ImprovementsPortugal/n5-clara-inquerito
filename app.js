// As perguntas, o plano e as regras vêm de js/inquerito.js, o mesmo módulo que corre no servidor
// (netlify/voucher.js), para o email e o ecrã terem o mesmo plano.
import { PERGUNTAS, planoDoConsultor, limparRespostas } from './js/inquerito.js';
import { origemDe } from './js/origem.js';

const FORMULARIO = 'inquerito-clara';
const STORAGE_KEY = 'n5_clara_inquerito_v1';
const RESULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const qs = (selector, root = document) => root.querySelector(selector);
const getPage = () => document.body.dataset.page;
const codificar = obj => Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

function initSurvey() {
  const stage = qs('#question-stage');
  const contactStage = qs('#contact-stage');
  const form = qs('#survey-form');
  if (!stage || !form) return;
  const nextButton = qs('#next-btn');
  const submitButton = qs('#submit-btn');
  const backButton = qs('#back-btn');
  const errorEl = qs('#form-error');
  const progressBar = qs('#progress-bar');
  const progressEl = qs('#survey-progress');
  const stepLabel = qs('#form-step-label');
  const total = PERGUNTAS.length;
  let step = 0;
  const responses = {};

  function showError(message) { errorEl.textContent = message; errorEl.hidden = !message; }

  function render() {
    showError('');
    const isContact = step === total;
    stage.hidden = isContact;
    contactStage.hidden = !isContact;
    nextButton.hidden = isContact;
    submitButton.hidden = !isContact;
    backButton.hidden = step === 0;
    stepLabel.textContent = isContact ? 'ÚLTIMO PASSO' : `PERGUNTA ${step + 1} DE ${total}`;
    progressBar.style.width = `${(step / (total + 1)) * 100}%`;
    progressEl.setAttribute('aria-valuenow', String(step));
    if (isContact) return;
    const q = PERGUNTAS[step];
    stage.replaceChildren();
    const eyebrow = document.createElement('span');
    eyebrow.className = 'question-index';
    eyebrow.textContent = `PERGUNTA ${String(step + 1).padStart(2, '0')}`;
    const heading = document.createElement('h3');
    heading.className = 'question-title';
    heading.id = 'current-question-title';
    heading.textContent = q.texto;
    stage.append(eyebrow, heading);
    if (q.tipo === 'texto') {
      const help = document.createElement('p'); help.className = 'question-help'; help.textContent = q.ajuda || '';
      const wrapper = document.createElement('div'); wrapper.className = 'field';
      const label = document.createElement('label'); label.htmlFor = 'answer-text'; label.textContent = 'A tua resposta (opcional)';
      const input = document.createElement('textarea'); input.id = 'answer-text'; input.maxLength = q.max; input.placeholder = 'Escreve aqui, se quiseres...'; input.value = responses[q.id] || '';
      wrapper.append(label, input); stage.append(help, wrapper);
      return;
    }
    if (q.tipo === 'varias') {
      const help = document.createElement('p'); help.className = 'question-help'; help.textContent = `Seleciona até ${q.max} opções.`;
      stage.append(help);
    }
    const list = document.createElement('div'); list.className = 'choices'; list.setAttribute('role', 'group'); list.setAttribute('aria-labelledby', heading.id);
    for (const [value, text] of q.opcoes) {
      const choice = document.createElement('label'); choice.className = 'choice';
      const input = document.createElement('input'); input.type = q.tipo === 'varias' ? 'checkbox' : 'radio'; input.name = q.id; input.value = value;
      input.checked = q.tipo === 'varias' ? (responses[q.id] || []).includes(value) : responses[q.id] === value;
      if (q.tipo === 'varias') {
        input.addEventListener('change', () => {
          const checked = [...list.querySelectorAll('input:checked')];
          if (checked.length > q.max) { input.checked = false; showError(`Podes selecionar até ${q.max} opções.`); }
          else showError('');
        });
      } else input.addEventListener('change', () => showError(''));
      const labelText = document.createElement('span'); labelText.textContent = text;
      choice.append(input, labelText); list.append(choice);
    }
    stage.append(list);
  }

  function capture() {
    const q = PERGUNTAS[step];
    if (!q) return true;
    if (q.tipo === 'texto') { const t = qs('#answer-text', stage); responses[q.id] = t ? t.value.trim() : ''; return true; }
    const checked = [...stage.querySelectorAll('input:checked')].map(e => e.value);
    if (!checked.length) { showError('Escolhe uma opção para continuar.'); return false; }
    responses[q.id] = q.tipo === 'varias' ? checked : checked[0];
    return true;
  }

  function move(delta) {
    if (delta > 0 && !capture()) return;
    step = Math.max(0, Math.min(total, step + delta));
    render();
    const top = qs('#questionnaire').getBoundingClientRect().top;
    if (top < -50 || top > innerHeight * .7) qs('#questionnaire').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  nextButton.addEventListener('click', () => move(1));
  backButton.addEventListener('click', () => move(-1));

  let submitting = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (step !== total || submitting) return;
    const name = qs('#lead-name'); const email = qs('#lead-email'); const phone = qs('#lead-phone');
    if (!name.value.trim()) { showError('Preciso de um nome para saber como te tratar.'); name.focus(); return; }
    if (!EMAIL.test(email.value.trim())) { showError('Este email não me parece certo. Confirmas?'); email.focus(); return; }
    if (phone.value.trim()) {
      const digits = phone.value.replace(/\D/g, '');
      if (digits.length < 9 || digits.length > 15) { showError('O número tem de ter entre 9 e 15 dígitos.'); phone.focus(); return; }
    }

    if (!qs('#privacy').checked) { showError('Precisamos que confirmes a política de privacidade para concluir.'); qs('#privacy').focus(); return; }

    const clean = limparRespostas(responses);
    submitting = true;
    submitButton.disabled = true;
    const originalLabel = submitButton.innerHTML;
    submitButton.textContent = 'A enviar...';
    try {
      // Netlify Forms: o formulário escondido «inquerito-clara» está no index.html.
      // A função netlify/functions/submission-created.mjs trata do GHL e do email com o voucher.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: codificar({
          'form-name': FORMULARIO,
          nome: name.value.trim(),
          email: email.value.trim(),
          telefone: phone.value.trim(),
          respostas: JSON.stringify(clean),
          consentimento: true,
          origem: origemDe(location.pathname, location.search),
          teste: '',
          'empresa-site': qs('#empresa-site').value || '',
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      // Servidor local simples (python -m http.server) não aceita POST: deixa testar o resto do percurso.
      const local = ['localhost', '127.0.0.1'].includes(location.hostname);
      if (!res.ok && local && [404, 405, 501].includes(res.status)) {
        console.warn('Modo local: o formulário não foi enviado (só a Netlify recebe o POST). Segue para a página de obrigado.');
      } else if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Inquérito: o envio falhou:', err.message, '(405/501/404 = o site não está a correr na Netlify; sem erro de rede = falta o formulário detetado)');
      showError('Não conseguimos enviar. Confirma a ligação à internet e tenta outra vez.');
      submitting = false;
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
      return;
    }
    // Só o primeiro nome e as respostas ficam no navegador (sem email nem telemóvel).
    const publicResult = { firstName: name.value.trim().split(/\s+/)[0], answers: clean, completedAt: Date.now() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(publicResult)); } catch { /* sem armazenamento: a página de obrigado mostra o estado vazio */ }
    location.assign('obrigado.html');
  });
  render();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function initThanks() {
  const holder = qs('#thanks-content');
  if (!holder) return;
  let result;
  try { result = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { result = null; }
  if (result && Date.now() - (result.completedAt || 0) > RESULT_TTL_MS) {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignora */ }
    result = null;
  }
  if (!result?.answers) { qs('#no-result').hidden = false; return; }
  qs('#has-result').hidden = false;

  const p = planoDoConsultor(result.answers);
  const first = (result.firstName || '').slice(0, 80);
  qs('#thanks-name').textContent = first ? `, ${first}` : '';
  qs('#personalized-title').textContent = `${p.titulo}.`;

  const points = qs('#plan-points');
  if (p.pontos.length) {
    for (const x of p.pontos) {
      const li = el('li');
      li.append(el('strong', '', x.texto), el('span', '', `Hoje: ${x.antes}`), el('span', 'with-clara', `Com a Clara: ${x.depois}`));
      points.append(li);
    }
  } else qs('#plan-points-card').hidden = true;

  const day = qs('#plan-day');
  for (const m of p.dia) {
    const li = el('li');
    li.append(el('span', 'when', m.quando), el('b', '', m.titulo), el('span', '', m.texto));
    if (m.nota) li.append(el('span', 'only-in', m.nota));
    day.append(li);
  }

  const weeks = qs('#plan-weeks');
  for (const s of p.semanas) {
    const li = el('li', 'phase');
    li.append(el('b', '', s.quando.toUpperCase()), el('strong', '', s.titulo), el('p', '', s.texto));
    weeks.append(li);
  }

  if (p.pedidos.length) {
    qs('#plan-requests').textContent = `Também te custa: ${p.pedidos.join('; ').toLowerCase()}. A Clara ainda não faz isto e ficou registado para decidirmos o que desenvolvemos a seguir.`;
    qs('#plan-requests').hidden = false;
  }
  qs('#recommended-plan').textContent = p.nomePlano;
  qs('#recommended-why').textContent = p.depois;
}

function initVideo() {
  const video = qs('#intro-video');
  if (!video) return;
  const soundBtn = qs('#video-sound');
  video.muted = true;
  // Os navegadores só deixam arrancar sozinho sem som: toca em silêncio
  // quando está visível e pausa quando sai do ecrã.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {}); else video.pause();
    }, { threshold: .4 }).observe(video);
  } else video.play().catch(() => {});
  const sync = () => { soundBtn.hidden = !video.muted; };
  video.addEventListener('volumechange', sync);
  sync();
  soundBtn.addEventListener('click', () => {
    video.muted = false; video.loop = false; video.currentTime = 0; video.play().catch(() => {});
  });
}

// Os módulos correm depois de o documento estar pronto.
initVideo();
if (getPage() === 'survey') initSurvey();
if (getPage() === 'thanks') initThanks();
