import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { fold } from '../lib/text'
import { headKey } from '../lib/words'

const words = ref([])
const loading = ref(true)
const loaded = ref(false)

async function load() {
  loading.value = true
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .order('word_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (!error) words.value = data
  loading.value = false
  loaded.value = true
  return error
}

// Los otros significados apuntados de la misma palabra en inglés.
function sensesOf(en, excludeId) {
  const k = headKey(en)
  return words.value.filter((w) => w.id !== excludeId && headKey(w.en) === k)
}

// Solo es duplicada si coinciden la palabra y el significado: «bank = banco» y
// «bank = orilla» son dos significados distintos que se guardan por separado.
function findDuplicate(en, es, excludeId) {
  return sensesOf(en, excludeId).find((w) => fold(w.es.trim()) === fold(es.trim()))
}

async function addWord({ en, es, ex, pos, note, word_date }) {
  const dupe = findDuplicate(en, es)
  if (dupe) return { ok: false, message: 'Ya tienes «' + dupe.en + '» = ' + dupe.es + ' apuntada el ' + dupe.word_date + '.' }
  const { data, error } = await supabase
    .from('words')
    .insert({ en, es, ex: ex || '', pos: pos || null, note: note || '', word_date })
    .select()
    .single()
  if (error) return { ok: false, message: error.message }
  words.value.unshift(data)
  return { ok: true, word: data }
}

async function updateWord(id, patch) {
  const dupe = patch.en && patch.es ? findDuplicate(patch.en, patch.es, id) : null
  if (dupe) return { ok: false, message: 'Ya tienes «' + dupe.en + '» = ' + dupe.es + ' apuntada.' }
  const { data, error } = await supabase.from('words').update(patch).eq('id', id).select().single()
  if (error) return { ok: false, message: error.message }
  const i = words.value.findIndex((w) => w.id === id)
  if (i > -1) words.value[i] = data
  return { ok: true, word: data }
}

async function removeWord(id) {
  const { error } = await supabase.from('words').delete().eq('id', id)
  if (!error) words.value = words.value.filter((w) => w.id !== id)
  return !error
}

// Los aciertos/fallos de un examen se acumulan aquí y se guardan todos juntos
// al terminar, en vez de lanzar una petición por cada pregunta.
const pendingMiss = new Map()
function markLocal(id, ok) {
  const w = words.value.find((x) => x.id === id)
  if (!w) return
  const cur = pendingMiss.has(id) ? pendingMiss.get(id) : w.missed_count
  const next = ok ? Math.max(0, cur - 1) : cur + 1
  pendingMiss.set(id, next)
  w.missed_count = next
}
async function flushMissed() {
  const entries = [...pendingMiss.entries()]
  pendingMiss.clear()
  await Promise.all(entries.map(([id, missed_count]) => supabase.from('words').update({ missed_count }).eq('id', id)))
}

function reset() {
  words.value = []
  loaded.value = false
  pendingMiss.clear()
}

export function useWords() {
  return { words, loading, loaded, load, sensesOf, addWord, updateWord, removeWord, markLocal, flushMissed, reset }
}
