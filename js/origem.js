/* de onde veio a inscrição: a página e o anúncio (utm_content). Formato «página · anúncio», o que o servidor lê. */
const limpar = a => String(a || '').replace(/[^\w-]/g, '').slice(0, 60)

export function origemDe(caminho = '/', pesquisa = '') {
  const anuncio = limpar(new URLSearchParams(pesquisa).get('utm_content'))
  return [caminho || '/', anuncio].filter(Boolean).join(' · ')
}

/* etiqueta do GHL para a página: «pagina-inquerito», «pagina-inicio», ... */
export function etiquetaPagina(origem) {
  const caminho = String(origem || '').split(' · ')[0]
  const pasta = caminho.split('/').filter(Boolean)[0]
  if (!caminho) return null
  return `pagina-${(pasta || 'inicio').toLowerCase().replace(/[^a-z0-9-]/g, '')}`
}
