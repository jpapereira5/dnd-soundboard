/** "1:30", "0:45" or "90" → seconds. Empty or unreadable → undefined. */
export function parseTime(text: string): number | undefined {
  const t = text.trim()
  if (!t) return undefined
  const parts = t.split(':')
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return undefined
  const secs = parts.reduce((total, p) => total * 60 + Number(p), 0)
  return secs > 0 ? secs : undefined
}

/** 90 → "1:30". Missing or zero → "". */
export function formatTime(secs: number | undefined): string {
  if (!secs || secs <= 0) return ''
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
