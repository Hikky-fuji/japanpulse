export function calendarDaysUntil(value, now = new Date()) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const targetDay = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((targetDay - currentDay) / 86400000)
}
