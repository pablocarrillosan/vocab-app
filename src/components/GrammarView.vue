<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { BLOCKS } from '../data/grammarB1'
import { useGrammarProgress } from '../composables/useGrammarProgress'
import GrammarBlock from './GrammarBlock.vue'

// focus = true mientras hay un bloque abierto: App oculta entonces la cabecera
// y las pestañas, igual que con un día de verbos.
const emit = defineEmits(['update:focus'])
const { summary } = useGrammarProgress()

const open = ref(null) // número del bloque abierto
watch(
  () => open.value != null,
  (f) => emit('update:focus', f),
)
function go(n) {
  open.value = n
  nextTick(() => window.scrollTo(0, 0))
}

const GROUPS = [
  { t: 'Tiempos verbales', from: 1, to: 6 },
  { t: 'Otras estructuras', from: 7, to: 10 },
]
const rows = computed(() =>
  BLOCKS.map((b) => {
    const s = summary(b.id)
    return { b, s, state: s.sets === b.sets.length ? 'done' : s.sets ? 'half' : 'todo' }
  }),
)
// Primero el que dejaste a medias; si no hay ninguno, el siguiente sin empezar.
const next = computed(() => rows.value.find((r) => r.state === 'half') || rows.value.find((r) => r.state === 'todo'))
const nDone = computed(() => rows.value.filter((r) => r.state === 'done').length)
const nHalf = computed(() => rows.value.filter((r) => r.state === 'half').length)
const hitRate = computed(() => {
  const right = rows.value.reduce((n, r) => n + r.s.right, 0)
  const total = rows.value.reduce((n, r) => n + r.s.total, 0)
  return total ? Math.round((100 * right) / total) + '%' : '—'
})
const lower = (t) => t[0].toLowerCase() + t.slice(1)
const KIND = { done: 'k-reg', half: 'k-prep', todo: '' }
</script>

<template>
  <GrammarBlock v-if="open" :key="open" :block="BLOCKS[open - 1]" :count="BLOCKS.length" @back="go(null)" />

  <template v-else>
    <section class="today">
      <template v-if="next">
        <h2>{{ next.state === 'half' ? 'Sigue con' : 'Empieza' }} el bloque {{ next.b.num }}: {{ lower(next.b.title) }}</h2>
        <p class="pv">
          {{
            next.state === 'half'
              ? 'Llevas ' + next.s.sets + ' de ' + next.b.sets.length + ' tandas corregidas.'
              : 'Explicación y cinco tandas de ejercicios: opción múltiple, huecos, corrección, sin pistas y traducción.'
          }}
        </p>
        <button class="btn" type="button" @click="go(next.b.num)">Abrir el bloque {{ next.b.num }}</button>
      </template>
      <template v-else>
        <h2>Repaso completado</h2>
        <p class="pv">Has corregido todas las tandas de los {{ BLOCKS.length }} bloques. Vuelve a los que tengan peor nota.</p>
      </template>
    </section>

    <div class="stats">
      <div><b>{{ nDone }} de {{ BLOCKS.length }}</b><span>bloques hechos</span></div>
      <div><b>{{ nHalf }}</b><span>a medias</span></div>
      <div><b>{{ hitRate }}</b><span>de acierto</span></div>
    </div>

    <template v-for="g in GROUPS" :key="g.t">
      <h3 class="month">{{ g.t }}</h3>
      <ol class="days">
        <li v-for="r in rows.slice(g.from - 1, g.to)" :key="r.b.id">
          <button class="row" :class="KIND[r.state]" type="button" @click="go(r.b.num)">
            <span class="num">{{ r.b.num }}</span>
            <span class="tt">
              <b>{{ r.b.title }}</b>
              <small>{{ r.s.sets ? r.s.sets + ' de ' + r.b.sets.length + ' tandas' : 'Sin empezar' }}</small>
            </span>
            <span v-if="r.state === 'done'" class="st done">{{ r.s.right }}/{{ r.s.total }}</span>
            <span v-else class="st">{{ r.state === 'half' ? 'A medias' : 'Pendiente' }}</span>
          </button>
        </li>
      </ol>
    </template>
  </template>
</template>
