/**
 * Низкоуровневый вызов Telegram Bot API (sendMessage).
 * Прокси: TELEGRAM_PROXY в .env (undici ProxyAgent).
 */
import { Blob } from "node:buffer";
import { fetch as undiciFetch, ProxyAgent, FormData } from "undici";

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

const MAX_TELEGRAM_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * Скачать картинку с этого сервера: сначала через TELEGRAM_PROXY (часто CDN из РФ), затем напрямую.
 * @returns {Promise<{ buffer: Buffer, contentType: string } | null>}
 */
async function fetchImageForTelegramUpload(imageUrl, maxBytes = MAX_TELEGRAM_PHOTO_BYTES) {
  const raw = String(imageUrl || "").trim();
  if (!/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return null;

  const attempts = [];
  const dispatcher = getTelegramProxyDispatcher();
  if (dispatcher) attempts.push({ dispatcher, label: "proxy" });
  attempts.push({ dispatcher: null, label: "direct" });

  // Многие хостинги (Pinterest, StockX, Telegram CDN и пр.) проверяют Referer.
  // Сначала пробуем с Referer = origin картинки, затем без него.
  let originReferer = "";
  try {
    const u = new URL(raw);
    originReferer = `${u.protocol}//${u.host}/`;
  } catch { /* noop */ }

  const refererVariants = originReferer ? [originReferer, ""] : [""];

  for (const { dispatcher: d, label } of attempts) {
    let success = null;
    for (const referer of refererVariants) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 45_000);
      const res = await undiciFetch(raw, {
        method: "GET",
        redirect: "follow",
        signal: ac.signal,
        headers: {
          Accept: "image/*,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; ConciergeBackend/1.0)",
          ...(referer ? { Referer: referer } : {})
        },
        ...(d ? { dispatcher: d } : {})
      });
      clearTimeout(timer);
      if (!res.ok) {
        console.warn(`[telegramBotApi] fetch image (${label}): HTTP ${res.status}`);
        continue;
      }
      const len = res.headers.get("content-length");
      if (len && Number(len) > maxBytes) {
        console.warn("[telegramBotApi] fetch image: Content-Length too large");
        continue;
      }
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > maxBytes || buf.length === 0) continue;
      let ct = (res.headers.get("content-type") || "").split(";")[0].trim();
      if (!/^image\//i.test(ct)) {
        if (buf[0] === 0xff && buf[1] === 0xd8) ct = "image/jpeg";
        else if (buf[0] === 0x89 && buf[1] === 0x50) ct = "image/png";
        else if (buf[0] === 0x47 && buf[1] === 0x49) ct = "image/gif";
        else if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49) ct = "image/webp";
        else ct = "image/jpeg";
      }
      success = { buffer: buf, contentType: ct };
      break;
    } catch (e) {
      console.warn(`[telegramBotApi] fetch image (${label}/${referer ? "ref" : "no-ref"}):`, e?.message || e);
    }
    }
    if (success) return success;
  }
  return null;
}

function guessPhotoFilenameFromUrl(imageUrl, contentType) {
  try {
    const path = new URL(imageUrl).pathname.split("/").pop() || "";
    if (/\.(jpe?g|png|gif|webp)$/i.test(path)) return path.slice(0, 128);
  } catch {
    /* ignore */
  }
  const ct = String(contentType || "");
  if (/png/i.test(ct)) return "photo.png";
  if (/gif/i.test(ct)) return "photo.gif";
  if (/webp/i.test(ct)) return "photo.webp";
  return "photo.jpg";
}

/**
 * sendPhoto с телом файла, если по URL Telegram скачать не может.
 * @returns {Promise<number|null>}
 */
async function sendTelegramPhotoMultipart(botToken, chatId, buffer, filename, caption, replyMarkup) {
  if (!botToken || !chatId || !buffer?.length) return null;
  const id = String(chatId).trim();
  if (!id) return null;
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const dispatcher = getTelegramProxyDispatcher();
  const form = new FormData();
  form.set("chat_id", id);
  const cap = String(caption || "").slice(0, 1024);
  if (cap) form.set("caption", cap);
  form.set("parse_mode", "HTML");
  if (replyMarkup) form.set("reply_markup", JSON.stringify(replyMarkup));
  form.append("photo", new Blob([buffer]), filename);
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 120_000);
    const res = await undiciFetch(url, {
      method: "POST",
      body: form,
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {})
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn(
        "[telegramBotApi] sendPhoto multipart failed:",
        res.status,
        data?.error_code,
        data?.description || JSON.stringify(data)
      );
      return null;
    }
    console.log("[telegramBotApi] фото отправлено multipart (chat_id:", id + ")");
    return data.result?.message_id ?? null;
  } catch (e) {
    console.warn("[telegramBotApi] sendPhoto multipart error:", e?.message || e);
    return null;
  }
}

