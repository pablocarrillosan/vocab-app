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

async function sendMagicLink(email) {
  if (!supabaseReady) return { ok: false, message: 'Supabase no está configurado todavía.' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true, message: 'Te hemos enviado un enlace a ' + email + '. Ábrelo para entrar.' }
}

async function signOut() {
  if (!supabaseReady) return
  await supabase.auth.signOut()
}

export function useAuth() {
  return { session, ready, sendMagicLink, signOut }
}
