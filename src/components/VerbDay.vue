<script setup>
import { computed, ref, reactive } from 'vue'
import { KIND, planOf } from '../lib/verbPlan'
import { questionCount } from '../lib/verbQuiz'
import { useVerbProgress } from '../composables/useVerbProgress'
import SayButton from './SayButton.vue'
import ExamplePhrase from './ExamplePhrase.vue'

const props = defineProps({
  num: { type: Number, required: true },
  backLabel: { type: String, default: 'Volver al plan' },
})
const emit = defineEmits(['back', 'start'])
const { stats } = useVerbProgress()

const p = computed(() => planOf(props.num))
const isLearn = computed(() => p.value.type === 'learn')
const n = computed(() => questionCount(p.value, stats.value))
const missed = (v) => (stats.value[v.id]?.missed_count || 0) > 0
const weak = computed(() => p.value.verbs.filter(missed))

// Lista de un repaso agrupada por el día en que se estudió cada verbo.
const groups = computed(() => {
  const g = new Map()
  p.value.verbs.forEach((v) => {
    if (!g.has(v.day)) g.set(v.day, [])
    g.get(v.day).push(v)
  })
  return [...g.entries()].map(([day, verbs]) => ({ day, t: planOf(day).t, verbs }))
})

const hideEs = ref(false)
const shown = reactive(new Set())
function reveal(id) {
  if (shown.has(id)) shown.delete(id)
  else shown.add(id)
}
</script>

<template>
  <button class="back" type="button" @click="emit('back')">← {{ backLabel }}</button>
  <div class="dayhead">
    <div class="dsub">Día {{ p.num }}, semana {{ p.week }}</div>
    <h2>{{ p.t }}</h2>
    <span v-if="isLearn" class="chip" :class="'k-' + p.k">{{ KIND[p.k] }}</span>
  </div>

  <template v-if="isLearn">
    <p class="plan">
      Guía de 30 minutos: unos 15 leyendo cada verbo y diciendo la frase en voz alta, unos 10 con el examen ({{ n }} preguntas) y 5 para volver a los
      que falles.
    </p>
    <label class="toggle"><input v-model="hideEs" type="checkbox" /> Ocultar traducciones (toca una para verla)</label>
    <div class="entries" :class="{ 'hide-es': hideEs }">
      <article v-for="v in p.verbs" :key="v.id" class="entry" :class="'k-' + v.k">
        <h3 lang="en">{{ v.en }}</h3>
        <SayButton :text="v.en" />
        <div class="meta">
          <div v-if="v.past" class="forms">
            pasado <b lang="en">{{ v.past.join('/') }}</b>, participio <b lang="en">{{ v.pp.join('/') }}</b>
          </div>
          <div class="es" :class="{ shown: shown.has(v.id) }" @click="reveal(v.id)">{{ v.es }}</div>
        </div>
        <ExamplePhrase :word="v" small />
      </article>
    </div>
    <div class="actions sticky"><button class="btn" type="button" @click="emit('start')">Hacer el examen</button></div>
  </template>

  <template v-else>
    <p class="plan">
      Este repaso tiene {{ n }} preguntas, unos {{ Math.max(10, Math.round(n * 0.33)) }} minutos.
      {{
        p.type === 'month'
          ? 'Entran primero los verbos que más has fallado y el resto se elige al azar.'
          : 'Cada verbo de la semana sale una vez, y los que has fallado salen dos.'
      }}
    </p>
    <p v-if="weak.length" class="plan">
      Verbos con fallos: <span lang="en">{{ weak.map((v) => v.en).join(', ') }}</span>.
    </p>
    <p class="plan">Antes de empezar puedes echar un vistazo a la lista:</p>
    <details v-for="g in groups" :key="g.day" class="grp">
      <summary>Día {{ g.day }}: {{ g.t }}</summary>
      <ul class="cl">
        <li v-for="v in g.verbs" :key="v.id">
          <b lang="en">{{ v.en }}</b><span>{{ v.es }}</span><span v-if="missed(v)" class="tag">repasar</span>
        </li>
      </ul>
    </details>
    <div class="actions sticky"><button class="btn" type="button" @click="emit('start')">Empezar el repaso</button></div>
  </template>
</template>
