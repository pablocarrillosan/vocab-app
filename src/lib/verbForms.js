import { cmp } from './text'
import { expand } from './grammarCheck'

// Formas de los verbos de los planes: 3.ª persona (-s), -ing, pasado y
// participio, con las reglas de ortografía del inglés. Los irregulares del plan
// traen su pasado y su participio en los datos; los phrasal verbs y los verbos
// con preposición conjugan solo la primera palabra (come up with → came up with).
// Cada forma es una lista: la primera es la que se enseña y el resto también vale.

// Pasado y participio de los irregulares que hacen falta fuera de los días de
// irregulares: la primera palabra de un phrasal verb o de un verbo con
// preposición (break up, come up with…) y algún regular del plan, como strive.
const IRR = {
  bear: 'bore, borne', beat: 'beat, beaten', become: 'became, become', begin: 'began, begun', bend: 'bent, bent',
  blow: 'blew, blown', break: 'broke, broken', bring: 'brought, brought', build: 'built, built', burst: 'burst, burst',
  buy: 'bought, bought', catch: 'caught, caught', come: 'came, come', cut: 'cut, cut', deal: 'dealt, dealt',
  dig: 'dug, dug', do: 'did, done', draw: 'drew, drawn', drink: 'drank, drunk', drive: 'drove, driven',
  dwell: 'dwelt/dwelled, dwelt/dwelled', eat: 'ate, eaten', fall: 'fell, fallen', feel: 'felt, felt', fight: 'fought, fought',
  find: 'found, found', fit: 'fitted/fit, fitted/fit', fly: 'flew, flown', get: 'got, got/gotten', give: 'gave, given',
  go: 'went, gone', grow: 'grew, grown', hang: 'hung, hung', have: 'had, had', hear: 'heard, heard', hit: 'hit, hit',
  hold: 'held, held', keep: 'kept, kept', know: 'knew, known', lay: 'laid, laid', lead: 'led, led', leave: 'left, left',
  let: 'let, let', lose: 'lost, lost', make: 'made, made', mean: 'meant, meant', meet: 'met, met', pay: 'paid, paid',
  plead: 'pleaded/pled, pleaded/pled', put: 'put, put', read: 'read, read', ride: 'rode, ridden', ring: 'rang, rung',
  rise: 'rose, risen', run: 'ran, run', say: 'said, said', see: 'saw, seen', sell: 'sold, sold', send: 'sent, sent',
  set: 'set, set', shake: 'shook, shaken', show: 'showed, shown/showed', shut: 'shut, shut', sing: 'sang, sung',
  sink: 'sank, sunk', sit: 'sat, sat', sleep: 'slept, slept', speak: 'spoke, spoken', spell: 'spelt/spelled, spelt/spelled',
  spend: 'spent, spent', stand: 'stood, stood', steal: 'stole, stolen', stick: 'stuck, stuck', strike: 'struck, struck',
  strive: 'strove/strived, striven/strived', swim: 'swam, swum', take: 'took, taken', teach: 'taught, taught',
  tear: 'tore, torn', tell: 'told, told', think: 'thought, thought', thrive: 'thrived/throve, thrived/thriven',
  throw: 'threw, thrown', understand: 'understood, understood', wake: 'woke, woken', wear: 'wore, worn',
  win: 'won, won', wind: 'wound, wound', write: 'wrote, written',
}
const parseForms = (s) => s.split(',').map((x) => x.trim().split('/').map((y) => y.trim()))

// Verbos de más de una sílaba con el acento al final: doblan la consonante
// como los monosílabos (admit → admitted, deter → deterring).
const DOUBLE = new Set(['admit', 'regret', 'submit', 'emit', 'acquit', 'deter', 'incur', 'forbid', 'outbid', 'outrun', 'overrun', 'undercut', 'offset', 'beset', 'resit'])
// Acabados en vocal + l: el inglés británico dobla la l (level → levelled) y el
// americano no (leveled); estos la doblan siempre porque llevan el acento al final.
const STRESSED_L = new Set(['excel', 'enrol', 'compel', 'expel', 'propel', 'repel', 'rebel', 'control', 'patrol', 'fulfil', 'instil'])
const ALT_S = { zero: ['zeroes', 'zeros'] }
// Formas que también valen aunque los datos del plan no las traigan.
const ALT_PP = { prove: ['proven', 'proved'] }

const isV = (ch) => 'aeiou'.includes(ch)
const syllables = (w) => (w.match(/[aeiouy]+/g) || []).length
// Consonante + una sola vocal + consonante final (sin contar w, x ni y). La u de
// qu cuenta como consonante: quit → quitting.
function cvc(w) {
  const n = w.length
  const c = w[n - 1]
  const v = w[n - 2]
  if (n < 3 || !isV(v) || isV(c) || 'wxy'.includes(c)) return false
  return !isV(w[n - 3]) || (w[n - 3] === 'u' && w[n - 4] === 'q')
}
// Raíces a las que se añade -ing o -ed: stop → stopp, level → levell o level.
function stems(w) {
  const c = w[w.length - 1]
  if (cvc(w)) {
    if (DOUBLE.has(w) || syllables(w) === 1) return [w + c]
    if (c === 'l') return STRESSED_L.has(w) ? [w + 'l'] : [w + 'l', w]
  }
  if (c === 'c') return [w + 'k']
  return [w]
}

