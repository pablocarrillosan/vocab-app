import { ref } from 'vue'
import { supabase, supabaseReady } from '../lib/supabase'

const session = ref(null)
const ready = ref(false)

if (supabaseReady) {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
    ready.value = true
  })
  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s
  })
} else {
  ready.value = true
}

async function signInWithGoogle() {
  if (!supabaseReady) return { ok: false, message: 'Supabase no está configurado todavía.' }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

// Login con el botón oficial de Google: Google nos da un token (JWT) y
// Supabase lo valida. Así Google muestra nuestro dominio y no el de Supabase.
async function signInWithGoogleToken(token, nonce) {
  if (!supabaseReady) return { ok: false, message: 'Supabase no está configurado todavía.' }
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

async function signOut() {
  if (!supabaseReady) return
  // 'local' borra la sesión de este navegador aunque falle la llamada al servidor
  await supabase.auth.signOut({ scope: 'local' })
  // Que Google no vuelva a entrar solo con la misma cuenta
  window.google?.accounts?.id?.disableAutoSelect()
}

export function useAuth() {
  return { session, ready, signInWithGoogle, signInWithGoogleToken, signOut }
}
