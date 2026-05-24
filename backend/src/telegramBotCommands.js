/**
 * Обработка команд бота и кнопок постоянной клавиатуры.
 * Поддерживает: /profile, /orders, /referral, /help
 * и соответствующие кнопки ReplyKeyboard.
 */
import { escapeHtml, ORDER_STATUS_TITLE_RU } from "./notificationMessages.js";

export const KB_PROFILE  = "👤 Мой профиль";
export const KB_ORDERS   = "📦 Мои заказы";
export const KB_REFERRAL = "🎁 Реферальная программа";
export const KB_OPEN_APP = "🚀 Открыть приложение";

/** ReplyKeyboardMarkup, который остаётся внизу чата у клиента. */
export function buildClientKeyboard() {
  return {
    keyboard: [
      [KB_PROFILE,  KB_ORDERS],
      [KB_REFERRAL, KB_OPEN_APP]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
  } catch {
    return "—";
  }
}

function findUserByTelegramId(db, telegramId) {
  const tid = String(telegramId ?? "").trim();
  if (!tid) return null;
  return db.users.find(u => String(u.telegram_id ?? "") === tid) ?? null;
}

function renderProfile(user) {
  const name = escapeHtml(
    user.full_name ||
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
    "Клиент"
  );
  const city    = escapeHtml(user.city || "—");
  const balance = Number(user.bonus_balance ?? 0).toLocaleString("ru-RU");
  const pid     = escapeHtml(user.public_id || "—");
  const since   = formatDate(user.created_date);

  const lines = [
    "👤 <b>Ваш профиль</b>",
    "",
    `Имя: <b>${name}</b>`,
    `Город: <b>${city}</b>`,
    `Баллы: <b>${balance}</b>`,
    `ID: <code>${pid}</code>`,
    `С нами с: ${since}`,
  ];

  if (!user.profile_completed) {
    lines.push("", "⚠️ Профиль не заполнен. Откройте приложение, чтобы завершить регистрацию.");
  }

  return lines.join("\n");
}

const ACTIVE_STATUSES = new Set([
  "pending", "confirmed", "sourcing", "shipping", "awaiting_pickup"
]);

function formatPrice(order) {
  const n = Number(order.price ?? 0);
  if (!Number.isFinite(n) || n === 0) return "";
  const fmt = n.toLocaleString("ru-RU");
  const cur = String(order.currency || "RUB").toUpperCase();
  if (cur === "RUB") return `${fmt} ₽`;
  if (cur === "USD") return `$${fmt}`;
  if (cur === "EUR") return `€${fmt}`;
  return `${fmt} ${cur}`;
}

function renderOrders(user, db) {
  const tid   = String(user.telegram_id ?? "").trim();
  const email = String(user.email ?? "").trim();

  const active = (db.orders ?? []).filter(o => {
    if (!ACTIVE_STATUSES.has(o.status)) return false;
    if (tid   && String(o.client_telegram_id ?? "") === tid)   return true;
    if (email && String(o.client_email        ?? "") === email) return true;
    return false;
  });

  if (!active.length) {
    return "📦 <b>Ваши заказы</b>\n\nАктивных заказов нет.";
  }

  const lines = [`📦 <b>Активные заказы (${active.length})</b>`, ""];

  for (const o of active.slice(0, 8)) {
    const name  = escapeHtml(String(o.item_name ?? "Заказ").trim());
    const size  = o.item_size ? ` – ${escapeHtml(String(o.item_size).trim())}` : "";
    const oid   = escapeHtml(o.id ?? "—");
    const st    = escapeHtml(ORDER_STATUS_TITLE_RU[o.status] ?? o.status);
    const price = formatPrice(o);

    lines.push(`<b>${name}${size}</b>`);
    lines.push(`<code>${oid}</code>  ${st}`);
    if (price) lines.push(price);
    lines.push("");
  }

  if (active.length > 8) {
    lines.push(`…ещё ${active.length - 8}. Подробности — в приложении.`);
  }

  return lines.join("\n").trimEnd();
}

function renderReferral(user, db, botUsername) {
  const token   = String(user.referral_link_token ?? "").trim();
  const refLink = token && botUsername
    ? `https://t.me/${botUsername}?start=ref_${token}`
    : null;

  const uid          = String(user.id ?? "").trim();
  const friendsCount = uid
    ? (db.users ?? []).filter(u => String(u.referred_by ?? "") === uid).length
    : 0;
  const balance = Number(user.bonus_balance ?? 0).toLocaleString("ru-RU");

  const lines = [
    "🎁 <b>Реферальная программа</b>",
    "",
    "Приглашайте друзей — получайте баллы за каждого!",
  ];

  if (refLink) {
    lines.push("", "Ваша ссылка:");
    lines.push(`<code>${escapeHtml(refLink)}</code>`);
  }

  lines.push(
    "",
    `Приглашено друзей: <b>${friendsCount}</b>`,
    `Баллы: <b>${balance}</b>`
  );

  return lines.join("\n");
}

/**
 * Обработать входящее сообщение (не /start).
 * @param {object} message  Telegram message
 * @param {object} db       текущий data.json
 * @param {{ botUsername?: string, appUrl?: string }} opts
 * @returns {{ text: string } | null}
 */
export function handleBotMessage(message, db, opts = {}) {
  const raw = (message?.text ?? "").trim();
  if (!raw || !message?.from?.id) return null;

  // Отрезаем @botname суффикс у команд
  const cmd   = raw.replace(/@\S+/, "").trim();
  const lower = cmd.toLowerCase();

  const isProfile  = lower === "/profile"  || raw === KB_PROFILE;
  const isOrders   = lower === "/orders"   || raw === KB_ORDERS;
  const isReferral = lower === "/referral" || raw === KB_REFERRAL;
  const isOpenApp  = raw === KB_OPEN_APP;
  const isHelp     = lower === "/help";

  if (!isProfile && !isOrders && !isReferral && !isOpenApp && !isHelp) return null;

  if (isOpenApp) {
    const u   = String(opts.botUsername ?? "").trim();
    const url = u
      ? `https://t.me/${u}?startapp`
      : String(opts.appUrl ?? "").trim();
    return {
      text: url
        ? `🚀 <a href="${escapeHtml(url)}">Открыть Concierge</a>`
        : "Откройте приложение через меню бота."
    };
  }

  if (isHelp) {
    return {
      text: [
        "<b>Доступные команды:</b>",
        "",
        "/profile — профиль и баллы",
        "/orders — активные заказы",
        "/referral — реферальная программа",
        "/help — это сообщение",
      ].join("\n")
    };
  }

  const user = findUserByTelegramId(db, message.from.id);
  if (!user) {
    return {
      text: "Вы ещё не зарегистрированы в Concierge.\n\nОткройте приложение, чтобы создать аккаунт."
    };
  }

  if (isProfile)  return { text: renderProfile(user) };
  if (isOrders)   return { text: renderOrders(user, db) };
  if (isReferral) return { text: renderReferral(user, db, opts.botUsername) };

  return null;
}
