import { formatOrderEtaClientLine } from '@/lib/estimatedDelivery';

/**
 * Краткая подсказка по сроку для списка заказов (главная).
 * @returns {string|null}
 */
export function getOrderEtaHint(order, lang = 'ru') {
  if (!order || order.status === 'delivered' || order.status === 'cancelled') return null;
  const line = formatOrderEtaClientLine(order, lang, { compact: true });
  if (!line) return null;
  return lang === 'ru' ? `Срок ожидания ${line}` : `Waiting period ${line}`;
}
