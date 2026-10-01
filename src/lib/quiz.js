import { fold, cmp, escRe, shuffle } from './text'
import { headKey } from './words'

const CAP = 60

export const altsOf = (en) =>
  en
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)

// Busca en la frase de ejemplo dónde aparece la palabra (o alguna de sus
// variantes), para poder convertirla en un hueco que rellenar.
// Los verbos del plan ya traen la posición precalculada en w.m.
export function matchIn(w) {
  if (w.m) return w.m
  const ex = w.ex || ''
  if (!ex) return null
  const alts = altsOf(w.en)
    .map((a) => a.replace(/^to\s+(?=\S)/i, ''))
    .sort((a, b) => b.length - a.length)
  for (const a of alts) {
    if (!a) continue
    let re
    try {
      re = new RegExp('(^|[^\\p{L}])(' + escRe(a).replace(/\s+/g, '\\s+') + '\\p{L}*)', 'iu')
    } catch (e) {
      continue
    }
    const m = re.exec(ex)
    if (m) return { i: m.index + m[1].length, t: m[2] }
  }
  return null
}

// Devuelve la frase partida en tres trozos para envolver el hueco en <mark>
// desde la plantilla, sin usar v-html.
export function exParts(w) {
  const m = matchIn(w)
  if (!m) return { before: w.ex, match: '', after: '' }
  return { before: w.ex.slice(0, m.i), match: m.t, after: w.ex.slice(m.i + m.t.length) }
}

// multi: la palabra tiene otros significados apuntados. Entonces «¿Qué significa
// bank?» tendría más de una respuesta buena, así que se pregunta al revés.
function makeQ(item, pool, multi) {
  const w = item.w
  if (item.k === 'mcq') {
    const e2s = !multi && Math.random() < 0.5
    const seen = new Set([e2s ? fold(w.es) : cmp(w.en)])
    const opts = []
    for (const x of shuffle(pool)) {
      if (x.id === w.id) continue
      const key = e2s ? fold(x.es) : cmp(x.en)
      if (seen.has(key)) continue
      seen.add(key)
      opts.push(e2s ? x.es : x.en)
      if (opts.length >= 3) break
    }
    if (opts.length) {
      const answer = e2s ? w.es : w.en
      return { type: 'mcq', dir: e2s ? 'e2s' : 's2e', w, answer, options: shuffle([answer, ...opts]) }
    }
  }
  const m = matchIn(w)
  if (m) return { type: 'cloze', w, m }
  return { type: 'type', w }
}

// words: las palabras de esta tanda de examen. pool: todas las palabras del
// usuario, para poder sacar opciones falsas de otras palabras suyas.
export function buildQuestions(words, pool) {
  let items = []
  words.forEach((w) => {
    const miss = w.missed_count > 0
    const kinds = miss ? ['mcq', 'prod'] : [Math.random() < 0.5 ? 'mcq' : 'prod']
    kinds.forEach((k) => items.push({ w, k, pr: miss ? 1 : 0 }))
  })
  if (items.length > CAP) {
    items = shuffle(items)
      .sort((a, b) => b.pr - a.pr)
      .slice(0, CAP)
  }
  const heads = new Map()
  pool.forEach((x) => heads.set(headKey(x.en), (heads.get(headKey(x.en)) || 0) + 1))
  return shuffle(items).map((it) => makeQ(it, pool, (heads.get(headKey(it.w.en)) || 0) > 1))
}

// Todas las formas en inglés que se aceptan como correctas: la propia palabra
// y cualquier otra palabra del usuario con el mismo significado en español.
export function acceptedAnswers(q, pool) {
  const w = q.w
  if (q.type === 'cloze') return [...altsOf(w.en), q.m.t]
  const out = []
  pool.forEach((x) => {
    if (x.id === w.id || fold(x.es) === fold(w.es)) out.push(...altsOf(x.en))
  })
  return out
}
