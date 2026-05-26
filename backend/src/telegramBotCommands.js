/**
 * Inline-меню бота.
 *
 * Архитектура (как у топовых ботов):
 * - В ответ на /start или команду — бот показывает одно сообщение-меню
 *   с inline-кнопками под ним.
 * - Нажатия на кнопки приходят как `callback_query` — мы РЕДАКТИРУЕМ
 *   то же сообщение через editMessageText. Чат не засоряется — клиент
 *   видит одно «живое» меню, которое меняет содержимое.
 * - Кнопка «Открыть Concierge» — это url-кнопка (t.me/<bot>?startapp),
 *   она просто открывает Mini App.
 *
 * Совместимость со старыми клиентами: если у клиента ещё висит старая
 * ReplyKeyboard (с прошлой версии бота), при нажатии на её кнопку он
 * получит обычное сообщение с inline-меню + reply_markup remove_keyboard
 * чтобы скрыть старую клавиатуру.
 */
import { escapeHtml, ORDER_STATUS_TITLE_RU } from "./notificationMessages.js";

/** Callback-data для секций меню. */
export const CB = {
  MAIN:     "menu:main",
  PROFILE:  "menu:profile",
  ORDERS:   "menu:orders",
  REFERRAL: "menu:referral",
};

/* ────────────────── ВСПОМОГАТЕЛЬНОЕ ────────────────── */

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
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

function buildOpenAppButton(botUsername, appUrl) {
  const u = String(botUsername ?? "").replace(/^@/, "").trim();
  if (u) return { text: "Открыть Concierge", url: `https://t.me/${u}?startapp` };
  const url = String(appUrl ?? "").trim();
  if (/^https:\/\//i.test(url)) return { text: "Открыть Concierge", url };
  return null;
}

/* ────────────────── INLINE-КЛАВИАТУРЫ ────────────────── */

/** Главное меню. */
export function buildMainMenu(botUsername, appUrl) {
  const rows = [
    [{ text: "◐ Профиль",               callback_data: CB.PROFILE  }],
    [{ text: "▤ Мои заказы",            callback_data: CB.ORDERS   }],
    [{ text: "◇ Реферальная программа", callback_data: CB.REFERRAL }],
  ];
  const openBtn = buildOpenAppButton(botUsername, appUrl);
  if (openBtn) rows.push([openBtn]);
  return { inline_keyboard: rows };
}

/** Подменю: кнопка «← Меню» + «Открыть Concierge». */
function buildBackMenu(botUsername, appUrl) {
  const rows = [[{ text: "← Меню", callback_data: CB.MAIN }]];
  const openBtn = buildOpenAppButton(botUsername, appUrl);
  if (openBtn) rows.push([openBtn]);
  return { inline_keyboard: rows };
}

/* ────────────────── РЕНДЕРЫ КОНТЕНТА ────────────────── */

function renderMainGreeting(user) {
  const name = user?.first_name || user?.full_name?.split(" ")[0] || "";

  // Зарегистрированный — минималистично, как заголовок раздела
  if (user && name) {
    return "<b>≡ Меню</b>";
  }

  // Не зарегистрирован — большой welcome (первое впечатление о сервисе)
  return (
    "<b>Concierge</b> — Ваш персональный сервис 24/7\n\n" +
    "Выкупим, найдём и доставим любой товар под любой случай.\n\n" +
    "<b>Внутри приложения:</b>\n" +
    "• личный кабинет клиента\n" +
    "• отслеживание заказов\n" +
    "• реферальная программа: баллы за друзей\n\n" +
    "Откройте приложение, чтобы начать."
  );
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
    "<b>◐ Профиль</b>",
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
  if (cur === "RUB") return `${fmt} ₽`;
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
    return "<b>▤ Мои заказы</b>\n\nАктивных заказов нет.";
  }

  const lines = [`<b>▤ Мои заказы</b>  <i>(${active.length} активных)</i>`, ""];

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

  // Та же логика что в /api/referrals/stats — по email клиента, не по id.
  // В data.json поле `referred_by` хранит EMAIL пригласившего.
  const myEmail = String(user.email ?? "").trim();
  const invites = myEmail
    ? (db.users ?? []).filter((u) => String(u.referred_by ?? "") === myEmail)
    : [];
  const friendsCount = invites.length;

  // Баллы заработанные от друзей: сумма referrer_bonus по доставленным заказам,
  // где referrer_email = email текущего пользователя.
  const bonusFromFriends = myEmail
    ? (db.orders ?? [])
        .filter((o) =>
          o.status === "delivered" &&
          String(o.referrer_email ?? "") === myEmail
        )
        .reduce((s, o) => s + Number(o.referrer_bonus || 0), 0)
    : 0;

  const balance = Number(user.bonus_balance ?? 0).toLocaleString("ru-RU");

  const lines = [
    "<b>◇ Реферальная программа</b>",
    "",
    "Приглашайте друзей — получайте баллы за каждого.",
  ];

  if (refLink) {
    lines.push("", "Ваша ссылка:");
    lines.push(`<code>${escapeHtml(refLink)}</code>`);
  }

  lines.push(
    "",
    `Приглашено друзей: <b>${friendsCount}</b>`,
    `Получено баллов от друзей: <b>${bonusFromFriends.toLocaleString("ru-RU")}</b>`,
    `Текущий баланс: <b>${balance}</b>`
  );

  return lines.join("\n");
}

