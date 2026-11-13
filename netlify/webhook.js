/* webhook de entrada do workflow do GHL: leva as respostas por extenso, o plano recomendado e o id do evento do pixel.
   O endereço vem da variável de ambiente GHL_WEBHOOK_INQUERITO (netlify/functions/submission-created.mjs). */
import { PERGUNTAS, lerRespostas, rotulo, planoDoConsultor } from '../js/inquerito.js'

export function corpoWebhook(dados = {}) {
  const r = lerRespostas(dados.respostas)
  const legiveis = {}
  for (const p of PERGUNTAS) {
    const v = r[p.id]
    if (v === undefined) { legiveis[p.id] = ''; continue }
    legiveis[p.id] = p.tipo === 'texto' ? v : Array.isArray(v) ? v.map(x => rotulo(p.id, x) || x).join('; ') : (rotulo(p.id, v) || v)
  }
  return {
    nome: String(dados.nome || '').trim(),
    email: String(dados.email || '').trim(),
    telefone: String(dados.telefone || '').trim(),
    ...legiveis,
    plano_recomendado: planoDoConsultor(r).nomePlano,
    consentimento: true,
    origem: dados.origem || '',
    pagina: dados.pagina || '',
    event_id: dados.event_id || '',
    timestamp: new Date().toISOString(),
  }
}

export async function enviarWebhookInquerito({ dados, url, pedir = fetch }) {
  const resp = await pedir(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpoWebhook(dados)) })
  return { ok: resp.ok, estado: resp.status }
}
