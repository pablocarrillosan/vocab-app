<script setup>
import { computed } from 'vue'
import { wkLabel, dayLabel, today } from '../lib/dates'
import { groupWords } from '../lib/words'
import WordRow from './WordRow.vue'

const props = defineProps({
  weekKey: { type: String, required: true },
  words: { type: Array, required: true },
  done: { type: Object, default: null }, // { score, total } o null
  isPast: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle', 'edit', 'exam'])

const byDay = computed(() => {
  const g = {}
  props.words.forEach((w) => (g[w.word_date] = g[w.word_date] || []).push(w))
  return Object.keys(g)
    .sort()
    .reverse()
    .map((d) => ({ day: d, groups: groupWords(g[d]) }))
})
const td = today()
</script>

<template>
  <details class="week" :open="open" @toggle="emit('toggle', $event.target.open)">
    <summary>
      <span class="wk-title">Semana del {{ wkLabel(weekKey) }}</span>
      <span v-if="done" class="badge done">Examen {{ done.score }}/{{ done.total }}</span>
      <span v-else-if="words.length && isPast" class="badge todo">Examen pendiente</span>
      <span class="wk-prog">{{ words.length }} {{ words.length === 1 ? 'palabra' : 'palabras' }}</span>
    </summary>

    <p v-if="!words.length" class="emptyw">Todavía no has apuntado nada esta semana.</p>
    <template v-else>
      <div class="wkact">
        <button class="btn" :class="{ ghost: done }" type="button" @click="emit('exam', weekKey)">
          {{ done ? 'Repetir el examen de la semana' : 'Examen de la semana' }}
        </button>
      </div>
      <template v-for="g in byDay" :key="g.day">
        <div class="dayh">{{ dayLabel(g.day) }}<template v-if="g.day === td"> · hoy</template></div>
        <WordRow v-for="x in g.groups" :key="x.key" :senses="x.senses" @edit="emit('edit', $event)" />
      </template>
    </template>
  </details>
</template>
