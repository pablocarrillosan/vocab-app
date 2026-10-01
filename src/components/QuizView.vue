<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { cmp } from '../lib/text'
import { formsOk } from '../lib/verbQuiz'
import { meaning } from '../lib/words'
import SayButton from './SayButton.vue'
import ExamplePhrase from './ExamplePhrase.vue'

// Pantalla de examen compartida por palabras y verbos. Quien la usa pasa cómo
// construir las preguntas y qué respuestas acepta, y recibe cada acierto/fallo
// (answer) y el resultado final (finish).
const props = defineProps({
  title: { type: String, required: true },
  kicker: { type: String, default: 'Examen' },
  build: { type: Function, required: true },
  accepted: { type: Function, required: true },
})
const emit = defineEmits(['exit', 'answer', 'finish'])

const questions = ref(props.build())
const total = computed(() => questions.value.length)
const i = ref(0)
const checked = ref(false)
const lastOk = ref(false)
const sel = ref(null)
const val = ref('')
const val2 = ref('')
const in2 = ref(null)
const results = ref([])
const finished = ref(false)

const current = computed(() => questions.value[i.value])
const hits = computed(() => results.value.filter((r) => r.ok).length)
const progressPct = computed(() => Math.round((100 * i.value) / total.value))
const kCls = (w) => (w.k ? 'k-' + w.k : null)

function record(ok) {
  checked.value = true
  lastOk.value = ok
  results.value.push({ q: current.value, ok })
  emit('answer', current.value, ok)
}
function pick(idx) {
  if (checked.value || current.value.type !== 'mcq') return
  sel.value = idx
  record(current.value.options[idx] === current.value.answer)
}
function check() {
  if (checked.value || current.value.type === 'mcq' || !val.value.trim()) return
  if (current.value.type === 'forms') {
    if (!val2.value.trim()) return in2.value?.focus()
    return record(formsOk(current.value.w, val.value, val2.value))
  }
  record(props.accepted(current.value).some((a) => cmp(a) === cmp(val.value)))
}
function next() {
  if (!checked.value) return
  i.value++
  checked.value = false
  val.value = ''
  val2.value = ''
  sel.value = null
  if (i.value >= total.value) finish()
}
function finish() {
  finished.value = true
  emit('finish', hits.value, total.value)
}
function again() {
  questions.value = props.build()
  i.value = 0
  checked.value = false
  val.value = ''
  val2.value = ''
  sel.value = null
  results.value = []
  finished.value = false
  nextTick(() => window.scrollTo(0, 0))
}

const resultMsg = computed(() => {
  const pc = Math.round((100 * hits.value) / total.value)
  return pc >= 90
    ? 'Muy bien. Esto ya casi es tuyo.'
    : pc >= 70
      ? 'Bien. Mira los fallos de abajo antes de seguir.'
      : 'Merece otra vuelta: vuelve a leerlo y repite el examen.'
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
    <div class="dsub">{{ kicker }}</div>
    <h2>{{ title }}</h2>
  </div>

  <p v-if="!total" class="plan">No hay nada que preguntar todavía.</p>

  <div v-else-if="!finished" class="qwrap">
    <div class="qbar"><i :style="{ width: progressPct + '%' }"></i></div>
    <div class="qmeta">
      <span>Pregunta {{ i + 1 }} de {{ total }}</span>
      <span>{{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }}</span>
    </div>

    <template v-if="current.type === 'mcq'">
      <h3 v-if="current.dir === 'e2s'" class="qprompt">
        ¿Qué significa <span class="qw" :class="kCls(current.w)" lang="en">{{ current.w.en }}</span>? <SayButton :text="current.w.en" />
      </h3>
      <h3 v-else class="qprompt">
        ¿Cómo se dice <span class="qw">{{ current.w.es }}</span><span v-if="current.w.note" class="qnote"> ({{ current.w.note }})</span> en inglés?
      </h3>
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
      <p class="qhelp">{{ current.help || 'Escribe la palabra que falta.' }}</p>
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
        /><template v-if="current.base"> <span class="base">({{ current.base }})</span></template>{{ current.w.ex.slice(current.m.i + current.m.t.length) }}
      </p>
      <p class="hint">Pista: {{ meaning(current.w) }}</p>
    </template>

    <template v-else-if="current.type === 'forms'">
      <h3 class="qprompt">
        Escribe el pasado y el participio de <span class="qw" :class="kCls(current.w)" lang="en">{{ current.w.en }}</span>
      </h3>
      <p class="hint" style="margin: -8px 0 14px">{{ current.w.es }}</p>
      <div class="pair">
        <label
          >Pasado<input
            v-model="val"
            class="blank"
            :class="{ ok: checked && lastOk, bad: checked && !lastOk }"
            :disabled="checked"
            lang="en"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
        /></label>
        <label
          >Participio<input
            ref="in2"
            v-model="val2"
            class="blank"
            :class="{ ok: checked && lastOk, bad: checked && !lastOk }"
            :disabled="checked"
            lang="en"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
        /></label>
      </div>
    </template>

    <template v-else>
      <h3 class="qprompt">
        Escribe en inglés: <span class="qw">{{ current.w.es }}</span><span v-if="current.w.note" class="qnote"> ({{ current.w.note }})</span>
      </h3>
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
        <b class="t">No es esa</b><span><b lang="en">{{ current.w.en }}</b> significa {{ meaning(current.w) }}.</span>
      </template>
      <template v-else-if="current.type === 'forms'">
        <b class="t">Respuesta: pasado {{ current.w.past.join('/') }}, participio {{ current.w.pp.join('/') }}</b>
      </template>
      <template v-else>
        <b class="t">Respuesta: {{ current.type === 'cloze' ? (current.w.alts || [current.m.t]).join(' o ') : current.w.en }}</b>
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
      <div v-for="w in wrongList" :key="w.id" class="miss" :class="kCls(w)">
        <h3 lang="en">{{ w.en }} <SayButton :text="w.en" small /></h3>
        <div v-if="w.past" class="forms">
          pasado <b lang="en">{{ w.past.join('/') }}</b>, participio <b lang="en">{{ w.pp.join('/') }}</b>
        </div>
        <div class="es">{{ meaning(w) }}</div>
        <ExamplePhrase :word="w" />
      </div>
    </template>
    <div class="actions">
      <button class="btn ghost" type="button" @click="again">Repetir el examen</button>
      <slot name="result-actions">
        <button class="btn" type="button" @click="emit('exit')">Volver</button>
      </slot>
    </div>
  </div>
</template>
