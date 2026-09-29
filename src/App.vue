<script setup>
import { ref, computed, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useWords } from './composables/useWords'
import { useExamResults } from './composables/useExamResults'
import { wkLabel, wkOf } from './lib/dates'
import AuthView from './components/AuthView.vue'
import HomeView from './components/HomeView.vue'
import WordsView from './components/WordsView.vue'
import QuizView from './components/QuizView.vue'

const { session, ready, signOut } = useAuth()
const { words, load: loadWords, reset: resetWords } = useWords()
const { results, load: loadResults, reset: resetResults } = useExamResults()

const mode = ref('home') // 'home' | 'list'
const editingWord = ref(null)
const examScope = ref(null) // { type: 'week', weekKey } | { type: 'all' } | { type: 'missed' }

watch(
  session,
  async (s, prev) => {
    if (s && !prev) {
      await Promise.all([loadWords(), loadResults()])
    } else if (!s && prev) {
      resetWords()
      resetResults()
      mode.value = 'home'
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
</script>

<template>
  <div class="wrap">
    <p v-if="!ready" class="hint">Cargando…</p>

    <AuthView v-else-if="!session" />

    <template v-else>
      <QuizView
        v-if="examScope"
        :scope-words="examWords"
        :pool="words"
        :title="examTitle"
        :week-key="examScope.type === 'week' ? examScope.weekKey : null"
        @exit="exitExam"
      />

      <template v-else>
        <div class="top">
          <h1>Mi vocabulario</h1>
          <button class="btn ghost small" type="button" @click="signOut">Cerrar sesión</button>
        </div>
        <p class="sub">Apunta cada día las palabras que no conoces y ponte a prueba al acabar la semana.</p>
        <nav class="tabs">
          <button type="button" :aria-current="mode === 'home' ? 'page' : null" @click="mode = 'home'">Hoy</button>
          <button type="button" :aria-current="mode === 'list' ? 'page' : null" @click="mode = 'list'">Palabras</button>
        </nav>

        <HomeView v-if="mode === 'home'" v-model:editing-word="editingWord" @start-exam="startExam" />
        <WordsView v-else @edit="editFromList" @start-exam="startExam" />

        <p class="foot">Sesión: {{ session.user.email }}</p>
      </template>
    </template>
  </div>
</template>
