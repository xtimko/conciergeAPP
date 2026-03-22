/**
 * Человекочитаемый номер заказа (CON-000001) или сокращение длинного legacy-id.
 */
export function formatOrderDisplayId(order) {
  if (!order?.id) return '—';
  const id = String(order.id);
  if (/^CON-\d{6}$/.test(id)) return id;
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
