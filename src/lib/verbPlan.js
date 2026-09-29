import { WEEKS } from '../data/verbs'

export const KIND = { reg: 'Regulares', irr: 'Irregulares', phr: 'Phrasal verbs' }
export const MONTH_WEEKS = 4
export const WEEKS_COUNT = WEEKS.length
export const TOTAL_DAYS = WEEKS.length * 7

// Cada verbo usa su propio infinitivo como id: es único en la lista y así el
// progreso guardado no depende de la posición del verbo si la lista cambia.
export const VERBS = []
export const PLAN = []

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
      }
      if (forms) {
        const f = forms.split(',').map((x) => x.trim().split('/').map((y) => y.trim()))
        v.past = f[0]
        v.pp = f[1]
      }
      VERBS.push(v)
      return v
    })
    PLAN.push({ num, week: wi + 1, type: 'learn', t: d.t, k: d.k, verbs })
  })
})
WEEKS.forEach((wk, wi) => {
  const w = wi + 1
  const month = w % MONTH_WEEKS === 0
  const from = month ? w - MONTH_WEEKS + 1 : w
  PLAN.push({
    num: w * 7,
    week: w,
    type: month ? 'month' : 'week',
    month: month ? w / MONTH_WEEKS : null,
    t: month ? 'Repaso del mes ' + w / MONTH_WEEKS : 'Repaso de la semana ' + w,
    verbs: VERBS.filter((v) => v.week >= from && v.week <= w),
  })
})
PLAN.sort((a, b) => a.num - b.num)

export const planOf = (n) => PLAN.find((p) => p.num === n)
export const weekReviews = PLAN.filter((p) => p.type === 'week')
export const monthReviews = PLAN.filter((p) => p.type === 'month')

// El plan es secuencial: "hoy" es el primer día que todavía no has hecho.
export const nextDay = (results) => PLAN.find((p) => !results[p.num])

// Un repaso se abre cuando el plan llega a su día (o si ya lo hiciste).
export function reached(p, results) {
  const nx = nextDay(results)
  return !!results[p.num] || !nx || nx.num >= p.num
}

// Verbos de los días de estudio que ya has hecho, para el repaso acumulativo.
export const studiedVerbs = (results) => VERBS.filter((v) => results[v.day])

export function reviewSub(p) {
  return p.type === 'month' ? p.verbs.length + ' verbos, con prioridad a los que fallas' : 'Los ' + p.verbs.length + ' verbos de la semana'
}
