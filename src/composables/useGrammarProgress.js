import { ref } from 'vue'
import { supabase } from '../lib/supabase'

// Progreso del repaso de gramática: una fila por bloque con lo que has
// escrito o elegido en cada ejercicio (answers) y la nota de cada tanda que
// has corregido (scores: índice de tanda -> [aciertos, total]).

const progress = ref({}) // id del bloque -> { answers, scores }

async function load() {
  const { data, error } = await supabase.from('grammar_progress').select('block, answers, scores')
  if (!error) {
    const map = {}
    data.forEach((x) => (map[x.block] = { answers: x.answers || {}, scores: x.scores || {} }))
    progress.value = map
  }
  return error
}

// get sirve para leer (también desde la plantilla); entry crea la fila si hace falta.
const EMPTY = Object.freeze({ answers: Object.freeze({}), scores: Object.freeze({}) })
function get(block) {
  return progress.value[block] || EMPTY
}
function entry(block) {
  if (!progress.value[block]) progress.value[block] = { answers: {}, scores: {} }
  return progress.value[block]
}

// Tandas corregidas de un bloque y aciertos sumados de todas ellas.
function summary(block) {
  const sc = Object.values(get(block).scores)
  return { sets: sc.length, right: sc.reduce((n, x) => n + x[0], 0), total: sc.reduce((n, x) => n + x[1], 0) }
}

async function save(block) {
  clearTimeout(timers[block])
  delete timers[block]
  const p = entry(block)
  await supabase
    .from('grammar_progress')
    .upsert({ block, answers: p.answers, scores: p.scores, updated_at: new Date().toISOString() }, { onConflict: 'user_id,block' })
}

// Lo que se escribe se guarda un momento después de dejar de teclear; las
// notas y el borrado, al momento.
const timers = {}
function setAnswer(block, key, value) {
  entry(block).answers[key] = value
  clearTimeout(timers[block])
  timers[block] = setTimeout(() => save(block), 1200)
}
function setScore(block, s, right, total) {
  entry(block).scores[s] = [right, total]
  return save(block)
}
function clearBlock(block) {
  progress.value[block] = { answers: {}, scores: {} }
  return save(block)
}
function flush() {
  return Promise.all(Object.keys(timers).map(save))
}

function reset() {
  Object.values(timers).forEach(clearTimeout)
  Object.keys(timers).forEach((k) => delete timers[k])
  progress.value = {}
}

export function useGrammarProgress() {
  return { progress, get, summary, load, setAnswer, setScore, clearBlock, flush, reset }
}
