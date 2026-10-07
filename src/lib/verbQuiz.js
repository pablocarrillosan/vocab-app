import { cmp, fold, shuffle } from './text'
import { LEVELS } from './verbPlan'
import { formsOf, slotOf, sameForm } from './verbForms'

const CAP = 60 // verbos como mucho en un repaso, cada uno con su pregunta de formas
const TEXTS = 2 // textos en los repasos

// Las preguntas de verbos salen mezcladas. Tienen la misma forma que las del
// examen de palabras para usar el mismo QuizView; las de varios huecos (formas,
// tablas y textos) llevan sus respuestas en fields.
// Cada verbo del examen tiene su pregunta de formas: pasado, participio y
// significado. Ninguna otra pregunta de ese verbo sale antes (mixed), para que
// nada te dé hechas las respuestas.

// Significados sin las aclaraciones entre paréntesis:
// "abstenerse de (votar, beber)" -> ["abstenerse de"].
const glosses = (es) =>
  es
    .replace(/\(.*?\)/g, '')
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean)

// Opciones falsas: verbos del mismo plan y tipo, pero no del mismo día (sus
// verbos suelen ser casi sinónimos) ni de verbos que compartan un significado.
function others(v) {
  const mine = new Set(glosses(v.es))
  return shuffle(LEVELS[v.lv].VERBS.filter((x) => x.k === v.k && x.day !== v.day && !glosses(x.es).some((g) => mine.has(g))))
}
// Tres opciones distintas entre sí y de la respuesta.
function threeOf(list, answer, key = (x) => x) {
  const seen = new Set([key(answer)])
  const out = []
  for (const o of list) {
    if (seen.has(key(o))) continue
    seen.add(key(o))
    out.push(o)
    if (out.length === 3) break
  }
  return out
}

// 1. Formas y significado: el pasado, el participio y la traducción al español
// del verbo (el infinitivo es el propio verbo). El significado se corrige con
// meaningOk.
function core(v) {
  const f = formsOf(v)
  return {
    type: 'grid',
    kind: 'core',
    w: v,
    rows: [{ label: v.en, fields: [0, 1, 2] }],
    fields: [
      { label: 'Pasado', a: f.past, w: v },
      { label: 'Participio', a: f.pp, w: v },
      { label: 'Significado', a: [v.es], w: v, mean: true },
    ],
  }
}

// El significado, para elegir entre cuatro (en los repasos, con los que fallas).
function mean(v) {
  const opts = threeOf(
    others(v).map((x) => x.es),
    v.es,
  )
  return { type: 'mcq', dir: 'e2s', w: v, answer: v.es, options: shuffle([v.es, ...opts]) }
}

// 2. Elige el verbo: la frase con hueco y cuatro verbos en la misma forma que
// pide la frase (si es «argued», las otras opciones también van en pasado).
function pick(v) {
  const slot = slotOf(v)
  if (!slot) return null
  const opts = threeOf(
    others(v).map((x) => formsOf(x)[slot.form][0]),
    v.m.t,
    cmp,
  )
  if (opts.length < 3) return null
  return { type: 'pick', w: v, m: v.m, answer: v.m.t, options: shuffle([v.m.t, ...opts]) }
}

// 3. Escribe el verbo: el hueco dice en qué tiempo va (pasado simple, pasiva…).
// En los verbos con preposición lo que se practica es la preposición: la pista
// solo da el verbo y hay que escribir los dos.
function cloze(v) {
  const q = { type: 'cloze', w: v, m: v.m, tense: slotOf(v)?.tense }
  if (v.k === 'prep') return { ...q, help: 'Escribe el verbo en la forma correcta y su preposición.', base: v.en.split(' ')[0] + ' + prep.' }
  return { ...q, help: 'Escribe la forma correcta del verbo.', base: v.en }
}

