<script setup>
import { ref, computed } from 'vue'
import { useWords } from '../composables/useWords'
import { fold } from '../lib/text'
import { groupWords } from '../lib/words'
import WordRow from './WordRow.vue'

const emit = defineEmits(['edit', 'start-exam'])
const { words } = useWords()

const q = ref('')
const filter = ref('all')

const missed = computed(() => words.value.filter((w) => w.missed_count > 0))

const list = computed(() => {
  const needle = fold(q.value.trim())
  return words.value
    .filter((w) => (filter.value === 'missed' ? w.missed_count > 0 : true))
    .filter(
      (w) =>
        !needle ||
        fold(w.en).includes(needle) ||
        fold(w.es).includes(needle) ||
        fold(w.note || '').includes(needle) ||
        fold(w.ex || '').includes(needle),
    )
})
const groups = computed(() => groupWords(list.value))
</script>

<template>
  <input v-model="q" class="search" type="search" placeholder="Buscar en inglés o en español" autocomplete="off" aria-label="Buscar palabra" />
  <div class="chips">
    <button class="fchip" type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">Todas</button>
    <button class="fchip" type="button" :aria-pressed="filter === 'missed'" @click="filter = 'missed'">Por repasar ({{ missed.length }})</button>
  </div>

  <div v-if="words.length" class="actions" style="margin: 6px 0 4px">
    <button class="btn ghost" type="button" @click="emit('start-exam', { type: 'all' })">Examen con todas</button>
    <button v-if="missed.length" class="btn ghost" type="button" @click="emit('start-exam', { type: 'missed' })">Repasar las que fallo</button>
  </div>

  <p v-if="!words.length" class="hint">Aún no has apuntado ninguna palabra.</p>
  <template v-else>
    <p class="count">
      {{ groups.length }} {{ groups.length === 1 ? 'palabra' : 'palabras' }}<template v-if="list.length > groups.length">
        · {{ list.length }} significados</template
      >
    </p>
    <p v-if="!list.length" class="hint">No hay palabras con ese filtro.</p>
    <WordRow v-for="g in groups" :key="g.key" :senses="g.senses" show-day @edit="emit('edit', $event)" />
  </template>
</template>
