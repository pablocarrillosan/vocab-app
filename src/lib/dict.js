// Consulta las acepciones de una palabra en el diccionario libre
// dictionaryapi.dev. Las definiciones vienen en inglés.
const POS_MAP = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv' }

export async function lookup(word) {
  const q = word.trim().toLowerCase().replace(/^to\s+(?=\S)/, '')
  const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(q))
  if (res.status === 404) return []
  if (!res.ok) throw new Error('Diccionario: ' + res.status)
  const data = await res.json()
  const out = []
  const seen = new Set()
  ;(Array.isArray(data) ? data : []).forEach((entry) =>
    (entry.meanings || []).forEach((m) =>
      (m.definitions || []).forEach((d) => {
        if (!d.definition || seen.has(d.definition)) return
        seen.add(d.definition)
        out.push({ pos: POS_MAP[m.partOfSpeech] || '', posName: m.partOfSpeech || '', def: d.definition, ex: d.example || '' })
      }),
    ),
  )
  return out
}
