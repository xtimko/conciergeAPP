// @ts-nocheck
/**
 * Заворачивает внешний URL картинки через бэкенд `/api/img-proxy?url=...`.
 *
 * Зачем: hotlink protection (Pinterest, StockX и пр. блокируют чужие Referer)
 * и истекающие signed URL (Telegram CDN, CloudFront с TTL). Бэкенд скачивает
 * картинку один раз с правильным Referer + опциональным TELEGRAM_PROXY и
 * отдаёт клиенту с долгим кэшем.
 *
 * Не оборачивает: data:URL и уже относительные URL.
 */

function getApiBase() {
  const envBase = (import.meta?.env?.VITE_API_BASE_URL || '').toString().trim().replace(/\/+$/, '');
  if (envBase) return envBase;
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return '/api';
}

export function proxyImageUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;
  if (!/^https?:\/\//i.test(raw)) return raw;
  return `${getApiBase()}/img-proxy?url=${encodeURIComponent(raw)}`;
}
