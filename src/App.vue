<script setup>
import { ref, computed, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useWords } from './composables/useWords'
import { useExamResults } from './composables/useExamResults'
import { useVerbProgress } from './composables/useVerbProgress'
import { wkLabel, wkOf } from './lib/dates'
import { buildQuestions, acceptedAnswers } from './lib/quiz'
import AuthView from './components/AuthView.vue'
import HomeView from './components/HomeView.vue'
import WordsView from './components/WordsView.vue'
import QuizView from './components/QuizView.vue'
import VerbsView from './components/VerbsView.vue'

const { session, ready, signOut } = useAuth()
const { words, load: loadWords, reset: resetWords, markLocal, flushMissed } = useWords()
const { load: loadResults, reset: resetResults, saveResult } = useExamResults()
const { load: loadVerbs, reset: resetVerbs } = useVerbProgress()

const mode = ref('home') // 'home' | 'list' | 'verbs'
const verbFocus = ref(false) // un día o un examen de verbos ocupa toda la pantalla
const editingWord = ref(null)
const examScope = ref(null) // { type: 'week', weekKey } | { type: 'all' } | { type: 'missed' }

watch(
  session,
  async (s, prev) => {
    if (s && !prev) {
      await Promise.all([loadWords(), loadResults(), loadVerbs()])
    } else if (!s && prev) {
      resetWords()
      resetResults()
      resetVerbs()
      mode.value = 'home'
      verbFocus.value = false
      editingWord.value = null
      examScope.value = null
    }
  },
  { immediate: true },
)

function startExam(scope) {
  examScope.value = scope
}
function exitExam() {
  examScope.value = null
}
function editFromList(w) {
  editingWord.value = w
  mode.value = 'home'
}

const examWords = computed(() => {
  const s = examScope.value
  if (!s) return []
  if (s.type === 'week') return words.value.filter((w) => wkOf(w.word_date) === s.weekKey)
  if (s.type === 'missed') return words.value.filter((w) => w.missed_count > 0)
  return words.value
})
const examTitle = computed(() => {
  const s = examScope.value
  if (!s) return ''
  if (s.type === 'week') return 'Semana del ' + wkLabel(s.weekKey)
  if (s.type === 'missed') return 'Repaso de las que fallas'
  return 'Todas las palabras'
})
const buildWordExam = () => buildQuestions(examWords.value, words.value)
const acceptedWord = (q) => acceptedAnswers(q, words.value)
async function finishWordExam(hits, total) {
  await flushMissed()
  const s = examScope.value
  if (s?.type === 'week') await saveResult(s.weekKey, hits, total)
}
</script>

<template>
  <AuthView v-if="ready && !session" />

  <div v-else class="wrap">
    <p v-if="!ready" class="hint">Cargando…</p>

    <template v-else>
      <QuizView
        v-if="examScope"
        :title="examTitle"
        :build="buildWordExam"
        :accepted="acceptedWord"
        @answer="(q, ok) => markLocal(q.w.id, ok)"
        @finish="finishWordExam"
        @exit="exitExam"
      />

      <template v-else>
        <template v-if="!verbFocus">
          <div class="top">
            <h1>Mi vocabulario</h1>
            <button class="btn ghost small" type="button" @click="signOut">Cerrar sesión</button>
          </div>
          <p class="sub">
            {{
              mode === 'verbs'
                ? '384 verbos para el B2 en 8 semanas, 30 minutos al día.'
                : 'Apunta cada día las palabras que no conoces y ponte a prueba al acabar la semana.'
            }}
          </p>
          <nav class="tabs">
            <button type="button" :aria-current="mode === 'home' ? 'page' : null" @click="mode = 'home'">Hoy</button>
            <button type="button" :aria-current="mode === 'list' ? 'page' : null" @click="mode = 'list'">Palabras</button>
            <button type="button" :aria-current="mode === 'verbs' ? 'page' : null" @click="mode = 'verbs'">Verbos</button>
          </nav>
        </template>

        <HomeView v-if="mode === 'home'" v-model:editing-word="editingWord" @start-exam="startExam" />
        <WordsView v-else-if="mode === 'list'" @edit="editFromList" @start-exam="startExam" />
        <VerbsView v-else v-model:focus="verbFocus" />

        <p v-if="!verbFocus" class="foot">Sesión: {{ session.user.email }}</p>
      </template>
    </template>
  </div>
</template>
