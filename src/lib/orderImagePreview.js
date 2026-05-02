import { getApiBaseDebug } from '@/api/client';

const TOKEN_KEY = 'concierge_jwt';

/** Превью внешних URL через бэкенд (Mini App / img без Bearer). */
export function getProxiedOrderImageSrc(originalUrl) {
  const raw = String(originalUrl || '').trim();
  if (!raw || raw.startsWith('data:')) return raw;
  if (!/^https?:\/\//i.test(raw)) return raw;
  if (typeof window === 'undefined') return raw;
  const token = localStorage.getItem(TOKEN_KEY);
  const base = getApiBaseDebug();
  if (!token) return raw;
  return `${base}/media/preview?url=${encodeURIComponent(raw)}&token=${encodeURIComponent(token)}`;
}
