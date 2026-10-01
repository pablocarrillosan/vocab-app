<script setup>
import { ref } from 'vue'
import { dayLabel } from '../lib/dates'
import { posLabel } from '../lib/words'
import { useWords } from '../composables/useWords'
import SayButton from './SayButton.vue'
import ExamplePhrase from './ExamplePhrase.vue'

// Una palabra con todos sus significados (filas con el mismo inglés).
const props = defineProps({
  senses: { type: Array, required: true },
  showDay: { type: Boolean, default: false },
})
const emit = defineEmits(['edit'])
const { removeWord } = useWords()

const armed = ref(null)
async function del(w) {
  if (armed.value !== w.id) {
    armed.value = w.id
    return
  }
  armed.value = null
  await removeWord(w.id)
}
</script>

<template>
  <div class="wrow">
    <div class="wl">
      <span class="w" lang="en">{{ senses[0].en }}</span>
      <SayButton :text="senses[0].en" small />
      <span v-if="senses.length > 1" class="cnt">{{ senses.length }} significados</span>
    </div>
    <div v-for="(w, i) in senses" :key="w.id" class="sense" :class="{ multi: senses.length > 1 }">
      <span v-if="senses.length > 1" class="i">{{ i + 1 }}</span>
      <div class="sb">
        <div class="m">
          <i v-if="w.pos" class="pos">{{ posLabel(w.pos) }}</i>{{ w.es }}<span v-if="w.note" class="nt"> ({{ w.note }})</span>
          <span v-if="w.missed_count > 0" class="tag">repasar</span>
          <span v-if="showDay" class="dd">{{ dayLabel(w.word_date) }}</span>
        </div>
        <ExamplePhrase :word="w" small />
      </div>
      <div class="acts">
        <button class="mini" type="button" @click="emit('edit', w)">Editar</button>
        <button class="mini" :class="{ arm: armed === w.id }" type="button" @click="del(w)">{{ armed === w.id ? '¿Borrar?' : 'Borrar' }}</button>
      </div>
    </div>
  </div>
</template>
