// Todas las fechas se manejan como 'YYYY-MM-DD' en hora local, igual que en
// el artefacto original: nada de objetos Date guardados en el estado.

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
export const parse = (s) => {
  const p = s.split('-')
  return new Date(+p[0], +p[1] - 1, +p[2])
}
export const today = () => ymd(new Date())
const dow = (d) => (d.getDay() + 6) % 7 // 0 = lunes

export function addDays(s, n) {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}
export function wkOf(s) {
  const d = parse(s)
  d.setDate(d.getDate() - dow(d))
  return ymd(d)
}
export function dayOfWeek(s) {
  return dow(parse(s))
}
export function dayLabel(s) {
  const d = parse(s)
  return DIA[dow(d)] + ' ' + d.getDate() + ' ' + MES[d.getMonth()]
}
export function dayLong(s) {
  const d = parse(s)
  return DIA[dow(d)] + ' ' + d.getDate() + ' de ' + MESL[d.getMonth()]
}
export function wkLabel(wk) {
  const a = parse(wk)
  const b = parse(addDays(wk, 6))
  return a.getMonth() === b.getMonth()
    ? a.getDate() + ' al ' + b.getDate() + ' ' + MES[b.getMonth()]
    : a.getDate() + ' ' + MES[a.getMonth()] + ' al ' + b.getDate() + ' ' + MES[b.getMonth()]
}
