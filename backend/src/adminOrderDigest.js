/**
 * Периодическая сводка в Telegram для админов:
 * 1) активные заказы с истекающим/прошедшим крайним сроком (created + max срока);
 * 2) активные заказы в статусе «подтверждён» дольше суток (по updated_date или created_date) —
 *    напоминание сменить этап.
 *
 * .env:
 *   TELEGRAM_ADMIN_CHAT_IDS — через запятую (например 123456789,-100123)
 *   ADMIN_ORDER_DIGEST_WARN_DAYS — порог «осталось дней», по умолчанию 3
 *   ADMIN_ORDER_DIGEST_STALE_CONFIRMED_HOURS — «висит подтверждён», по умолчанию 24
 *   ADMIN_ORDER_DIGEST_INTERVAL_MS — как часто проверять, по умолчанию 6ч
 *   ADMIN_ORDER_DIGEST_DEDUP_MS — не слать ту же сводку чаще, по умолчанию 8ч
 */
import { readDb, writeDb } from "./db.js";
import { sendTelegramMessage } from "./telegramBotApi.js";
import { escapeHtml, ORDER_STATUS_TITLE_RU } from "./notificationMessages.js";

const WARN_DAYS = Math.max(0, Number(process.env.ADMIN_ORDER_DIGEST_WARN_DAYS || 3));
const STALE_CONFIRMED_MS = Math.max(
  3600_000,
  Number(process.env.ADMIN_ORDER_DIGEST_STALE_CONFIRMED_HOURS || 24) * 3600 * 1000
);
const INTERVAL_MS = Math.max(60_000, Number(process.env.ADMIN_ORDER_DIGEST_INTERVAL_MS || 6 * 3600 * 1000));
const DEDUP_MS = Math.max(0, Number(process.env.ADMIN_ORDER_DIGEST_DEDUP_MS || 8 * 3600 * 1000));

