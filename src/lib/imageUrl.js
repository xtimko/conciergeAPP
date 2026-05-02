/**
 * Подготовка URL картинки для img в HTTPS Mini App.
 * — protocol-relative //host → https://host
 * — http:// → пробуем https:// (mixed content в WebView блокирует http)
 */
export function normalizeImageUrlForDisplay(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("http://")) {
    try {
      const u = new URL(s);
      return `https://${u.hostname}${u.pathname}${u.search}${u.hash}`;
    } catch {
      return s;
    }
  }
  return s;
}
