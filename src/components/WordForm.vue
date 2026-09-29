<script setup>
import { ref, watch, nextTick } from 'vue'
import { useWords } from '../composables/useWords'
import { today, dayLabel } from '../lib/dates'

const props = defineProps({
  editingWord: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'cancel'])
const { addWord, updateWord } = useWords()

const enText = ref('')
const esText = ref('')
const exText = ref('')
const dateVal = ref(today())
const msg = ref(null)

const enInput = ref(null)
const esInput = ref(null)
const exInput = ref(null)

watch(
  () => props.editingWord,
  (w) => {
    msg.value = null
    if (w) {
      enText.value = w.en
      esText.value = w.es
      exText.value = w.ex || ''
      dateVal.value = w.word_date
    } else {
      enText.value = ''
      esText.value = ''
      exText.value = ''
    }
  },
  { immediate: true },
)

function focusEn() {
  nextTick(() => enInput.value?.focus())
}
defineExpose({ focusEn })

async function submit() {
  if (!enText.value.trim()) {
    msg.value = { k: 'bad', t: 'Escribe la palabra en inglés.' }
    focusEn()
    return
  }
  if (!esText.value.trim()) {
    msg.value = { k: 'bad', t: 'Escribe qué significa en español.' }
    nextTick(() => esInput.value?.focus())
    return
  }
  const word_date = dateVal.value > today() ? today() : dateVal.value
  const payload = { en: enText.value.trim(), es: esText.value.trim(), ex: exText.value.trim(), word_date }
  const res = props.editingWord ? await updateWord(props.editingWord.id, payload) : await addWord(payload)
  if (!res.ok) {
    msg.value = { k: 'bad', t: res.message }
    return
  }
  msg.value = { k: 'ok', t: props.editingWord ? 'Cambios guardados.' : 'Añadida: ' + payload.en }
  enText.value = ''
  esText.value = ''
  exText.value = ''
  emit('saved', word_date)
  focusEn()
}
</script>

<template>
  <section class="addcard">
    <h2>{{ editingWord ? 'Editar palabra' : 'Apuntar una palabra' }}</h2>
    <div class="two">
      <div class="fld">
        <label for="f-en">En inglés</label>
        <input
          id="f-en"
          ref="enInput"
          v-model="enText"
          class="inp"
          lang="en"
          placeholder="borrow"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          @keydown.enter.prevent="esInput?.focus()"
        />
      </div>
      <div class="fld">
        <label for="f-es">Significado en español</label>
        <input
          id="f-es"
          ref="esInput"
          v-model="esText"
          class="inp"
          lang="es"
          placeholder="pedir prestado"
          autocomplete="off"
          autocapitalize="none"
          @keydown.enter.prevent="exInput?.focus()"
        />
      </div>
    </div>
    <div class="fld">
      <label for="f-ex">Frase de ejemplo (opcional, pero el examen la aprovecha)</label>
      <input
        id="f-ex"
        ref="exInput"
        v-model="exText"
        class="inp"
        lang="en"
        placeholder="Can I borrow your pen?"
        autocomplete="off"
        autocapitalize="sentences"
        @keydown.enter.prevent="submit"
      />
    </div>
    <details class="opt2">
      <summary>Día: {{ dateVal === today() ? 'hoy' : dayLabel(dateVal) }}</summary>
      <input v-model="dateVal" class="inp" type="date" :max="today()" aria-label="Día de la palabra" />
    </details>
    <p v-if="msg" class="note" :class="msg.k" role="status">{{ msg.t }}</p>
    <div class="actions">
      <button class="btn" type="button" @click="submit">{{ editingWord ? 'Guardar cambios' : 'Añadir' }}</button>
      <button v-if="editingWord" class="btn ghost" type="button" @click="emit('cancel')">Cancelar</button>
    </div>
  </section>
</template>