// 4. Todos los tiempos: el verbo conjugado en cada tiempo del nivel, con el
// sujeto de su frase de ejemplo (o they, que vale para personas y cosas).
export const TENSE_ROWS = {
  ps: ['Present simple', 'presente simple'],
  pc: ['Present continuous', 'presente continuo'],
  past: ['Past simple', 'pasado simple'],
  pastc: ['Past continuous', 'pasado continuo'],
  pp: ['Present perfect', 'presente perfecto'],
  ppc: ['Present perfect continuous', 'presente perfecto continuo'],
  pastp: ['Past perfect', 'pasado perfecto'],
  fut: ['Future simple', 'futuro con will'],
  futp: ['Future perfect', 'futuro perfecto'],
  condp: ['Conditional perfect', 'condicional perfecto'],
}
// Verbos de estado (no van en continuo: «it is seeming») y alguno que casi
// siempre va en pasiva: no salen en la tabla.
const NO_TABLE = new Set([
  'seem', 'appear', 'resemble', 'belong', 'contain', 'depend', 'owe', 'require', 'involve', 'doubt', 'suppose', 'envy',
  'afford', 'respect', 'trust', 'admire', 'resent', 'look up to', 'take after', 'deem', 'presume', 'perceive', 'constitute',
  'encompass', 'entail', 'embody', 'warrant', 'correspond to', 'pertain to', 'relate to', 'verge on', 'conceive of',
  'hinge on', 'stem from', 'account for', 'amount to', 'derive from', 'rest on', 'boil down to', 'underlie', 'correlate',
  'loathe', 'despise', 'cherish', 'detract from', 'subscribe to', 'take aback',
])
function subjectOf(v) {
  const w = v.ex.split(/\s+/)[0]
  if (w === 'I') return w
  return ['you', 'he', 'she', 'it', 'we', 'they'].includes(w.toLowerCase()) ? w.toLowerCase() : 'they'
}
function tenses(v) {
  const f = formsOf(v)
  const s = subjectOf(v)
  const third = ['he', 'she', 'it'].includes(s)
  const be = s === 'I' ? 'am' : third ? 'is' : 'are'
  const was = s === 'I' || third ? 'was' : 'were'
  const have = third ? 'has' : 'have'
  const pre = (p, list) => list.map((x) => p + ' ' + x)
  const ans = {
    ps: third ? f.s : f.base,
    pc: pre(be, f.ing),
    past: f.past,
    pastc: pre(was, f.ing),
    pp: pre(have, f.pp),
    ppc: pre(have + ' been', f.ing),
    pastp: pre('had', f.pp),
    fut: pre('will', f.base),
    futp: pre('will have', f.pp),
    condp: pre('would have', f.pp),
  }
  const keys = LEVELS[v.lv].tenses
  return {
    type: 'grid',
    kind: 'tenses',
    w: v,
    rows: keys.map((k, i) => ({ label: TENSE_ROWS[k][0], sub: TENSE_ROWS[k][1], pre: s, fields: [i] })),
    fields: keys.map((k) => ({ a: ans[k], w: v, pre: s })),
  }
}
// 5. Completa el texto: el texto del día con un hueco por verbo.
const textQ = (d) => ({ type: 'text', day: d.num, ...d.text })

const missedOf = (stats, v) => stats[v.id]?.missed_count || 0
const seenOf = (stats, v) => stats[v.id]?.last_seen || ''
const missed = (stats) => (v) => missedOf(stats, v) > 0
const byMissed = (stats) => (a, b) => missedOf(stats, b) - missedOf(stats, a)

// Verbos para la tabla de tiempos: primero los que más fallas.
function tableVerbs(vs, n, stats) {
  return shuffle(vs.filter((v) => !NO_TABLE.has(v.en)))
    .sort(byMissed(stats))
    .slice(0, n)
}

// Pregunta de más para un verbo que fallas (en el repaso semanal): elegir su
// significado, elegir el verbo de su frase o escribirlo.
function extra(v) {
  for (const k of shuffle([mean, pick, cloze])) {
    const q = k(v)
    if (q) return q
  }
}

// Baraja las preguntas sin poner ninguna antes que la de formas de su verbo:
// así nada te enseña el pasado, el participio o la traducción antes de que los
// escribas tú. Los textos salen cuando ya han salido las formas de sus verbos.
const verbsIn = (q) => (q.type === 'text' ? q.fields.map((f) => f.w).filter(Boolean) : [q.w])
function mixed(qs) {
  const firsts = new Map(qs.filter((q) => q.kind === 'core').map((q) => [q.w, q]))
  const placed = new Set()
  const ready = (q) => q.kind === 'core' || verbsIn(q).every((w) => !firsts.has(w) || placed.has(firsts.get(w)))
  const pool = shuffle(qs)
  const out = []
  while (pool.length) {
    const [q] = pool.splice(pool.findIndex(ready), 1)
    placed.add(q)
    out.push(q)
  }
  return out
}

// Textos de los repasos: de días distintos, elegidos al azar entre los que
// tienen verbos del repaso.
function reviewTexts(verbs) {
  if (!verbs.length) return []
  const plan = LEVELS[verbs[0].lv]
  const days = [...new Set(verbs.map((v) => v.day))].map(plan.planOf).filter((d) => d.text)
  return shuffle(days).slice(0, TEXTS)
}

// Un repaso: las formas y el significado de cada verbo, dos textos y una tabla
// de tiempos.
function review(verbs, texts, stats, tableFrom) {
  return [...verbs.map(core), ...texts.map(textQ), ...tableVerbs(tableFrom, 1, stats).map(tenses)]
}

