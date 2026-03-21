/**
 * Краткая подсказка по сроку для списка заказов (главная).
 * @returns {string|null}
 */
export function getOrderEtaHint(order, lang = 'ru') {
  if (!order || order.status === 'delivered' || order.status === 'cancelled') return null;
  const created = order.created_date ? new Date(order.created_date) : null;
  const estDays = Number(order.estimated_days || 0);
  if (!created || !estDays || estDays <= 0) return null;
  const eta = new Date(created.getTime() + estDays * 86400000);
  const now = new Date();
  const diffMs = eta.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / 86400000);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const shortDate = eta.toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  if (daysLeft <= 0) {
    return lang === 'ru' ? 'Срок ожидания истёк' : 'Past expected date';
  }
  if (daysLeft === 1) {
    return lang === 'ru' ? `~1 день · до ${shortDate}` : `~1 day · by ${shortDate}`;
  }
  return lang === 'ru'
    ? `~${daysLeft} дн. · до ${shortDate}`
    : `~${daysLeft}d · by ${shortDate}`;
}
