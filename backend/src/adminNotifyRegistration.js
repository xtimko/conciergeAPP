/**
 * Уведомление админам в Telegram о первой регистрации клиента (POST /api/auth/telegram).
 * Те же чаты, что и для сводок: TELEGRAM_ADMIN_CHAT_IDS (или TELEGRAM_ADMIN_CHAT_ID).
 */
import { sendTelegramMessage } from "./telegramBotApi.js";
import { escapeHtml } from "./notificationMessages.js";

function parseAdminChatIds() {
  const raw = String(
    process.env.TELEGRAM_ADMIN_CHAT_IDS || process.env.TELEGRAM_ADMIN_CHAT_ID || ""
  ).trim();
  return raw
    ? raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

/**
 * @param {string} botToken
 * @param {object} user — пользователь после applyReferralToNewUser (referred_by, referred_by_name)
 */
export async function notifyAdminsNewClient(botToken, user) {
  const chatIds = parseAdminChatIds();
  if (!botToken || !chatIds.length) return;

  const displayName = escapeHtml(
    String(user.full_name || "").trim() ||
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
      "Клиент"
  );
  const usernameRaw = String(user.telegram_username || "").replace(/^@/, "");
  const usernamePart = usernameRaw
    ? ` @${escapeHtml(usernameRaw)}`
    : "";
  const publicId = escapeHtml(user.public_id || "—");
  const tgId = escapeHtml(String(user.telegram_id || ""));

  let refBlock;
  if (String(user.referred_by || "").trim() || String(user.referred_by_name || "").trim()) {
    const refName = escapeHtml(String(user.referred_by_name || "").trim() || "—");
    const refKey = escapeHtml(String(user.referred_by || "").trim());
    refBlock = `Пришёл <b>по рефералу</b>\n👤 ${refName}`;
    if (refKey) refBlock += `\n<code>${refKey}</code>`;
  } else {
    refBlock = "Источник: <b>без реферала</b> (прямой вход).";
  }

  const firstAdmin =
    user.role === "admin"
      ? "\n\n<i>Первый пользователь в базе — назначен администратором.</i>"
      : "";

  const text = [
    "🆕 <b>Новый клиент</b>",
    "",
    `${displayName}${usernamePart}`,
    `Номер: <code>${publicId}</code>`,
    `Telegram id: <code>${tgId}</code>`,
    "",
    refBlock,
    firstAdmin
  ].join("\n");

  for (const chatId of chatIds) {
    await sendTelegramMessage(botToken, chatId, text);
  }
}
