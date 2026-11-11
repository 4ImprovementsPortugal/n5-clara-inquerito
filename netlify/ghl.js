/* o inquérito vira um contacto no GHL: dados, etiquetas para os workflows e uma nota com as respostas.
   Copiado e reduzido de netlify/ghl.js do site principal (N5BRAND/n5-clara-site). */
import { etiquetaPagina } from '../js/origem.js'
import { lerRespostas, resumoInquerito, planoDoConsultor } from '../js/inquerito.js'

export const PRODUTO = 'N5 Clara'
export const ETIQUETA = 'n5-clara'
export const API = 'https://services.leadconnectorhq.com'

const nomeSeparado = nome => {
  const [primeiro, ...resto] = String(nome || '').trim().split(/\s+/)
  return resto.length ? { firstName: primeiro, lastName: resto.join(' ') } : { firstName: primeiro }
}

/* números portugueses sem indicativo passam a +351; o resto segue como veio */
export function telefone(t) {
  const digitos = String(t || '').replace(/[^\d+]/g, '')
  if (!digitos) return undefined
  if (digitos.startsWith('+')) return digitos
  if (digitos.startsWith('00')) return '+' + digitos.slice(2)
  if (digitos.length === 9) return '+351' + digitos
  return '+' + digitos
}

const sem = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''))
const daOrigem = d => (d.origem ? [etiquetaPagina(d.origem)].filter(Boolean) : [])
const linhasExtra = d => (d.origem ? [`Página: ${d.origem}`] : [])

export function paraGhl(dados) {
  if (!dados?.email) return null
  const r = lerRespostas(dados.respostas)
  const p = planoDoConsultor(r)
  const base = {
    contacto: { ...nomeSeparado(dados.nome), email: dados.email, phone: telefone(dados.telefone), source: `Inquérito ${PRODUTO}` },
    etiquetas: [ETIQUETA, 'inquerito-clara', 'voucher-elite-2-meses', `plano-${p.plano}`, ...daOrigem(dados)],
    nota: [`Inquérito da ${PRODUTO}.`, `Voucher: ${dados.voucher || 'por gerar'} (2 primeiros meses da Clara Elite, ativar entre 1 e 31/12/2026, um por pessoa, não se junta à pré-reserva).`, `Plano que cobre o que escolheu: ${p.nomePlano}`, '', resumoInquerito(r), ...linhasExtra(dados)].join('\n'),
  }
  return { ...base, contacto: sem(base.contacto) }
}

/* cria ou atualiza o contacto pelo email, junta as etiquetas e deixa a nota */
export async function enviarParaGhl({ dados, token, localizacao, pedir = fetch }) {
  const r = paraGhl(dados)
  if (!r) return { ok: false, motivo: 'sem-email' }
  const cabecalhos = { Authorization: `Bearer ${token}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' }
  const chamar = async (caminho, corpo) => {
    const resp = await pedir(API + caminho, { method: 'POST', headers: cabecalhos, body: JSON.stringify(corpo) })
    if (!resp.ok) throw new Error(`GHL ${caminho} respondeu ${resp.status}`)
    return resp.json()
  }
  const { contact } = await chamar('/contacts/upsert', { locationId: localizacao, ...r.contacto })
  await chamar(`/contacts/${contact.id}/tags`, { tags: r.etiquetas })
  await chamar(`/contacts/${contact.id}/notes`, { body: r.nota })
  return { ok: true, id: contact.id }
}
