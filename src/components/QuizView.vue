<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { buildQuestions, acceptedAnswers } from '../lib/quiz'
import { cmp } from '../lib/text'
import { useWords } from '../composables/useWords'
import { useExamResults } from '../composables/useExamResults'
import SayButton from './SayButton.vue'
import ExamplePhrase from './ExamplePhrase.vue'

const props = defineProps({
  scopeWords: { type: Array, required: true },
  pool: { type: Array, required: true },
  title: { type: String, required: true },
  weekKey: { type: String, default: null },
})
const emit = defineEmits(['exit'])
const { markLocal, flushMissed } = useWords()
const { saveResult } = useExamResults()

function build() {
  return buildQuestions(props.scopeWords, props.pool)
}

const questions = ref(build())
const total = questions.value.length
const i = ref(0)
const checked = ref(false)
const lastOk = ref(false)
const sel = ref(null)
const val = ref('')
const results = ref([])
const finished = ref(false)

const current = computed(() => questions.value[i.value])
const hits = computed(() => results.value.filter((r) => r.ok).length)
const progressPct = computed(() => Math.round((100 * i.value) / total))

function record(ok) {
  checked.value = true
  lastOk.value = ok
  results.value.push({ q: current.value, ok })
  markLocal(current.value.w.id, ok)
}
function pick(idx) {
  if (checked.value || current.value.type !== 'mcq') return
  sel.value = idx
  record(current.value.options[idx] === current.value.answer)
}
function check() {
  if (checked.value || current.value.type === 'mcq' || !val.value.trim()) return
  const ok = acceptedAnswers(current.value, props.pool).some((a) => cmp(a) === cmp(val.value))
  record(ok)
}
async function next() {
  if (!checked.value) return
  i.value++
  checked.value = false
  val.value = ''
  sel.value = null
  if (i.value >= total) await finish()
}
async function finish() {
  finished.value = true
  await flushMissed()
  if (props.weekKey) await saveResult(props.weekKey, hits.value, total)
}
function again() {
  questions.value = build()
  i.value = 0
  checked.value = false
  val.value = ''
  sel.value = null
  results.value = []
  finished.value = false
}

const resultMsg = computed(() => {
  const pc = Math.round((100 * hits.value) / total)
  return pc >= 90
    ? 'Muy bien. Estas palabras ya casi son tuyas.'
    : pc >= 70
      ? 'Bien. Mira los fallos de abajo antes de seguir.'
      : 'Merece otra vuelta: vuelve a leer las palabras y repite el examen.'
})
const wrongList = computed(() => {
  const seen = new Set()
  const arr = []
  results.value.forEach((r) => {
    if (!r.ok && !seen.has(r.q.w.id)) {
      seen.add(r.q.w.id)
      arr.push(r.q.w)
    }
  })
  return arr
})

function onKey(e) {
  if (finished.value) return
  if (e.key === 'Enter') {
    const el = document.activeElement
    if (el && el.tagName === 'BUTTON') return
    e.preventDefault()
    if (checked.value) next()
    else if (current.value.type !== 'mcq') check()
    return
  }
  if (!checked.value && current.value.type === 'mcq' && /^[1-4]$/.test(e.key)) pick(+e.key - 1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <button class="back" type="button" @click="emit('exit')">← Salir del examen</button>
  <div class="dayhead">
    <div class="dsub">Examen</div>
    <h2>{{ title }}</h2>
  </div>

  <div v-if="!finished" class="qwrap">
    <div class="qbar"><i :style="{ width: progressPct + '%' }"></i></div>
    <div class="qmeta">
      <span>Pregunta {{ i + 1 }} de {{ total }}</span>
      <span>{{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }}</span>
    </div>

    <template v-if="current.type === 'mcq'">
      <h3 v-if="current.dir === 'e2s'" class="qprompt">
        ¿Qué significa <span class="qw" lang="en">{{ current.w.en }}</span>? <SayButton :text="current.w.en" />
      </h3>
      <h3 v-else class="qprompt">¿Cómo se dice <span class="qw">{{ current.w.es }}</span> en inglés?</h3>
      <div class="opts">
        <button
          v-for="(o, idx) in current.options"
          :key="idx"
          class="opt"
          :class="{ ok: checked && o === current.answer, bad: checked && idx === sel && o !== current.answer }"
          :disabled="checked"
          type="button"
          @click="pick(idx)"
        >
          <kbd>{{ idx + 1 }}</kbd><span>{{ o }}</span>
        </button>
      </div>
    </template>

    <template v-else-if="current.type === 'cloze'">
      <p class="qhelp">Escribe la palabra que falta.</p>
      <p class="sentence" lang="en">
        {{ current.w.ex.slice(0, current.m.i) }}<input
          v-model="val"
          class="blank"
          :class="{ ok: checked && lastOk, bad: checked && !lastOk }"
          :style="{ width: Math.max(6, current.m.t.length + 3) + 'ch' }"
          :disabled="checked"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          aria-label="Respuesta"
        />{{ current.w.ex.slice(current.m.i + current.m.t.length) }}
      </p>
      <p class="hint">Pista: {{ current.w.es }}</p>
    </template>

    <template v-else>
      <h3 class="qprompt">Escribe en inglés: <span class="qw">{{ current.w.es }}</span></h3>
      <input
        v-model="val"
        class="blank"
        :class="{ ok: checked && lastOk, bad: checked && !lastOk }"
        style="width: min(100%, 24ch); font-size: 22px; padding: 6px 10px"
        :disabled="checked"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        aria-label="Respuesta"
      />
    </template>

    <div v-if="checked" class="fb" :class="lastOk ? 'ok' : 'bad'">
      <template v-if="lastOk"><b class="t">Correcto</b></template>
      <template v-else-if="current.type === 'mcq'">
        <b class="t">No es esa</b><span><b lang="en">{{ current.w.en }}</b> significa {{ current.w.es }}.</span>
      </template>
      <template v-else>
        <b class="t">Respuesta: {{ current.type === 'cloze' ? current.m.t : current.w.en }}</b>
      </template>
      <ExamplePhrase :word="current.w" small />
    </div>

    <div class="actions">
      <button v-if="checked" class="btn" type="button" @click="next">{{ i === total - 1 ? 'Ver resultado' : 'Siguiente' }}</button>
      <button v-else-if="current.type !== 'mcq'" class="btn" type="button" @click="check">Comprobar</button>
    </div>
  </div>

  <div v-else>
    <div class="score">{{ hits }}<small> de {{ total }}</small></div>
    <p class="plan" style="margin-top: 0">{{ resultMsg }}</p>
    <template v-if="wrongList.length">
      <h3 style="margin: 22px 0 4px; font-size: 22px">Para repasar</h3>
      <div v-for="w in wrongList" :key="w.id" class="miss">
        <h3 lang="en">{{ w.en }} <SayButton :text="w.en" small /></h3>
        <div class="es">{{ w.es }}</div>
        <ExamplePhrase :word="w" />
      </div>
    </template>
    <div class="actions">
      <button class="btn ghost" type="button" @click="again">Repetir el examen</button>
      <button class="btn" type="button" @click="emit('exit')">Volver</button>
    </div>
  </div>
</template>
