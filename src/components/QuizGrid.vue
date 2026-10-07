<script setup>
// Tabla de huecos del examen de verbos: los tiempos de un verbo (kind 'tenses')
// o el pasado y el participio de uno o varios irregulares (kind 'forms').
// QuizView guarda lo escrito (vals) y, al comprobar, qué huecos están bien (marks).
const props = defineProps({
  q: { type: Object, required: true },
  vals: { type: Array, required: true },
  marks: { type: Array, required: true },
  checked: { type: Boolean, default: false },
})
const emit = defineEmits(['input'])

const INPUT = { type: 'text', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' }
const cls = (k) => (props.checked ? (props.marks[k] ? 'ok' : 'bad') : '')
const label = (r, j) => (props.q.cols ? props.q.cols[j] + ' de ' + r.label : r.label)
</script>

<template>
  <template v-if="q.kind === 'tenses'">
    <h3 class="qprompt">
      Conjuga <span class="qw" :class="'k-' + q.w.k" lang="en">{{ q.w.en }}</span> en todos los tiempos
    </h3>
    <p class="qhelp">{{ q.w.es }}. Escribe el verbo con su auxiliar; el sujeto ya está puesto.</p>
  </template>
  <template v-else>
    <h3 class="qprompt">
      Escribe el pasado y el participio<template v-if="q.w">
        de <span class="qw" :class="'k-' + q.w.k" lang="en">{{ q.w.en }}</span></template
      >
    </h3>
    <p v-if="q.w" class="qhelp">{{ q.w.es }}</p>
  </template>

  <div class="qgrid" :class="q.kind">
    <div v-if="q.cols && q.rows.length > 1" class="qrow head" aria-hidden="true">
      <span></span><span v-for="c in q.cols" :key="c">{{ c }}</span>
    </div>
    <div v-for="(r, ri) in q.rows" :key="ri" class="qrow">
      <span v-if="q.rows.length > 1 || !q.cols" class="qlab">
        <b :lang="q.kind === 'forms' ? 'en' : null">{{ r.label }}</b><small>{{ r.sub }}</small>
      </span>
      <label v-for="(k, j) in r.fields" :key="k" class="qcell">
        <span v-if="q.cols && q.rows.length === 1" class="qcol">{{ q.cols[j] }}</span>
        <span v-if="r.pre" class="pre" lang="en">{{ r.pre }}</span>
        <input
          v-bind="INPUT"
          class="blank"
          :class="cls(k)"
          :value="vals[k] || ''"
          :data-f="k"
          :disabled="checked"
          :placeholder="q.cols && q.rows.length > 1 ? q.cols[j].toLowerCase() : null"
          :aria-label="label(r, j)"
          lang="en"
          @input="emit('input', k, $event.target.value)"
        />
        <span v-if="checked && !marks[k]" class="sol" lang="en">{{ q.fields[k].a.join(' / ') }}</span>
      </label>
    </div>
  </div>
</template>
