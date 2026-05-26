/**
 * Long polling Telegram Bot API: альтернатива webhook для случаев,
 * когда серверы Telegram не могут установить входящее соединение
 * с VPS (типичная ситуация с RU-хостингом). Использует тот же
 * TELEGRAM_PROXY (если задан), что и sendMessage в telegramBotApi.js.
 *
 * Включается переменной окружения TELEGRAM_USE_LONG_POLLING=true.
 * При включении нужно один раз вызвать deleteWebhook у Telegram,
 * иначе getUpdates вернёт 409 Conflict — код это сам распознаёт и
 * вызовет deleteWebhook автоматически.
 */
import { fetch as undiciFetch, ProxyAgent } from "undici";

let _proxyDispatcher = null;
let _proxyForUrl = "";

function getProxyDispatcher() {
  const proxyUrl = String(
    process.env.TELEGRAM_PROXY || process.env.TELEGRAM_HTTPS_PROXY || ""
  ).trim();
  if (!proxyUrl) {
    _proxyDispatcher = null;
    _proxyForUrl = "";
    return null;
  }
  if (_proxyDispatcher && _proxyForUrl === proxyUrl) return _proxyDispatcher;
  _proxyForUrl = proxyUrl;
  _proxyDispatcher = new ProxyAgent(proxyUrl);
  return _proxyDispatcher;
}

async function callTelegram(botToken, method, query = "", body = null) {
  const dispatcher = getProxyDispatcher();
  const url = `https://api.telegram.org/bot${botToken}/${method}${query ? `?${query}` : ""}`;
  const res = await undiciFetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...(dispatcher ? { dispatcher } : {})
  });
  return res.json().catch(() => ({}));
}

/**
 * @param {string} botToken
 * @param {(update: object) => void | Promise<void>} onUpdate
 * @param {{ timeoutSec?: number }} [opts]
 */
export function startTelegramLongPolling(botToken, onUpdate, opts = {}) {
  if (!botToken || typeof onUpdate !== "function") return;
  const pollTimeout = Math.max(20, Math.min(60, Number(opts.timeoutSec || 50)));

  let offset = 0;
  let stopped = false;
  let webhookDropped = false;

  async function ensureWebhookDropped() {
    if (webhookDropped) return;
    try {
      await callTelegram(botToken, "deleteWebhook", "drop_pending_updates=false");
      webhookDropped = true;
      console.log("[telegramLongPolling] deleteWebhook вызван (готовимся к long polling).");
    } catch (e) {
      console.warn("[telegramLongPolling] deleteWebhook error:", e?.message || e);
    }
  }

  async function loop() {
    await ensureWebhookDropped();
    while (!stopped) {
      try {
        const data = await callTelegram(
          botToken,
          "getUpdates",
          // allowed_updates=["message","callback_query"]
          `timeout=${pollTimeout}&offset=${offset}&allowed_updates=%5B%22message%22%2C%22callback_query%22%5D`
        );

        if (data?.ok && Array.isArray(data.result)) {
          for (const upd of data.result) {
            if (typeof upd?.update_id === "number") {
              offset = upd.update_id + 1;
            }
            try {
              await onUpdate(upd);
            } catch (e) {
              console.warn("[telegramLongPolling] onUpdate error:", e?.message || e);
            }
          }
          continue;
        }

        if (data?.error_code === 409) {
          console.warn(
            "[telegramLongPolling] 409 Conflict — webhook ещё стоит, удаляю и повторяю."
          );
          webhookDropped = false;
          await ensureWebhookDropped();
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }

        if (data?.error_code) {
          console.warn(
            "[telegramLongPolling] getUpdates error:",
            data.error_code,
            data.description || ""
          );
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        // пустой long poll или сетевая фигня
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.warn("[telegramLongPolling] loop error:", e?.message || e);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  loop().catch((e) =>
    console.warn("[telegramLongPolling] crashed:", e?.message || e)
  );

  return () => {
    stopped = true;
  };
}
