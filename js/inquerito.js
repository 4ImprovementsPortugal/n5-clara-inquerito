/* inquérito para consultores (/inquerito/): valida a Clara, mostra o que é útil e as dores de cada um e, com as respostas,
   monta o plano de como a Clara organiza o trabalho do consultor. Quem acaba recebe por email o voucher de 15 dias do
   plano Clara (netlify/voucher.js). O plano sai só das respostas: não há médias de ninguém nem horas poupadas inventadas.
   O mesmo módulo corre na página e no servidor, para o email ter o mesmo plano que o ecrã. */
import { PRECOS } from './precos.js'

export const PERGUNTAS = [
  {
    id: 'experiencia', tipo: 'opcoes', texto: 'Há quanto tempo és consultor imobiliário?',
    opcoes: [['menos-2', 'Menos de 2 anos'], ['2-5', '2 a 5 anos'], ['mais-5', 'Mais de 5 anos']],
  },
  {
    id: 'rede', tipo: 'opcoes', texto: 'Em que marca ou rede trabalhas?',
    opcoes: [['remax', 'RE/MAX'], ['kw', 'KW'], ['era', 'ERA'], ['century21', 'Century 21'], ['zome', 'Zome'], ['outra-rede', 'Outra rede'], ['independente', 'Agência própria ou independente']],
  },
  {
    id: 'leads', tipo: 'opcoes', texto: 'Quantas leads novas recebes por mês?',
    opcoes: [['ate-10', 'Até 10'], ['10-30', '10 a 30'], ['30-60', '30 a 60'], ['mais-60', 'Mais de 60']],
  },
  {
    id: 'resposta', tipo: 'opcoes', texto: 'Quanto tempo demoras, em média, a responder a uma lead nova?',
    opcoes: [['minutos', 'Menos de 15 minutos'], ['hora', 'Até 1 hora'], ['horas', 'Algumas horas'], ['dia', 'No dia seguinte ou mais']],
  },
  {
    id: 'admin', tipo: 'opcoes', texto: 'Quantas horas por semana vão para tarefas administrativas: CRM, mensagens, documentos e relatórios?',
    opcoes: [['menos-3', 'Menos de 3 horas'], ['3-6', '3 a 6 horas'], ['6-10', '6 a 10 horas'], ['mais-10', 'Mais de 10 horas']],
  },
  {
    id: 'dores', tipo: 'varias', max: 3, texto: 'O que te custa mais no dia a dia? Escolhe até 3.',
    opcoes: [
      ['leads', 'Responder às leads a tempo'],
      ['seguimento', 'Fazer seguimento sem deixar cair ninguém'],
      ['organizar', 'Saber por onde começar o dia'],
      ['crm', 'Preencher o CRM'],
      ['angariar', 'Angariar imóveis'],
      ['documentos', 'Juntar os documentos dos imóveis'],
      ['proprietarios', 'Manter os proprietários informados'],
      ['base', 'Voltar a falar com contactos antigos'],
      ['chamadas', 'Saber o que melhorar nas chamadas'],
    ],
  },
  {
    id: 'perdes', tipo: 'opcoes', texto: 'Onde sentes que perdes mais negócios?',
    opcoes: [
      ['lead-fria', 'Leads que arrefecem antes de eu responder'],
      ['sem-seguimento', 'Contactos que deixo de seguir'],
      ['poucas-angariacoes', 'Poucas angariações'],
      ['compradores', 'Compradores pouco qualificados'],
      ['proprietarios', 'Proprietários que desistem ou vão para outra agência'],
    ],
  },
  {
    id: 'uteis', tipo: 'varias', max: 4, texto: 'Destas funções da Clara, quais usavas já amanhã? Escolhe até 4.',
    opcoes: [
      ['leads', 'Responder às leads em minutos, a qualquer hora'],
      ['plano-dia', 'As prioridades do dia por ordem, logo de manhã'],
      ['voz', 'Notas de voz que ficam registadas na ficha'],
      ['copiloto', 'Preencher o CRM da minha marca por mim'],
      ['particulares', 'Os particulares a vender sem agência na minha zona'],
      ['documentos', 'Pedir e acompanhar os documentos do imóvel'],
      ['reativar', 'Voltar a falar com a minha base de contactos'],
      ['chamadas', 'Análise e coaching das minhas chamadas'],
    ],
  },
  { id: 'resolver', tipo: 'texto', max: 300, texto: 'Se a Clara te resolvesse um problema amanhã, qual era?', ajuda: 'Escreve como dirias a um colega. Podes saltar.' },
  {
    id: 'objetivo', tipo: 'opcoes', texto: 'O que queres mais nos próximos 12 meses?',
    opcoes: [['negocios', 'Fechar mais negócios'], ['angariacoes', 'Ter mais angariações'], ['tempo', 'Ter mais tempo, a faturar o mesmo'], ['organizar', 'Ter tudo organizado num só sítio']],
  },
  {
    id: 'valor', tipo: 'opcoes', texto: 'Quanto pagarias por mês por uma assistente que fizesse o que escolheste?',
    opcoes: [['ate-50', 'Até 50 €'], ['50-100', '50 a 100 €'], ['100-150', '100 a 150 €'], ['mais-150', 'Mais de 150 €'], ['nada', 'Não pagaria']],
  },
]

