<script setup>
import { reactive, watch } from 'vue'

// Resumen y apartados de la explicación de un bloque. Con blurred todo se
// difumina y cada apartado se destapa tocándolo, como las traducciones en el
// día de verbos.
const props = defineProps({
  block: { type: Object, required: true },
  blurred: { type: Boolean, default: false },
})
const emit = defineEmits(['unblur'])

const shown = reactive(new Set())
watch(
  () => props.blurred,
  () => shown.clear(),
)
// Va en la fase de captura para que el toque destape el apartado sin plegarlo.
function peek(k, e) {
  if (!props.blurred || shown.has(k)) return
  e.preventDefault()
  e.stopPropagation()
  shown.add(k)
}
</script>

<template>
  <div class="gth" :class="{ blurred }">
    <div v-if="blurred" class="tapa">
      Información oculta: toca un apartado para verlo
      <button type="button" @click="emit('unblur')">Mostrar todo</button>
    </div>
    <div class="gsum bl" :class="{ shown: shown.has('sum') }" @click.capture="peek('sum', $event)">
      <h3>En resumen</h3>
      <dl>
        <template v-for="[dt, dd] in block.summary" :key="dt">
          <dt>{{ dt }}</dt>
          <dd v-html="dd"></dd>
        </template>
      </dl>
    </div>
    <details
      v-for="(t, i) in block.theory"
      :key="t.t"
      class="gsec bl"
      :class="{ shown: shown.has(i) }"
      open
      @click.capture="peek(i, $event)"
    >
      <summary>{{ t.t }}</summary>
      <div class="gsec-b" v-html="t.html"></div>
    </details>
  </div>
</template>
