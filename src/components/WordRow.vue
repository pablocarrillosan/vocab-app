<script setup>
import { ref } from 'vue'
import { dayLabel } from '../lib/dates'
import { useWords } from '../composables/useWords'
import SayButton from './SayButton.vue'
import ExamplePhrase from './ExamplePhrase.vue'

const props = defineProps({
  word: { type: Object, required: true },
  showDay: { type: Boolean, default: false },
})
const emit = defineEmits(['edit'])
const { removeWord } = useWords()

const armed = ref(false)
async function del() {
  if (!armed.value) {
    armed.value = true
    return
  }
  armed.value = false
  await removeWord(props.word.id)
}
</script>

<template>
  <div class="wrow">
    <div class="wl">
      <span class="w" lang="en">{{ word.en }}</span>
      <SayButton :text="word.en" small />
      <span v-if="word.missed_count > 0" class="tag">repasar</span>
    </div>
    <div class="acts">
      <button class="mini" type="button" @click="emit('edit', word)">Editar</button>
      <button class="mini" :class="{ arm: armed }" type="button" @click="del">{{ armed ? '¿Borrar?' : 'Borrar' }}</button>
    </div>
    <div class="m">
      {{ word.es }}
      <span v-if="showDay" class="dd">{{ dayLabel(word.word_date) }}</span>
    </div>
    <ExamplePhrase :word="word" small />
  </div>
</template>
