import { cmp, shuffle } from './text'
import { VERBS } from './verbPlan'

const CAP = 60
const first = (es) => es.split(/[;,(]/)[0].trim()

// Tres tipos de pregunta: significado (test), hueco en la frase y, solo en los
// irregulares, pasado + participio. Tienen la misma forma que las del examen de
// palabras para poder usar el mismo QuizView.
function mcq(v) {
  const pool = VERBS.filter((x) => x.k === v.k && x.id !== v.id && x.es !== v.es && first(x.es) !== first(v.es))
  const opts = shuffle(pool)
    .slice(0, 3)
    .map((x) => x.es)
  return { type: 'mcq', dir: 'e2s', w: v, answer: v.es, options: shuffle([v.es, ...opts]) }
}
const cloze = (v) => ({ type: 'cloze', w: v, m: v.m, help: 'Escribe la forma correcta del verbo.', base: v.en })
const forms = (v) => ({ type: 'forms', w: v })

function randomQ(v) {
  const t = [mcq, cloze]
  if (v.k === 'irr') t.push(forms)
  return t[Math.floor(Math.random() * t.length)](v)
}

const missedOf = (stats, v) => stats[v.id]?.missed_count || 0
const seenOf = (stats, v) => stats[v.id]?.last_seen || ''

export function questionCount(p, stats) {
  if (p.type === 'month') return Math.min(CAP, p.verbs.length)
  if (p.type === 'week') return p.verbs.length + p.verbs.filter((v) => missedOf(stats, v) > 0).length
  return p.verbs.length * 2 + p.verbs.filter((v) => v.k === 'irr').length
}

// Preguntas de un día del plan (estudio, repaso semanal o mensual).
export function planQuestions(p, stats) {
  if (p.type === 'learn') {
    const qs = []
    p.verbs.forEach((v) => {
      qs.push(mcq(v), cloze(v))
      if (v.k === 'irr') qs.push(forms(v))
    })
    return shuffle(qs)
  }
  if (p.type === 'week') {
    const qs = p.verbs.map(randomQ)
    p.verbs.filter((v) => missedOf(stats, v) > 0).forEach((v) => qs.push(Math.random() < 0.5 ? cloze(v) : mcq(v)))
    return shuffle(qs)
  }
  const weak = p.verbs
    .filter((v) => missedOf(stats, v) > 0)
    .sort((a, b) => missedOf(stats, b) - missedOf(stats, a))
    .slice(0, 30)
  const rest = shuffle(p.verbs.filter((v) => !weak.includes(v))).slice(0, CAP - weak.length)
  return shuffle([...weak, ...rest].map(randomQ))
}

// Repaso acumulativo: todo lo estudiado, primero lo que más fallas y después lo
// que llevas más tiempo sin ver (lo nunca preguntado cuenta como lo más antiguo).
export function cumulativeQuestions(verbs, stats) {
  const picked = shuffle(verbs)
    .sort((a, b) => missedOf(stats, b) - missedOf(stats, a) || seenOf(stats, a).localeCompare(seenOf(stats, b)))
    .slice(0, CAP)
  return shuffle(picked.map(randomQ))
}

export function missedQuestions(stats) {
  const weak = VERBS.filter((v) => missedOf(stats, v) > 0)
    .sort((a, b) => missedOf(stats, b) - missedOf(stats, a))
    .slice(0, CAP)
  return shuffle(weak.map(randomQ))
}

export function acceptedVerbAnswers(q) {
  return q.type === 'cloze' ? q.w.alts : [q.w.en]
}

export const formsOk = (w, past, pp) => w.past.some((x) => cmp(x) === cmp(past)) && w.pp.some((x) => cmp(x) === cmp(pp))
