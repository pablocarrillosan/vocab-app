<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useGrammarProgress } from '../composables/useGrammarProgress'
import GrammarTheory from './GrammarTheory.vue'
import GrammarSet from './GrammarSet.vue'

// Un bloque a pantalla completa. En pantallas anchas la explicación y los
// ejercicios van lado a lado, cada uno con su propio scroll y el elegido más
// ancho. En el móvil van en dos pestañas con el scroll de la página.
const props = defineProps({
  block: { type: Object, required: true },
  count: { type: Number, required: true },
})
const emit = defineEmits(['back'])
const { get, summary, clearBlock, flush } = useGrammarProgress()

const id = props.block.id
const done = computed(() => summary(id))
const started = done.value.sets > 0 || Object.keys(get(id).answers).length > 0
const side = ref(started ? 'ex' : 'th') // 'th' explicación | 'ex' ejercicios
const blur = ref(false) // «Ocultar información», solo con las dos a la vista

const mq = window.matchMedia('(min-width: 1000px)')
const split = ref(mq.matches)
function onMq(e) {
  split.value = e.matches
  nextTick(fade)
}

// Móvil: cada pestaña recuerda por dónde ibas y, al cambiar, la página baja
// como mínimo hasta dejar la barra de pestañas pegada arriba.
const head = ref(null)
const bar = ref(null)
const pos = {}
function barEdge() {
  const cs = getComputedStyle(bar.value)
  return head.value.getBoundingClientRect().bottom + window.scrollY + parseFloat(cs.marginTop) - parseFloat(cs.top)
}
function pick(s) {
  if (s === side.value) return
  if (split.value) {
    side.value = s
    return
  }
  pos[side.value] = window.scrollY
  const edge = barEdge()
  side.value = s
  nextTick(() => {
    const top = Math.max(pos[s] ?? 0, edge)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: top === edge && window.scrollY < edge && !calm ? 'smooth' : 'auto' })
  })
}

// Ordenador: sin barras de scroll; el borde se difumina solo si queda
// contenido por ese lado.
const thPane = ref(null)
const exPane = ref(null)
const panes = () => [thPane.value, exPane.value].filter(Boolean)
function fade() {
  panes().forEach((el) => {
    const t = el.scrollTop
    const left = el.scrollHeight - el.clientHeight - t
    el.style.setProperty('--ft', Math.min(Math.max(t, 0), 48) + 'px')
    el.style.setProperty('--fb', Math.min(Math.max(left, 0), 48) + 'px')
  })
}
let ro = null

const onHide = () => document.visibilityState === 'hidden' && flush()
onMounted(() => {
  mq.addEventListener('change', onMq)
  document.addEventListener('visibilitychange', onHide)
  if (window.ResizeObserver) {
    ro = new ResizeObserver(fade)
    panes().forEach((el) => {
      ro.observe(el)
      ro.observe(el.firstElementChild)
    })
  }
  fade()
})
onBeforeUnmount(() => {
  mq.removeEventListener('change', onMq)
  document.removeEventListener('visibilitychange', onHide)
  ro?.disconnect()
  flush()
})

const armed = ref(false)
async function wipe() {
  if (!armed.value) {
    armed.value = true
    return
  }
  armed.value = false
  await clearBlock(id)
}
const totalText = computed(() =>
  done.value.sets
    ? 'Llevas ' + done.value.right + ' aciertos de ' + done.value.total + ' en las tandas corregidas.'
    : 'Aún no has corregido nada.',
)
</script>

<template>
  <div class="gb" :class="{ split, blur: split && blur }">
    <header ref="head" class="gb-head">
      <button class="back" type="button" @click="emit('back')">← Volver a los bloques</button>
      <div class="dsub">Repaso B1 · bloque {{ block.num }} de {{ count }}</div>
      <h2>{{ block.title }}</h2>
      <p class="gsub">{{ block.sub }}</p>
    </header>

    <div ref="bar" class="gb-tabs">
      <div class="gseg" role="tablist" aria-label="Partes del bloque">
        <button type="button" role="tab" :aria-selected="side === 'th'" @click="pick('th')">
          Explicación <small v-if="split">{{ block.theory.length }} apartados</small>
        </button>
        <button type="button" role="tab" :aria-selected="side === 'ex'" @click="pick('ex')">
          Ejercicios <small>{{ done.sets }} de {{ block.sets.length }}{{ split ? ' tandas' : '' }}</small>
        </button>
      </div>
    </div>

    <div class="gb-panes">
      <section
        v-show="split || side === 'th'"
        ref="thPane"
        class="gpane"
        :class="{ on: side === 'th' }"
        :tabindex="split ? 0 : null"
        aria-label="Explicación"
        @click="split && !blur && pick('th')"
        @scroll="fade"
      >
        <GrammarTheory :block="block" :blurred="split && blur" @unblur="blur = false" />
      </section>
      <section
        v-show="split || side === 'ex'"
        ref="exPane"
        class="gpane"
        :class="{ on: side === 'ex' }"
        :tabindex="split ? 0 : null"
        aria-label="Ejercicios"
        @click="split && pick('ex')"
        @scroll="fade"
      >
        <div>
          <p class="thint">Corrige cada tanda con Comprobar o pulsando Intro. Tus respuestas se guardan en tu cuenta.</p>
          <GrammarSet v-for="(st, s) in block.sets" :key="s" :block="id" :set="st" :s="s" />
          <div class="gfoot">
            <span>{{ totalText }}</span>
            <button class="mini" :class="{ arm: armed }" type="button" @click="wipe">
              {{ armed ? '¿Borrar todas las respuestas?' : 'Borrar respuestas' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <button
      v-if="split"
      type="button"
      class="fab"
      :class="{ off: side !== 'ex' }"
      :inert="side !== 'ex'"
      :aria-pressed="blur"
      @click="blur = !blur"
    >
      <svg v-if="blur" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10.7 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-2.6 3.7M6.6 6.6A13 13 0 0 0 2 12c1 2.5 5 7 10 7a9.8 9.8 0 0 0 5.4-1.6" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
      </svg>
      {{ blur ? 'Mostrar información' : 'Ocultar información' }}
    </button>
  </div>
</template>
