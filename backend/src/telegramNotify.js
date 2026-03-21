/**
 * Отправка сообщения пользователю через Bot API (для уведомлений о статусе заказа).
 * Требуется TELEGRAM_BOT_TOKEN в .env.
 */
export async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId || !text) return;
  const id = String(chatId).trim();
  if (!id) return;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: id,
      text: text.slice(0, 4000),
      disable_web_page_preview: true
    })
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.warn("[telegramNotify] sendMessage failed:", res.status, err);
  }
}

const STATUS_RU = {
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
  const st = STATUS_RU[order.status] || order.status;
  return `📦 Статус заказа «${title}» изменён: ${st}`;
}
