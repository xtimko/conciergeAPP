/**
 * Система уведомлений клиенту в Telegram: типы, каналы, настройки пользователя.
 *
 * Каналы (notify_preferences):
 * - orders    — заказы (создание, смена статуса)
 * - marketing — акции, новости (пока заглушка для будущих рассылок)
 * - system    — важные системные (безопасность, сбои; пока не используется)
 *
 * Новый тип: добавь в NOTIFICATION_REGISTRY и вызови notifyClientTelegram(...).
 */
import { sendTelegramMessage, sendTelegramPhoto } from "./telegramBotApi.js";
import {
  formatOrderCreatedNotificationRu,
  formatOrderStatusMessageRu,
  formatBonusDeliveredClientRu,
  formatBonusDeliveredReferrerRu
} from "./notificationMessages.js";

/** Значения по умолчанию для новых и существующих пользователей */
export const DEFAULT_NOTIFY_PREFERENCES = {
  orders: true,
  marketing: false,
  system: true
};

/** Каналы и человекочитаемые id (для API / настроек) */
export const NOTIFY_CHANNELS = ["orders", "marketing", "system"];

export function getNotifyPreferences(user) {
  const raw = user?.notify_preferences;
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_NOTIFY_PREFERENCES };
  }
  return {
    orders: typeof raw.orders === "boolean" ? raw.orders : DEFAULT_NOTIFY_PREFERENCES.orders,
    marketing:
      typeof raw.marketing === "boolean" ? raw.marketing : DEFAULT_NOTIFY_PREFERENCES.marketing,
    system: typeof raw.system === "boolean" ? raw.system : DEFAULT_NOTIFY_PREFERENCES.system
  };
}

/** Слияние PATCH с текущими prefs (только валидные ключи) */
export function mergeNotifyPreferences(currentUser, patch) {
  const cur = getNotifyPreferences(currentUser);
  if (!patch || typeof patch !== "object") return cur;
  return {
    orders: typeof patch.orders === "boolean" ? patch.orders : cur.orders,
    marketing: typeof patch.marketing === "boolean" ? patch.marketing : cur.marketing,
    system: typeof patch.system === "boolean" ? patch.system : cur.system
  };
}

/**
 * Одно сообщение: фото с подписью (если есть публичный URL), иначе только текст.
 * Подпись к фото ≤ 1024 символов (лимит Telegram).
 */
async function sendOrderCreatedTelegram(botToken, chatId, { order }) {
  const raw = String(order?.image_url || "").trim();
  const hasPublicPhoto = raw && /^https?:\/\//i.test(raw);

  if (hasPublicPhoto) {
    const caption = formatOrderCreatedNotificationRu(order, { maxTotal: 1024 });
    const ok = await sendTelegramPhoto(botToken, chatId, raw, caption);
    if (ok) return;
    console.warn("[clientNotifications] sendPhoto не удался — отправляем текстом");
  }

  const text = formatOrderCreatedNotificationRu(order, { maxTotal: 4096 });
  await sendTelegramMessage(botToken, chatId, text);
}

/**
 * Реестр уведомлений: type → канал + сборка текста или кастомная отправка.
 * `send` — async (botToken, chatId, { order, user }) для сложных кейсов (фото + текст).
 */
export const NOTIFICATION_REGISTRY = {
  order_created: {
    channel: "orders",
    send: sendOrderCreatedTelegram
  },
  order_status_changed: {
    channel: "orders",
    buildText: ({ order }) => formatOrderStatusMessageRu(order)
  },
  /** Начисление/списание баллов у клиента заказа при статусе «доставлен» */
  bonus_delivered_client: {
    channel: "orders",
    buildText: ({ extra }) => formatBonusDeliveredClientRu(extra)
  },
  /** Баллы пригласившему за доставленный заказ приглашённого */
  bonus_delivered_referrer: {
    channel: "orders",
    buildText: ({ extra }) => formatBonusDeliveredReferrerRu(extra)
  }
};

/**
 * После applyOrderBonusesIfNeeded: уведомить клиента и реферера (если есть начисления).
 */
export function notifyDeliveredBonusesTelegram(botToken, db, order, bonusResult) {
  if (!botToken || !bonusResult || !order) return;
  const { clientDelta, referrerDelta } = bonusResult;

  if (clientDelta !== 0 && order.client_email) {
    const u = db.users.find((x) => String(x.email || "").trim() === String(order.client_email).trim());
    if (u) {
      void notifyClientTelegram(botToken, u, {
        type: "bonus_delivered_client",
        extra: { delta: clientDelta, orderId: order.id }
      }).catch((e) => console.warn("[clientNotifications] bonus client:", e?.message || e));
    }
  }

  if (referrerDelta > 0 && order.referrer_email) {
    const r = db.users.find((x) => String(x.email || "").trim() === String(order.referrer_email).trim());
    if (r) {
      void notifyClientTelegram(botToken, r, {
        type: "bonus_delivered_referrer",
        extra: { delta: referrerDelta, orderId: order.id }
      }).catch((e) => console.warn("[clientNotifications] bonus referrer:", e?.message || e));
    }
  }
}

/**
 * Отправить уведомление клиенту, если включён канал и есть валидный telegram_id.
 * @param {object} user — документ пользователя из db.users
 * @param {{ type: string, order?: object, extra?: object }} payload — extra для bonus_* и др.
 */
export async function notifyClientTelegram(botToken, user, payload) {
  if (!botToken) {
    console.warn("[clientNotifications] пропуск: TELEGRAM_BOT_TOKEN не задан");
    return;
  }
  const { type, order, extra } = payload || {};
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
      await meta.send(botToken, idStr, { order, user });
    } catch (e) {
      console.warn("[clientNotifications] send error:", e?.message || e);
    }
    return;
  }

  let text;
  try {
    text = meta.buildText({ order, user, extra });
  } catch (e) {
    console.warn("[clientNotifications] buildText error:", e?.message || e);
    return;
  }
  if (!text || typeof text !== "string") {
    console.warn("[clientNotifications] пустой текст для type=", type);
    return;
  }

  try {
    await sendTelegramMessage(botToken, idStr, text);
  } catch (e) {
    console.warn("[clientNotifications] ошибка отправки:", e?.message || e);
  }
}
