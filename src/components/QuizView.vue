<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { cmp } from '../lib/text'
import { gradeFields, meaningOk } from '../lib/verbQuiz'
import { TENSES } from '../lib/verbForms'
import { meaning } from '../lib/words'
import SayButton from './SayButton.vue'
import ExamplePhrase from './ExamplePhrase.vue'
import QuizGrid from './QuizGrid.vue'
import QuizText from './QuizText.vue'

// Pantalla de examen compartida por palabras y verbos. Quien la usa pasa cómo
// construir las preguntas y qué respuestas acepta, y recibe cada acierto/fallo
// de cada palabra o verbo (answer, al pasar a la pregunta siguiente) y el
// resultado final (finish).
// Cada hueco cuenta un punto: las tablas y los textos de los verbos valen tantos
// puntos como huecos tienen; el resto de preguntas, uno.
const props = defineProps({
  title: { type: String, required: true },
  kicker: { type: String, default: 'Examen' },
  build: { type: Function, required: true },
  accepted: { type: Function, required: true },
})
const emit = defineEmits(['exit', 'answer', 'finish'])

const questions = ref(props.build())
const total = computed(() => questions.value.length)
const maxPts = computed(() => questions.value.reduce((n, q) => n + (q.fields ? q.fields.length : 1), 0))
const i = ref(0)
const checked = ref(false)
const lastOk = ref(false)
const sel = ref(null)
const vals = ref([]) // lo escrito en cada hueco de la pregunta
const marks = ref([]) // tras comprobar, si cada hueco está bien
const results = ref([]) // { q, ok, pts, verbs: [{ w, ok }], sent }
const finished = ref(false)
const overruled = ref(false) // «Mi respuesta vale» en la pregunta actual

const current = computed(() => questions.value[i.value])
const hits = computed(() => results.value.reduce((n, r) => n + r.pts, 0))
const progressPct = computed(() => Math.round((100 * i.value) / total.value))
const kCls = (w) => (w.k ? 'k-' + w.k : null)
const lastPts = computed(() => results.value[results.value.length - 1]?.pts || 0)

// En las preguntas de huecos, la frase partida alrededor del hueco.
const around = computed(() => {
  const q = current.value
  if (!q?.m) return null
  return { before: q.w.ex.slice(0, q.m.i), after: q.w.ex.slice(q.m.i + q.m.t.length) }
})

function record(ok, pts, verbs) {
  checked.value = true
  lastOk.value = ok
  results.value.push({ q: current.value, ok, pts, verbs })
}
// Los aciertos y fallos se mandan al pasar de pregunta (o al salir), para que
// «Mi respuesta vale» todavía pueda cambiar el resultado.
function commit() {
  const r = results.value[results.value.length - 1]
  if (!r || r.sent) return
  r.sent = true
  r.verbs.forEach((x) => emit('answer', { w: x.w }, x.ok))
}
// El significado escrito no estaba en la lista, pero era bueno: cuenta como acierto.
function overrule() {
  const r = results.value[results.value.length - 1]
  r.ok = true
  r.pts = 1
  r.verbs = r.verbs.map((x) => ({ ...x, ok: true }))
  lastOk.value = true
  overruled.value = true
}
function leave() {
  commit()
  emit('exit')
}
function pick(idx) {
  const q = current.value
  if (checked.value || !q.options) return
  sel.value = idx
  const ok = q.options[idx] === q.answer
  record(ok, ok ? 1 : 0, [{ w: q.w, ok }])
}
// Un verbo falla si falla cualquiera de sus huecos.
function verbsOf(q, oks) {
  const m = new Map()
  q.fields.forEach((f, k) => f.w && m.set(f.w, (m.get(f.w) ?? true) && oks[k]))
  return [...m].map(([w, ok]) => ({ w, ok }))
}
function check() {
  const q = current.value
  if (checked.value || q.options || !vals.value.some((v) => v && v.trim())) return
  if (q.fields) {
    marks.value = gradeFields(q, vals.value)
    const pts = marks.value.filter(Boolean).length
    return record(pts === q.fields.length, pts, verbsOf(q, marks.value))
  }
  const ok = q.type === 'meanw' ? meaningOk(q.w, vals.value[0]) : props.accepted(q).some((a) => cmp(a) === cmp(vals.value[0]))
  record(ok, ok ? 1 : 0, [{ w: q.w, ok }])
}
function setVal(k, v) {
  vals.value[k] = v
}
function clear() {
  checked.value = false
  overruled.value = false
  vals.value = []
  marks.value = []
  sel.value = null
}
function next() {
  if (!checked.value) return
  commit()
  i.value++
  clear()
  if (i.value >= total.value) finish()
  nextTick(() => window.scrollTo(0, 0))
}
function finish() {
  finished.value = true
  emit('finish', hits.value, maxPts.value)
}
function again() {
  questions.value = props.build()
  i.value = 0
  clear()
  results.value = []
  finished.value = false
  nextTick(() => window.scrollTo(0, 0))
}

