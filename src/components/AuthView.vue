<script setup>
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { supabaseReady } from '../lib/supabase'

const { signInWithGoogle, signInWithGoogleToken } = useAuth()
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const msg = ref(null)
const sending = ref(false)
const gisBox = ref(null)
// Si no hay Client ID o el script de Google no carga, usamos la redirección de Supabase
const useGis = ref(Boolean(clientId))

// Palabras decorativas del fondo (k = tipo, para el color)
const chips = [
  { t: 'serendipity', k: 'reg' },
  { t: 'to give up', k: 'phr' },
  { t: 'went', k: 'irr' },
  { t: 'thoroughly', k: 'reg' },
  { t: 'to look forward to', k: 'phr' },
  { t: 'bought', k: 'irr' },
  { t: 'whereas', k: 'reg' },
  { t: 'to run out of', k: 'phr' },
]

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// Google recibe el nonce cifrado y Supabase el original, para evitar que
// alguien reutilice un token robado
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}

onMounted(async () => {
  if (!supabaseReady || !useGis.value) return
  try {
    await loadGis()
    const nonce = await makeNonce()
    window.google.accounts.id.initialize({
      client_id: clientId,
      nonce: nonce.hashed,
      use_fedcm_for_prompt: true,
      callback: async ({ credential }) => {
        sending.value = true
        const res = await signInWithGoogleToken(credential, nonce.raw)
        if (!res.ok) msg.value = { k: 'bad', t: res.message }
        sending.value = false
      },
    })
    window.google.accounts.id.renderButton(gisBox.value, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 280,
      locale: 'es',
    })
  } catch {
    useGis.value = false
  }
})

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
  <main class="login">
    <div class="glow" aria-hidden="true"></div>
    <ul class="chips" aria-hidden="true">
      <li v-for="(c, i) in chips" :key="c.t" :class="['chip', c.k]" :style="{ '--i': i }">{{ c.t }}</li>
    </ul>

    <section class="card">
      <div class="logo" aria-hidden="true">📖</div>
      <h1>Cada día, una palabra más</h1>
      <p class="lead">Apunta las palabras que no conoces y ponte a prueba al acabar la semana.</p>

      <p v-if="!supabaseReady" class="note bad">
        Falta configurar Supabase: copia <code>.env.example</code> a <code>.env</code> y rellena
        <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
      </p>
      <template v-else>
        <div class="cta">
          <div v-if="useGis" ref="gisBox" class="gis"></div>
          <button v-else class="google" type="button" :disabled="sending" @click="submit">
            <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
            {{ sending ? 'Abriendo Google…' : 'Continuar con Google' }}
          </button>
        </div>
        <p v-if="useGis && sending" class="note" role="status">Entrando…</p>
        <p v-if="msg" class="note" :class="msg.k" role="status">{{ msg.t }}</p>
        <p class="fine">Solo usamos tu cuenta de Google para identificarte.</p>
      </template>
    </section>
  </main>
</template>

<style scoped>
.login {
  position: relative;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  overflow: hidden;
}

.glow {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(40% 35% at 25% 30%, color-mix(in srgb, var(--reg) 22%, transparent), transparent 70%),
    radial-gradient(35% 30% at 78% 70%, color-mix(in srgb, var(--irr) 16%, transparent), transparent 70%),
    radial-gradient(30% 30% at 70% 20%, color-mix(in srgb, var(--phr) 14%, transparent), transparent 70%);
  pointer-events: none;
}

.chips {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}
.chip {
  position: absolute;
  padding: 6px 14px;
  border-radius: 999px;
  font-family: var(--read);
  font-size: 15px;
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
  background: color-mix(in srgb, currentColor 8%, var(--surface));
  opacity: 0.75;
  animation: float 9s ease-in-out infinite;
  animation-delay: calc(var(--i) * -1.3s);
}
.chip.reg { color: var(--reg); }
.chip.irr { color: var(--irr); }
.chip.phr { color: var(--phr); }
.chip:nth-child(1) { top: 12%; left: 8%; }
.chip:nth-child(2) { top: 20%; right: 9%; }
.chip:nth-child(3) { top: 42%; left: 4%; }
.chip:nth-child(4) { top: 46%; right: 5%; }
.chip:nth-child(5) { bottom: 22%; left: 10%; }
.chip:nth-child(6) { bottom: 14%; right: 14%; }
.chip:nth-child(7) { top: 6%; left: 46%; }
.chip:nth-child(8) { bottom: 6%; left: 40%; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .chip { animation: none; }
}
/* En móvil dejamos solo las de arriba y abajo para no tapar la tarjeta */
@media (max-width: 640px) {
  .chip:nth-child(3), .chip:nth-child(4), .chip:nth-child(7), .chip:nth-child(8) { display: none; }
  .chip { font-size: 13px; opacity: 0.55; }
  .chip:nth-child(1) { top: 5%; left: 6%; }
  .chip:nth-child(2) { top: 11%; right: 6%; }
  .chip:nth-child(5) { bottom: 10%; left: 6%; }
  .chip:nth-child(6) { bottom: 4%; right: 10%; }
}

.card {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 36px 28px 28px;
  border-radius: 28px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid var(--line);
  box-shadow: 0 30px 80px -30px rgba(10, 14, 40, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  text-align: center;
}

.logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  display: grid;
  place-items: center;
  font-size: 32px;
  border-radius: 20px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--reg) 25%, var(--surface)), color-mix(in srgb, var(--phr) 20%, var(--surface)));
  border: 1px solid var(--line);
}

h1 {
  font-size: clamp(26px, 6vw, 32px);
  text-wrap: balance;
}
.lead {
  margin: 12px auto 0;
  max-width: 32ch;
  color: var(--muted);
  font-family: var(--read);
  text-wrap: pretty;
}

.cta {
  margin-top: 28px;
  display: flex;
  justify-content: center;
  min-height: 44px;
}
/* El iframe de Google es claro por dentro; si hereda color-scheme oscuro
   el navegador le pinta un fondo blanco opaco alrededor del botón */
.gis :deep(iframe) {
  color-scheme: light;
}

.google {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 22px;
  border-radius: 999px;
  font-weight: 600;
  background: #fff;
  color: #1f1f1f;
  border: 1px solid #dadce0;
}

.note {
  text-align: center;
}
.fine {
  margin: 22px 0 0;
  font-size: 13px;
  color: var(--muted);
}
</style>
