import { ref, computed, watch } from 'vue'
import { LEVELS } from '../lib/verbPlan'

// Plan de verbos que se está viendo (B2 o C1). Es una preferencia de este
// navegador; el progreso de cada plan se guarda aparte en Supabase.
const KEY = 'verbLevel'

function saved() {
  try {
    return localStorage.getItem(KEY)
  } catch (e) {
    return null
  }
}

const level = ref(LEVELS[saved()] ? saved() : 'b2')
const plan = computed(() => LEVELS[level.value])

watch(level, (l) => {
  try {
    localStorage.setItem(KEY, l)
  } catch (e) {
    /* sin almacenamiento: el nivel solo dura esta visita */
  }
})

export function useVerbLevel() {
  return { level, plan }
}
