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

const CATEGORY_RU = {
  footwear: "Обувь",
  clothing: "Одежда",
  accessories: "Аксессуары",
  bags: "Сумки",
  other: "Другое"
};

function formatMoney(order) {
  const n = Number(order.price ?? 0);
  const cur = String(order.currency || "RUB").toUpperCase();
  const formatted = Number.isFinite(n) ? n.toLocaleString("ru-RU") : "—";
  if (cur === "RUB") return `${formatted} ₽`;
  if (cur === "USD") return `$${formatted}`;
  if (cur === "EUR") return `€${formatted}`;
  return `${formatted} ${cur}`;
}

function formatEstimated(order) {
  const r = String(order.estimated_days_range || "").trim();
  if (r) return `ориентир ${r} дн.`;
  const d = Number(order.estimated_days || 0);
  if (d > 0) return `ориентир до ${d} дн.`;
  return "";
}

function formatBonusBlock(order) {
  const ref = Number(order.referral_bonus || 0);
  if (ref <= 0) return null;
  const subtract = order.client_bonus_mode === "subtract";
  if (subtract) {
    return `💎 Баллы: после доставки спишется ${ref} с баланса (по условиям заказа).`;
  }
  return `💎 Баллы: после доставки начислим ${ref} на ваш счёт.`;
}

function formatReferrerBonusLine(order) {
  const rb = Number(order.referrer_bonus || 0);
  if (rb <= 0 || !String(order.referrer_email || "").trim()) return null;
  return `🤝 Бонус пригласившему после доставки: ${rb} балл.`;
}

/**
 * Короткая подпись к фото (Telegram ≤ 1024 символов).
 */
export function formatOrderCreatedPhotoCaptionRu(order) {
  const id = order.id || "";
  const name = order.item_name || "Заказ";
  const price = formatMoney(order);
  const st = ORDER_STATUS_LABELS_RU[order.status] || order.status;
  return `📦 ${id}\n${name}\n${price}\nСтатус: ${st}`;
}

/**
 * Полное текстовое уведомление о создании заказа.
 */
export function formatOrderCreatedRichRu(order) {
  const lines = [];
  lines.push("✅ Заказ принят в работу");
  lines.push("");
  lines.push(`📋 Номер: ${order.id || "—"}`);
  lines.push(`📦 ${order.item_name || "Товар"}`);
  if (order.brand) lines.push(`🏷 Бренд: ${order.brand}`);
  if (order.item_size) lines.push(`📏 Размер: ${order.item_size}`);
  const cat = CATEGORY_RU[order.item_category] || order.item_category;
  if (cat) lines.push(`📂 Категория: ${cat}`);
  lines.push(`💰 Стоимость: ${formatMoney(order)}`);
  const est = formatEstimated(order);
  if (est) lines.push(`⏱ Срок: ${est}`);
  const st = ORDER_STATUS_LABELS_RU[order.status] || order.status;
  lines.push(`📍 Статус: ${st}`);
  const bonus = formatBonusBlock(order);
  if (bonus) lines.push(bonus);
  const refLine = formatReferrerBonusLine(order);
  if (refLine) lines.push(refLine);
  const notes = String(order.notes || "").trim();
  if (notes) {
    lines.push("");
    lines.push(`📝 Комментарий: ${notes.slice(0, 500)}${notes.length > 500 ? "…" : ""}`);
  }
  const img = String(order.image_url || "").trim();
  if (img.startsWith("data:")) {
    lines.push("");
    lines.push("📷 Фото прикреплено к заказу — откройте приложение, чтобы посмотреть.");
  }
  lines.push("");
  lines.push("Мы напишем, когда статус изменится.");
  return lines.join("\n");
}

export function formatOrderStatusMessageRu(order) {
  const title = order.item_name || "Заказ";
  const st = ORDER_STATUS_LABELS_RU[order.status] || order.status;
  const num = order.id ? `\nНомер: ${order.id}` : "";
  return `📦 Обновление по заказу «${title}»${num}\n\nНовый статус: ${st}`;
}
