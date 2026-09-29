export const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.,;!?]+$/, '')
    .trim()
// Compara respuestas del examen sin distinguir mayúsculas, acentos ni un "to" inicial.
export const cmp = (s) => fold(norm(s)).replace(/^to\s+/, '')
export const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function shuffle(a) {
  const b = a.slice()
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export function say(t) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(t)
    u.lang = 'en-GB'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  } catch (e) {
    /* voces no disponibles: la app sigue sin sonido */
  }
}
