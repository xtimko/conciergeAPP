// @ts-nocheck
const REF_PREFIX = 'ref_';

export function compactRefToken(user) {
  const linkToken = String(user?.referral_link_token || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  if (linkToken) return linkToken;
  const fallback = String(user?.referral_code || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  if (fallback) return fallback;
  return String(user?.id || '').trim();
}

/** Реферальная ссылка для Mini App (нужен username бота без @). */
export function buildReferralLink(user, telegramBotUsername) {
  const bot = String(telegramBotUsername || '').replace(/^@/, '').trim();
  const token = compactRefToken(user);
  if (!bot || !token) return '';
  return `https://t.me/${bot}?startapp=${REF_PREFIX}${token}`;
}
