/* voucher do inquérito (/inquerito/): 15 dias do plano Clara oferecidos a quem acaba o inquérito.
   Um por pessoa (por email), uso único, não se junta à pré-reserva de 27 €.
   O email sai pelo GHL (Conversations API), a partir de pedro.ferreira@numerocinco.pt, com o voucher e o plano.
   O GHL_TOKEN precisa da permissão de enviar mensagens (conversations/message.write) e o numerocinco.pt tem de estar
   como domínio de envio no GHL. */
import { createHash } from 'node:crypto'
import { API } from './ghl.js'
import { planoDoConsultor } from '../js/inquerito.js'

export const REMETENTE = 'pedro.ferreira@numerocinco.pt'
export const CONDICOES = [
  'O voucher dá 15 dias do plano Clara, sem pagar.',
  'É um por pessoa e só se usa uma vez.',
  'Não se junta à pré-reserva de 27 €.',
  'A ativação depende das condições da campanha. Sem fidelização.',
]

/* o mesmo email dá sempre o mesmo código: quem responde duas vezes recebe o mesmo voucher, não um segundo.
   Sem letras que se confundem (I, O, 0, 1), como os códigos do Passa a Clara */
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function codigoVoucher(email) {
  const h = createHash('sha256').update(`n5-clara-inquerito:${String(email || '').trim().toLowerCase()}`).digest()
  return `CLARA-${[...h.subarray(0, 6)].map(b => LETRAS[b % LETRAS.length]).join('')}`
}

const escapar = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const primeiroNome = nome => String(nome || '').trim().split(/\s+/)[0].slice(0, 40)

/* o email em HTML simples, com estilos na linha, para abrir bem no Gmail e no Outlook.
   O texto livre do inquérito não entra no email: só as escolhas, para o formulário não servir para mandar texto a outros */
const SITE_PRE_RESERVA = 'https://assistenteclara.numerocinco.pt'
const CODIGO_PASSA = /^[A-HJ-NP-Z2-9]{6}$/

