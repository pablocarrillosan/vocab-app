// Corrección de los ejercicios de gramática. Es la misma lógica que tenían los
// artefactos: sin distinguir mayúsculas, sin el punto final y aceptando las
// contracciones en los dos sentidos ('s y 'd pueden ser is/has y would/had).

function norm(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[’ʼ]/g, "'")
    .trim()
    .replace(/[.,!?;:]+$/, '')
    .replace(/\s+/g, ' ')
}

function expand(s) {
  s = norm(s)
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b/g, 'can not')
    .replace(/\bcannot\b/g, 'can not')
    .replace(/\bshan't\b/g, 'shall not')
    .replace(/n't\b/g, ' not')
    .replace(/'ll\b/g, ' will')
    .replace(/'ve\b/g, ' have')
    .replace(/'re\b/g, ' are')
    .replace(/'m\b/g, ' am')
  let outs = [s]
  for (const [c, reps] of [
    ["'d", [' would', ' had']],
    ["'s", [' is', ' has']],
  ]) {
    outs = outs.flatMap((o) => (o.includes(c) ? reps.map((r) => o.split(c).join(r)) : [o]))
  }
  return outs.map((o) => o.replace(/\s+/g, ' ').trim())
}

export function matches(user, answers) {
  const u = expand(user)
  return answers.some((a) => {
    const e = expand(a)
    return u.some((x) => e.includes(x))
  })
}

// Clave de cada respuesta guardada: 'tanda.ítem' en opción múltiple y
// 'tanda.ítem.hueco' en los demás (hueco 0 cuando solo hay uno).
export function fieldsOf(item, s, i) {
  if (item.type === 'mc') return [{ key: s + '.' + i, mc: true }]
  if (item.type === 'gap') {
    return item.parts.filter((p) => typeof p !== 'string').map((p, g) => ({ key: s + '.' + i + '.' + g, a: p.a }))
  }
  return [{ key: s + '.' + i + '.0', a: item.a }]
}

// Resultado de un ítem con las respuestas actuales: qué campos están bien y
// qué soluciones hay que enseñar para los que están mal.
export function gradeItem(item, s, i, answers) {
  const ok = {}
  const sol = []
  for (const f of fieldsOf(item, s, i)) {
    const v = answers[f.key] || ''
    if (f.mc) ok[f.key] = v === item.a
    else {
      ok[f.key] = Boolean(v.trim()) && matches(v, f.a)
      if (!ok[f.key]) sol.push(f.a[0])
    }
  }
  const vals = Object.values(ok)
  return { ok, sol, right: vals.filter(Boolean).length, total: vals.length }
}

export function gradeSet(set, s, answers) {
  let right = 0
  let total = 0
  set.items.forEach((it, i) => {
    const g = gradeItem(it, s, i, answers)
    right += g.right
    total += g.total
  })
  return [right, total]
}
