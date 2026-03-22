import { notifyClientTelegram } from "./clientNotifications.js";

export { sendTelegramMessage } from "./telegramBotApi.js";

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

  if (/^\d{5,16}$/.test(raw)) {
    const byTg = db.users.find((u) => String(u.telegram_id || "").trim() === raw);
    if (byTg) return byTg;
  }

  const mTg = /^tg-([^@]+)@client\.internal$/i.exec(e);
  if (mTg) {
    let key = mTg[1].trim();
    try {
      key = decodeURIComponent(key);
    } catch {
      /* ignore */
    }
    const u = db.users.find((x) => String(x.telegram_id || "").trim() === key);
    if (u) return u;
  }
  const mLocal = /^tg_([^@]+)@concierge-app\.local$/i.exec(e);
  if (mLocal) {
    const key = mLocal[1].trim();
    const u = db.users.find((x) => String(x.telegram_id || "").trim() === key);
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
  if (tid) {
    return db.users.find((x) => String(x.telegram_id || "").trim() === tid) || null;
  }
  return null;
}

/** Заполняем client_telegram_id при создании заказа из тела запроса / из синтетического email. */
export function deriveClientTelegramIdFromBody(body) {
  const b = body || {};
  const direct = String(b.client_telegram_id || "").trim();
  if (direct) return direct;
  const e = String(b.client_email || "").trim();
  const m = /^tg-([^@]+)@client\.internal$/i.exec(e);
  if (m) {
    try {
      return decodeURIComponent(m[1]).trim();
    } catch {
      return m[1].trim();
    }
  }
  const m2 = /^tg_([^@]+)@concierge-app\.local$/i.exec(e);
  if (m2) return m2[1].trim();
  if (/^\d{5,16}$/.test(e)) return e;
  return "";
}

/**
 * Уведомление по заказу в чат с ботом (создание / смена статуса).
 * Учитывает notify_preferences.orders (см. clientNotifications.js).
 */
export function notifyOrderInTelegramChat(botToken, db, order, kind) {
  if (!botToken) {
    console.warn("[telegramNotify] пропуск: TELEGRAM_BOT_TOKEN не задан (проверь backend/.env и перезапуск)");
    return;
  }
  if (!order?.client_email && !order?.client_telegram_id) {
    console.warn("[telegramNotify] пропуск: у заказа нет client_email / client_telegram_id, id=", order?.id);
    return;
  }
  const user = findUserForOrder(db, order);
  if (!user) {
    console.warn(
      "[telegramNotify] не нашли клиента в data.json. Заказ:",
      order?.id,
      "client_email:",
      order?.client_email,
      "client_telegram_id:",
      order?.client_telegram_id
    );
    return;
  }

  const type = kind === "created" ? "order_created" : "order_status_changed";
  notifyClientTelegram(botToken, user, { type, order });
}