export function emailVoucher({ nome, codigo, respostas, teste = false, passaCodigo = '' }) {
  const passa = CODIGO_PASSA.test(String(passaCodigo || '').toUpperCase()) ? String(passaCodigo).toUpperCase() : ''
  const ligacao = passa ? `${SITE_PRE_RESERVA}/?ref=${passa}` : ''
  const p = planoDoConsultor(respostas)
  const ola = primeiroNome(nome) ? `Olá ${escapar(primeiroNome(nome))},` : 'Olá,'
  const tinta = '#15181D'
  const dourado = '#E8A13C'
  const cinza = '#5B6068'
  const linha = (titulo, texto, quando) => `
    <tr><td style="padding:12px 0;border-top:1px solid #E6E3DC">
      ${quando ? `<div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${dourado}">${escapar(quando)}</div>` : ''}
      <div style="font-size:16px;font-weight:700;color:${tinta};margin:2px 0 4px">${escapar(titulo)}</div>
      <div style="font-size:15px;line-height:1.5;color:${cinza}">${escapar(texto)}</div>
    </td></tr>`

  const html = `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#F5F4F0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:18px;font-family:Arial,Helvetica,sans-serif;color:${tinta}">
<tr><td style="padding:28px 28px 8px">
  <p style="font-size:16px;line-height:1.5;margin:0 0 14px">${ola}</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 14px">Obrigado por responderes ao inquérito da N5 Clara. As tuas respostas ajudam-nos a decidir o que a Clara faz primeiro. Como prometido, aqui tens o teu voucher.</p>
</td></tr>
<tr><td style="padding:8px 28px 20px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${tinta};border-radius:14px"><tr><td style="padding:22px 24px;color:#F5F4F0">
    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${dourado}">O teu voucher</div>
    <div style="font-size:18px;font-weight:700;margin:6px 0 10px">15 dias do plano Clara oferecidos</div>
    <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:.12em;color:${dourado}">${escapar(codigo)}</div>
    <div style="font-size:14px;line-height:1.5;margin-top:10px;color:#D9D6CE">A Clara abre a 1 de dezembro. Nesse dia enviamos-te a ligação para a ativares com este código.</div>
  </td></tr></table>
</td></tr>
<tr><td style="padding:0 28px 8px">
  <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${dourado}">O teu plano</div>
  <h1 style="font-size:22px;line-height:1.25;margin:6px 0 4px">${escapar(p.titulo)}</h1>
  <p style="font-size:15px;line-height:1.5;color:${cinza};margin:0 0 6px">Feito com as tuas respostas.</p>
</td></tr>
${p.pontos.length ? `<tr><td style="padding:0 28px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${p.pontos.map(x => linha(x.texto, `Hoje: ${x.antes}. Com a Clara: ${x.depois}.`)).join('')}</table></td></tr>` : ''}
<tr><td style="padding:12px 28px 0"><div style="font-size:17px;font-weight:700">O teu dia com a Clara</div></td></tr>
<tr><td style="padding:0 28px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${p.dia.map(m => linha(m.titulo, m.texto, m.quando)).join('')}</table></td></tr>
<tr><td style="padding:12px 28px 0"><div style="font-size:17px;font-weight:700">Os teus primeiros 15 dias</div></td></tr>
<tr><td style="padding:0 28px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${p.semanas.map(s => linha(s.titulo, s.texto, s.quando)).join('')}</table></td></tr>
${p.pedidos.length ? `<tr><td style="padding:8px 28px"><p style="font-size:15px;line-height:1.5;color:${cinza};margin:0">Também nos disseste que te custa: ${p.pedidos.map(escapar).join('; ').toLowerCase()}. A Clara ainda não faz isto e ficou registado para decidirmos o que desenvolvemos a seguir.</p></td></tr>` : ''}
<tr><td style="padding:12px 28px 8px"><p style="font-size:15px;line-height:1.5;margin:0"><b>Depois dos 15 dias.</b> ${escapar(p.depois)}</p></td></tr>
<tr><td style="padding:12px 28px 24px">
  <div style="font-size:13px;font-weight:700;color:${tinta};margin-bottom:6px">Condições do voucher</div>
  <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.5;color:${cinza}">${CONDICOES.map(c => `<li>${escapar(c)}</li>`).join('')}</ul>
  <p style="font-size:13px;line-height:1.5;color:${cinza};margin:10px 0 0">Termos completos em <a href="https://clara.numerocinco.pt/termos/#voucher" style="color:${tinta}">clara.numerocinco.pt/termos</a>.</p>
</td></tr>
${passa ? `<tr><td style="padding:0 28px 20px"><div style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${dourado}">Passa a Clara</div><p style="font-size:15px;line-height:1.5;margin:6px 0 8px">Por cada colega que fizer uma pré-reserva paga pela tua ligação, ganhas 1 mês gratuito de Clara Elite, até 6 meses.</p><p style="font-size:14px;line-height:1.5;margin:0;word-break:break-all"><a href="${escapar(ligacao)}" style="color:${tinta}">${escapar(ligacao)}</a><br><span style="color:${cinza}">O teu código: <b style="font-family:'Courier New',monospace;letter-spacing:.12em;color:${tinta}">${escapar(passa)}</b></span></p></td></tr>` : ''}
<tr><td style="padding:0 28px 28px"><p style="font-size:15px;line-height:1.5;margin:0">Qualquer dúvida, responde a este email.<br>Pedro Ferreira<br><span style="color:${cinza}">N5 Clara</span></p></td></tr>
</table></td></tr></table></body></html>`

  return { assunto: `${teste ? '[Teste] ' : ''}O teu voucher: 15 dias do plano Clara oferecidos`, html }
}

/* envia o email pelo GHL ao contacto que o inquérito criou ou atualizou */
export async function enviarEmailVoucher({ contactId, nome, email, respostas, teste = false, passaCodigo = '', token, pedir = fetch }) {
  const { assunto, html } = emailVoucher({ nome, codigo: codigoVoucher(email), respostas, teste, passaCodigo })
  const resp = await pedir(`${API}/conversations/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Version: '2021-04-15', 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ type: 'Email', contactId, emailFrom: REMETENTE, subject: assunto, html }),
  })
  if (!resp.ok) throw new Error(`GHL /conversations/messages respondeu ${resp.status}`)
  return { ok: true }
}
