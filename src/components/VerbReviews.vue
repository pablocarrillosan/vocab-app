<script setup>
import { computed } from 'vue'
import { useVerbProgress } from '../composables/useVerbProgress'
import { useVerbLevel } from '../composables/useVerbLevel'
import { dayLong, ymd } from '../lib/dates'
import VerbDayRow from './VerbDayRow.vue'

const emit = defineEmits(['open', 'cumulative', 'missed'])
const { results, stats } = useVerbProgress()
const { plan } = useVerbLevel()

const studied = computed(() => plan.value.studiedVerbs(results.value))
const nDays = computed(() => new Set(studied.value.map((v) => v.day)).size)
const byKind = computed(() => plan.value.kinds.map((k) => ({ k, n: studied.value.filter((v) => v.k === k).length })).filter((x) => x.n))
const KLABEL = { reg: 'regulares', phr: 'phrasal', irr: 'irregulares', prep: 'con preposición' }
const last = computed(() => results.value[plan.value.cumKey])
const lastDate = computed(() => (last.value ? dayLong(ymd(new Date(last.value.done_at))) : ''))

const missed = computed(() => plan.value.VERBS.filter((v) => (stats.value[v.id]?.missed_count || 0) > 0))

// Se enseñan las semanas ya alcanzadas y la siguiente, bloqueada.
const weeks = computed(() => {
  const { weekReviews, reached } = plan.value
  const open = weekReviews.filter((p) => reached(p, results.value))
  const nextLocked = weekReviews.find((p) => !reached(p, results.value))
  return { open, nextLocked, hidden: nextLocked ? weekReviews.length - open.length - 1 : 0 }
})
</script>

<template>
  <p class="plan">El semanal y el mensual te llegan solos dentro del plan. Aquí puedes repetirlos, o repasar todo lo estudiado cuando quieras.</p>

  <section class="today">
    <span class="eyebrow">Acumulativo</span>
    <h2>Todo lo que has estudiado</h2>
    <template v-if="studied.length">
      <p class="pv">
        {{ studied.length }} verbos de {{ nDays }} {{ nDays === 1 ? 'día' : 'días' }} de estudio. Hasta 60 preguntas: primero los que fallas y los que
        llevas más tiempo sin ver.
      </p>
      <div class="kchips">
        <span v-for="x in byKind" :key="x.k" :class="'k-' + x.k">{{ x.n }} {{ KLABEL[x.k] }}</span>
      </div>
      <button class="btn" type="button" @click="emit('cumulative')">Empezar repaso acumulativo</button>
      <p v-if="last" class="lastres">Último intento: {{ last.score }} de {{ last.total }}, el {{ lastDate }}</p>
    </template>
    <p v-else class="pv">Cuando termines el examen de tu primer día de estudio, sus verbos entrarán aquí.</p>
  </section>

  <section class="card">
    <div class="cardhead">
      <h3>Solo los que fallo</h3>
      <span>{{ missed.length }} {{ missed.length === 1 ? 'verbo' : 'verbos' }}</span>
    </div>
    <template v-if="missed.length">
      <p class="vchips" lang="en">
        <span v-for="v in missed.slice(0, 24)" :key="v.id" :class="'k-' + v.k">{{ v.en }}</span
        ><span v-if="missed.length > 24" class="more">y {{ missed.length - 24 }} más</span>
      </p>
      <button class="btn ghost" type="button" @click="emit('missed')">Repasar {{ missed.length === 1 ? 'el que fallo' : 'los ' + missed.length }}</button>
    </template>
    <p v-else class="hint">Ahora mismo no tienes ningún verbo con fallos.</p>
  </section>

  <h3 class="month">Semanales</h3>
  <ol class="days">
    <li v-for="p in weeks.open" :key="p.num"><VerbDayRow :p="p" :label="'Semana ' + p.week" @open="emit('open', p.num)" /></li>
    <li v-if="weeks.nextLocked"><VerbDayRow :p="weeks.nextLocked" :label="'Semana ' + weeks.nextLocked.week" locked /></li>
  </ol>
  <p v-if="weeks.hidden" class="hint">Las semanas siguientes aparecen aquí al llegar a ellas.</p>

  <h3 class="month">Mensuales</h3>
  <ol class="days">
    <li v-for="p in plan.monthReviews" :key="p.num">
      <VerbDayRow :p="p" :label="'Mes ' + p.month" :locked="!plan.reached(p, results)" @open="emit('open', p.num)" />
    </li>
  </ol>
</template>
