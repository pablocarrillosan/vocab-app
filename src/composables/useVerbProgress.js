import { ref } from 'vue'
import { supabase } from '../lib/supabase'

// Resultados de los exámenes de verbos: la clave es el número de día del plan
// ('1'…'56') o 'acumulativo' para el repaso de todo lo estudiado.
export const CUMULATIVE = 'acumulativo'

const results = ref({}) // clave -> { score, total, done_at }
const stats = ref({}) // verbo -> { missed_count, last_seen }

async function load() {
  const [r, s] = await Promise.all([supabase.from('verb_results').select('*'), supabase.from('verb_stats').select('*')])
  if (!r.error) {
    const map = {}
    r.data.forEach((x) => (map[x.key] = x))
    results.value = map
  }
  if (!s.error) {
    const map = {}
    s.data.forEach((x) => (map[x.verb] = x))
    stats.value = map
  }
  return r.error || s.error
}

// En los días del plan se guarda el mejor intento; en el acumulativo, el último.
async function saveResult(key, score, total) {
  key = String(key)
  const prev = results.value[key]
  if (key !== CUMULATIVE && prev && score / total < prev.score / prev.total) return prev
  const { data, error } = await supabase
    .from('verb_results')
    .upsert({ key, score, total, done_at: new Date().toISOString() }, { onConflict: 'user_id,key' })
    .select()
    .single()
  if (!error) results.value = { ...results.value, [key]: data }
  return error ? prev : data
}

// Igual que con las palabras: los fallos se acumulan en local durante el
// examen y se guardan todos juntos al terminar.
const pending = new Set()
function markLocal(verb, ok) {
  const cur = stats.value[verb]?.missed_count || 0
  stats.value = {
    ...stats.value,
    [verb]: { ...stats.value[verb], verb, missed_count: ok ? Math.max(0, cur - 1) : cur + 1, last_seen: new Date().toISOString() },
  }
  pending.add(verb)
}
async function flush() {
  if (!pending.size) return
  const rows = [...pending].map((verb) => {
    const s = stats.value[verb]
    return { verb, missed_count: s.missed_count, last_seen: s.last_seen }
  })
  pending.clear()
  await supabase.from('verb_stats').upsert(rows, { onConflict: 'user_id,verb' })
}

function reset() {
  results.value = {}
  stats.value = {}
  pending.clear()
}

export function useVerbProgress() {
  return { results, stats, load, saveResult, markLocal, flush, reset }
}