/**
 * Inline-кнопки в уведомлениях о заказе:
 *  - «Открыть Concierge» — url на Mini App в full-screen
 *  - «Меню» — callback `nav:menu`, бот пришлёт ОТДЕЛЬНОЕ сообщение
 *    с inline-меню (профиль / заказы / реферальная) и не тронет карточку.
 * Нужен TELEGRAM_BOT_USERNAME.
 */
function buildOpenConciergeReplyMarkup() {
  const u = String(process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim();
  if (!u) return null;
  return {
    inline_keyboard: [
      [{ text: "Открыть Concierge", url: `https://t.me/${u}?startapp` }],
      [{ text: "Меню", callback_data: "nav:menu" }],
    ]
  };
}

/**
 * @param {{ reply_markup?: object, openMiniApp?: boolean }} [options]
 *   openMiniApp — добавить кнопку «Открыть Concierge» (ссылка на Mini App в full-screen), если задан TELEGRAM_BOT_USERNAME.
 */
export async function sendTelegramMessage(botToken, chatId, text, options = {}) {
  if (!botToken || !chatId || !text) return null;
  const id = String(chatId).trim();
  if (!id) return null;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  let replyMarkup = options.reply_markup;
  if (!replyMarkup && options.openMiniApp) {
    replyMarkup = buildOpenConciergeReplyMarkup();
  }
  const bodyObj = {
    chat_id: id,
    text: text.slice(0, 4000),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  };
  const body = JSON.stringify(bodyObj);
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
      return null;
    }
    console.log("[telegramBotApi] сообщение отправлено (chat_id:", id + ")");
    return data.result?.message_id ?? null;
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn("[telegramBotApi] sendMessage error:", msg);
    if (!dispatcher && /aborted|fetch failed|timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
      console.warn(
        "[telegramBotApi] подсказка: задай TELEGRAM_PROXY (http://user:pass@host:port) если с VPS нет прямого доступа к api.telegram.org."
      );
    }
    return null;
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function editTelegramMessageText(botToken, chatId, messageId, text, options = {}) {
  if (!botToken || !chatId || messageId == null || !text) return false;
  const id = String(chatId).trim();
  const mid = Number(messageId);
  if (!id || !Number.isFinite(mid)) return false;
  let replyMarkup = options.reply_markup;
  if (!replyMarkup && options.openMiniApp) {
    replyMarkup = buildOpenConciergeReplyMarkup();
  }
  const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
  const payload = {
    chat_id: id,
    message_id: mid,
    text: text.slice(0, 4096),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  };
  const dispatcher = getTelegramProxyDispatcher();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45_000);
    const res = await undiciFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {})
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn("[telegramBotApi] editMessageText failed:", data?.description || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[telegramBotApi] editMessageText error:", e?.message || e);
    return false;
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function editTelegramMessageCaption(botToken, chatId, messageId, caption, options = {}) {
  if (!botToken || !chatId || messageId == null) return false;
  const id = String(chatId).trim();
  const mid = Number(messageId);
  if (!id || !Number.isFinite(mid)) return false;
  let replyMarkup = options.reply_markup;
  if (!replyMarkup && options.openMiniApp) {
    replyMarkup = buildOpenConciergeReplyMarkup();
  }
  const cap = String(caption || "").slice(0, 1024);
  const url = `https://api.telegram.org/bot${botToken}/editMessageCaption`;
  const payload = {
    chat_id: id,
    message_id: mid,
    caption: cap,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  };
  const dispatcher = getTelegramProxyDispatcher();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45_000);
    const res = await undiciFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {})
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn("[telegramBotApi] editMessageCaption failed:", data?.description || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[telegramBotApi] editMessageCaption error:", e?.message || e);
    return false;
  }
}

/**
 * Отправить документ (файл) в чат через Bot API sendDocument (multipart).
 * Используется когда фронт в Telegram Mini App не может надёжно скачать blob —
 * мы получаем содержимое на сервер и шлём в чат клиента, оттуда он
 * пересылает в избранное / контактам.
 *
 * @param {string} botToken
 * @param {string|number} chatId
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {{ caption?: string, mime?: string }} [opts]
 * @returns {Promise<number|null>} message_id или null
 */