function parseMaxEstimatedDays(order) {
  const r = String(order.estimated_days_range || "").trim();
  const m = r.match(/^(\d+)\s*[-\u2013\u2014]\s*(\d+)$/);
  if (m) return Math.max(Number(m[1]), Number(m[2]));
  const n = Number(order.estimated_days || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function etaEndDate(order) {
  const max = parseMaxEstimatedDays(order);
  if (!order.created_date || !max) return null;
  const created = new Date(order.created_date);
  if (Number.isNaN(created.getTime())) return null;
  return new Date(created.getTime() + max * 86400000);
}

export function collectOrdersForAdminDigest(orders, now = new Date()) {
  const out = [];
  for (const o of orders || []) {
    if (o.status === "delivered" || o.status === "cancelled") continue;
    const end = etaEndDate(o);
    if (!end) continue;
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);
    if (daysLeft > WARN_DAYS) continue;
    out.push({ order: o, etaEnd: end, daysLeft });
  }
  out.sort((a, b) => a.etaEnd.getTime() - b.etaEnd.getTime());
  return out;
}

function orderRefDateForStaleConfirmed(order) {
  const raw = order.updated_date || order.created_date;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Подтверждённые активные заказы, у которых с последнего обновления (или создания) прошло
 * больше STALE_CONFIRMED_MS — напоминание сменить статус.
 */
export function collectStaleConfirmedForDigest(orders, now = new Date()) {
  const out = [];
  const nowMs = now.getTime();
  for (const o of orders || []) {
    if (o.status !== "confirmed") continue;
    const ref = orderRefDateForStaleConfirmed(o);
    if (!ref) continue;
    if (nowMs - ref.getTime() <= STALE_CONFIRMED_MS) continue;
    out.push({ order: o, refAt: ref });
  }
  out.sort((a, b) => a.refAt.getTime() - b.refAt.getTime());
  return out;
}

function formatDigestMessageRu(etaItems, staleItems) {
  const lines = ["<b>Сводка по активным заказам</b>", ""];

  if (etaItems.length) {
    lines.push(`<b>Сроки</b> — истекающий или прошедший крайний срок (≤ ${WARN_DAYS} дн. или просрочка):`);
    lines.push("");
    for (const { order, etaEnd, daysLeft } of etaItems) {
      const id = escapeHtml(order.id || "—");
      const name = escapeHtml(String(order.item_name || "").trim() || "—");
      const client = escapeHtml(String(order.client_name || order.client_email || "").slice(0, 96));
      const st = escapeHtml(ORDER_STATUS_TITLE_RU[order.status] || order.status || "");
      const dateStr = escapeHtml(
        etaEnd.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      );
      const flag =
        daysLeft < 0
          ? "просрочен"
          : daysLeft === 0
            ? "срок сегодня"
            : `осталось ~${daysLeft} дн.`;
      lines.push(`• <code>${id}</code> ${name}`);
      lines.push(`  Клиент: ${client}`);
      lines.push(`  До: ${dateStr} · ${escapeHtml(flag)} · ${st}`);
      lines.push("");
    }
  }

  if (staleItems.length) {
    const hours = Math.round(STALE_CONFIRMED_MS / 3600000);
    lines.push(
      `<b>Статус «Подтверждён»</b> — дольше ~${hours} ч без смены этапа (по дате обновления заказа):`
    );
    lines.push("");
    for (const { order, refAt } of staleItems) {
      const id = escapeHtml(order.id || "—");
      const name = escapeHtml(String(order.item_name || "").trim() || "—");
      const client = escapeHtml(String(order.client_name || order.client_email || "").slice(0, 96));
      const since = escapeHtml(
        refAt.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      );
      lines.push(`• <code>${id}</code> ${name}`);
      lines.push(`  Клиент: ${client}`);
      lines.push(`  С ~${since} — проверьте, не пора ли обновить статус`);
      lines.push("");
    }
  }

  return lines.join("\n").slice(0, 4000);
}

export function scheduleAdminOrderDigest(TELEGRAM_BOT_TOKEN) {
  const raw = String(
    process.env.TELEGRAM_ADMIN_CHAT_IDS || process.env.TELEGRAM_ADMIN_CHAT_ID || ""
  ).trim();
  const chatIds = raw
    ? raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  if (!TELEGRAM_BOT_TOKEN || !chatIds.length) {
    console.log(
      "[adminDigest] выключено: задайте TELEGRAM_ADMIN_CHAT_IDS (и TELEGRAM_BOT_TOKEN) для сводок по срокам"
    );
    return;
  }
  console.log(
    `[adminDigest] вкл: чаты ${chatIds.join(", ")}, интервал ${Math.round(INTERVAL_MS / 3600000)}ч, сроки ≤${WARN_DAYS}дн., «подтверждён» >${Math.round(STALE_CONFIRMED_MS / 3600000)}ч, dedup ${Math.round(DEDUP_MS / 3600000)}ч`
  );

  async function tick() {
    try {
      const db = readDb();
      const now = new Date();
      const etaItems = collectOrdersForAdminDigest(db.orders, now);
      const staleAll = collectStaleConfirmedForDigest(db.orders, now);
      const etaIds = new Set(etaItems.map((x) => x.order.id));
      const staleItems = staleAll.filter((x) => !etaIds.has(x.order.id));
      if (!etaItems.length && !staleItems.length) return;

      const fing = [
        `e:${etaItems.map((x) => x.order.id).sort().join(",")}`,
        `s:${staleItems.map((x) => x.order.id).sort().join(",")}`
      ].join("|");
      const nowMs = Date.now();
      const dedup = db.app_meta?.admin_digest_dedup;
      if (
        dedup &&
        dedup.fing === fing &&
        dedup.at &&
        nowMs - Date.parse(dedup.at) < DEDUP_MS
      ) {
        return;
      }

      const text = formatDigestMessageRu(etaItems, staleItems);
      for (const chatId of chatIds) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, text);
      }

      if (!db.app_meta || typeof db.app_meta !== "object") db.app_meta = {};
      db.app_meta.admin_digest_dedup = { fing, at: new Date().toISOString() };
      db.app_meta.admin_digest_last_at = db.app_meta.admin_digest_dedup.at;
      db.app_meta.admin_digest_last_count = etaItems.length + staleItems.length;
      writeDb(db);
    } catch (e) {
      console.warn("[adminDigest] ошибка:", e?.message || e);
    }
  }

  setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 60_000);
}
