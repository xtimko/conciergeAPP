/**
 * Низкоуровневый вызов Telegram Bot API (sendMessage).
 * Прокси: TELEGRAM_PROXY в .env (undici ProxyAgent).
 */
import { fetch as undiciFetch, ProxyAgent, FormData, Blob } from "undici";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const _photoFileIdCache = new Map();

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
 * options.photoPath — абсолютный путь к локальному файлу-обложке (надёжнее URL,
 *   потому что Telegram скачивает файл прямо из multipart, а не ходит к нам).
 * options.photoUrl — публичный HTTPS URL картинки (fallback, если photoPath не задан).
 *   Caption имеет лимит 1024 символа — Telegram обрезает длинные тексты.
 */
export async function sendTelegramWelcomeWithWebApp(botToken, chatId, textHtml, webAppUrl, options = {}) {
  if (!botToken || !chatId) return;
  const id = String(chatId).trim();
  if (!id) return;

  const botUsername = String(options?.botUsername || "").replace(/^@/, "").trim();
  const url = String(webAppUrl || "").trim().replace(/\/$/, "");
  const photoUrl = String(options?.photoUrl || "").trim();
  const photoPath = String(options?.photoPath || "").trim();

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
  const caption = String(textHtml || "").slice(0, 1024);
  const fullText = String(textHtml || "").slice(0, 4000);
  const sendPhotoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const sendMessageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const sendTextFallback = async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45_000);
    try {
      const res = await undiciFetch(sendMessageUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: id,
          text: fullText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: replyMarkup
        }),
        signal: ac.signal,
        ...(dispatcher ? { dispatcher } : {})
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (!data?.ok) {
        console.warn("[telegramBotApi] welcome text fallback failed:", data?.description || res.status);
      }
    } catch (e) {
      console.warn("[telegramBotApi] welcome text fallback error:", e?.message || e);
      clearTimeout(timer);
    }
  };

  const cachedFileId = photoPath ? _photoFileIdCache.get(photoPath) : null;

  if (cachedFileId) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45_000);
    try {
      const res = await undiciFetch(sendPhotoUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: id,
          photo: cachedFileId,
          caption,
          parse_mode: "HTML",
          reply_markup: replyMarkup
        }),
        signal: ac.signal,
        ...(dispatcher ? { dispatcher } : {})
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (data?.ok) return;
      console.warn("[telegramBotApi] sendPhoto by file_id failed, will reupload:", data?.description || res.status);
      _photoFileIdCache.delete(photoPath);
    } catch (e) {
      clearTimeout(timer);
      console.warn("[telegramBotApi] sendPhoto by file_id error:", e?.message || e);
      _photoFileIdCache.delete(photoPath);
    }
  }

  if (photoPath) {
    try {
      const buf = await readFile(photoPath);
      const filename = basename(photoPath) || "welcome.png";
      const form = new FormData();
      form.set("chat_id", id);
      form.set("caption", caption);
      form.set("parse_mode", "HTML");
      form.set("reply_markup", JSON.stringify(replyMarkup));
      form.set("photo", new Blob([buf]), filename);

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 60_000);
      const res = await undiciFetch(sendPhotoUrl, {
        method: "POST",
        body: form,
        signal: ac.signal,
        ...(dispatcher ? { dispatcher } : {})
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        const sizes = data?.result?.photo;
        const fileId = Array.isArray(sizes) && sizes.length ? sizes[sizes.length - 1]?.file_id : null;
        if (fileId) _photoFileIdCache.set(photoPath, fileId);
        return;
      }
      console.warn("[telegramBotApi] sendPhoto multipart failed:", data?.description || res.status);
    } catch (e) {
      console.warn("[telegramBotApi] sendPhoto multipart error:", e?.message || e);
    }
  } else if (/^https?:\/\//i.test(photoUrl) && !photoUrl.startsWith("data:")) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 60_000);
    try {
      const res = await undiciFetch(sendPhotoUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: id,
          photo: photoUrl,
          caption,
          parse_mode: "HTML",
          reply_markup: replyMarkup
        }),
        signal: ac.signal,
        ...(dispatcher ? { dispatcher } : {})
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (data?.ok) return;
      console.warn("[telegramBotApi] sendPhoto by URL failed:", data?.description || res.status);
    } catch (e) {
      clearTimeout(timer);
      console.warn("[telegramBotApi] sendPhoto by URL error:", e?.message || e);
    }
  }

  await sendTextFallback();
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
