/**
 * Уведомления рефереру в Telegram (регистрация приглашённого, заказ друга, начисление после доставки).
 */
import { sendTelegramMessage } from "./telegramBotApi.js";
import { escapeHtml } from "./notificationMessages.js";
import { findUserByClientEmail } from "./telegramNotify.js";
import { getNotifyPreferences } from "./clientNotifications.js";

function wantsReferralNotifications(user) {
  const p = getNotifyPreferences(user);
  return p.referrals !== false;
}

function inviteeDisplayName(invitee) {
  return (
    String(invitee.full_name || "").trim() ||
    [invitee.first_name, invitee.last_name].filter(Boolean).join(" ").trim() ||
    "Приглашённый"
  );
}

/**
 * Реферер: приглашённый завершил регистрацию (онбординг).
 */
export async function notifyReferrerInviteeRegistered(botToken, db, invitee) {
  if (!botToken || !invitee) return;
  const refEmail = String(invitee.referred_by || "").trim().toLowerCase();
  if (!refEmail) return;

  const referrer = db.users?.find(
    (u) => String(u.email || "").trim().toLowerCase() === refEmail
  );
  if (!referrer?.telegram_id || referrer.id === invitee.id) return;
  if (!wantsReferralNotifications(referrer)) return;

  const name = escapeHtml(inviteeDisplayName(invitee));
  const un = String(invitee.telegram_username || "").replace(/^@/, "");
  const unLine = un ? `\n@${escapeHtml(un)}` : "";

  const text = [
    "<b>По вашей ссылке зарегистрировался человек</b>",
    "",
    `${name}${unLine}`,
    "",
    "За каждый <b>доставленный</b> заказ приглашённого вам будут начисляться баллы.",
    "Мы напишем, когда друг оформит заказ."
  ].join("\n");

  await sendTelegramMessage(botToken, String(referrer.telegram_id).trim(), text);
}

/**
 * Реферер: приглашённый оформил заказ (админ создал заказ с бонусами).
 */
export async function notifyReferrerFriendOrdered(botToken, db, order) {
  if (!botToken || !order) return;
  const refBonus = Number(order.referrer_bonus || 0);
  const referralBonus = Number(order.referral_bonus || 0);
  if (refBonus <= 0 && referralBonus <= 0) return;

  const refEmail = String(order.referrer_email || "").trim();
  if (!refEmail) return;

  const referrer = findUserByClientEmail(db, refEmail);
  if (!referrer?.telegram_id) return;
  if (!wantsReferralNotifications(referrer)) return;

  const oid = escapeHtml(order.id || "—");
  const item = escapeHtml(String(order.item_name || "Заказ").trim());
  const text = [
    "<b>Ваш друг оформил заказ</b>",
    "",
    `${item}`,
    `<code>${oid}</code>`,
    "",
    "Баллы начислим на ваш счёт после доставки заказа."
  ].join("\n");

  await sendTelegramMessage(botToken, String(referrer.telegram_id).trim(), text);
}

/**
 * Реферер: после доставки заказа друга — сколько баллов пришло на счёт.
 */
export async function notifyReferrerDeliveryBonus(botToken, db, order) {
  if (!botToken || !order) return;
  const refBonus = Number(order.referrer_bonus || 0);
  if (refBonus <= 0) return;

  const refEmail = String(order.referrer_email || "").trim();
  if (!refEmail) return;

  const referrer = findUserByClientEmail(db, refEmail);
  if (!referrer?.telegram_id) return;
  if (!wantsReferralNotifications(referrer)) return;

  const oid = escapeHtml(order.id || "—");
  const n = Math.round(refBonus);
  const text = [
    "<b>Заказ друга доставлен</b>",
    "",
    `<code>${oid}</code>`,
    "",
    `На ваш счёт зачислено <b>${n}</b> баллов за этот заказ.`,
    "Спасибо, что делитесь Concierge с друзьями."
  ].join("\n");

  await sendTelegramMessage(botToken, String(referrer.telegram_id).trim(), text);
}
