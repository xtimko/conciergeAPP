import fs from "fs";
import path from "path";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "..", "data.json");
console.log("[concierge][db] DB_PATH:", DB_PATH);

const initialData = {
  users: [],
  orders: [],
  pending_referrals: {}
};

function randomTokenSuffix(len = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += alphabet[randomInt(0, alphabet.length)];
  }
  return out;
}

function nextReferralLinkToken(db) {
  const used = new Set((db.users || []).map((u) => String(u.referral_link_token || "").toUpperCase()));
  const maxAttempts = 10_000;
  for (let i = 0; i < maxAttempts; i += 1) {
    const token = `CON${randomTokenSuffix(10)}`;
    if (!used.has(token)) return token;
  }
  throw new Error("nextReferralLinkToken: failed to allocate token");
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
  }
}

export function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (e) {
    // Если data.json битый — не даём серверу падать бесконечно.
    // Делаем бэкап и восстанавливаем минимальную структуру.
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${DB_PATH}.corrupt-${ts}`;
    try {
      fs.copyFileSync(DB_PATH, backupPath);
    } catch {
      /* ignore */
    }
    console.warn("[concierge][db] data.json parse failed, restoring:", e?.message || e);
    const fresh = JSON.parse(JSON.stringify(initialData));
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2), "utf8");
    return fresh;
  }
}

export function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function nowIso() {
  return new Date().toISOString();
}

/** Следующий номер CLI-000001 (для отображения и экспорта). */
export function nextClientPublicId(db) {
  let max = 0;
  for (const u of db.users) {
    const m = /^CLI-(\d+)$/.exec(u.public_id || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `CLI-${String(max + 1).padStart(6, "0")}`;
}

/**
 * Уникальный номер заказа CON-XXXXXX: случайные 6 цифр (0…999999), без повторов
 * среди существующих id заказов.
 */
export function nextOrderPublicId(db) {
  const used = new Set();
  for (const o of db.orders || []) {
    const m = /^CON-(\d{6})$/.exec(String(o.id || ""));
    if (m) used.add(m[1]);
  }
  const maxAttempts = 10_000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const n = randomInt(0, 1_000_000);
    const suffix = String(n).padStart(6, "0");
    if (!used.has(suffix)) {
      return `CON-${suffix}`;
    }
  }
  throw new Error("nextOrderPublicId: не удалось выделить свободный номер CON-");
}

/** Проставить public_id клиентам без номера (миграция). */
export function ensureUserPublicIds(db) {
  let max = 0;
  for (const u of db.users) {
    const m = /^CLI-(\d+)$/.exec(u.public_id || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  let changed = false;
  for (const u of db.users) {
    if (!u.public_id) {
      max += 1;
      u.public_id = `CLI-${String(max).padStart(6, "0")}`;
      changed = true;
    }
  }
  return changed;
}

export function createUserFromTelegram(telegramUser, db) {
  const firstName = telegramUser.first_name || "Client";
  const lastName = telegramUser.last_name || "";
  return {
    id: nanoid(),
    public_id: nextClientPublicId(db),
    telegram_id: String(telegramUser.id),
    role: "client",
    first_name: firstName,
    last_name: lastName,
    full_name: [firstName, lastName].filter(Boolean).join(" "),
    // Делаем email заполненным сразу, чтобы:
    // - реферальная логика не зависела от полного onboarding
    // - в MySQL не ловить UNIQUE-конфликты (если будет миграция обратно)
    email: `tg_${telegramUser.id}@concierge-app.local`,
    phone: "",
    city: "",
    delivery_address: "",
    address_street: "",
    address_house: "",
    address_apartment: "",
    address_floor: "",
    address_entrance: "",
    intercom: "",
    courier_comment: "",
    referral_code: `REF-${nanoid(8).toUpperCase()}`,
    referral_link_token: nextReferralLinkToken(db),
    referred_by: "",
    referred_by_name: "",
    telegram_username: "",
    notify_preferences: {
      orders: true,
      marketing: false,
      system: true
    },
    bonus_balance: 500,
    language: "ru",
    theme: "dark",
    profile_completed: false,
    created_date: nowIso(),
    updated_date: nowIso()
  };
}
