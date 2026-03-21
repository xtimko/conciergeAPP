/**
 * Парсинг срока доставки заказа: одно число или диапазон "7-14" / "7 – 14".
 */
export function parseEstimatedDaysFromOrder(order) {
  const r = order?.estimated_days_range;
  if (r && typeof r === 'string') {
    const t = r.trim();
    const m = t.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return { min: lo, max: hi, isRange: true };
    }
  }
  const n = Number(order?.estimated_days || 0);
  if (Number.isFinite(n) && n > 0) return { min: n, max: n, isRange: false };
  return { min: 0, max: 0, isRange: false };
}

/** Нормализация ввода админа → API */
export function normalizeEstimatedDaysInput(raw) {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return { estimated_days: 0, estimated_days_range: '' };
  const m = s.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return { estimated_days: hi, estimated_days_range: `${lo}-${hi}` };
  }
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return { estimated_days: n, estimated_days_range: '' };
  return { estimated_days: 0, estimated_days_range: '' };
}
