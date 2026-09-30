<script setup>
import { ref, computed, watch } from 'vue'
import { fieldsOf, gradeItem, gradeSet } from '../lib/grammarCheck'
import { useGrammarProgress } from '../composables/useGrammarProgress'

// Una tanda de ejercicios, igual que en los artefactos: Comprobar (o Intro en
// cualquier hueco) corrige, enseña la explicación de cada frase y la solución
// de lo que está mal. Ver soluciones guarda la nota con lo que hayas puesto y
// después rellena los huecos que estaban mal.
const props = defineProps({
  block: { type: String, required: true },
  set: { type: Object, required: true },
  s: { type: Number, required: true },
})
const { get, setAnswer, setScore } = useGrammarProgress()

const answers = computed(() => get(props.block).answers)
const score = computed(() => get(props.block).scores[props.s] || null)

const grade = () => props.set.items.map((it, i) => gradeItem(it, props.s, i, answers.value))
const result = ref(score.value ? grade() : null) // corrección de la última vez que se pulsó
const edited = ref(new Set()) // campos cambiados desde entonces: dejan de marcarse
const revealed = ref(false)

// Al borrar las respuestas del bloque desaparece la nota y con ella la corrección.
watch(score, (sc) => {
  if (!sc) {
    result.value = null
    revealed.value = false
    edited.value = new Set()
  }
})

const rows = computed(() =>
  props.set.items.map((it, i) => {
    const keys = fieldsOf(it, props.s, i).map((f) => f.key)
    if (it.type !== 'gap') return { ...it, key: keys[0] }
    let g = 0
    return { ...it, segs: it.parts.map((p) => (typeof p === 'string' ? { text: p } : { ...p, key: keys[g++] })) }
  }),
)

function check(reveal) {
  const [right, total] = gradeSet(props.set, props.s, answers.value)
  if (reveal) {
    props.set.items.forEach((it, i) => {
      const g = gradeItem(it, props.s, i, answers.value)
      fieldsOf(it, props.s, i).forEach((f) => {
        if (!f.mc && !g.ok[f.key]) setAnswer(props.block, f.key, f.a[0])
      })
    })
  }
  revealed.value = reveal
  edited.value = new Set()
  result.value = grade()
  setScore(props.block, props.s, right, total)
}

function type(key, e) {
  setAnswer(props.block, key, e.target.value)
  edited.value.add(key)
}
function pick(key, o) {
  setAnswer(props.block, key, o)
  edited.value.add(key)
}

function mark(i, key) {
  if (!result.value || edited.value.has(key)) return ''
  return result.value[i].ok[key] ? 'ok' : 'bad'
}
function optClass(i, key, o) {
  if (!result.value || edited.value.has(key)) return ''
  const picked = answers.value[key]
  const a = props.set.items[i].a
  if (o === picked) return picked === a ? 'ok' : 'bad'
  return o === a && (picked || revealed.value) ? 'ok' : ''
}

// Los huecos parten del ancho que tenían en los artefactos y crecen con lo que escribes.
const MIN = { s: 7.5, m: 12, l: 17 }
const width = (key, w) => ({ width: Math.max(MIN[w], (answers.value[key] || '').length + 2) + 'ch' })

const pct = computed(() => (score.value ? Math.round((100 * score.value[0]) / score.value[1]) : 0))
const INPUT = { type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' }
</script>

<template>
  <section class="gset">
    <h3 class="gset-h"><span class="kind">{{ set.kind }}</span>{{ set.title }}</h3>
    <p v-if="set.hint" class="thint">{{ set.hint }}</p>
    <ol class="gitems">
      <li v-for="(it, i) in rows" :key="i" class="git">
        <span class="n">{{ i + 1 }}</span>
        <div class="gbd">
          <template v-if="it.type === 'mc'">
            <p class="gen" lang="en">{{ it.en }}</p>
            <div class="gopts">
              <button
                v-for="o in it.opts"
                :key="o"
                type="button"
                class="gopt"
                :class="optClass(i, it.key, o)"
                :aria-pressed="answers[it.key] === o"
                lang="en"
                @click="pick(it.key, o)"
              >
                {{ o }}
              </button>
            </div>
          </template>
          <p v-else-if="it.type === 'gap'" class="gen" lang="en">
            <template v-for="(p, j) in it.segs" :key="j">
              <template v-if="p.text != null">{{ p.text }}</template>
              <span v-else class="gap"
                ><span class="cue" lang="es">{{ p.cue }}</span
                ><input
                  v-bind="INPUT"
                  class="blank"
                  :class="mark(i, p.key)"
                  :style="width(p.key, p.w)"
                  :value="answers[p.key] || ''"
                  aria-label="Hueco"
                  @input="type(p.key, $event)"
                  @keydown.enter.prevent="check(false)"
              /></span>
            </template>
          </p>
          <template v-else-if="it.type === 'fix'">
            <p class="gen wrong" lang="en">{{ it.wrong }}</p>
            <label class="fix"
              >Forma correcta
              <input
                v-bind="INPUT"
                class="blank"
                :class="mark(i, it.key)"
                :style="width(it.key, 'm')"
                :value="answers[it.key] || ''"
                lang="en"
                @input="type(it.key, $event)"
                @keydown.enter.prevent="check(false)"
            /></label>
          </template>
          <template v-else>
            <p class="ges">{{ it.es }}</p>
            <input
              v-bind="INPUT"
              class="inp"
              :class="mark(i, it.key)"
              :value="answers[it.key] || ''"
              placeholder="tu traducción"
              aria-label="Traducción"
              lang="en"
              @input="type(it.key, $event)"
              @keydown.enter.prevent="check(false)"
            />
          </template>
          <p v-if="result && it.note" class="gnote" v-html="it.note"></p>
          <p v-if="result && result[i].sol.length" class="gsol" lang="en">→ {{ result[i].sol.join('  ·  ') }}</p>
        </div>
      </li>
    </ol>
    <div class="gbar">
      <button class="btn small" type="button" @click="check(false)">Comprobar</button>
      <button class="btn ghost small" type="button" @click="check(true)">Ver soluciones</button>
      <span class="gscore" :class="{ good: pct >= 80 }" aria-live="polite">{{
        score ? score[0] + ' de ' + score[1] + ' · ' + pct + '%' : ''
      }}</span>
    </div>
  </section>
</template>