const porId = Object.fromEntries(PERGUNTAS.map(p => [p.id, p]))
export const rotulo = (id, valor) => porId[id]?.opcoes?.find(([v]) => v === valor)?.[1]

/* só ficam respostas que existem nas perguntas: o servidor volta a montar o plano com o que chega do formulário */
export function limparRespostas(r = {}) {
  const limpo = {}
  for (const p of PERGUNTAS) {
    const v = r[p.id]
    if (p.tipo === 'opcoes' && rotulo(p.id, v)) limpo[p.id] = v
    if (p.tipo === 'varias' && Array.isArray(v)) {
      const validos = [...new Set(v.filter(x => rotulo(p.id, x)))].slice(0, p.max)
      if (validos.length) limpo[p.id] = validos
    }
    if (p.tipo === 'texto' && typeof v === 'string' && v.trim()) limpo[p.id] = v.trim().replace(/\s+/g, ' ').slice(0, p.max)
  }
  return limpo
}

/* lê as respostas que vêm do formulário (JSON); o que não se lê fica vazio */
export function lerRespostas(texto) {
  try {
    return limparRespostas(JSON.parse(String(texto || '{}')))
  } catch {
    return {}
  }
}

const HORAS_ADMIN = { 'menos-3': 'menos de 3 horas', '3-6': '3 a 6 horas', '6-10': '6 a 10 horas', 'mais-10': 'mais de 10 horas' }
const RESPOSTA_LENTA = new Set(['hora', 'horas', 'dia'])
const COM_CRM_DA_MARCA = new Set(['remax', 'kw', 'era', 'century21', 'zome', 'outra-rede'])

