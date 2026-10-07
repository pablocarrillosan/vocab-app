<script setup>
import SayButton from './SayButton.vue'

// Preguntas de varios huecos del examen de verbos: el pasado, el participio y el
// significado de un verbo (kind 'core') o el verbo conjugado en todos los
// tiempos (kind 'tenses'). QuizView guarda lo escrito (vals) y, al comprobar,
// qué huecos están bien (marks).
const props = defineProps({
  q: { type: Object, required: true },
  vals: { type: Array, required: true },
  marks: { type: Array, required: true },
  checked: { type: Boolean, default: false },
})
const emit = defineEmits(['input'])

const INPUT = { type: 'text', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' }
const cls = (k) => (props.checked ? (props.marks[k] ? 'ok' : 'bad') : '')
const lang = (k) => (props.q.fields[k].mean ? 'es' : 'en')
</script>

<template>
  <template v-if="q.kind === 'core'">
    <h3 class="qprompt">
      <span class="qw" :class="'k-' + q.w.k" lang="en">{{ q.w.en }}</span> <SayButton :text="q.w.en" />
    </h3>
    <p class="qhelp">Escribe su pasado, su participio y lo que significa en español.</p>
  </template>
  <template v-else>
    <h3 class="qprompt">
      Conjuga <span class="qw" :class="'k-' + q.w.k" lang="en">{{ q.w.en }}</span> en todos los tiempos
    </h3>
    <p class="qhelp">Escribe el verbo con su auxiliar; el sujeto ya está puesto.</p>
  </template>

  <div class="qgrid" :class="q.kind">
    <div v-for="(r, ri) in q.rows" :key="ri" class="qrow">
      <span v-if="q.kind === 'tenses'" class="qlab"><b>{{ r.label }}</b><small>{{ r.sub }}</small></span>
      <label v-for="k in r.fields" :key="k" class="qcell">
        <span v-if="q.kind === 'core'" class="qcol">{{ q.fields[k].label }}</span>
        <span v-if="r.pre" class="pre" lang="en">{{ r.pre }}</span>
        <input
          v-bind="INPUT"
          class="blank"
          :class="cls(k)"
          :value="vals[k] || ''"
          :data-f="k"
          :disabled="checked"
          :aria-label="q.fields[k].label || r.label"
          :lang="lang(k)"
          @input="emit('input', k, $event.target.value)"
        />
        <span v-if="checked && !marks[k]" class="sol" :lang="lang(k)">{{ q.fields[k].a.join(' / ') }}</span>
      </label>
    </div>
  </div>
</template>
