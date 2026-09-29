<script setup>
import { computed } from 'vue'
import { exParts } from '../lib/quiz'
import SayButton from './SayButton.vue'

const props = defineProps({
  word: { type: Object, required: true },
  small: { type: Boolean, default: false },
})
const parts = computed(() => exParts(props.word))
</script>

<template>
  <p v-if="word.ex" class="ex" lang="en">
    {{ parts.before }}<mark v-if="parts.match">{{ parts.match }}</mark>{{ parts.after }}
    <SayButton :text="word.ex" :small="small" />
  </p>
</template>