// Preguntas de un día del plan (estudio, repaso semanal o mensual).
export function planQuestions(p, stats) {
  if (p.type === 'learn') {
    // Cada verbo: sus formas y su significado, y su frase para elegir el verbo o
    // escribirlo (mitad y mitad). Además, dos tablas de tiempos y el texto.
    const vs = p.verbs
    const qs = [...vs.map(core), ...shuffle(vs).map((v, i) => (i % 2 && pick(v)) || cloze(v))]
    qs.push(...tableVerbs(vs, 2, stats).map(tenses))
    if (p.text) qs.push(textQ(p))
    return mixed(qs)
  }
  const texts = reviewTexts(p.verbs)
  if (p.type === 'week') {
    // Todos los verbos de la semana, y otra pregunta para los que fallas.
    return mixed([...review(p.verbs, texts, stats, p.verbs), ...p.verbs.filter(missed(stats)).map(extra)])
  }
  // Mensual: primero los que más fallas y el resto al azar, hasta CAP verbos.
  const weak = p.verbs.filter(missed(stats)).sort(byMissed(stats)).slice(0, 30)
  const fill = shuffle(p.verbs.filter((v) => !weak.includes(v))).slice(0, CAP - weak.length)
  return mixed(review([...weak, ...fill], texts, stats, weak.length ? weak : fill))
}

// Repaso acumulativo: todo lo estudiado, primero lo que más fallas y después lo
// que llevas más tiempo sin ver (lo nunca preguntado cuenta como lo más antiguo).
export function cumulativeQuestions(verbs, stats) {
  const picked = shuffle(verbs)
    .sort((a, b) => missedOf(stats, b) - missedOf(stats, a) || seenOf(stats, a).localeCompare(seenOf(stats, b)))
    .slice(0, CAP)
  return mixed(review(picked, reviewTexts(picked), stats, picked.slice(0, 10)))
}

export function missedQuestions(verbs, stats) {
  const weak = verbs.filter(missed(stats)).sort(byMissed(stats)).slice(0, CAP)
  return mixed(review(weak, [], stats, weak))
}

// Preguntas de un día del plan y minutos aproximados, para avisar antes de
// empezar: un texto o una tabla llevan más tiempo que escribir una respuesta, y
// escribirla, más que elegirla.
const MINUTES = { text: 3, tenses: 1.5, core: 1 / 3, cloze: 1 / 3 }
export function examSize(p, stats) {
  const qs = planQuestions(p, stats)
  return { n: qs.length, min: Math.max(5, Math.round(qs.reduce((m, q) => m + (MINUTES[q.kind || q.type] || 1 / 6), 0))) }
}

export function acceptedVerbAnswers(q) {
  return q.type === 'cloze' ? q.w.alts : [q.w.en]
}

// Corrección de las preguntas de varios huecos (formas, tablas y textos): un
// acierto o fallo por hueco.
export function gradeFields(q, vals) {
  return q.fields.map((f, i) => Boolean((vals[i] || '').trim()) && (f.mean ? meaningOk(f.w, vals[i]) : sameForm(vals[i], f.a, f.pre)))
}

// Corrección del significado escrito: vale cualquiera de los de la lista, sin
// acentos ni mayúsculas, con o sin el «se» opcional (esconder(se)) y sin la
// preposición del final (confiar en → confiar), salvo cuando sin ella el verbo
// significa otra cosa (pasar por → pasar). Si escribes varios, separados por
// comas o con «o», basta con que uno esté en la lista, y en las palabras largas
// se perdona una letra (argumetar).
const PREP_END = / (de|a|en|por|para|sobre|contra|entre)$/
const NO_STRIP = new Set(['pasar', 'dar', 'salir', 'dejar', 'ponerse', 'responder', 'pagar', 'cargar', 'faltar', 'apuntar', 'deshacerse', 'ascender', 'proceder', 'rayar'])
const plain = (s) => fold(s).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
function meaningsOf(v) {
  const out = new Set()
  const add = (es) =>
    es
      .split(/[;,]/)
      .map(plain)
      .filter(Boolean)
      .forEach((g) => {
        out.add(g)
        const bare = g.replace(PREP_END, '')
        if (bare !== g && !NO_STRIP.has(bare)) out.add(bare)
      })
  const es = v.es.replace(/\s\([^)]*\)/g, '') // fuera las notas: «abstenerse de (votar, beber)»
  add(es.replace(/\([^)]*\)/g, '')) // esconder(se) → esconder
  add(es.replace(/\(([^)]*)\)/g, '$1')) // esconder(se) → esconderse
  return out
}
// Una letra de más, de menos o cambiada.
function oneOff(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && a[i] === b[i]) i++
  const [x, y] = a.length >= b.length ? [a, b] : [b, a]
  return x.slice(i + 1) === y.slice(x.length === y.length ? i + 1 : i)
}
export function meaningOk(v, answer) {
  const ok = meaningsOf(v)
  return fold(answer)
    .replace(/\([^)]*\)/g, ' ') // lo que escribas entre paréntesis no cuenta
    .split(/[;,/]| o | y /)
    .map(plain)
    .filter(Boolean)
    .some((a) => ok.has(a) || [...ok].some((g) => g.length >= 8 && oneOff(a, g)))
}
