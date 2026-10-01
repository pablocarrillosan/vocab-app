// Consulta las acepciones de una palabra en inglés. Prueba primero
// FreeDictionaryAPI.com y, si falla o no la encuentra, Wiktionary. Las
// definiciones vienen en inglés; Free Dictionary API trae además, cuando las
// tiene, las traducciones al español de cada acepción (sacadas de Wiktionary).
const TIMEOUT = 8000

function posCode(name) {
  const p = String(name || '').toLowerCase()
  if (p === 'noun' || p === 'proper noun') return 'n'
  if (p === 'verb') return 'v'
  if (p === 'adjective') return 'adj'
  if (p === 'adverb') return 'adv'
  if (p === 'phrasal verb') return 'phr'
  if (p === 'phrase' || p === 'idiom' || p === 'proverb' || p === 'prepositional phrase') return 'expr'
  return ''
}

// Wiktionary devuelve las definiciones con HTML (enlaces, cursivas…).
function plain(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

async function getJson(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (res.status === 404) return null
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

// Traducciones al español de una acepción, sin repetir y como mucho tres.
function spanish(sense) {
  const words = (sense.translations || []).filter((t) => t.language?.code === 'es' && t.word).map((t) => t.word.trim())
  return [...new Set(words)].slice(0, 3)
}

// Frase de ejemplo de una acepción: su primer ejemplo o, si no tiene, la cita
// más corta (las largas son párrafos de libros que no sirven para el examen).
const QUOTE_MAX = 160
function sentence(sense) {
  const ex = (sense.examples || []).find((x) => x && x.trim())
  if (ex) return ex.trim()
  const quotes = (sense.quotes || [])
    .map((x) => (x.text || '').replace(/\s+/g, ' ').trim())
    .filter((t) => t && t.length <= QUOTE_MAX)
    .sort((a, b) => a.length - b.length)
  return quotes[0] || ''
}

async function fromFreeDictionary(q) {
  const data = await getJson('https://freedictionaryapi.com/api/v1/entries/en/' + encodeURIComponent(q) + '?translations=true')
  const out = []
  const add = (e, s) => {
    out.push({ posName: e.partOfSpeech, def: s.definition, ex: sentence(s), es: spanish(s) })
    ;(s.subsenses || []).forEach((sub) => add(e, sub))
  }
  ;(data?.entries || []).forEach((e) => (e.senses || []).forEach((s) => add(e, s)))
  return out
}

async function fromWiktionary(q) {
  const data = await getJson('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(q.replace(/ /g, '_')))
  const out = []
  ;(data?.en || []).forEach((e) =>
    (e.definitions || []).forEach((d) =>
      out.push({ posName: e.partOfSpeech, def: plain(d.definition), ex: plain((d.examples || [])[0]) }),
    ),
  )
  return out
}

const SOURCES = [
  { name: 'Free Dictionary API', get: fromFreeDictionary },
  { name: 'Wiktionary', get: fromWiktionary },
]

// Devuelve { source, senses }. senses vacío si ninguna fuente la conoce; lanza
// un error solo si todas las fuentes han fallado.
export async function lookup(word) {
  const q = word.trim().toLowerCase().replace(/^to\s+(?=\S)/, '')
  let failed = 0
  for (const src of SOURCES) {
    try {
      const raw = await src.get(q)
      const seen = new Set()
      const senses = raw
        .filter((s) => s.def && !seen.has(s.def) && seen.add(s.def))
        .map((s) => ({
          pos: posCode(s.posName),
          posName: String(s.posName || '').toLowerCase(),
          def: s.def,
          ex: s.ex || '',
          es: s.es || [],
        }))
      if (senses.length) return { source: src.name, senses }
    } catch (e) {
      failed++
      console.warn('Diccionario ' + src.name + ':', e)
    }
  }
  if (failed === SOURCES.length) throw new Error('Ningún diccionario responde')
  return { source: '', senses: [] }
}
