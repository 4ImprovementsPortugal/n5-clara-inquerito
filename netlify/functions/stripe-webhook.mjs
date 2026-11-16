/* Nº5 Clara | Compra da pré-reserva (27 €) pela API de Conversões, a partir do webhook da Stripe.
   Na Stripe: Programadores > Webhooks > Adicionar endpoint
     URL: https://inquerito.clara.numerocinco.pt/.netlify/functions/stripe-webhook
     Eventos: checkout.session.completed e checkout.session.async_payment_succeeded
   O segredo de assinatura (whsec_…) vai para a variável STRIPE_WEBHOOK_SECRET da Netlify.
   - cartão / MB WAY: conta em checkout.session.completed com payment_status = paid;
   - Multibanco: só conta em checkout.session.async_payment_succeeded (quando o pagamento entra mesmo).
   Só envia se a pessoa aceitou o marketing ao preencher o formulário (registo guardado pela função capi-lead). */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getStore } from '@netlify/blobs'
import { LOJA, RETENCAO_MS, URL_PRE_RESERVA_OBRIGADO, chaveEmail, dadosUtilizador, enviarEvento } from '../meta-capi.js'

const TOLERANCIA_S = 300

export function assinaturaValida(corpo, cabecalho, segredo, agora = Math.floor(Date.now() / 1000)) {
  if (!cabecalho || !segredo) return false
  const partes = {}
  const v1 = []
  for (const p of String(cabecalho).split(',')) {
    const [k, v] = p.split('=')
    if (k === 't') partes.t = v
    if (k === 'v1') v1.push(v)
  }
  if (!partes.t || !v1.length) return false
  if (Math.abs(agora - Number(partes.t)) > TOLERANCIA_S) return false
  const esperado = createHmac('sha256', segredo).update(`${partes.t}.${corpo}`, 'utf8').digest('hex')
  return v1.some(v => v.length === esperado.length && timingSafeEqual(Buffer.from(v), Buffer.from(esperado)))
}

/* devolve a sessão se este evento é uma pré-reserva paga, senão null */
export function preReservaPaga(evento) {
  const s = evento?.data?.object
  if (!s || s.object !== 'checkout.session') return null
  if (s.amount_total !== 2700 || String(s.currency).toLowerCase() !== 'eur') return null
  if (evento.type === 'checkout.session.completed' && s.payment_status === 'paid') return s
  if (evento.type === 'checkout.session.async_payment_succeeded') return s
  return null
}

export function eventoCompra(sessao, clique, criadoEm) {
  const c = sessao.customer_details || {}
  return {
    event_name: 'Purchase',
    event_time: criadoEm || Math.floor(Date.now() / 1000),
    event_id: sessao.id,
    action_source: 'website',
    event_source_url: URL_PRE_RESERVA_OBRIGADO,
    user_data: dadosUtilizador({
      email: c.email,
      telefone: c.phone || clique.telefone,
      nome: c.name || clique.nome,
      ip: clique.ip, ua: clique.ua, fbp: clique.fbp, fbc: clique.fbc,
    }),
    custom_data: { value: 27, currency: 'EUR', content_name: 'Pré-reserva Nº5 Clara' },
  }
}

export default async req => {
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405 })
  const corpo = await req.text()
  if (!assinaturaValida(corpo, req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET)) {
    console.error('Stripe: assinatura inválida ou STRIPE_WEBHOOK_SECRET em falta')
    return new Response('assinatura inválida', { status: 400 })
  }
  let evento
  try { evento = JSON.parse(corpo) } catch (_) { return new Response('pedido ilegível', { status: 400 }) }

  const sessao = preReservaPaga(evento)
  if (!sessao) return new Response('ignorado', { status: 200 })

  const email = sessao.customer_details?.email
  let clique = null
  try { clique = email ? await getStore(LOJA).get(chaveEmail(email), { type: 'json' }) : null } catch (e) { console.error('Blobs:', e.message) }
  if (!clique?.marketing || Date.now() - (clique.em || 0) > RETENCAO_MS) {
    console.log('Meta CAPI Purchase: sem consentimento de marketing registado para este email, não enviado', sessao.id)
    return new Response('sem consentimento', { status: 200 })
  }

  try {
    const r = await enviarEvento(eventoCompra(sessao, clique, evento.created))
    console.log('Meta CAPI Purchase:', sessao.id, r.ok ? 'enviado' : r.motivo || `falhou (${r.estado}) ${JSON.stringify(r.resposta)}`)
    /* 500 faz a Stripe repetir mais tarde se a Meta falhar; o event_id igual evita contar duas vezes */
    if (!r.ok && r.estado >= 500) return new Response('meta falhou', { status: 500 })
  } catch (e) {
    console.error('Meta CAPI falhou:', e.message)
    return new Response('erro', { status: 500 })
  }
  return new Response('ok', { status: 200 })
}
