import { WEEKS as B2 } from '../data/verbsB2'
import { WEEKS as C1 } from '../data/verbsC1'
import { TEXTS as TEXTS_B2 } from '../data/textsB2'
import { TEXTS as TEXTS_C1 } from '../data/textsC1'

export const KIND = { reg: 'Regulares', irr: 'Irregulares', phr: 'Phrasal verbs', prep: 'Verbos con preposición' }
export const MONTH_WEEKS = 4
export const CUMULATIVE = 'acumulativo'

// Texto de un día para el ejercicio de completar: los huecos van entre llaves
// con el verbo y las respuestas que valen, {argue|argued/were arguing}. La pista
// puede llevar palabras delante del verbo, como en gramática: {not / afford|…}.
// Cada salto de línea empieza un párrafo.
function parseText(raw, verbs) {
  if (!raw) return null
  const fields = []
  const paras = raw.x.split('\n').map((line) => {
    const segs = []
    let last = 0
    for (const m of line.matchAll(/\{([^{}|]+)\|([^{}]+)\}/g)) {
      if (m.index > last) segs.push({ text: line.slice(last, m.index) })
      const cue = m[1].trim()
      const en = cue.split('/').pop().trim()
      segs.push({ gap: fields.length, cue })
      fields.push({ a: m[2].split('/').map((x) => x.trim()), w: verbs.find((v) => v.en === en) || null })
      last = m.index + m[0].length
    }
    if (last < line.length) segs.push({ text: line.slice(last) })
    return segs
  })
  return { title: raw.t, paras, fields }
}

// Los dos planes (B2 y C1) se construyen igual a partir de sus semanas. Los
// resultados de sus días se guardan con un prefijo propio ('' en el B2, que ya
// existía así, y 'c1-' en el C1) para que el progreso de uno no pise al otro.
function buildPlan(id, label, WEEKS, TEXTS, prefix, guide, tenses) {
  const VERBS = []
  const PLAN = []
  const keyOf = (num) => prefix + num

  // Cada verbo usa su propio infinitivo como id: es único entre los dos planes y
  // así el progreso guardado no depende de la posición del verbo si la lista cambia.
  WEEKS.forEach((wk, wi) => {
    wk.forEach((d, di) => {
      const num = wi * 7 + di + 1
      const verbs = d.v.map((s) => {
        const [en, es, raw, forms] = s.split('|')
        const m = /^(.*)\[(.+?)\](.*)$/.exec(raw)
        const alts = m[2].split('/').map((x) => x.trim())
        const v = {
          id: en,
          en,
          es,
          ex: m[1] + alts[0] + m[3],
          m: { i: m[1].length, t: alts[0] },
          alts,
          k: d.k,
          day: num,
          week: wi + 1,
          lv: id,
        }
        if (forms) {
          const f = forms.split(',').map((x) => x.trim().split('/').map((y) => y.trim()))
          v.past = f[0]
          v.pp = f[1]
        }
        VERBS.push(v)
        return v
      })
      PLAN.push({ num, key: keyOf(num), week: wi + 1, type: 'learn', t: d.t, k: d.k, verbs, text: parseText(TEXTS[wi]?.[di], verbs) })
    })
  })
  WEEKS.forEach((wk, wi) => {
    const w = wi + 1
    const month = w % MONTH_WEEKS === 0
    const from = month ? w - MONTH_WEEKS + 1 : w
    PLAN.push({
      num: w * 7,
      key: keyOf(w * 7),
      week: w,
      type: month ? 'month' : 'week',
      month: month ? w / MONTH_WEEKS : null,
      t: month ? 'Repaso del mes ' + w / MONTH_WEEKS : 'Repaso de la semana ' + w,
      verbs: VERBS.filter((v) => v.week >= from && v.week <= w),
    })
  })
  PLAN.sort((a, b) => a.num - b.num)

  // El plan es secuencial: "hoy" es el primer día que todavía no has hecho.
  const nextDay = (results) => PLAN.find((p) => !results[p.key])

  return {
    id,
    label,
    guide,
    tenses,
    VERBS,
    PLAN,
    WEEKS_COUNT: WEEKS.length,
    TOTAL_DAYS: WEEKS.length * 7,
    kinds: Object.keys(KIND).filter((k) => VERBS.some((v) => v.k === k)),
    cumKey: prefix + CUMULATIVE,
    keyOf,
    planOf: (n) => PLAN.find((p) => p.num === n),
    weekReviews: PLAN.filter((p) => p.type === 'week'),
    monthReviews: PLAN.filter((p) => p.type === 'month'),
    nextDay,
    // Un repaso se abre cuando el plan llega a su día (o si ya lo hiciste).
    reached(p, results) {
      const nx = nextDay(results)
      return !!results[p.key] || !nx || nx.num >= p.num
    },
    // Verbos de los días de estudio que ya has hecho, para el repaso acumulativo.
    studiedVerbs: (results) => VERBS.filter((v) => results[keyOf(v.day)]),
  }
}

// guide: minutos de un día de estudio (en total, leyendo, en el examen y
// volviendo a los fallos). El C1 tiene 10 verbos al día en vez de 8.
// tenses: filas de la tabla «Todos los tiempos» (verbQuiz.js); el C1 añade el
// futuro perfecto y el condicional perfecto.
const TENSES = ['ps', 'pc', 'past', 'pastc', 'pp', 'ppc', 'pastp', 'fut']
export const LEVELS = {
  b2: buildPlan('b2', 'B2', B2, TEXTS_B2, '', { total: 30, read: 15, quiz: 10, fix: 5 }, TENSES),
  c1: buildPlan('c1', 'C1', C1, TEXTS_C1, 'c1-', { total: 35, read: 18, quiz: 12, fix: 5 }, [...TENSES, 'futp', 'condp']),
}

export function reviewSub(p) {
  return p.type === 'month' ? p.verbs.length + ' verbos, con prioridad a los que fallas' : 'Los ' + p.verbs.length + ' verbos de la semana'
}