/* ────────────────── ПОСТРОЕНИЕ СЕКЦИИ ────────────────── */

/**
 * По callback_data строит контент + клавиатуру.
 * Возвращает { text, replyMarkup } или null если data не наша.
 * Если пользователь не зарегистрирован — возвращает сообщение об этом.
 */
function buildSection(data, db, telegramId, opts) {
  const { botUsername, appUrl } = opts;

  if (data === CB.MAIN) {
    const user = findUserByTelegramId(db, telegramId);
    return {
      text: renderMainGreeting(user),
      replyMarkup: buildMainMenu(botUsername, appUrl),
    };
  }

  const user = findUserByTelegramId(db, telegramId);
  if (!user) {
    return {
      text: "Вы ещё не зарегистрированы в Concierge.\n\nОткройте приложение, чтобы создать аккаунт.",
      replyMarkup: buildBackMenu(botUsername, appUrl),
    };
  }

  if (data === CB.PROFILE) {
    return { text: renderProfile(user), replyMarkup: buildBackMenu(botUsername, appUrl) };
  }
  if (data === CB.ORDERS) {
    return { text: renderOrders(user, db), replyMarkup: buildBackMenu(botUsername, appUrl) };
  }
  if (data === CB.REFERRAL) {
    return { text: renderReferral(user, db, botUsername), replyMarkup: buildBackMenu(botUsername, appUrl) };
  }

  return null;
}

/* ────────────────── ПУБЛИЧНЫЕ ХЕНДЛЕРЫ ────────────────── */

/**
 * Главный welcome — для /start. Возвращает { text, replyMarkup }.
 */
export function buildWelcome(db, telegramId, opts) {
  const user = findUserByTelegramId(db, telegramId);
  const text = user
    ? renderMainGreeting(user)
    : "<b>Concierge</b> — премиум-сервис покупок под заказ.\n\n" +
      "Откройте приложение, чтобы начать. После регистрации это меню покажет ваш профиль и заказы.";
  return {
    text,
    replyMarkup: buildMainMenu(opts.botUsername, opts.appUrl),
  };
}

/**
 * Обработка callback_query от inline-кнопок.
 * Возвращает { text, replyMarkup } для editMessageText, или null.
 */
export function handleCallbackQuery(callbackQuery, db, opts = {}) {
  const data = String(callbackQuery?.data ?? "").trim();
  const fromId = callbackQuery?.from?.id;
  if (!data || !fromId) return null;
  return buildSection(data, db, fromId, opts);
}

/* ────────────────── СОВМЕСТИМОСТЬ СО СТАРЫМИ КЛИЕНТАМИ ────────────────── */

/**
 * Старые тексты кнопок (ReplyKeyboard). У клиентов, которые видели прошлую
 * версию бота, эта клавиатура может ещё висеть. Если нажмут — отвечаем
 * новой inline-плашкой + просьбой использовать кнопки под сообщением.
 */
const LEGACY_KB_TEXTS = new Set([
  "◆ Мой профиль",
  "◆ Мои заказы",
  "◆ Реферальная программа",
  "→ Открыть приложение",
  "👤 Мой профиль",
  "📦 Мои заказы",
  "🎁 Реферальная программа",
  "🚀 Открыть приложение",
]);

/**
 * Сообщение от клиента (не /start). Возвращает:
 *  - { text, replyMarkup, removeReplyKeyboard: true } — для старой ReplyKeyboard
 *  - { text, replyMarkup } — для команд /profile, /orders, /referral, /help
 *  - null — игнорируем (любой другой текст не наш)
 */
export function handleBotMessage(message, db, opts = {}) {
  const raw = (message?.text ?? "").trim();
  if (!raw || !message?.from?.id) return null;

  // Старая ReplyKeyboard → переводим клиента на новое inline-меню
  if (LEGACY_KB_TEXTS.has(raw)) {
    const welcome = buildWelcome(db, message.from.id, opts);
    return {
      ...welcome,
      removeReplyKeyboard: true,
    };
  }

  // Текстовые команды
  const cmd = raw.replace(/@\S+/, "").trim().toLowerCase();
  if (cmd === "/profile") {
    return buildSection(CB.PROFILE, db, message.from.id, opts);
  }
  if (cmd === "/orders") {
    return buildSection(CB.ORDERS, db, message.from.id, opts);
  }
  if (cmd === "/referral") {
    return buildSection(CB.REFERRAL, db, message.from.id, opts);
  }
  if (cmd === "/help" || cmd === "/menu") {
    return buildWelcome(db, message.from.id, opts);
  }

  return null;
}
