export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatIDR(amount) {
  const numeric = Number(amount);
  const safeValue = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  return `Rp ${safeValue.toLocaleString('id-ID')}`;
}

export function safeExternalUrl(rawUrl, fallbackUrl) {
  try {
    const parsed = new URL(String(rawUrl));
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    // Fallback to safe search URL
  }
  return fallbackUrl;
}

export function mapsSearchUrl(queryText) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(queryText || 'Aceh'))}`;
}

export async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function formatDayOffsetDate(startDateStr, dayOffset, lang = 'id') {
  if (!startDateStr) return '';
  const baseDate = new Date(`${startDateStr}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) return '';
  const targetDate = new Date(baseDate);
  targetDate.setDate(baseDate.getDate() + dayOffset);
  return targetDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short',
  });
}
