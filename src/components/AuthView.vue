<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { supabaseReady } from '../lib/supabase'

const { sendMagicLink } = useAuth()
const email = ref('')
const msg = ref(null)
const sending = ref(false)

async function submit() {
  if (!email.value.trim() || sending.value) return
  sending.value = true
  const res = await sendMagicLink(email.value.trim())
  msg.value = { k: res.ok ? 'ok' : 'bad', t: res.message }
  sending.value = false
}
</script>

<template>
  <h1>Mi vocabulario</h1>
  <p class="sub">Apunta cada día las palabras que no conoces y ponte a prueba al acabar la semana.</p>

  <section class="addcard" style="margin-top: 24px">
    <h2>Entrar</h2>
    <p v-if="!supabaseReady" class="note bad">
      Falta configurar Supabase: copia <code>.env.example</code> a <code>.env</code> y rellena
      <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> con los datos de tu proyecto.
    </p>
    <template v-else>
      <div class="fld">
        <label for="f-email">Tu email</label>
        <input
          id="f-email"
          v-model="email"
          class="inp"
          type="email"
          placeholder="tú@ejemplo.com"
          autocomplete="email"
          @keydown.enter.prevent="submit"
        />
      </div>
      <p v-if="msg" class="note" :class="msg.k" role="status">{{ msg.t }}</p>
      <div class="actions">
        <button class="btn" type="button" :disabled="sending" @click="submit">{{ sending ? 'Enviando…' : 'Enviarme un enlace' }}</button>
      </div>
    </template>
  </section>
</template>
