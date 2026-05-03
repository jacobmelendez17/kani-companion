/**
 * Returns a short, human-readable relative time string.
 * "just now", "2m ago", "3h ago", "5d ago"
 */
export function timeAgo(isoString: string | null | undefined): string {
  if (!isoString) return 'never'

  const then = new Date(isoString).getTime()
  const now = Date.now()
  const seconds = Math.max(0, Math.floor((now - then) / 1000))

  if (seconds < 30) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
