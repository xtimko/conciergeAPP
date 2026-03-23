/**
 * Одноразовый импорт backend/data.json → MySQL.
 * Перед запуском: создай БД, выполни schema.sql, заполни backend/.env (MYSQL_*).
 *
 *   cd backend && node scripts/migrate-json-to-mysql.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "../src/loadEnv.js";
import * as userRepo from "../src/db/userRepo.js";
import * as orderRepo from "../src/db/orderRepo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "..", "data.json");

const DEF_PREFS = { orders: true, marketing: false, system: true };

function normalizeUser(u) {
  let email = String(u.email || "").trim();
  if (!email && u.telegram_id) {
    email = `tg_${u.telegram_id}@concierge-app.local`;
  }
  return {
    ...u,
    email,
    notify_preferences: u.notify_preferences || DEF_PREFS,
    telegram_username: u.telegram_username ?? "",
    public_id: u.public_id || "",
    address_entrance: u.address_entrance ?? "",
    profile_completed: Boolean(u.profile_completed)
  };
}

function normalizeOrder(o) {
  return {
    ...o,
    bonuses_applied: Boolean(o.bonuses_applied),
    client_bonus_mode: o.client_bonus_mode === "subtract" ? "subtract" : "add",
    cost_price: o.cost_price ?? 0
  };
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("Нет файла", DATA_PATH);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const users = (raw.users || []).map(normalizeUser);
  const orders = (raw.orders || []).map(normalizeOrder);

  console.log(`Импорт: ${users.length} пользователей, ${orders.length} заказов`);

  for (const u of users) {
    const existing = await userRepo.getById(u.id);
    if (existing) {
      console.log("skip user", u.id);
      continue;
    }
    await userRepo.insert(u);
    console.log("user", u.id, u.email);
  }

  for (const o of orders) {
    const existing = await orderRepo.getById(o.id);
    if (existing) {
      console.log("skip order", o.id);
      continue;
    }
    await orderRepo.insert(o);
    console.log("order", o.id);
  }

  console.log("Готово.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
