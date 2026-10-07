<script setup>
import { computed, ref, reactive } from 'vue'
import { KIND } from '../lib/verbPlan'
import { examSize } from '../lib/verbQuiz'
import { useVerbProgress } from '../composables/useVerbProgress'
import { useVerbLevel } from '../composables/useVerbLevel'
import SayButton from './SayButton.vue'
import ExamplePhrase from './ExamplePhrase.vue'

const props = defineProps({
  num: { type: Number, required: true },
  backLabel: { type: String, default: 'Volver al plan' },
})
const emit = defineEmits(['back', 'start'])
const { stats } = useVerbProgress()
const { plan } = useVerbLevel()

const p = computed(() => plan.value.planOf(props.num))
const isLearn = computed(() => p.value.type === 'learn')
const size = computed(() => examSize(p.value, stats.value))
const missed = (v) => (stats.value[v.id]?.missed_count || 0) > 0
const weak = computed(() => p.value.verbs.filter(missed))

// Lista de un repaso agrupada por el día en que se estudió cada verbo.
const groups = computed(() => {
  const g = new Map()
  p.value.verbs.forEach((v) => {
    if (!g.has(v.day)) g.set(v.day, [])
    g.get(v.day).push(v)
  })
  return [...g.entries()].map(([day, verbs]) => ({ day, t: plan.value.planOf(day).t, verbs }))
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
    <div class="dsub">{{ plan.label }} · Día {{ p.num }}, semana {{ p.week }}</div>
    <h2>{{ p.t }}</h2>
    <span v-if="isLearn" class="chip" :class="'k-' + p.k">{{ KIND[p.k] }}</span>
  </div>

  <template v-if="isLearn">
    <p class="plan">
      Guía de {{ plan.guide.total }} minutos: unos {{ plan.guide.read }} leyendo cada verbo y diciendo la frase en voz alta, unos
      {{ plan.guide.quiz }} con el examen y {{ plan.guide.fix }} para volver a los que falles.
    </p>
    <p class="plan">
      El examen tiene {{ size.n }} preguntas de tipos mezclados: qué significa cada verbo (eligiéndolo o escribiéndolo en español), el
      verbo que falta en su frase (eligiéndolo o escribiéndolo en el tiempo que se indica),
      {{ p.k === 'irr' ? 'el pasado y el participio de todos, todos los tiempos de uno' : 'todos los tiempos de dos de ellos' }}
      y un texto con los {{ p.verbs.length }} verbos.
    </p>
    <p v-if="p.k === 'prep'" class="plan">
      Fíjate bien en la preposición: cuando tengas que escribir el verbo de la frase, solo verás el verbo y tendrás que escribirla tú.
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
      Este repaso tiene {{ size.n }} preguntas, unos {{ size.min }} minutos.
      {{
        p.type === 'month'
          ? 'Dos textos de días del mes y, hasta llegar a 60 verbos, primero los que más has fallado y el resto al azar.'
          : 'Dos textos de días de la semana y una pregunta por cada uno de los demás verbos; los que has fallado salen otra vez.'
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
