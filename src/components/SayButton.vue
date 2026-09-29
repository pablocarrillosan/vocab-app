<script setup>
import { say } from '../lib/text'

defineProps({
  text: { type: String, required: true },
  small: { type: Boolean, default: false },
})
</script>

<template>
  <button class="say" :class="{ sm: small }" type="button" @click="say(text)" aria-label="Escuchar">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  </button>
</template>
