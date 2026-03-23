import fs from "fs";
import path from "path";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "..", "data.json");

const initialData = {
  users: [],
  orders: []
};

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
  }
}

export function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
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
    email: "",
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
    referred_by: "",
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
