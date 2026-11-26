/* Nº5 Clara | Lead da pré-reserva pela API de Conversões.
   Chamado pelo site assistenteclara.numerocinco.pt (GitHub Pages, sem servidor próprio) quando alguém envia o formulário.
   - envia o Lead à Meta com o mesmo event_id do pixel;
   - guarda 90 dias (Netlify Blobs) os dados do clique (fbp, fbc, IP, navegador) com o email cifrado como chave,
     para a função stripe-webhook ligar o pagamento ao anúncio.
   Só faz alguma coisa com os cookies de marketing aceites (política de privacidade, ponto 8). */
import { getStore } from '@netlify/blobs'
import { LOJA, aceitouMarketing, chaveEmail, dadosUtilizador, enviarEvento } from '../meta-capi.js'

const ORIGENS = ['https://assistenteclara.numerocinco.pt']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const cabecalhos = origem => ({
  'Access-Control-Allow-Origin': ORIGENS.includes(origem) ? origem : ORIGENS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
})

export default async (req, context) => {
  const origem = req.headers.get('origin') || ''
  const h = cabecalhos(origem)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405, headers: h })
  /* só aceita pedidos do site da pré-reserva (reduz leads falsas enviadas por terceiros) */
  if (!ORIGENS.includes(origem)) return new Response('origem não permitida', { status: 403, headers: h })

  let d
  try { d = JSON.parse(await req.text()) } catch (_) { return new Response('pedido ilegível', { status: 400, headers: h }) }
  if (!aceitouMarketing(d.marketing)) return new Response(null, { status: 204, headers: h })
  if (!EMAIL.test(String(d.email || '').trim())) return new Response('email inválido', { status: 400, headers: h })

  const clique = {
    fbp: d.fbp || null,
    fbc: d.fbc || null,
    ip: context?.ip || req.headers.get('x-nf-client-connection-ip') || null,
    ua: req.headers.get('user-agent') || null,
    telefone: d.telefone || null,
    nome: d.nome || null,
    marketing: true,
    em: Date.now(),
  }

  try {
    await getStore(LOJA).setJSON(chaveEmail(d.email), clique)
  } catch (e) {
    console.error('Blobs: não guardou o clique:', e.message)
  }

  try {
    const r = await enviarEvento({
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: d.event_id || undefined,
      action_source: 'website',
      event_source_url: d.pagina || 'https://assistenteclara.numerocinco.pt/',
      user_data: dadosUtilizador({ email: d.email, telefone: d.telefone, nome: d.nome, ip: clique.ip, ua: clique.ua, fbp: clique.fbp, fbc: clique.fbc }),
      custom_data: { content_name: 'Pré-reserva Nº5 Clara' },
    })
    console.log('Meta CAPI Lead pré-reserva:', r.ok ? 'enviado' : r.motivo || `falhou (${r.estado}) ${JSON.stringify(r.resposta)}`)
  } catch (e) {
    console.error('Meta CAPI falhou:', e.message)
  }
  return new Response(null, { status: 204, headers: h })
}
