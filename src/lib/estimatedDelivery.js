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

/** Короткая строка для UI: ~14дн. / ~5-10дн. (дефис между числами). */
export function formatExpectedDaysShort(order, lang = 'ru') {
  const { min, max, isRange } = parseEstimatedDaysFromOrder(order);
  if (!max || max <= 0) return null;
  if (lang === 'ru') {
    if (isRange && min !== max) return `~${min}-${max}дн.`;
    return `~${max}дн.`;
  }
  if (isRange && min !== max) return `~${min}-${max}d`;
  return `~${max}d`;
}

/**
 * Одна строка для клиента: срок + крайняя дата окна (created + max дней).
 * Пример: ~5-10дн. до 16 апреля 2026 г.
 */
export function formatOrderEtaClientLine(order, lang = 'ru', { compact = false } = {}) {
  const created = order?.created_date ? new Date(order.created_date) : null;
  const { max } = parseEstimatedDaysFromOrder(order);
  if (!created || Number.isNaN(created.getTime()) || !max || max <= 0) return null;

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const etaEnd = new Date(created.getTime() + max * 86400000);
  const shortWait = formatExpectedDaysShort(order, lang);
  const dateOpts = compact
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  const dateStr = etaEnd.toLocaleDateString(locale, dateOpts);
  const until = lang === 'ru' ? `до ${dateStr}` : `until ${dateStr}`;
  return shortWait ? `${shortWait} ${until}` : until;
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
