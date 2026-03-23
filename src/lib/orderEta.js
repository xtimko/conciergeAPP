import { parseEstimatedDaysFromOrder, formatExpectedDaysShort } from '@/lib/estimatedDelivery';

/**
 * Краткая подсказка по сроку для списка заказов (главная).
 * @returns {string|null}
 */
export function getOrderEtaHint(order, lang = 'ru') {
  if (!order || order.status === 'delivered' || order.status === 'cancelled') return null;
  const created = order.created_date ? new Date(order.created_date) : null;
  const { min, max, isRange } = parseEstimatedDaysFromOrder(order);
  if (!created || !max || max <= 0) return null;

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const fmt = (d) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const etaStart = new Date(created.getTime() + min * 86400000);
  const etaEnd = new Date(created.getTime() + max * 86400000);
  const now = new Date();
  const daysToEnd = Math.ceil((etaEnd.getTime() - now.getTime()) / 86400000);
  const daysToStart = Math.ceil((etaStart.getTime() - now.getTime()) / 86400000);

  if (daysToEnd <= 0) {
    return lang === 'ru' ? 'Срок ожидания истёк' : 'Past expected date';
  }

  const shortWait = formatExpectedDaysShort(order, lang);
  if (isRange) {
    return lang === 'ru'
      ? `Срок ожидания ${shortWait} · ${fmt(etaStart)}–${fmt(etaEnd)}`
      : `Waiting ${shortWait} · ${fmt(etaStart)}–${fmt(etaEnd)}`;
  }

  const daysLeft = daysToEnd;
  const shortDate = fmt(etaEnd);
  if (daysLeft === 1) {
    return lang === 'ru'
      ? `Срок ожидания ${shortWait} · ${shortDate}`
      : `Waiting ${shortWait} · ${shortDate}`;
  }
  return lang === 'ru'
    ? `Срок ожидания ${shortWait} · ${shortDate}`
    : `Waiting ${shortWait} · ${shortDate}`;
}
