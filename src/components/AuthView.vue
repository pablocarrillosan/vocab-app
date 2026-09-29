<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { supabaseReady } from '../lib/supabase'

const { signInWithGoogle } = useAuth()
const msg = ref(null)
const sending = ref(false)

async function submit() {
  if (sending.value) return
  sending.value = true
  // Si va bien, el navegador se va a Google y no volvemos aquí
  const res = await signInWithGoogle()
  if (!res.ok) {
    msg.value = { k: 'bad', t: res.message }
    sending.value = false
  }
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
      <p v-if="msg" class="note" :class="msg.k" role="status">{{ msg.t }}</p>
      <div class="actions">
        <button class="btn google" type="button" :disabled="sending" @click="submit">
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          {{ sending ? 'Abriendo Google…' : 'Continuar con Google' }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.btn.google {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  color: #1f1f1f;
  border: 1px solid #dadce0;
}
</style>
