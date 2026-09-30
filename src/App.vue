<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useAuth } from './composables/useAuth'
import { useWords } from './composables/useWords'
import { useExamResults } from './composables/useExamResults'
import { useVerbProgress } from './composables/useVerbProgress'
import { useGrammarProgress } from './composables/useGrammarProgress'
import { wkLabel, wkOf } from './lib/dates'
import { buildQuestions, acceptedAnswers } from './lib/quiz'
import AuthView from './components/AuthView.vue'
import HomeView from './components/HomeView.vue'
import WordsView from './components/WordsView.vue'
import QuizView from './components/QuizView.vue'
import VerbsView from './components/VerbsView.vue'

// Gramática trae sus 10 bloques de datos: se carga solo al abrir la pestaña.
const GrammarView = defineAsyncComponent(() => import('./components/GrammarView.vue'))

const { session, ready, signOut } = useAuth()
const { words, load: loadWords, reset: resetWords, markLocal, flushMissed } = useWords()
const { load: loadResults, reset: resetResults, saveResult } = useExamResults()
const { load: loadVerbs, reset: resetVerbs } = useVerbProgress()
const { load: loadGrammar, reset: resetGrammar } = useGrammarProgress()

// Tres áreas arriba; dentro de cada una, chips (Vocabulario: Hoy y Palabras).
const mode = ref('vocab') // 'vocab' | 'verbs' | 'grammar'
const vocabSub = ref('home') // 'home' | 'list'
const focus = ref(false) // un día de verbos, un examen o un bloque de gramática ocupa toda la pantalla
const editingWord = ref(null)
const examScope = ref(null) // { type: 'week', weekKey } | { type: 'all' } | { type: 'missed' }

watch(
  session,
  async (s, prev) => {
    if (s && !prev) {
      await Promise.all([loadWords(), loadResults(), loadVerbs(), loadGrammar()])
    } else if (!s && prev) {
      resetWords()
      resetResults()
      resetVerbs()
      resetGrammar()
      mode.value = 'vocab'
      vocabSub.value = 'home'
      focus.value = false
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
  vocabSub.value = 'home'
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
        <template v-if="!focus">
          <div class="top">
            <h1>Mi cuaderno</h1>
            <button class="btn ghost small" type="button" @click="signOut">Cerrar sesión</button>
          </div>
          <nav class="tabs">
            <button type="button" :aria-current="mode === 'vocab' ? 'page' : null" @click="mode = 'vocab'">Vocabulario</button>
            <button type="button" :aria-current="mode === 'verbs' ? 'page' : null" @click="mode = 'verbs'">Verbos</button>
            <button type="button" :aria-current="mode === 'grammar' ? 'page' : null" @click="mode = 'grammar'">Gramática</button>
          </nav>
        </template>

        <template v-if="mode === 'vocab'">
          <div class="subnav">
            <div class="chips">
              <button class="fchip" type="button" :aria-pressed="vocabSub === 'home'" @click="vocabSub = 'home'">Hoy</button>
              <button class="fchip" type="button" :aria-pressed="vocabSub === 'list'" @click="vocabSub = 'list'">Palabras</button>
            </div>
          </div>
          <HomeView v-if="vocabSub === 'home'" v-model:editing-word="editingWord" @start-exam="startExam" />
          <WordsView v-else @edit="editFromList" @start-exam="startExam" />
        </template>
        <VerbsView v-else-if="mode === 'verbs'" v-model:focus="focus" />
        <GrammarView v-else v-model:focus="focus" />

        <p v-if="!focus" class="foot">Sesión: {{ session.user.email }}</p>
      </template>
    </template>
  </div>
</template>
