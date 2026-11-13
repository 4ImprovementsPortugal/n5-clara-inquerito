import { enviarParaGhl } from '../ghl.js'
import { codigoVoucher, enviarEmailVoucher } from '../voucher.js'
import { enviarWebhookInquerito } from '../webhook.js'

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
