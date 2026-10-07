<script setup>
import { computed } from 'vue'
import { KIND, reviewSub } from '../lib/verbPlan'
import { useVerbProgress } from '../composables/useVerbProgress'

// Fila de un día del plan. En la pestaña Repasos se usa con un título propio
// (label) y bloqueada (locked) hasta que el plan llega a ese día.
const props = defineProps({
  p: { type: Object, required: true },
  showNum: { type: Boolean, default: false },
  label: { type: String, default: '' },
  locked: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])
const { results } = useVerbProgress()

const rev = computed(() => props.p.type !== 'learn')
const done = computed(() => results.value[props.p.key])
const sub = computed(() => {
  if (props.locked) return (props.p.type === 'month' ? props.p.verbs.length + ' verbos, hasta 60 en el repaso. ' : '') + 'Se abre el día ' + props.p.num
  return rev.value ? reviewSub(props.p) : KIND[props.p.k]
})
</script>

<template>
  <button
    class="row"
    :class="locked ? 'locked' : rev ? 'rev k-rev' : 'k-' + p.k"
    type="button"
    :disabled="locked"
    @click="emit('open')"
  >
    <span v-if="showNum" class="num">{{ p.num }}</span>
    <span class="tt"><b>{{ label || p.t }}</b><small>{{ sub }}</small></span>
    <svg v-if="locked" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Bloqueado">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
    <span v-else-if="done" class="st done">{{ done.score }}/{{ done.total }}</span>
    <span v-else class="st">Pendiente</span>
  </button>
</template>