/* o que a Clara faz em cada momento do dia; «quando» é a hora ou o momento. Só funções que a Clara tem no lançamento */
const MOMENTOS = {
  plano: { quando: '08:30', titulo: 'As prioridades do dia, por ordem', texto: 'A Clara junta visitas, leads, documentos e compradores e põe-nos por ordem de prioridade, no teu Google Calendar. Começas o dia a saber a quem ligar primeiro.' },
  leads: { quando: 'A qualquer hora', titulo: 'Leads respondidas em minutos', texto: 'A Clara responde às leads das tuas campanhas pelo WhatsApp, com o teu guião, e qualifica-as: o que procuram, orçamento, prazo e crédito. As mais prontas entram no teu plano do dia.' },
  seguimento: { quando: 'Durante o dia', titulo: 'Ninguém fica esquecido', texto: 'Cada contacto tem uma prioridade de acompanhamento, com os motivos. O plano do dia avisa-te quando uma lead arrefece e diz-te o próximo passo.' },
  voz: { quando: 'Depois de cada visita', titulo: 'Falas, a Clara regista', texto: 'Gravas uma nota de voz ao sair da visita. A Clara guarda o feedback na ficha certa e marca a visita seguinte dentro dos horários que definiste.' },
  copiloto: { quando: 'Depois de cada visita', titulo: 'O CRM da tua marca preenchido', texto: 'O copiloto da Clara Elite escreve no CRM da tua marca o que a Clara captou, na sessão que já tens aberta, e grava. Nunca te pede palavras-passe.', plano: 'elite' },
  particulares: { quando: 'Segunda de manhã', titulo: 'Particulares para angariar', texto: 'Os anúncios de particulares a vender sem agência nas tuas freguesias, por prioridade de 0 a 100, com a abordagem preparada. A chamada é tua.', plano: 'pro' },
  documentos: { quando: 'Depois de cada angariação', titulo: 'Documentos sem andar atrás', texto: 'A Clara abre a checklist do imóvel, pede ao proprietário pelo WhatsApp o que falta e volta a lembrar quando tarda.' },
  reativar: { quando: 'De três em três meses', titulo: 'A tua base volta a falar contigo', texto: 'A Clara separa a base por grupos, prepara a mensagem de cada um e envia-a por ti. Quem responde volta ao teu acompanhamento.', plano: 'pro' },
  chamadas: { quando: 'Ao fim do dia', titulo: 'Coaching das tuas chamadas', texto: 'Ligas pela aplicação da Clara, com o teu número. Cada chamada fica transcrita e analisada e de manhã tens o que correu bem e o que melhorar.', plano: 'elite' },
}
const ORDEM_DIA = ['plano', 'leads', 'seguimento', 'voz', 'copiloto', 'documentos', 'particulares', 'chamadas', 'reativar']
/* cada dor e o momento do dia que lhe responde, para as semanas seguirem a ordem do que mais custa à pessoa */
const DOR_MOMENTO = { leads: 'leads', seguimento: 'seguimento', organizar: 'plano', crm: 'copiloto', angariar: 'particulares', documentos: 'documentos', base: 'reativar', chamadas: 'chamadas' }

/* dores que ainda não têm resposta na Clara: ficam no plano como pedido, para decidirmos o que fazer a seguir */
const SEM_RESPOSTA = { proprietarios: 'Manter os proprietários informados' }

/* que momentos entram no plano: as dores, a perda de negócios e as funções escolhidas */
function momentosDe(r) {
  const dores = new Set(r.dores || [])
  const uteis = new Set(r.uteis || [])
  const quer = new Set(['plano'])
  if (r.leads || dores.has('leads') || uteis.has('leads') || r.perdes === 'lead-fria' || RESPOSTA_LENTA.has(r.resposta)) quer.add('leads')
  if (dores.has('seguimento') || r.perdes === 'sem-seguimento') quer.add('seguimento')
  if (dores.has('crm') || uteis.has('voz') || r.admin === '6-10' || r.admin === 'mais-10') quer.add('voz')
  if ((dores.has('crm') || uteis.has('copiloto')) && (COM_CRM_DA_MARCA.has(r.rede) || uteis.has('copiloto'))) quer.add('copiloto')
  if (dores.has('angariar') || uteis.has('particulares') || r.perdes === 'poucas-angariacoes' || r.objetivo === 'angariacoes') quer.add('particulares')
  if (dores.has('documentos') || uteis.has('documentos')) quer.add('documentos')
  if (dores.has('base') || uteis.has('reativar')) quer.add('reativar')
  if (dores.has('chamadas') || uteis.has('chamadas')) quer.add('chamadas')
  if (uteis.has('plano-dia') || dores.has('organizar')) quer.add('plano')
  return ORDEM_DIA.filter(id => quer.has(id))
}

/* o plano da Clara que cobre o que a pessoa escolheu: Elite > Pro > Clara */
function planoDe(ids) {
  if (ids.some(id => MOMENTOS[id].plano === 'elite')) return 'elite'
  if (ids.some(id => MOMENTOS[id].plano === 'pro')) return 'pro'
  return 'clara'
}

const TITULO_OBJETIVO = {
  negocios: 'para fechares mais negócios',
  angariacoes: 'para teres mais angariações',
  tempo: 'para teres mais tempo, a faturar o mesmo',
  organizar: 'para teres tudo organizado num só sítio',
}

