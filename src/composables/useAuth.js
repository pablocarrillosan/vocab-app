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

async function signOut() {
  if (!supabaseReady) return
  await supabase.auth.signOut()
}

export function useAuth() {
  return { session, ready, signInWithGoogle, signOut }
}