function sOf(w) {
  if (ALT_S[w]) return ALT_S[w]
  if (w === 'have') return ['has']
  if (/(s|x|z|ch|sh)$/.test(w)) return [w + 'es']
  if (/[^aeiou]y$/.test(w)) return [w.slice(0, -1) + 'ies']
  if (/[^aeiou]o$/.test(w)) return [w + 'es']
  return [w + 's']
}
function ingOf(w) {
  if (w.endsWith('ie')) return [w.slice(0, -2) + 'ying']
  if (/(ee|ye|oe)$/.test(w)) return [w + 'ing']
  if (w.endsWith('e')) return [w.slice(0, -1) + 'ing']
  return stems(w).map((s) => s + 'ing')
}
function edOf(w) {
  if (w.endsWith('e')) return [w + 'd']
  if (/[^aeiou]y$/.test(w)) return [w.slice(0, -1) + 'ied']
  return stems(w).map((s) => s + 'ed')
}

const cache = new Map()
export function formsOf(v) {
  if (cache.has(v.en)) return cache.get(v.en)
  const [head, ...rest] = v.en.split(' ')
  const tail = rest.length ? ' ' + rest.join(' ') : ''
  const irr = v.past ? [v.past, v.pp] : IRR[head] && parseForms(IRR[head])
  const add = (list) => list.map((x) => x + tail)
  const f = {
    base: [v.en],
    s: add(sOf(head)),
    ing: add(ingOf(head)),
    past: add(irr ? irr[0] : edOf(head)),
    pp: add(ALT_PP[head] || (irr ? irr[1] : edOf(head))),
  }
  cache.set(v.en, f)
  return f
}

// Compara formas verbales: sin mayúsculas ni punto final, con las contracciones
// desplegadas (she's → she is / she has) y aceptando la ortografía americana
// (-ize por -ise, plow por plough).
// subj: sujeto que ya está escrito delante del hueco; si lo vuelves a escribir
// («she has chosen» en vez de «has chosen») también vale.
const ize = (s) => s.replace(/([iy])z(e|es|ed|ing)\b/g, '$1s$2').replace(/\bplow/g, 'plough')
export function sameForm(user, answers, subj) {
  const p = subj ? subj.toLowerCase() + ' ' : null
  const u = expand(user)
    .map((x) => (p && x.startsWith(p) ? x.slice(p.length) : x))
    .map(ize)
  return answers.some((a) => expand(a).map(ize).some((x) => u.includes(x)))
}

// ---------------------------------------------------------------------------
// Tiempo verbal de la forma entre corchetes de cada frase de ejemplo, para que
// el ejercicio de huecos diga qué hay que escribir. Se deduce de la forma (-s,
// pasado, -ing...) y de lo que va delante (has, was, to, will...). Las pocas
// frases en las que esto no basta están corregidas a mano en SLOT_FIX.

export const TENSES = {
  pres: ['Presente simple'],
  past: ['Pasado simple'],
  'pres-cont': ['Presente continuo', 'forma en -ing'],
  'past-cont': ['Pasado continuo', 'forma en -ing'],
  'pres-perf': ['Presente perfecto', 'participio'],
  'past-perf': ['Pasado perfecto', 'participio'],
  'pres-perf-cont': ['Presente perfecto continuo', 'forma en -ing'],
  'past-perf-cont': ['Pasado perfecto continuo', 'forma en -ing'],
  'fut-cont': ['Futuro continuo', 'forma en -ing'],
  fut: ['Futuro con will', 'infinitivo sin to'],
  cond: ['Condicional con would', 'infinitivo sin to'],
  'fut-perf': ['Futuro perfecto', 'participio'],
  'cond-perf': ['Condicional perfecto', 'participio'],
  'modal-perf': ['Modal perfecto', 'participio'],
  pas: ['Pasiva', 'participio'],
  pp: ['Participio'],
  ger: ['Gerundio', 'forma en -ing'],
  inf: ['Infinitivo'],
  bare: ['Infinitivo sin to'],
  imp: ['Imperativo'],
}
// Forma que pide cada tiempo (en presente simple depende de la persona).
const FORM = {
  past: 'past', pp: 'pp', pas: 'pp', 'pres-perf': 'pp', 'past-perf': 'pp', 'fut-perf': 'pp', 'cond-perf': 'pp', 'modal-perf': 'pp',
  ger: 'ing', 'pres-cont': 'ing', 'past-cont': 'ing', 'pres-perf-cont': 'ing', 'past-perf-cont': 'ing', 'fut-cont': 'ing',
  inf: 'base', bare: 'base', fut: 'base', cond: 'base', imp: 'base',
}

