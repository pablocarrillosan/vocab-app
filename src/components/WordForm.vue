<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useWords } from '../composables/useWords'
import { today, dayLabel } from '../lib/dates'
import { POS, posLabel } from '../lib/words'
import { lookup } from '../lib/dict'

const props = defineProps({
  editingWord: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'cancel', 'edit'])
const { addWord, updateWord, sensesOf } = useWords()

const enText = ref('')
const esText = ref('')
const exText = ref('')
const posVal = ref('')
const noteText = ref('')
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
      posVal.value = w.pos || ''
      noteText.value = w.note || ''
      dateVal.value = w.word_date
    } else {
      clearFields()
    }
  },
  { immediate: true },
)

function clearFields() {
  enText.value = ''
  esText.value = ''
  exText.value = ''
  posVal.value = ''
  noteText.value = ''
}

// Otros significados que ya tienes de la palabra que estás escribiendo.
const siblings = computed(() => (enText.value.trim() ? sensesOf(enText.value, props.editingWord?.id) : []))

// Acepciones del diccionario para la palabra escrita. Se borran al cambiarla.
const dict = ref(null) // { word, status: 'loading' | 'ok' | 'none' | 'error', senses }
const DICT_MAX = 12
watch(enText, (v) => {
  if (dict.value && dict.value.word !== v.trim()) dict.value = null
})
async function lookUp() {
  const word = enText.value.trim()
  if (!word) return
  dict.value = { word, status: 'loading', senses: [] }
  try {
    const senses = await lookup(word)
    if (dict.value?.word !== word) return
    dict.value = { word, status: senses.length ? 'ok' : 'none', senses: senses.slice(0, DICT_MAX) }
  } catch (e) {
    if (dict.value?.word === word) dict.value = { word, status: 'error', senses: [] }
  }
}
function useSense(s) {
  if (s.pos) posVal.value = s.pos
  if (s.ex && !exText.value.trim()) exText.value = s.ex
  dict.value = null
  nextTick(() => esInput.value?.focus())
}

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
  const payload = {
    en: enText.value.trim(),
    es: esText.value.trim(),
    ex: exText.value.trim(),
    pos: posVal.value || null,
    note: noteText.value.trim(),
    word_date,
  }
  const nth = siblings.value.length + 1
  const res = props.editingWord ? await updateWord(props.editingWord.id, payload) : await addWord(payload)
  if (!res.ok) {
    msg.value = { k: 'bad', t: res.message }
    return
  }
  msg.value = {
    k: 'ok',
    t: props.editingWord ? 'Cambios guardados.' : nth > 1 ? 'Añadido el ' + nth + '.º significado de ' + payload.en + '.' : 'Añadida: ' + payload.en,
  }
  clearFields()
  dict.value = null
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

    <div v-if="siblings.length" class="sibs" role="status">
      <p>
        Ya tienes <b lang="en">{{ siblings[0].en }}</b> con
        {{ siblings.length === 1 ? 'este significado' : 'estos significados' }}. Si es otro, escríbelo y se guardará aparte.
      </p>
      <ul>
        <li v-for="s in siblings" :key="s.id">
          <span><i v-if="s.pos" class="pos">{{ posLabel(s.pos) }}</i>{{ s.es }}<span v-if="s.note" class="nt"> ({{ s.note }})</span></span>
          <button class="mini" type="button" @click="emit('edit', s)">Editar</button>
        </li>
      </ul>
    </div>

    <div v-if="enText.trim()" class="dictbox">
      <button v-if="!dict" class="mini" type="button" @click="lookUp">Ver sus significados en el diccionario</button>
      <p v-else-if="dict.status === 'loading'" class="hint">Buscando «{{ dict.word }}»…</p>
      <p v-else-if="dict.status === 'none'" class="hint">«{{ dict.word }}» no está en el diccionario.</p>
      <p v-else-if="dict.status === 'error'" class="hint">
        No se ha podido consultar el diccionario. <button class="mini" type="button" @click="lookUp">Reintentar</button>
      </p>
      <template v-else>
        <p class="hint">Elige el significado que estás apuntando: se rellenan la categoría y la frase. La traducción la escribes tú.</p>
        <div class="dlist">
          <button v-for="(s, i) in dict.senses" :key="i" class="dsense" type="button" @click="useSense(s)">
            <span><i class="pos">{{ posLabel(s.pos) || s.posName }}</i><span lang="en">{{ s.def }}</span></span>
            <span v-if="s.ex" class="dex" lang="en">{{ s.ex }}</span>
          </button>
        </div>
        <button class="mini" type="button" @click="dict = null">Cerrar el diccionario</button>
      </template>
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
    <div class="two">
      <div class="fld">
        <label for="f-pos">Categoría (opcional)</label>
        <select id="f-pos" v-model="posVal" class="inp">
          <option value="">Sin indicar</option>
          <option v-for="p in POS" :key="p[0]" :value="p[0]">{{ p[1] }}</option>
        </select>
      </div>
      <div class="fld">
        <label for="f-note">Matiz (opcional)</label>
        <input
          id="f-note"
          v-model="noteText"
          class="inp"
          lang="es"
          placeholder="de un río, informal…"
          autocomplete="off"
          autocapitalize="none"
          @keydown.enter.prevent="submit"
        />
      </div>
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
