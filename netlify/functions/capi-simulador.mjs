/* Nº5 Clara | Lead do simulador pela API de Conversões.
   O simulador (simulador.numerocinco.pt) está no GitHub Pages e não tem servidor próprio, por isso chama esta função
   da Netlify quando alguém o conclui. Envia à Meta o mesmo Lead que o pixel, com o mesmo event_id: a Meta conta-o uma vez.
   Só envia quando a pessoa marcou a autorização para a Meta no formulário (política de privacidade do simulador, ponto 8).
   Endereço: https://inquerito.clara.numerocinco.pt/.netlify/functions/capi-simulador */
import { aceitouMarketing, dadosUtilizador, enviarEvento } from '../meta-capi.js'

export const ORIGENS = ['https://simulador.numerocinco.pt']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const cabecalhos = origem => ({
  'Access-Control-Allow-Origin': ORIGENS.includes(origem) ? origem : ORIGENS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
})

/* devolve o evento a enviar, ou o motivo para não enviar */
export function eventoSimulador(d = {}, { ip, ua, agora = Date.now() } = {}) {
  if (aceitouMarketing(d.teste)) return { motivo: 'inscrição de teste interno' }
  if (!aceitouMarketing(d.consentimento_meta)) return { motivo: 'sem autorização para a Meta' }
  if (!EMAIL.test(String(d.email || '').trim())) return { motivo: 'email inválido' }
  const pagina = String(d.pagina || '')
  return {
    evento: {
      event_name: 'Lead',
      event_time: Math.floor(agora / 1000),
      event_id: d.event_id || undefined,
      action_source: 'website',
      event_source_url: pagina.startsWith(ORIGENS[0]) ? pagina : `${ORIGENS[0]}/`,
      user_data: dadosUtilizador({ email: d.email, telefone: d.telefone, nome: d.nome, ip, ua, fbp: d.fbp, fbc: d.fbc }),
      custom_data: { content_name: 'Simulador Nº5 Clara' },
    },
  }
}

export default async (req, context) => {
  const origem = req.headers.get('origin') || ''
  const h = cabecalhos(origem)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405, headers: h })
  /* só aceita pedidos do simulador (reduz leads falsas enviadas por terceiros) */
  if (!ORIGENS.includes(origem)) return new Response('origem não permitida', { status: 403, headers: h })

  let d
  try { d = JSON.parse(await req.text()) } catch (_) { return new Response('pedido ilegível', { status: 400, headers: h }) }

  const { evento, motivo } = eventoSimulador(d, {
    ip: context?.ip || req.headers.get('x-nf-client-connection-ip') || null,
    ua: req.headers.get('user-agent') || null,
  })
  if (!evento) {
    console.log('Meta CAPI Lead simulador: não enviado,', motivo)
    return new Response(null, { status: 204, headers: h })
  }
  try {
    const r = await enviarEvento(evento)
    console.log('Meta CAPI Lead simulador:', r.ok ? 'enviado' : r.motivo || `falhou (${r.estado}) ${JSON.stringify(r.resposta)}`)
  } catch (e) {
    console.error('Meta CAPI Lead simulador falhou:', e.message)
  }
  return new Response(null, { status: 204, headers: h })
}
