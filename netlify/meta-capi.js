/* Nº5 Clara | API de Conversões da Meta (servidor).
   Envia os eventos ao pixel N5 CLARA com o email, o telemóvel e o nome cifrados (SHA-256).
   Como diz a política de privacidade (ponto 8), só se envia quando a pessoa aceitou os cookies de marketing:
   quem chama estas funções tem de confirmar isso antes.
   Variáveis (Netlify > Site configuration > Environment variables):
   - META_CAPI_TOKEN: token gerado em Gestor de Eventos > pixel > Definições > API de Conversões (obrigatório);
   - META_TEST_EVENT_CODE: código de "Testar eventos" (só durante os testes; apagar depois). */
import { createHash } from 'node:crypto'

export const PIXEL_ID = '2995898050758755'
export const GRAPH = 'https://graph.facebook.com/v23.0'
export const URL_PRE_RESERVA_OBRIGADO = 'https://assistenteclara.numerocinco.pt/obrigado.html'

export const hash = v => {
  const s = String(v ?? '').trim().toLowerCase()
  return s ? createHash('sha256').update(s, 'utf8').digest('hex') : undefined
}

/* telemóvel só com dígitos e indicativo (a Meta pede assim): 9 dígitos portugueses passam a 351… */
export function telefoneMeta(t) {
  let d = String(t || '').trim()
  if (!d) return undefined
  const mais = d.startsWith('+')
  d = d.replace(/\D/g, '')
  if (!d) return undefined
  if (!mais && d.startsWith('00')) d = d.slice(2)
  else if (!mais && d.length === 9) d = '351' + d
  return d
}

const lista = v => (v ? [v] : undefined)
const sem = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export function dadosUtilizador({ email, telefone, nome, ip, ua, fbp, fbc } = {}) {
  const [primeiro, ...resto] = String(nome || '').trim().split(/\s+/).filter(Boolean)
  return sem({
    em: lista(hash(email)),
    ph: lista(hash(telefoneMeta(telefone))),
    fn: lista(hash(primeiro)),
    ln: lista(hash(resto.join(' '))),
    country: lista(hash('pt')),
    external_id: lista(hash(email)),
    client_ip_address: ip || undefined,
    client_user_agent: ua || undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  })
}

/* consentimento de marketing tal como chega dos formulários ("1", "true", true) */
export const aceitouMarketing = v => v === true || v === 1 || ['1', 'true', 'sim', 'yes'].includes(String(v || '').trim().toLowerCase())

export async function enviarEvento(evento, { token = process.env.META_CAPI_TOKEN, teste = process.env.META_TEST_EVENT_CODE, pedir = fetch } = {}) {
  if (!token) return { ok: false, motivo: 'sem-token (falta META_CAPI_TOKEN)' }
  const corpo = { data: [evento], ...(teste ? { test_event_code: teste } : {}) }
  const resp = await pedir(`${GRAPH}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  let resposta = null
  try { resposta = await resp.json() } catch (_) { /* resposta sem JSON */ }
  return { ok: resp.ok, estado: resp.status, resposta }
}

/* chave do registo da pré-reserva (Netlify Blobs): o email cifrado, para ligar o pagamento da Stripe ao clique no anúncio */
export const chaveEmail = email => hash(email)
export const RETENCAO_MS = 90 * 24 * 3600 * 1000 /* política de privacidade, ponto 6 */
export const LOJA = 'meta-capi-pre-reserva'
