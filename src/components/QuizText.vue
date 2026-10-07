<script setup>
// Texto con un hueco por verbo del día. Cada hueco lleva delante su verbo entre
// paréntesis, igual que los ejercicios de gramática.
const props = defineProps({
  q: { type: Object, required: true },
  vals: { type: Array, required: true },
  marks: { type: Array, required: true },
  checked: { type: Boolean, default: false },
})
const emit = defineEmits(['input'])

const INPUT = { type: 'text', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' }
const cls = (k) => (props.checked ? (props.marks[k] ? 'ok' : 'bad') : '')
// El hueco crece con lo que escribes, sin delatar lo larga que es la respuesta.
const width = (k) => ({ width: Math.max(9, (props.vals[k] || '').length + 2) + 'ch' })
</script>

<template>
  <h3 class="qprompt">{{ q.title }}</h3>
  <p class="qhelp">Pon cada verbo en el tiempo que pide el texto, con su auxiliar si lo lleva (has, was, will…).</p>
  <div class="qtext" lang="en">
    <p v-for="(segs, pi) in q.paras" :key="pi">
      <template v-for="(s, si) in segs" :key="si">
        <template v-if="s.text != null">{{ s.text }}</template>
        <span v-else class="gap"
          ><span class="cue">({{ s.cue }})</span
          ><input
            v-bind="INPUT"
            class="blank"
            :class="cls(s.gap)"
            :style="width(s.gap)"
            :value="vals[s.gap] || ''"
            :data-f="s.gap"
            :disabled="checked"
            :aria-label="'Hueco ' + (s.gap + 1) + ': ' + s.cue"
            @input="emit('input', s.gap, $event.target.value)" /><span v-if="checked && !marks[s.gap]" class="sol">{{
            q.fields[s.gap].a[0]
          }}</span></span
        >
      </template>
    </p>
  </div>
</template>