/* o plano: o que muda no dia, os primeiros 15 dias e o plano da Clara a seguir aos 15 dias oferecidos */
export function planoDoConsultor(entrada = {}) {
  const r = limparRespostas(entrada)
  const ids = momentosDe(r)
  /* o voucher é do plano Clara: o que só existe no Pro ou no Elite vem assinalado */
  const dia = ids.map(id => ({ id, ...MOMENTOS[id], nota: MOMENTOS[id].plano ? `Só no plano ${PRECOS[MOMENTOS[id].plano].nome}` : '' }))
  const plano = planoDe(ids)

  const pontos = []
  if (r.resposta) {
    pontos.push(RESPOSTA_LENTA.has(r.resposta)
      ? { id: 'resposta', antes: rotulo('resposta', r.resposta), depois: 'Em minutos, a qualquer hora', texto: 'Tempo de resposta a uma lead nova' }
      : { id: 'resposta', antes: rotulo('resposta', r.resposta), depois: 'Também à noite e ao fim de semana', texto: 'Tempo de resposta a uma lead nova' })
  }
  if (r.admin) pontos.push({ id: 'admin', antes: HORAS_ADMIN[r.admin], depois: 'Notas de voz, sem formulários', texto: 'Tarefas administrativas por semana' })
  if (r.leads) pontos.push({ id: 'leads', antes: `${rotulo('leads', r.leads)} por mês`, depois: 'Respondidas e por prioridade', texto: 'Leads novas' })

  /* dias 4 a 7 e 8 a 12: primeiro o que a pessoa disse que custa mais, depois o resto do dia */
  const porDor = (r.dores || []).map(d => DOR_MOMENTO[d] === 'copiloto' && !ids.includes('copiloto') ? 'voz' : DOR_MOMENTO[d])
  const ordem = [...new Set([...porDor, ...ids.filter(id => id !== 'plano')])].filter(id => ids.includes(id))
  const [primeiro, segundo] = ordem.map(id => MOMENTOS[id])
  const semanas = [
    { n: 1, quando: 'Dias 1 a 3', titulo: 'Ligar e ensinar', texto: 'Ligas o WhatsApp, as campanhas e o Google Calendar e dás à Clara o teu guião: as perguntas que farias a uma lead.' },
    { n: 2, quando: 'Dias 4 a 7', titulo: (primeiro || MOMENTOS.plano).titulo, texto: 'Começa pelo que mais te custa. Vês a Clara a trabalhar e afinas com ela o que for preciso.' },
    segundo
      ? { n: 3, quando: 'Dias 8 a 12', titulo: segundo.titulo, texto: 'Junta-se a segunda frente. A Clara já conhece o teu guião e os teus horários.' }
      : { n: 3, quando: 'Dias 8 a 12', titulo: 'O dia por ordem, todos os dias', texto: 'Usas as prioridades da manhã todos os dias. A Clara afina o teu guião com as respostas das leads.' },
    { n: 4, quando: 'Dias 13 a 15', titulo: 'Ver o que mudou', texto: 'Olhas para estes 15 dias com a Clara: as leads que ela respondeu, as que avançaram e o que ficou por fazer, e decides se continuas.' },
  ]

  const pedidos = (r.dores || []).filter(d => SEM_RESPOSTA[d]).map(d => SEM_RESPOSTA[d])

  return {
    titulo: `O teu plano com a Clara${r.objetivo ? `, ${TITULO_OBJETIVO[r.objetivo]}` : ''}`,
    pontos,
    dia,
    semanas,
    pedidos,
    plano,
    nomePlano: PRECOS[plano].nome,
    depois: plano === 'clara'
      ? `O plano Clara cobre o que escolheste, a ${PRECOS.clara.mensal} por mês + IVA.`
      : `O plano ${PRECOS[plano].nome} cobre tudo o que escolheste, a ${PRECOS[plano].mensal} por mês + IVA. Os 15 dias oferecidos são do plano Clara: o que só existe no ${PRECOS[plano].nome} aparece assinalado no teu dia.`,
  }
}

/* as respostas em texto, para a nota do contacto no GHL */
export function resumoInquerito(entrada = {}) {
  const r = limparRespostas(entrada)
  return PERGUNTAS.map(p => {
    const v = r[p.id]
    const texto = v === undefined ? 'sem resposta'
      : p.tipo === 'varias' ? v.map(x => rotulo(p.id, x)).join('; ')
      : p.tipo === 'texto' ? v
      : rotulo(p.id, v)
    return `${p.texto} ${texto}`
  }).join('\n')
}
