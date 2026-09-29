import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const results = ref({}) // week_start ('YYYY-MM-DD') -> { score, total, done_at }

async function load() {
  const { data, error } = await supabase.from('exam_results').select('*')
  if (!error) {
    const map = {}
    data.forEach((r) => (map[r.week_start] = r))
    results.value = map
  }
  return error
}

// Solo sustituye el resultado guardado si el nuevo intento es igual o mejor,
// igual que hacía el artefacto original.
async function saveResult(week_start, score, total) {
  const prev = results.value[week_start]
  if (prev && score / total < prev.score / prev.total) return prev
  const { data, error } = await supabase
    .from('exam_results')
    .upsert({ week_start, score, total }, { onConflict: 'user_id,week_start' })
    .select()
    .single()
  if (!error) results.value = { ...results.value, [week_start]: data }
  return error ? prev : data
}

function reset() {
  results.value = {}
}

export function useExamResults() {
  return { results, load, saveResult, reset }
}
