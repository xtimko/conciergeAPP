/** Тексты уведомлений клиенту в Telegram (RU). Сдержанный тон, без лишней графики в тексте. */

export const ORDER_STATUS_LABELS_RU = {
  pending: "ожидает подтверждения",
  confirmed: "подтверждён",
  sourcing: "в поиске",
  shipping: "в пути",
  awaiting_pickup: "ожидает выдачи",
  delivered: "доставлен",
  cancelled: "отменён"
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

function formatEstimatedLine(order) {
  const r = String(order.estimated_days_range || "").trim();
  if (r) return `Срок: ${r.replace(/-/g, "–")} дней`;
  const d = Number(order.estimated_days || 0);
  if (d > 0) return `Срок: до ${d} дн.`;
  return "";
}

function formatClientBonusLine(order) {
  const ref = Number(order.referral_bonus || 0);
  if (ref <= 0) return null;
  if (order.client_bonus_mode === "subtract") {
    return `По условиям заказа после доставки будет списано ${ref} баллов.`;
  }
  return `После доставки на ваш счёт будет начислено ${ref} баллов.`;
}

function formatReferrerLine(order) {
  const rb = Number(order.referrer_bonus || 0);
  if (rb <= 0 || !String(order.referrer_email || "").trim()) return null;
  return `Реферальный бонус после доставки заказа: ${rb} баллов.`;
}

/**
 * Уведомление о создании заказа: один блок текста.
 * @param {object} opts — maxTotal (1024 для подписи к фото, иначе до 4096); maxNotes — лимит комментария
 */
export function formatOrderCreatedNotificationRu(order, opts = {}) {
  const maxTotal = typeof opts.maxTotal === "number" ? opts.maxTotal : 4096;
  const shortCaption = maxTotal <= 1024;
  const maxNotes =
    typeof opts.maxNotes === "number" ? opts.maxNotes : shortCaption ? 160 : 1200;

  const lines = [];

  lines.push("Заказ принят");
  lines.push("");
  lines.push(String(order.id || "—"));
  lines.push("");
  lines.push(String(order.item_name || "Позиция").trim() || "Позиция");

  const details = [];
  if (order.brand) details.push(String(order.brand).trim());
  if (order.item_size) details.push(String(order.item_size).trim());
  if (details.length) lines.push(details.join(" · "));

  const cat = CATEGORY_RU[order.item_category] || order.item_category;
  if (cat) lines.push(cat);

  lines.push("");
  lines.push(formatMoney(order));

  const est = formatEstimatedLine(order);
  if (est) lines.push(est);

  const st = ORDER_STATUS_LABELS_RU[order.status] || order.status;
  lines.push(`Статус: ${st}`);

  const bonus = formatClientBonusLine(order);
  if (bonus) {
    lines.push("");
    lines.push(bonus);
  }

  const refLine = formatReferrerLine(order);
  if (refLine) lines.push(refLine);

  const notes = String(order.notes || "").trim();
  if (notes) {
    lines.push("");
    const cut = notes.length > maxNotes ? `${notes.slice(0, maxNotes - 1)}…` : notes;
    lines.push(`Комментарий: ${cut}`);
  }

  const img = String(order.image_url || "").trim();
  if (img.startsWith("data:")) {
    lines.push("");
    lines.push("Изображение доступно в приложении.");
  }

  lines.push("");
  lines.push("Мы сообщим об изменении статуса.");

  let text = lines.join("\n");
  if (text.length > maxTotal) {
    text = `${text.slice(0, maxTotal - 1).trim()}…`;
  }
  return text;
}

/** Начисление / списание баллов по доставленному заказу (клиент заказа) */
export function formatBonusDeliveredClientRu(extra) {
  const orderId = String(extra?.orderId || "—");
  const delta = Number(extra?.delta ?? 0);
  if (delta === 0) return "";
  if (delta > 0) {
    return `Баллы по заказу ${orderId}\n\nЗачислено на счёт: ${delta} баллов.`;
  }
  return `Баллы по заказу ${orderId}\n\nСписано со счёта: ${Math.abs(delta)} баллов.`;
}

/** Реферальное вознаграждение пригласившему после доставки заказа друга */
export function formatBonusDeliveredReferrerRu(extra) {
  const orderId = String(extra?.orderId || "—");
  const delta = Number(extra?.delta ?? 0);
  if (delta <= 0) return "";
  return `Реферальное вознаграждение\n\nЗаказ ${orderId} доставлен.\n\nНа ваш счёт зачислено ${delta} баллов.`;
}

/** Обновление статуса — коротко, без эмодзи в каждой строке */
export function formatOrderStatusMessageRu(order) {
  const title = order.item_name || "Заказ";
  const st = ORDER_STATUS_LABELS_RU[order.status] || order.status;
  const id = order.id ? `${order.id}\n\n` : "";
  return `Обновление по заказу\n\n${id}«${title}»\n\nНовый статус: ${st}`;
}
