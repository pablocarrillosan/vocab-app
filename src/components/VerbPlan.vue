<script setup>
import { computed, reactive } from 'vue'
import { PLAN, WEEKS_COUNT, MONTH_WEEKS, TOTAL_DAYS, VERBS, nextDay } from '../lib/verbPlan'
import { useVerbProgress } from '../composables/useVerbProgress'
import VerbDayRow from './VerbDayRow.vue'

const emit = defineEmits(['open'])
const { results, stats } = useVerbProgress()

const cur = computed(() => nextDay(results.value))
const openWeeks = reactive(new Set(cur.value ? [cur.value.week] : []))

const nDone = computed(() => PLAN.filter((p) => results.value[p.num]).length)
const seenVerbs = computed(() => PLAN.filter((p) => p.type === 'learn' && results.value[p.num]).reduce((n, p) => n + p.verbs.length, 0))
const nMiss = computed(() => Object.values(stats.value).filter((s) => s.missed_count > 0).length)

const months = computed(() => {
  const out = []
  for (let w = 1; w <= WEEKS_COUNT; w++) {
    if ((w - 1) % MONTH_WEEKS === 0) out.push({ n: (w - 1) / MONTH_WEEKS + 1, weeks: [] })
    const days = PLAN.filter((p) => p.week === w)
    const done = days.filter((p) => results.value[p.num]).length
    out[out.length - 1].weeks.push({ w, days, done, pct: Math.round((100 * done) / days.length) })
  }
  return out
})
const preview = computed(() => {
  const p = cur.value
  if (!p) return ''
  if (p.type === 'learn') return p.verbs.map((v) => v.en).join(', ')
  return p.type === 'month'
    ? 'Repaso de los ' + p.verbs.length + ' verbos del mes. Los que más has fallado salen primero.'
    : 'Repaso de los ' + p.verbs.length + ' verbos de la semana, con una pregunta por verbo.'
})
function toggle(w, open) {
  if (open) openWeeks.add(w)
  else openWeeks.delete(w)
}
</script>

<template>
  <section class="today">
    <template v-if="cur">
      <h2>Hoy toca el día {{ cur.num }}: {{ cur.type === 'learn' ? cur.t : cur.t.toLowerCase() }}</h2>
      <p class="pv" :lang="cur.type === 'learn' ? 'en' : null">{{ preview }}</p>
      <button class="btn" type="button" @click="emit('open', cur.num)">Empezar el día {{ cur.num }}</button>
    </template>
    <template v-else>
      <h2>Plan completado</h2>
      <p class="pv">Has pasado por los {{ VERBS.length }} verbos. Sigue con el repaso acumulativo y con los que todavía fallas.</p>
    </template>
  </section>

  <div class="stats">
    <div><b>{{ nDone }} de {{ TOTAL_DAYS }}</b><span>días hechos</span></div>
    <div><b>{{ seenVerbs }} de {{ VERBS.length }}</b><span>verbos estudiados</span></div>
    <div><b>{{ nMiss }}</b><span>por repasar</span></div>
  </div>

  <template v-for="m in months" :key="m.n">
    <h3 class="month">Mes {{ m.n }}</h3>
    <details v-for="wk in m.weeks" :key="wk.w" class="week" :open="openWeeks.has(wk.w)" @toggle="toggle(wk.w, $event.target.open)">
      <summary>
        <span class="wk-title">Semana {{ wk.w }}</span>
        <span class="wk-prog">{{ wk.done }} de {{ wk.days.length }}</span>
        <span class="bar"><i :style="{ width: wk.pct + '%' }"></i></span>
      </summary>
      <ol class="days">
        <li v-for="p in wk.days" :key="p.num"><VerbDayRow :p="p" show-num @open="emit('open', p.num)" /></li>
      </ol>
    </details>
  </template>
</template>
