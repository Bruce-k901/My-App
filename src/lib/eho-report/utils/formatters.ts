export function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return `${Math.round(value)}%`
}

export function truncateText(text: string | null | undefined, maxLen: number = 200): string {
  if (!text) return ''
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

export function getDocStatus(expiryDate: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'unknown' {
  if (!expiryDate) return 'unknown'
  const expiry = new Date(expiryDate)
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (expiry < now) return 'expired'
  if (expiry < thirtyDays) return 'expiring'
  return 'valid'
}

export function rateColor(rate: number): string {
  if (rate >= 90) return 'green'
  if (rate >= 70) return 'amber'
  return 'red'
}
