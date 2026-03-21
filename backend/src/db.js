import fs from "fs";
import path from "path";
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

export function createUserFromTelegram(telegramUser) {
  const firstName = telegramUser.first_name || "Client";
  const lastName = telegramUser.last_name || "";
  return {
    id: nanoid(),
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
    intercom: "",
    courier_comment: "",
    referral_code: `REF-${nanoid(8).toUpperCase()}`,
    referred_by: "",
    telegram_username: "",
    bonus_balance: 500,
    language: "ru",
    theme: "dark",
    profile_completed: false,
    created_date: nowIso(),
    updated_date: nowIso()
  };
}
