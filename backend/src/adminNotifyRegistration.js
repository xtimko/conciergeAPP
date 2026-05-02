/**
 * Уведомление админам в Telegram о регистрации клиента (после complete-onboarding).
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

function findUserByEmail(db, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  return db.users?.find((u) => String(u.email || "").trim().toLowerCase() === e) || null;
}

/**
 * @param {string} botToken
 * @param {object} db — readDb() для поиска пригласившего по referred_by
 * @param {object} user — клиент после завершения онбординга
 */
export async function notifyAdminsNewClient(botToken, db, user) {
  const chatIds = parseAdminChatIds();
  if (!botToken || !chatIds.length) return;

  const usernameRaw = String(user.telegram_username || "").replace(/^@/, "");
  const usernameLine = usernameRaw ? `@${escapeHtml(usernameRaw)}` : "";
  const tgId = escapeHtml(String(user.telegram_id || ""));
  const displayName = escapeHtml(
    String(user.full_name || "").trim() ||
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
      "Клиент"
  );
  const publicId = escapeHtml(user.public_id || "—");

  const refByEmail = String(user.referred_by || "").trim();
  const refLines = [];
  if (refByEmail || String(user.referred_by_name || "").trim()) {
    const inviter = findUserByEmail(db, refByEmail);
    const inviterTg = inviter ? escapeHtml(String(inviter.telegram_id || "")) : "";
    const inviterUser = inviter?.telegram_username
      ? `@${escapeHtml(String(inviter.telegram_username).replace(/^@/, ""))}`
      : "";
    const refName = escapeHtml(String(user.referred_by_name || "").trim() || "—");
    refLines.push("Пришёл <b>по рефералу</b>", `👤 ${refName}`);
    if (inviterUser) refLines.push(inviterUser);
    if (inviterTg) refLines.push(`Telegram id пригласившего: <code>${inviterTg}</code>`);
  } else {
    refLines.push("Источник: <b>без реферала</b> (прямой вход).");
  }

  const firstAdmin =
    user.role === "admin"
      ? "\n\n<i>Первый пользователь в базе — назначен администратором.</i>"
      : "";

  const lines = [
    "🆕 <b>Новый клиент</b> (прошёл регистрацию)",
    "",
    ...(usernameLine ? [usernameLine] : []),
    `Telegram id: <code>${tgId}</code>`,
    displayName,
    `Номер: <code>${publicId}</code>`,
    "",
    ...refLines,
    firstAdmin
  ].filter((line) => line !== "");

  const text = lines.join("\n");

  for (const chatId of chatIds) {
    await sendTelegramMessage(botToken, chatId, text);
  }
}
