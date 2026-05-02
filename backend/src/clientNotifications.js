/**
 * Система уведомлений клиенту в Telegram: типы, каналы, настройки пользователя.
 *
 * Сейчас бот шлёт только: оформление заказа и смену статуса (канал orders).
 */
import { sendTelegramMessage, sendTelegramPhoto, deleteTelegramMessage } from "./telegramBotApi.js";
import { formatOrderCreatedNotificationRu, formatOrderStatusMessageRu } from "./notificationMessages.js";
import { readDb, writeDb } from "./db.js";

/** В data.json: последнее сообщение бота по заказу (перед обновлением статуса удаляем — новое сообщение даёт push). */
const ORDER_TG_MSG_KEY = "telegram_order_status_msg";

function ensureOrderMsgStore(db) {
  if (!db[ORDER_TG_MSG_KEY] || typeof db[ORDER_TG_MSG_KEY] !== "object") {
    db[ORDER_TG_MSG_KEY] = {};
  }
}

/** Значения по умолчанию для новых и существующих пользователей */
export const DEFAULT_NOTIFY_PREFERENCES = {
  orders: true,
  marketing: false,
  system: true,
  referrals: true
};

/** Каналы и человекочитаемые id (для API / настроек) */
export const NOTIFY_CHANNELS = ["orders", "marketing", "system", "referrals"];

export function getNotifyPreferences(user) {
  const raw = user?.notify_preferences;
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_NOTIFY_PREFERENCES };
  }
  return {
    orders: typeof raw.orders === "boolean" ? raw.orders : DEFAULT_NOTIFY_PREFERENCES.orders,
    marketing:
      typeof raw.marketing === "boolean" ? raw.marketing : DEFAULT_NOTIFY_PREFERENCES.marketing,
    system: typeof raw.system === "boolean" ? raw.system : DEFAULT_NOTIFY_PREFERENCES.system,
    referrals:
      typeof raw.referrals === "boolean" ? raw.referrals : DEFAULT_NOTIFY_PREFERENCES.referrals
  };
}

/** Слияние PATCH с текущими prefs (только валидные ключи) */
export function mergeNotifyPreferences(currentUser, patch) {
  const cur = getNotifyPreferences(currentUser);
  if (!patch || typeof patch !== "object") return cur;
  return {
    orders: typeof patch.orders === "boolean" ? patch.orders : cur.orders,
    marketing: typeof patch.marketing === "boolean" ? patch.marketing : cur.marketing,
    system: typeof patch.system === "boolean" ? patch.system : cur.system,
    referrals: typeof patch.referrals === "boolean" ? patch.referrals : cur.referrals
  };
}

/**
 * Одно сообщение: фото с подписью (если есть публичный URL), иначе только текст.
 * Подпись к фото ≤ 1024 символов (лимит Telegram).
 */
async function sendOrderCreatedTelegram(botToken, chatId, { order }) {
  const msgOpts = { openMiniApp: true };
  const raw = String(order?.image_url || "").trim();
  const hasPublicPhoto = raw && /^https?:\/\//i.test(raw);

  if (hasPublicPhoto) {
    const caption = formatOrderCreatedNotificationRu(order, { maxTotal: 1024 });
    const mid = await sendTelegramPhoto(botToken, chatId, raw, caption, msgOpts);
    if (mid != null) return { message_id: mid, is_photo: true };
    console.warn("[clientNotifications] sendPhoto не удался — отправляем текстом");
  }

  const text = formatOrderCreatedNotificationRu(order, { maxTotal: 4096 });
  const mid = await sendTelegramMessage(botToken, chatId, text, msgOpts);
  if (mid == null) return null;
  return { message_id: mid, is_photo: false };
}

export const NOTIFICATION_REGISTRY = {
  order_created: {
    channel: "orders",
    send: sendOrderCreatedTelegram
  },
  order_status_changed: {
    channel: "orders",
    buildText: ({ order }) => formatOrderStatusMessageRu(order)
  }
};

/**
 * @param {{ type: string, order?: object }} payload
 */
export async function notifyClientTelegram(botToken, user, payload) {
  if (!botToken) {
    console.warn("[clientNotifications] пропуск: TELEGRAM_BOT_TOKEN не задан");
    return;
  }
  const { type, order } = payload || {};
  const meta = NOTIFICATION_REGISTRY[type];
  if (!meta) {
    console.warn("[clientNotifications] неизвестный тип уведомления:", type);
    return;
  }

  const prefs = getNotifyPreferences(user);
  if (!prefs[meta.channel]) {
    console.log(
      `[clientNotifications] пропуск (канал выключен: ${meta.channel}) type=${type} user=${user?.id}`
    );
    return;
  }

  const tgId = user?.telegram_id;
  if (!tgId) {
    console.warn("[clientNotifications] нет telegram_id у пользователя:", user?.id);
    return;
  }
  const idStr = String(tgId).trim();
  if (!/^\d+$/.test(idStr)) {
    console.warn("[clientNotifications] telegram_id не число:", idStr);
    return;
  }

  if (typeof meta.send === "function") {
    try {
      const result = await meta.send(botToken, idStr, { order, user });
      if (result?.message_id != null && order?.id) {
        const db = readDb();
        ensureOrderMsgStore(db);
        db[ORDER_TG_MSG_KEY][String(order.id)] = {
          chat_id: idStr,
          message_id: result.message_id,
          is_photo: !!result.is_photo
        };
        writeDb(db);
      }
    } catch (e) {
      console.warn("[clientNotifications] send error:", e?.message || e);
    }
    return;
  }

  let text;
  try {
    text = meta.buildText({ order, user });
  } catch (e) {
    console.warn("[clientNotifications] buildText error:", e?.message || e);
    return;
  }
  if (!text || typeof text !== "string") {
    console.warn("[clientNotifications] пустой текст для type=", type);
    return;
  }

  const msgOpts = { openMiniApp: true };

  if (type === "order_status_changed" && order?.id) {
    const oid = String(order.id);
    const db = readDb();
    ensureOrderMsgStore(db);
    const existing = db[ORDER_TG_MSG_KEY][oid];
    if (existing?.message_id != null && existing?.chat_id) {
      await deleteTelegramMessage(botToken, existing.chat_id, existing.message_id);
    }
  }

  try {
    const mid = await sendTelegramMessage(botToken, idStr, text, msgOpts);
    if (mid != null && type === "order_status_changed" && order?.id) {
      const db = readDb();
      ensureOrderMsgStore(db);
      db[ORDER_TG_MSG_KEY][String(order.id)] = {
        chat_id: idStr,
        message_id: mid,
        is_photo: false
      };
      writeDb(db);
    }
  } catch (e) {
    console.warn("[clientNotifications] ошибка отправки:", e?.message || e);
  }
}
