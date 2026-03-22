/**
 * Отправка сообщения пользователю в личный чат с ботом (Bot API sendMessage).
 * Требуется TELEGRAM_BOT_TOKEN в .env; пользователь не должен блокировать бота.
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

/**
 * Найти пользователя по полю client_email заказа (и по «как email» строкам).
 *
 * Поддерживается:
 * - обычный email;
 * - tg-123…@client.internal / tg_123…@concierge-app.local / id-…@client.internal;
 * - строка из одних цифр — считается Telegram user id (частый случай, если ввели ID вручную).
 */
export function findUserByClientEmail(db, clientEmail) {
  const raw = String(clientEmail || "").trim();
  if (!raw) return null;
  const e = raw.toLowerCase();

  const byEmail = db.users.find((u) => String(u.email || "").trim().toLowerCase() === e);
  if (byEmail) return byEmail;

  // Только цифры — прямой поиск по telegram_id (5–16 цифр, как у реальных TG id)
  if (/^\d{5,16}$/.test(raw)) {
    const byTg = db.users.find((u) => String(u.telegram_id || "").trim() === raw);
    if (byTg) return byTg;
  }

  const mTg = /^tg-(\d+)@client\.internal$/i.exec(e);
  if (mTg) {
    const u = db.users.find((x) => String(x.telegram_id || "") === mTg[1]);
    if (u) return u;
  }
  const mLocal = /^tg_(\d+)@concierge-app\.local$/i.exec(e);
  if (mLocal) {
    const u = db.users.find((x) => String(x.telegram_id || "") === mLocal[1]);
    if (u) return u;
  }
  const mId = /^id-([^@]+)@client\.internal$/i.exec(e);
  if (mId) {
    const u = db.users.find((x) => String(x.id) === mId[1]);
    if (u) return u;
  }
  return null;
}

/**
 * Пользователь для уведомлений: по client_email и/или явному client_telegram_id в заказе.
 */
export function findUserForOrder(db, order) {
  const u1 = findUserByClientEmail(db, order?.client_email);
  if (u1) return u1;
  const tid = String(order?.client_telegram_id || "").trim();
  if (tid && /^\d{5,16}$/.test(tid)) {
    return db.users.find((x) => String(x.telegram_id || "").trim() === tid) || null;
  }
  return null;
}

/** Заполняем client_telegram_id при создании заказа из тела запроса / из синтетического email. */
export function deriveClientTelegramIdFromBody(body) {
  const b = body || {};
  const direct = String(b.client_telegram_id || "").trim();
  if (direct && /^\d{5,16}$/.test(direct)) return direct;
  const e = String(b.client_email || "").trim();
  const m = /^tg-(\d+)@client\.internal$/i.exec(e);
  if (m) return m[1];
  const m2 = /^tg_(\d+)@concierge-app\.local$/i.exec(e);
  if (m2) return m2[1];
  if (/^\d{5,16}$/.test(e)) return e;
  return "";
}

export function formatOrderStatusMessageRu(order) {
  const title = order.item_name || "Заказ";
  const st = STATUS_RU[order.status] || order.status;
  const num = order.id ? `\nНомер: ${order.id}` : "";
  return `📦 Обновление по заказу «${title}»${num}\n\nНовый статус: ${st}`;
}

export function formatOrderCreatedMessageRu(order) {
  const title = order.item_name || "Заказ";
  const st = STATUS_RU[order.status] || order.status;
  const num = order.id ? `Номер: ${order.id}` : "";
  return `✅ Заказ оформлен!\n\n📦 ${title}\n${num}\nСтатус: ${st}\n\nМы пришлём сообщение, когда статус изменится.`;
}

/**
 * Уведомление в чат с ботом (если у клиента есть telegram_id).
 */
export function notifyOrderInTelegramChat(botToken, db, order, kind) {
  if (!botToken) return;
  if (!order?.client_email && !order?.client_telegram_id) return;
  const user = findUserForOrder(db, order);
  const tgId = user?.telegram_id;
  if (!tgId) return;
  let text;
  if (kind === "created") {
    text = formatOrderCreatedMessageRu(order);
  } else {
    text = formatOrderStatusMessageRu(order);
  }
  sendTelegramMessage(botToken, tgId, text).catch(() => {});
}
