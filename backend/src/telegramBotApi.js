/**
 * Низкоуровневый вызов Telegram Bot API (sendMessage).
 * Прокси: TELEGRAM_PROXY в .env (undici ProxyAgent).
 */
import { fetch as undiciFetch, ProxyAgent } from "undici";

let _telegramProxyDispatcher = null;
let _telegramProxyForUrl = "";

function getTelegramProxyDispatcher() {
  const proxyUrl = String(process.env.TELEGRAM_PROXY || process.env.TELEGRAM_HTTPS_PROXY || "").trim();
  if (!proxyUrl) {
    _telegramProxyDispatcher = null;
    _telegramProxyForUrl = "";
    return null;
  }
  if (_telegramProxyDispatcher && _telegramProxyForUrl === proxyUrl) {
    return _telegramProxyDispatcher;
  }
  _telegramProxyForUrl = proxyUrl;
  _telegramProxyDispatcher = new ProxyAgent(proxyUrl);
  console.log("[telegramBotApi] запросы к api.telegram.org через TELEGRAM_PROXY (undici)");
  return _telegramProxyDispatcher;
}

export async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId || !text) return;
  const id = String(chatId).trim();
  if (!id) return;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = JSON.stringify({
    chat_id: id,
    text: text.slice(0, 4000),
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
  const dispatcher = getTelegramProxyDispatcher();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45_000);
    const res = await undiciFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {})
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn(
        "[telegramBotApi] sendMessage failed:",
        res.status,
        data?.error_code,
        data?.description || JSON.stringify(data)
      );
      return;
    }
    console.log("[telegramBotApi] сообщение отправлено (chat_id:", id + ")");
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn("[telegramBotApi] sendMessage error:", msg);
    if (!dispatcher && /aborted|fetch failed|timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
      console.warn(
        "[telegramBotApi] подсказка: задай TELEGRAM_PROXY (http://user:pass@host:port) если с VPS нет прямого доступа к api.telegram.org."
      );
    }
  }
}

/**
 * Приветствие после /start: текст + кнопка открытия Mini App.
 * webAppUrl — публичный HTTPS URL фронта (как в BotFather для Web App).
 * options.botUsername — если задан, используется inline-ссылка
 *   `https://t.me/<botUsername>?startapp`, что открывает Mini App в full-screen
 *   режиме (как Menu Button), а не в half-screen (как inline web_app).
 * options.photoUrl — публичный HTTPS URL картинки. Если задан, шлём sendPhoto
 *   с caption + reply_markup (одно сообщение-карточка). Caption имеет лимит
 *   1024 символа — Telegram обрезает длинные тексты.
 */
export async function sendTelegramWelcomeWithWebApp(botToken, chatId, textHtml, webAppUrl, options = {}) {
  if (!botToken || !chatId) return;
  const id = String(chatId).trim();
  if (!id) return;

  const botUsername = String(options?.botUsername || "").replace(/^@/, "").trim();
  const url = String(webAppUrl || "").trim().replace(/\/$/, "");
  const photoUrl = String(options?.photoUrl || "").trim();

  let button = null;
  if (botUsername) {
    button = { text: "Открыть Concierge", url: `https://t.me/${botUsername}?startapp` };
  } else if (/^https:\/\//i.test(url)) {
    button = { text: "Открыть Concierge", web_app: { url } };
  } else {
    console.warn(
      "[telegramBotApi] welcome WebApp: задайте TELEGRAM_BOT_USERNAME (рекомендуется, full-screen) или PUBLIC_APP_URL/FRONTEND_ORIGIN (HTTPS, half-screen fallback)"
    );
    return;
  }

  const replyMarkup = { inline_keyboard: [[button]] };
  const dispatcher = getTelegramProxyDispatcher();

  const usePhoto = /^https?:\/\//i.test(photoUrl) && !photoUrl.startsWith("data:");

  const apiUrl = usePhoto
    ? `https://api.telegram.org/bot${botToken}/sendPhoto`
    : `https://api.telegram.org/bot${botToken}/sendMessage`;

  const payload = usePhoto
    ? {
        chat_id: id,
        photo: photoUrl,
        caption: String(textHtml || "").slice(0, 1024),
        parse_mode: "HTML",
        reply_markup: replyMarkup
      }
    : {
        chat_id: id,
        text: String(textHtml || "").slice(0, 4000),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: replyMarkup
      };

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 60_000);
    const res = await undiciFetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {})
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn(
        "[telegramBotApi] welcome WebApp failed:",
        usePhoto ? "sendPhoto" : "sendMessage",
        data?.description || res.status
      );
      if (usePhoto) {
        const fallbackBody = JSON.stringify({
          chat_id: id,
          text: String(textHtml || "").slice(0, 4000),
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: replyMarkup
        });
        const ac2 = new AbortController();
        const t2 = setTimeout(() => ac2.abort(), 45_000);
        const res2 = await undiciFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: fallbackBody,
          signal: ac2.signal,
          ...(dispatcher ? { dispatcher } : {})
        });
        clearTimeout(t2);
        const data2 = await res2.json().catch(() => ({}));
        if (!data2?.ok) {
          console.warn("[telegramBotApi] welcome WebApp text fallback failed:", data2?.description || res2.status);
        }
      }
    }
  } catch (e) {
    console.warn("[telegramBotApi] welcome WebApp error:", e?.message || e);
  }
}

/**
 * Фото в чат (URL должен быть доступен серверам Telegram — https/http).
 * Не подходит: data:image/... (отправь только текст или храни файл по публичному URL).
 */
export async function sendTelegramPhoto(botToken, chatId, photoUrl, caption) {
  if (!botToken || !chatId || !photoUrl) return false;
  const id = String(chatId).trim();
  if (!id) return false;
  const raw = String(photoUrl).trim();
  if (raw.startsWith("data:") || !/^https?:\/\//i.test(raw)) {
    return false;
  }
  const cap = String(caption || "").slice(0, 1024);
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const body = JSON.stringify({
    chat_id: id,
    photo: raw,
    caption: cap || undefined,
    parse_mode: "HTML",
    disable_notification: false
  });
  const dispatcher = getTelegramProxyDispatcher();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 60_000);
    const res = await undiciFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {})
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn(
        "[telegramBotApi] sendPhoto failed:",
        res.status,
        data?.error_code,
        data?.description || JSON.stringify(data)
      );
      return false;
    }
    console.log("[telegramBotApi] фото отправлено (chat_id:", id + ")");
    return true;
  } catch (e) {
    console.warn("[telegramBotApi] sendPhoto error:", e?.message || e);
    return false;
  }
}
