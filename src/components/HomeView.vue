<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { today, wkOf, dayOfWeek, dayLong, wkLabel } from '../lib/dates'
import { useWords } from '../composables/useWords'
import { useExamResults } from '../composables/useExamResults'
import WordForm from './WordForm.vue'
import WeekBlock from './WeekBlock.vue'

const props = defineProps({
  editingWord: { type: Object, default: null },
})
const emit = defineEmits(['update:editingWord', 'start-exam'])
const { words } = useWords()
const { results } = useExamResults()

const formRef = ref(null)
const openWeeks = reactive(new Set())
const seeded = ref(false)

const td = today()
const cw = wkOf(td)

function weekWords(wk) {
  return words.value.filter((w) => wkOf(w.word_date) === wk)
}
const weekKeys = computed(() => {
  const s = new Set([cw])
  words.value.forEach((w) => s.add(wkOf(w.word_date)))
  return [...s].sort().reverse()
})
const pastPending = computed(() => weekKeys.value.find((k) => k < cw && !results.value[k] && weekWords(k).length))
const cwWords = computed(() => weekWords(cw))
const todayCount = computed(() => words.value.filter((w) => w.word_date === td).length)
const missCount = computed(() => words.value.filter((w) => w.missed_count > 0).length)

onMounted(() => {
  if (!seeded.value) {
    seeded.value = true
    openWeeks.add(cw)
    if (pastPending.value) openWeeks.add(pastPending.value)
  }
  if (props.editingWord) {
    openWeeks.add(wkOf(props.editingWord.word_date))
    nextTick(() => document.getElementById('form')?.scrollIntoView({ block: 'center' }))
  }
})

function toggleWeek(wk, open) {
  if (open) openWeeks.add(wk)
  else openWeeks.delete(wk)
}
function editWord(w) {
  emit('update:editingWord', w)
  openWeeks.add(wkOf(w.word_date))
  nextTick(() => {
    formRef.value?.focusEn()
    document.getElementById('form')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}
function onSaved(date) {
  emit('update:editingWord', null)
  openWeeks.add(wkOf(date))
}
function focusForm() {
  formRef.value?.focusEn()
  document.getElementById('form')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
</script>

<template>
  <section class="today">
    <template v-if="pastPending">
      <h2>Te quedó pendiente el examen de la semana del {{ wkLabel(pastPending) }}</h2>
      <p class="pv">{{ weekWords(pastPending).length }} palabras esperando a que las repases.</p>
      <button class="btn" type="button" @click="emit('start-exam', { type: 'week', weekKey: pastPending })">Hacer el examen</button>
    </template>
    <template v-else-if="dayOfWeek(td) >= 4 && cwWords.length && !results[cw]">
      <h2>Hoy toca el examen de la semana</h2>
      <p class="pv">{{ cwWords.length }} {{ cwWords.length === 1 ? 'palabra apuntada' : 'palabras apuntadas' }} del {{ wkLabel(cw) }}.</p>
      <button class="btn" type="button" @click="emit('start-exam', { type: 'week', weekKey: cw })">Empezar el examen</button>
    </template>
    <template v-else>
      <h2>Hoy es {{ dayLong(td) }}</h2>
      <p class="pv">
        {{ todayCount ? 'Hoy llevas ' + todayCount + (todayCount === 1 ? ' palabra.' : ' palabras.') + ' Sigue apuntando las que te vayan saliendo.' : 'Todavía no has apuntado ninguna palabra hoy.' }}
      </p>
      <button class="btn" type="button" @click="focusForm">Apuntar una palabra</button>
    </template>
  </section>

  <WordForm id="form" ref="formRef" :editing-word="editingWord" @saved="onSaved" @cancel="emit('update:editingWord', null)" @edit="editWord" />

  <div class="stats">
    <div><b>{{ words.length }}</b><span>palabras apuntadas</span></div>
    <div><b>{{ cwWords.length }}</b><span>esta semana</span></div>
    <div><b>{{ missCount }}</b><span>por repasar</span></div>
  </div>

  <h3 class="month">Semanas</h3>
  <WeekBlock
    v-for="wk in weekKeys"
    :key="wk"
    :week-key="wk"
    :words="weekWords(wk)"
    :done="results[wk] || null"
    :is-past="wk < cw"
    :open="openWeeks.has(wk)"
    @toggle="(o) => toggleWeek(wk, o)"
    @edit="editWord"
    @exam="(wk2) => emit('start-exam', { type: 'week', weekKey: wk2 })"
  />
</template>
