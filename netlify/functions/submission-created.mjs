import { enviarParaGhl } from '../ghl.js'
import { codigoVoucher, enviarEmailVoucher } from '../voucher.js'
import { enviarWebhookInquerito } from '../webhook.js'
import { aceitouMarketing, dadosUtilizador, enviarEvento } from '../meta-capi.js'

/* a Netlify junta ip, user_agent e referrer aos dados de cada inscrição */
export async function enviarLeadInquerito(payload, opcoes) {
  const d = payload?.data || {}
  if (d.teste === '1') return { ok: false, motivo: 'inscrição de teste interno' }
  if (!aceitouMarketing(d.marketing)) return { ok: false, motivo: 'sem consentimento de marketing' }
  return enviarEvento({
    event_name: 'Lead',
    event_time: Math.floor(Date.parse(payload.created_at || '') / 1000) || Math.floor(Date.now() / 1000),
    event_id: d.event_id || undefined,
    action_source: 'website',
    event_source_url: d.pagina || 'https://inquerito.clara.numerocinco.pt/',
    user_data: dadosUtilizador({ email: d.email, telefone: d.telefone, nome: d.nome, ip: d.ip || payload.ip, ua: d.user_agent || payload.user_agent, fbp: d.fbp, fbc: d.fbc }),
    custom_data: { content_name: 'Inquérito Nº5 Clara' },
  }, opcoes)
}

/* corre a cada inscrição válida do formulário «inquerito-clara» (Netlify Forms; o spam fica de fora).
   Precisa das variáveis GHL_TOKEN e GHL_LOCATION_ID (Netlify > Site configuration > Environment variables).
   O token do GHL precisa também de conversations/message.write, e numerocinco.pt tem de ser domínio de envio no GHL. */
export const handler = async event => {
  let payload
  try {
    payload = JSON.parse(event.body).payload
  } catch (e) {
    console.error('inscrição ilegível:', e.message)
    return { statusCode: 200 }
  }
  if (payload.form_name !== 'inquerito-clara') return { statusCode: 200 }

  /* API de Conversões: Lead do inquérito, com o mesmo event_id do pixel (a Meta junta os dois). Só com marketing aceite. */
  try {
    const r = await enviarLeadInquerito(payload)
    console.log('Meta CAPI Lead inquérito:', r.ok ? 'enviado' : r.motivo || `falhou (${r.estado}) ${JSON.stringify(r.resposta)}`)
  } catch (e) {
    console.error('Meta CAPI falhou:', e.message)
  }

  const { GHL_TOKEN: token, GHL_LOCATION_ID: localizacao, GHL_WEBHOOK_INQUERITO: webhook } = process.env

  /* webhook do workflow do GHL: corre à parte e nunca trava o resto. O endereço fica só na variável GHL_WEBHOOK_INQUERITO (não no código) */
  if (webhook) {
    try {
      const r = await enviarWebhookInquerito({ dados: payload.data, url: webhook })
      console.log('webhook GHL inquerito', r.ok ? 'enviado' : `falhou (${r.estado})`)
    } catch (e) {
      console.error('webhook GHL falhou:', e.message)
    }
  } else console.log('webhook GHL por configurar: falta GHL_WEBHOOK_INQUERITO')

  if (!token || !localizacao) {
    console.log('GHL por configurar: falta GHL_TOKEN ou GHL_LOCATION_ID')
    return { statusCode: 200 }
  }

  try {
    const dados = { ...payload.data, voucher: codigoVoucher(payload.data?.email) }
    const r = await enviarParaGhl({ dados, token, localizacao })
    console.log('GHL inquerito-clara', r.ok ? 'contacto atualizado' : r.motivo)
    /* o voucher e o plano seguem por email, pelo GHL, para o contacto que acabou de ser criado */
    if (r.ok) {
      try {
        await enviarEmailVoucher({ contactId: r.id, nome: dados.nome, email: dados.email, respostas: dados.respostas, teste: dados.teste === '1', passaCodigo: dados.codigo, token })
        console.log('GHL inquerito-clara: email do voucher enviado')
      } catch (e) {
        console.error('email do voucher falhou:', e.message)
      }
    }
  } catch (e) {
    console.error('GHL falhou:', e.message)
  }
  return { statusCode: 200 }
}
