<script setup>
import { ref, computed } from 'vue'
import { VERBS } from '../lib/verbPlan'
import { fold } from '../lib/text'
import { useVerbProgress } from '../composables/useVerbProgress'
import ExamplePhrase from './ExamplePhrase.vue'

const emit = defineEmits(['open'])
const { stats } = useVerbProgress()

const q = ref('')
const filter = ref('all')
const FILTERS = [
  ['all', 'Todos'],
  ['reg', 'Regulares'],
  ['irr', 'Irregulares'],
  ['phr', 'Phrasal verbs'],
  ['missed', 'Por repasar'],
]
const missed = (v) => (stats.value[v.id]?.missed_count || 0) > 0

const list = computed(() => {
  const needle = fold(q.value.trim())
  return VERBS.filter((v) => {
    if (filter.value === 'missed' && !missed(v)) return false
    if (['reg', 'irr', 'phr'].includes(filter.value) && v.k !== filter.value) return false
    return !needle || fold(v.en).includes(needle) || fold(v.es).includes(needle)
  })
})
</script>

<template>
  <input v-model="q" class="search" type="search" placeholder="Buscar en inglés o en español" autocomplete="off" aria-label="Buscar verbo" />
  <div class="chips">
    <button v-for="f in FILTERS" :key="f[0]" class="fchip" type="button" :aria-pressed="filter === f[0]" @click="filter = f[0]">{{ f[1] }}</button>
  </div>
  <p class="count">{{ list.length }} {{ list.length === 1 ? 'verbo' : 'verbos' }}</p>
  <p v-if="!list.length" class="hint">No hay verbos con ese filtro.</p>
  <div v-for="v in list" :key="v.id" class="vrow" :class="'k-' + v.k">
    <div class="vl">
      <b lang="en">{{ v.en }}</b>
      <span v-if="v.past" class="forms" lang="en"> {{ v.past.join('/') }}, {{ v.pp.join('/') }}</span>
      <span v-if="missed(v)" class="tag">repasar</span>
    </div>
    <button class="daylink" type="button" @click="emit('open', v.day)">Día {{ v.day }}</button>
    <div class="vr">{{ v.es }}</div>
    <ExamplePhrase :word="v" small class="vex" />
  </div>
</template>