const HAVE = new Set(['have', 'has', 'had', 'having', "haven't", "hasn't", "hadn't"])
const BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "isn't", "aren't", "wasn't", "weren't"])
const GET = new Set(['get', 'gets', 'got', 'getting', 'gotten'])
const MODAL = new Set(['can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'cannot', "can't", "couldn't", "won't", "wouldn't", "shouldn't", "mustn't"])
const DO = new Set(['do', 'does', 'did', "don't", "doesn't", "didn't"])
const PRON = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they'])
const ADV = new Set(['not', 'never', 'ever', 'already', 'just', 'finally', 'always', 'often', 'usually', 'sometimes', 'really', 'still', 'also', 'recently', 'suddenly', 'completely', 'gradually', 'slowly', 'quickly', 'strictly', 'brutally', 'accidentally', 'immediately', 'eventually', 'simply', 'barely', 'hardly', 'nearly', 'almost', 'only', 'soon', 'even', 'all', 'both', 'yet'])
// Contracciones pegadas al sujeto: we've, I'm, she's...
const CONTR = { "'ve": 'have', "'m": 'am', "'re": 'are', "'s": "'s", "'d": "'d", "'ll": 'will' }
const isAux = (t) => HAVE.has(t) || BE.has(t) || GET.has(t) || MODAL.has(t) || DO.has(t) || t === 'to' || t === "let's" || t === "'s" || t === "'d"

// Auxiliares que van justo delante del hueco (saltando adverbios y, en las
// preguntas, el sujeto: «Have you [voted]?») y lo que queda delante de ellos
// en la misma oración, sin adverbios.
function auxBefore(clause) {
  const toks = clause
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z' ]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .map((t) => {
      const c = t !== "let's" && Object.keys(CONTR).find((k) => t.endsWith(k) && t.length > k.length)
      return c ? CONTR[c] : t
    })
    .filter((t) => t && !ADV.has(t))
  let i = toks.length - 1
  const chain = []
  for (; i >= 0; i--) {
    const t = toks[i]
    if (PRON.has(t) && chain.length === 0 && i > 0 && isAux(toks[i - 1]) && toks[i - 1] !== 'to') continue
    if (!isAux(t)) break
    chain.unshift(t)
    // be, been y have pueden llevar otro auxiliar delante (will be, has been, must have)
    if (!BE.has(t) && t !== 'have') {
      i--
      break
    }
  }
  return { chain, lead: toks.slice(0, i + 1) }
}

// Frases en las que no basta con mirar los auxiliares.
const SLOT_FIX = {
  shed: 'pres', // Snakes [shed] their skin: la misma forma en presente y en pasado
  bet: 'pres', // I [bet] you won't finish on time.
  'come about': 'bare', // How did this situation [come about]?
  'get to': 'bare', // Don't let his comments [get to] you.
  'settle for': 'bare', // Why [settle for] second best?
  misspend: 'pp', // He regrets his [misspent] youth.
}

function tenseOf(is, chain, lead) {
  const a = chain[chain.length - 1] // el auxiliar más cercano al hueco
  const first = chain[0]
  if (is.ing) {
    if (a === 'been') return first === 'had' ? 'past-perf-cont' : 'pres-perf-cont'
    if (a === 'was' || a === 'were') return 'past-cont'
    if (a === 'be' && (first === 'will' || first === "won't")) return 'fut-cont'
    if (BE.has(a) || a === "'s") return 'pres-cont'
    return 'ger'
  }
  if ((is.pp || is.past) && (BE.has(a) || GET.has(a))) return 'pas'
  if (is.pp && (HAVE.has(a) || a === "'s" || a === "'d")) {
    if (a === 'have' && MODAL.has(first)) return first === 'will' ? 'fut-perf' : first === 'would' ? 'cond-perf' : 'modal-perf'
    return a === 'had' || a === "'d" ? 'past-perf' : 'pres-perf'
  }
  if (is.base) {
    if (a === 'to') return 'inf'
    if (a === 'will' || a === "won't") return 'fut'
    if (a === 'would' || a === "wouldn't" || a === "'d") return 'cond'
    // Please [hand in]…, Don't [give up]…, Always [warm up]…, Come on, [snap out of] it!
    if ((!a || a === "don't") && lead.every((t) => t === 'please')) return 'imp'
    if (MODAL.has(a) || DO.has(a) || a === "let's") return 'bare'
  }
  if (is.s) return 'pres'
  if (is.past) return 'past' // también put, set, cut… cuando no hay nada que diga que es presente
  if (is.base) return 'pres'
  return 'pp'
}

export function slotOf(v) {
  const f = formsOf(v)
  const t = cmp(v.m.t)
  const has = (k) => f[k].some((x) => cmp(x) === t)
  const is = { s: has('s'), ing: has('ing'), past: has('past'), pp: has('pp'), base: has('base') }
  if (!Object.values(is).some(Boolean)) return null
  // Solo cuenta la oración del hueco: lo que hay después de la última coma, punto y coma…
  const clause = v.ex.slice(0, v.m.i).split(/[,;:!?\u2014]/).pop()
  const { chain, lead } = auxBefore(clause)
  const tense = SLOT_FIX[v.en] || tenseOf(is, chain, lead)
  return { form: FORM[tense] || (is.s ? 's' : 'base'), tense }
}
