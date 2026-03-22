/** Тексты уведомлений (RU), разметка HTML для Telegram parse_mode. */

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Подписи статусов для писем (читабельный регистр) */
export const ORDER_STATUS_TITLE_RU = {
  pending: "Ожидает подтверждения",
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

function formatEstimatedLine(order) {
  const r = String(order.estimated_days_range || "").trim();
  if (r) return `Срок: ${r.replace(/-/g, "–")} дней`;
  const d = Number(order.estimated_days || 0);
  if (d > 0) return `Срок: до ${d} дн.`;
  return "";
}

/**
 * Уведомление о создании заказа (HTML).
 * Баллы: «Баллов к списанию: N» / «Баллов к начислению: N».
 */
export function formatOrderCreatedNotificationRu(order, opts = {}) {
  const maxTotal = typeof opts.maxTotal === "number" ? opts.maxTotal : 4096;
  const shortCaption = maxTotal <= 1024;
  const maxNotes =
    typeof opts.maxNotes === "number" ? opts.maxNotes : shortCaption ? 160 : 1200;

  const id = escapeHtml(order.id || "—");
  const item = escapeHtml(String(order.item_name || "Позиция").trim() || "Позиция");
  const size = order.item_size ? ` – ${escapeHtml(String(order.item_size).trim())}` : "";

  const parts = [];
  parts.push("<b>Заказ оформлен</b>");
  parts.push("");
  parts.push(`${item}${size}`);
  parts.push(`<b>${id}</b>`);

  const brand = order.brand ? escapeHtml(String(order.brand).trim()) : "";
  const catRaw = CATEGORY_RU[order.item_category] || order.item_category;
  const cat = catRaw ? escapeHtml(String(catRaw)) : "";

  const meta = [];
  if (brand) meta.push(brand);
  if (cat) meta.push(cat);
  if (meta.length) {
    parts.push("");
    parts.push(meta.join(" · "));
  }

  parts.push("");
  parts.push(`<b>${escapeHtml(formatMoney(order))}</b>`);

  const est = formatEstimatedLine(order);
  if (est) parts.push(escapeHtml(est));

  const st = ORDER_STATUS_TITLE_RU[order.status] || order.status;
  parts.push(`Статус: <b>${escapeHtml(st)}</b>`);

  const ref = Number(order.referral_bonus || 0);
  if (ref > 0) {
    parts.push("");
    if (order.client_bonus_mode === "subtract") {
      parts.push(`<b>Баллов к списанию:</b> ${ref}`);
    } else {
      parts.push(`<b>Баллов к начислению:</b> ${ref}`);
    }
  }

  const notes = String(order.notes || "").trim();
  if (notes) {
    parts.push("");
    const cut = notes.length > maxNotes ? `${notes.slice(0, maxNotes - 1)}…` : notes;
    parts.push(`Комментарий: ${escapeHtml(cut)}`);
  }

  const img = String(order.image_url || "").trim();
  if (img.startsWith("data:")) {
    parts.push("");
    parts.push("Изображение доступно в приложении.");
  }

  parts.push("");
  parts.push("Мы сообщим об изменении статуса.");

  let text = parts.join("\n");
  if (text.length > maxTotal) {
    text = `${text.slice(0, maxTotal - 1).trim()}…`;
  }
  return text;
}

/**
 * Обновление статуса (как в ТЗ).
 */
export function formatOrderStatusMessageRu(order) {
  const name = escapeHtml(order.item_name || "Заказ");
  const size = order.item_size ? ` – ${escapeHtml(String(order.item_size).trim())}` : "";
  const oid = escapeHtml(order.id || "—");
  const st = escapeHtml(ORDER_STATUS_TITLE_RU[order.status] || order.status);

  return `<b>Обновление по заказу:</b>\n\n${name}${size}\n<b>${oid}</b>\n\nСтатус -> <b>${st}</b>`;
}
