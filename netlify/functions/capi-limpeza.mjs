/* Nº5 Clara | apaga todos os dias os registos de clique com mais de 90 dias (política de privacidade, ponto 6). */
import { getStore } from '@netlify/blobs'
import { LOJA, RETENCAO_MS } from '../meta-capi.js'

export default async () => {
  const loja = getStore(LOJA)
  const { blobs } = await loja.list()
  let apagados = 0
  for (const { key } of blobs) {
    const r = await loja.get(key, { type: 'json' }).catch(() => null)
    if (!r || Date.now() - (r.em || 0) > RETENCAO_MS) { await loja.delete(key); apagados++ }
  }
  console.log(`capi-limpeza: ${apagados} de ${blobs.length} registos apagados`)
}

export const config = { schedule: '@daily' }
