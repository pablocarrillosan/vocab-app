<script setup>
import { computed, reactive } from 'vue'
import { MONTH_WEEKS } from '../lib/verbPlan'
import { useVerbProgress } from '../composables/useVerbProgress'
import { useVerbLevel } from '../composables/useVerbLevel'
import VerbDayRow from './VerbDayRow.vue'

const emit = defineEmits(['open'])
const { results, stats } = useVerbProgress()
const { plan } = useVerbLevel()

const cur = computed(() => plan.value.nextDay(results.value))
const openWeeks = reactive(new Set(cur.value ? [cur.value.week] : []))

const nDone = computed(() => plan.value.PLAN.filter((p) => results.value[p.key]).length)
const seenVerbs = computed(() =>
  plan.value.PLAN.filter((p) => p.type === 'learn' && results.value[p.key]).reduce((n, p) => n + p.verbs.length, 0),
)
const nMiss = computed(() => plan.value.VERBS.filter((v) => (stats.value[v.id]?.missed_count || 0) > 0).length)

const months = computed(() => {
  const { PLAN, WEEKS_COUNT } = plan.value
  const out = []
  for (let w = 1; w <= WEEKS_COUNT; w++) {
    if ((w - 1) % MONTH_WEEKS === 0) out.push({ n: (w - 1) / MONTH_WEEKS + 1, weeks: [] })
    const days = PLAN.filter((p) => p.week === w)
    const done = days.filter((p) => results.value[p.key]).length
    out[out.length - 1].weeks.push({ w, days, done, pct: Math.round((100 * done) / days.length) })
  }
  return out
})
const preview = computed(() => {
  const p = cur.value
  if (!p) return ''
  if (p.type === 'learn') return p.verbs.map((v) => v.en).join(', ')
  return p.type === 'month'
    ? 'Repaso de los ' + p.verbs.length + ' verbos del mes, con dos textos. Los que más has fallado salen primero.'
    : 'Repaso de los ' + p.verbs.length + ' verbos de la semana: dos textos y una pregunta por cada uno de los demás.'
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
      <p class="pv">Has pasado por los {{ plan.VERBS.length }} verbos. Sigue con el repaso acumulativo y con los que todavía fallas.</p>
    </template>
  </section>

  <div class="stats">
    <div><b>{{ nDone }} de {{ plan.TOTAL_DAYS }}</b><span>días hechos</span></div>
    <div><b>{{ seenVerbs }} de {{ plan.VERBS.length }}</b><span>verbos estudiados</span></div>
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
