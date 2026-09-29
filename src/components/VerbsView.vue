<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { LEVELS } from '../lib/verbPlan'
import { planQuestions, cumulativeQuestions, missedQuestions, acceptedVerbAnswers } from '../lib/verbQuiz'
import { useVerbProgress } from '../composables/useVerbProgress'
import { useVerbLevel } from '../composables/useVerbLevel'
import VerbPlan from './VerbPlan.vue'
import VerbReviews from './VerbReviews.vue'
import VerbList from './VerbList.vue'
import VerbDay from './VerbDay.vue'
import QuizView from './QuizView.vue'

// focus = true mientras se ve un día o un examen: App oculta entonces la
// cabecera y las pestañas, igual que con el examen de palabras.
const emit = defineEmits(['update:focus'])
const { results, stats, saveResult, markLocal, flush } = useVerbProgress()
const { level, plan } = useVerbLevel()

const sub = ref('plan') // 'plan' | 'reviews' | 'list'
const screen = ref(null) // { name: 'day', num } | { name: 'quiz', kind: 'day'|'cumulative'|'missed', num? }
const quizKey = ref(0)

watch(
  () => !!screen.value,
  (f) => emit('update:focus', f),
)
function go(s) {
  screen.value = s
  nextTick(() => window.scrollTo(0, 0))
}

const BACK = { plan: 'Volver al plan', reviews: 'Volver a los repasos', list: 'Volver a la lista' }
const openDay = (num) => go({ name: 'day', num })
function startQuiz(kind, num) {
  quizKey.value++
  go({ name: 'quiz', kind, num })
}
async function exitQuiz() {
  await flush()
  const s = screen.value
  go(s.kind === 'day' ? { name: 'day', num: s.num } : null)
}

const quiz = computed(() => {
  const s = screen.value
  if (!s || s.name !== 'quiz') return null
  const pl = plan.value
  if (s.kind === 'day') {
    const p = pl.planOf(s.num)
    return { title: p.t, kicker: pl.label + ' · Día ' + p.num + ', semana ' + p.week, build: () => planQuestions(p, stats.value) }
  }
  if (s.kind === 'cumulative') {
    return {
      title: 'Todo lo estudiado',
      kicker: 'Verbos ' + pl.label + ' · repaso acumulativo',
      build: () => cumulativeQuestions(pl.studiedVerbs(results.value), stats.value),
    }
  }
  return { title: 'Los que fallo', kicker: 'Verbos ' + pl.label + ' · repaso de fallos', build: () => missedQuestions(pl.VERBS, stats.value) }
})

async function onFinish(hits, total) {
  await flush()
  const s = screen.value
  if (s.kind === 'day') await saveResult(plan.value.keyOf(s.num), hits, total)
  else if (s.kind === 'cumulative') await saveResult(plan.value.cumKey, hits, total)
}
// Tras un examen del plan, botón para seguir con el siguiente día pendiente.
const upNext = computed(() => {
  const s = screen.value
  if (!s || s.kind !== 'day') return null
  const nx = plan.value.nextDay(results.value)
  return nx && nx.num !== s.num ? nx : null
})
</script>

<template>
  <QuizView
    v-if="quiz"
    :key="quizKey"
    :title="quiz.title"
    :kicker="quiz.kicker"
    :build="quiz.build"
    :accepted="acceptedVerbAnswers"
    @answer="(q, ok) => markLocal(q.w.id, ok)"
    @finish="onFinish"
    @exit="exitQuiz"
  >
    <template #result-actions>
      <button v-if="upNext" class="btn" type="button" @click="openDay(upNext.num)">Ir al día {{ upNext.num }}</button>
      <button v-else class="btn" type="button" @click="go(null)">{{ BACK[sub] }}</button>
    </template>
  </QuizView>

  <VerbDay v-else-if="screen" :num="screen.num" :back-label="BACK[sub]" @back="go(null)" @start="startQuiz('day', screen.num)" />

  <template v-else>
    <div class="subnav">
      <div class="chips">
        <button class="fchip" type="button" :aria-pressed="sub === 'plan'" @click="sub = 'plan'">Plan</button>
        <button class="fchip" type="button" :aria-pressed="sub === 'reviews'" @click="sub = 'reviews'">Repasos</button>
        <button class="fchip" type="button" :aria-pressed="sub === 'list'" @click="sub = 'list'">Lista</button>
      </div>
      <div class="level" role="group" aria-label="Nivel del plan">
        <button v-for="(l, id) in LEVELS" :key="id" type="button" :aria-pressed="level === id" @click="level = id">{{ l.label }}</button>
      </div>
    </div>
    <!-- key: al cambiar de nivel se vuelven a montar con el plan nuevo -->
    <VerbPlan v-if="sub === 'plan'" :key="level" @open="openDay" />
    <VerbReviews v-else-if="sub === 'reviews'" :key="level" @open="openDay" @cumulative="startQuiz('cumulative')" @missed="startQuiz('missed')" />
    <VerbList v-else :key="level" @open="openDay" />
  </template>
</template>
