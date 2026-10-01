import { cmp } from './text'

// Categorías gramaticales que se pueden marcar en una palabra: [código, nombre, abreviatura].
export const POS = [
  ['n', 'sustantivo', 'n.'],
  ['v', 'verbo', 'v.'],
  ['adj', 'adjetivo', 'adj.'],
  ['adv', 'adverbio', 'adv.'],
  ['phr', 'phrasal verb', 'phr. v.'],
  ['expr', 'expresión', 'expr.'],
]
export const posLabel = (p) => POS.find((x) => x[0] === p)?.[2] || ''

// Clave con la que se agrupan los significados de una misma palabra.
export const headKey = (en) => cmp(en)

// Agrupa las filas por palabra en inglés, en el orden en que aparece cada una
// por primera vez, con sus significados ordenados del más antiguo al más nuevo.
export function groupWords(list) {
  const groups = new Map()
  list.forEach((w) => {
    const k = headKey(w.en)
    if (!groups.has(k)) groups.set(k, { key: k, en: w.en, senses: [] })
    groups.get(k).senses.push(w)
  })
  const out = [...groups.values()]
  out.forEach((g) => g.senses.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0)))
  return out
}

// Texto del significado con su matiz, para mostrarlo en preguntas y respuestas.
export const meaning = (w) => (w.note ? w.es + ' (' + w.note + ')' : w.es)