export async function sendTelegramDocument(botToken, chatId, buffer, filename, opts = {}) {
  if (!botToken || !chatId || !buffer?.length || !filename) return null;
  const id = String(chatId).trim();
  if (!id) return null;
  const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
  const dispatcher = getTelegramProxyDispatcher();
  const form = new FormData();
  form.set("chat_id", id);
  if (opts.caption) {
    form.set("caption", String(opts.caption).slice(0, 1024));
    form.set("parse_mode", "HTML");
  }
  const mime = String(opts.mime || "application/octet-stream");
  form.append("document", new Blob([buffer], { type: mime }), filename);
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 120_000);
    const res = await undiciFetch(url, {
      method: "POST",
      body: form,
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {}),
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn(
        "[telegramBotApi] sendDocument failed:",
        res.status,
        data?.error_code,
        data?.description || JSON.stringify(data),
      );
      return null;
    }
    return data.result?.message_id ?? null;
  } catch (e) {
    console.warn("[telegramBotApi] sendDocument error:", e?.message || e);
    return null;
  }
}

/**
 * Подтвердить callback_query от inline-кнопки — Telegram уберёт «загрузка» индикатор у клиента.
 * Можно показать всплывающий тост через `text` (короткий). Если text не задан — просто закрыть индикатор.
 * @returns {Promise<boolean>}
 */
export async function answerCallbackQuery(botToken, callbackQueryId, options = {}) {
  if (!botToken || !callbackQueryId) return false;
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  const payload = {
    callback_query_id: String(callbackQueryId),
    ...(options.text ? { text: String(options.text).slice(0, 200) } : {}),
    ...(options.showAlert ? { show_alert: true } : {}),
  };
  const dispatcher = getTelegramProxyDispatcher();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15_000);
    const res = await undiciFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {}),
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn("[telegramBotApi] answerCallbackQuery failed:", data?.description || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[telegramBotApi] answerCallbackQuery error:", e?.message || e);
    return false;
  }
}

/**
 * Удалить сообщение бота в чате (например перед отправкой нового статуса — тогда клиент получит push).
 * @returns {Promise<boolean>}
 */
export async function deleteTelegramMessage(botToken, chatId, messageId) {
  if (!botToken || !chatId || messageId == null) return false;
  const id = String(chatId).trim();
  const mid = Number(messageId);
  if (!id || !Number.isFinite(mid)) return false;
  const url = `https://api.telegram.org/bot${botToken}/deleteMessage`;
  const payload = { chat_id: id, message_id: mid };
  const dispatcher = getTelegramProxyDispatcher();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45_000);
    const res = await undiciFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {})
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      console.warn("[telegramBotApi] deleteMessage failed:", data?.description || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[telegramBotApi] deleteMessage error:", e?.message || e);
    return false;
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
 * Фото в чат: сначала sendPhoto по URL (его качают серверы Telegram).
 * Если не выходит — скачиваем файл здесь (в т.ч. через TELEGRAM_PROXY к CDN) и шлём multipart.
 * Не подходит: data:image/...
 *
 * @param {{ reply_markup?: object, openMiniApp?: boolean }} [options]
 * @returns {Promise<number|null>} message_id или null
 */
export async function sendTelegramPhoto(botToken, chatId, photoUrl, caption, options = {}) {
  if (!botToken || !chatId || !photoUrl) return null;
  const id = String(chatId).trim();
  if (!id) return null;
  const raw = String(photoUrl).trim();
  if (raw.startsWith("data:") || !/^https?:\/\//i.test(raw)) {
    return null;
  }
  let replyMarkup = options.reply_markup;
  if (!replyMarkup && options.openMiniApp) {
    replyMarkup = buildOpenConciergeReplyMarkup();
  }
  const cap = String(caption || "").slice(0, 1024);
  const apiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const body = JSON.stringify({
    chat_id: id,
    photo: raw,
    caption: cap || undefined,
    parse_mode: "HTML",
    disable_notification: false,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
  const dispatcher = getTelegramProxyDispatcher();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 60_000);
    const res = await undiciFetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ac.signal,
      ...(dispatcher ? { dispatcher } : {})
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (data?.ok) {
      console.log("[telegramBotApi] фото отправлено по URL (chat_id:", id + ")");
      return data.result?.message_id ?? null;
    }
    console.warn(
      "[telegramBotApi] sendPhoto URL failed:",
      res.status,
      data?.error_code,
      data?.description || JSON.stringify(data),
      "— пробуем multipart"
    );
  } catch (e) {
    console.warn("[telegramBotApi] sendPhoto URL error:", e?.message || e, "— пробуем multipart");
  }

  const fetched = await fetchImageForTelegramUpload(raw);
  if (!fetched) {
    console.warn("[telegramBotApi] sendPhoto: multipart пропущен (не удалось скачать изображение)");
    return null;
  }
  const filename = guessPhotoFilenameFromUrl(raw, fetched.contentType);
  return sendTelegramPhotoMultipart(botToken, id, fetched.buffer, filename, cap, replyMarkup);
}