const resultMsg = computed(() => {
  const pc = Math.round((100 * hits.value) / maxPts.value)
  return pc >= 90
    ? 'Muy bien. Esto ya casi es tuyo.'
    : pc >= 70
      ? 'Bien. Mira los fallos de abajo antes de seguir.'
      : 'Merece otra vuelta: vuelve a leerlo y repite el examen.'
})
const wrongList = computed(() => {
  const seen = new Set()
  const arr = []
  results.value.forEach((r) =>
    r.verbs.forEach(({ w, ok }) => {
      if (!ok && !seen.has(w.id)) {
        seen.add(w.id)
        arr.push(w)
      }
    }),
  )
  return arr
})

// Intro comprueba o pasa a la siguiente; en las tablas y los textos, salta al
// hueco siguiente y comprueba desde el último.
function onKey(e) {
  if (finished.value || !current.value) return
  if (e.key === 'Enter') {
    const el = document.activeElement
    if (el && el.tagName === 'BUTTON') return
    e.preventDefault()
    if (checked.value) return next()
    if (current.value.options) return
    const k = el?.dataset?.f
    const after = k != null && document.querySelector('[data-f="' + (+k + 1) + '"]')
    if (after) return after.focus()
    return check()
  }
  if (!checked.value && current.value.options && /^[1-4]$/.test(e.key)) pick(+e.key - 1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <button class="back" type="button" @click="leave">← Salir del examen</button>
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

    <template v-if="current.type === 'mcq' || current.type === 'meanw'">
      <h3 v-if="current.dir !== 's2e'" class="qprompt">
        ¿Qué significa <span class="qw" :class="kCls(current.w)" lang="en">{{ current.w.en }}</span>? <SayButton :text="current.w.en" />
      </h3>
      <h3 v-else class="qprompt">
        ¿Cómo se dice <span class="qw">{{ current.w.es }}</span><span v-if="current.w.note" class="qnote"> ({{ current.w.note }})</span> en inglés?
      </h3>
      <template v-if="current.type === 'meanw'">
        <p class="qhelp">Escríbelo en español.</p>
        <input
          :value="vals[0] || ''"
          class="blank"
          :class="{ ok: checked && lastOk, bad: checked && !lastOk }"
          style="width: min(100%, 24ch); font-size: 22px; padding: 6px 10px"
          :disabled="checked"
          autocomplete="off"
          spellcheck="false"
          lang="es"
          aria-label="Significado en español"
          @input="setVal(0, $event.target.value)"
        />
      </template>
    </template>

    <template v-else-if="current.type === 'pick'">
      <p class="qhelp">Elige el verbo que completa la frase.</p>
      <p class="sentence" lang="en">
        {{ around.before }}<span class="gapline" :class="{ ok: checked }">{{ checked ? current.answer : '' }}</span
        >{{ around.after }}
      </p>
    </template>

    <template v-else-if="current.type === 'cloze'">
      <p v-if="current.tense" class="tense">
        <b>{{ TENSES[current.tense][0] }}</b><span v-if="TENSES[current.tense][1]">{{ TENSES[current.tense][1] }}</span>
      </p>
      <p class="qhelp">{{ current.help || 'Escribe la palabra que falta.' }}</p>
      <p class="sentence" lang="en">
        {{ around.before }}<input
          :value="vals[0] || ''"
          class="blank"
          :class="{ ok: checked && lastOk, bad: checked && !lastOk }"
          :style="{ width: Math.max(6, current.m.t.length + 3) + 'ch' }"
          :disabled="checked"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          aria-label="Respuesta"
          @input="setVal(0, $event.target.value)"
        /><template v-if="current.base"> <span class="base">({{ current.base }})</span></template>{{ around.after }}
      </p>
      <p class="hint">Pista: {{ meaning(current.w) }}</p>
    </template>

    <QuizGrid v-else-if="current.type === 'grid'" :q="current" :vals="vals" :marks="marks" :checked="checked" @input="setVal" />
    <QuizText v-else-if="current.type === 'text'" :q="current" :vals="vals" :marks="marks" :checked="checked" @input="setVal" />

    <template v-else>
      <h3 class="qprompt">
        Escribe en inglés: <span class="qw">{{ current.w.es }}</span><span v-if="current.w.note" class="qnote"> ({{ current.w.note }})</span>
      </h3>
      <input
        :value="vals[0] || ''"
        class="blank"
        :class="{ ok: checked && lastOk, bad: checked && !lastOk }"
        style="width: min(100%, 24ch); font-size: 22px; padding: 6px 10px"
        :disabled="checked"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        aria-label="Respuesta"
        @input="setVal(0, $event.target.value)"
      />
    </template>

    <div v-if="current.options" class="opts">
      <button
        v-for="(o, idx) in current.options"
        :key="idx"
        class="opt"
        :class="{ ok: checked && o === current.answer, bad: checked && idx === sel && o !== current.answer }"
        :disabled="checked"
        type="button"
        :lang="current.type === 'pick' ? 'en' : null"
        @click="pick(idx)"
      >
        <kbd>{{ idx + 1 }}</kbd><span>{{ o }}</span>
      </button>
    </div>

    <div v-if="checked" class="fb" :class="lastOk ? 'ok' : 'bad'">
      <template v-if="lastOk">
        <b class="t">{{ overruled ? 'Dado por bueno' : 'Correcto' }}</b>
        <span v-if="current.type === 'meanw'"><b lang="en">{{ current.w.en }}</b> significa {{ meaning(current.w) }}.</span>
      </template>
      <template v-else-if="current.fields">
        <b class="t">{{ lastPts }} de {{ current.fields.length }} bien</b>
        <span>Junto a cada hueco en rojo tienes la respuesta.</span>
      </template>
      <template v-else-if="current.type === 'mcq' || current.type === 'meanw'">
        <b class="t">{{ current.type === 'mcq' ? 'No es esa' : 'No es ninguno de sus significados' }}</b
        ><span><b lang="en">{{ current.w.en }}</b> significa {{ meaning(current.w) }}.</span>
        <button v-if="current.type === 'meanw'" class="btn ghost small over" type="button" @click="overrule">Mi respuesta vale</button>
      </template>
      <template v-else-if="current.type === 'pick'">
        <b class="t">Era «{{ current.answer }}»</b><span><b lang="en">{{ current.w.en }}</b> significa {{ meaning(current.w) }}.</span>
      </template>
      <template v-else>
        <b class="t">Respuesta: {{ current.type === 'cloze' ? (current.w.alts || [current.m.t]).join(' o ') : current.w.en }}</b>
      </template>
      <ExamplePhrase v-if="current.w && current.type !== 'pick'" :word="current.w" small />
    </div>

    <div class="actions">
      <button v-if="checked" class="btn" type="button" @click="next">{{ i === total - 1 ? 'Ver resultado' : 'Siguiente' }}</button>
      <button v-else-if="!current.options" class="btn" type="button" @click="check">Comprobar</button>
    </div>
  </div>

  <div v-else>
    <div class="score">{{ hits }}<small> de {{ maxPts }}</small></div>
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
