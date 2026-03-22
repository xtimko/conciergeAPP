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
import { sendTelegramMessage } from "./telegramBotApi.js";
import {
  formatOrderCreatedMessageRu,
  formatOrderStatusMessageRu
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
 * Реестр уведомлений: type → канал + сборка текста.
 * channel: какой флаг в notify_preferences проверять.
 */
export const NOTIFICATION_REGISTRY = {
  order_created: {
    channel: "orders",
    buildText: ({ order }) => formatOrderCreatedMessageRu(order)
  },
  order_status_changed: {
    channel: "orders",
    buildText: ({ order }) => formatOrderStatusMessageRu(order)
  }
  // Примеры на будущее:
  // promo_broadcast: { channel: "marketing", buildText: ({ text }) => text },
  // system_alert: { channel: "system", buildText: ({ text }) => text },
};

/**
 * Отправить уведомление клиенту, если включён канал и есть валидный telegram_id.
 * @param {object} user — документ пользователя из db.users
 * @param {{ type: string, order?: object }} payload — type из NOTIFICATION_REGISTRY; order для заказных типов
 */
export function notifyClientTelegram(botToken, user, payload) {
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

  sendTelegramMessage(botToken, idStr, text).catch((e) => {
    console.warn("[clientNotifications] ошибка отправки:", e?.message || e);
  });
}
