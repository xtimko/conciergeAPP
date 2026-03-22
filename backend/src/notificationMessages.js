/** Тексты уведомлений клиенту в Telegram (RU). Позже: en по user.language. */

export const ORDER_STATUS_LABELS_RU = {
  pending: "Ожидает",
  confirmed: "Подтверждён",
  sourcing: "В поиске",
  shipping: "В пути",
  awaiting_pickup: "Ожидает выдачи",
  delivered: "Доставлен",
  cancelled: "Отменён"
};

export function formatOrderStatusMessageRu(order) {
  const title = order.item_name || "Заказ";
  const st = ORDER_STATUS_LABELS_RU[order.status] || order.status;
  const num = order.id ? `\nНомер: ${order.id}` : "";
  return `📦 Обновление по заказу «${title}»${num}\n\nНовый статус: ${st}`;
}

export function formatOrderCreatedMessageRu(order) {
  const title = order.item_name || "Заказ";
  const st = ORDER_STATUS_LABELS_RU[order.status] || order.status;
  const num = order.id ? `Номер: ${order.id}` : "";
  return `✅ Заказ оформлен!\n\n📦 ${title}\n${num}\nСтатус: ${st}\n\nМы пришлём сообщение, когда статус изменится.`;
}
