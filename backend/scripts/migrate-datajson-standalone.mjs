/**
 * Импорт data.json → MySQL без зависимости от src/db (удобно для старого деплоя).
 *
 *   cd /opt/concierge/backend
 *   npm install mysql2 dotenv
 *   node scripts/migrate-datajson-standalone.mjs
 *
 * Нужны: backend/data.json, backend/.env с MYSQL_*
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env") });

const DATA_PATH = path.join(ROOT, "data.json");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE || "concierge",
  waitForConnections: true,
  connectionLimit: 5
});

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

function d(v) {
  if (v == null || v === "") return new Date();
  const t = Date.parse(v);
  return Number.isNaN(t) ? new Date() : new Date(t);
}

async function insertUser(conn, u) {
  const prefs = JSON.stringify(u.notify_preferences || DEF_PREFS);
  await conn.execute(
    `INSERT INTO users (
      id, telegram_id, role, first_name, last_name, full_name, email, phone, city,
      delivery_address, address_street, address_house, address_apartment, address_floor,
      address_entrance, intercom, courier_comment, referral_code, referred_by,
      bonus_balance, language, theme, profile_completed, telegram_username, public_id,
      notify_preferences, created_date, updated_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      u.id,
      u.telegram_id,
      u.role,
      u.first_name,
      u.last_name,
      u.full_name,
      u.email,
      u.phone,
      u.city,
      u.delivery_address || "",
      u.address_street || "",
      u.address_house || "",
      u.address_apartment || "",
      u.address_floor || "",
      u.address_entrance || "",
      u.intercom || "",
      u.courier_comment || "",
      u.referral_code,
      u.referred_by,
      Number(u.bonus_balance || 0),
      u.language || "ru",
      u.theme || "dark",
      u.profile_completed ? 1 : 0,
      u.telegram_username || "",
      u.public_id || "",
      prefs,
      d(u.created_date),
      d(u.updated_date)
    ]
  );
}

async function insertOrder(conn, o) {
  await conn.execute(
    `INSERT INTO orders (
      id, client_email, client_telegram_id, client_name, item_name, item_size, item_category,
      brand, price, cost_price, currency, status, estimated_days, estimated_days_range,
      image_url, notes, referrer_bonus, referral_bonus, referrer_email, client_bonus_mode,
      bonuses_applied, created_date, updated_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      o.id,
      o.client_email || "",
      o.client_telegram_id || "",
      o.client_name || "",
      o.item_name || "",
      o.item_size || "",
      o.item_category || "other",
      o.brand || "",
      Number(o.price || 0),
      Number(o.cost_price ?? 0),
      o.currency || "RUB",
      o.status || "pending",
      Number(o.estimated_days ?? 0),
      o.estimated_days_range || "",
      o.image_url || "",
      o.notes || "",
      Number(o.referrer_bonus ?? 0),
      Number(o.referral_bonus ?? 0),
      o.referrer_email || "",
      o.client_bonus_mode === "subtract" ? "subtract" : "add",
      o.bonuses_applied ? 1 : 0,
      d(o.created_date),
      d(o.updated_date)
    ]
  );
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("Нет файла:", DATA_PATH);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const users = (raw.users || []).map(normalizeUser);
  const orders = (raw.orders || []).map(normalizeOrder);

  console.log(`Импорт: ${users.length} пользователей, ${orders.length} заказов`);

  const conn = await pool.getConnection();
  try {
    for (const u of users) {
      const [rows] = await conn.query("SELECT id FROM users WHERE id = ?", [u.id]);
      if (rows.length) {
        console.log("skip user", u.id);
        continue;
      }
      await insertUser(conn, u);
      console.log("user", u.id, u.email);
    }

    for (const o of orders) {
      const [rows] = await conn.query("SELECT id FROM orders WHERE id = ?", [o.id]);
      if (rows.length) {
        console.log("skip order", o.id);
        continue;
      }
      await insertOrder(conn, o);
      console.log("order", o.id);
    }
  } finally {
    conn.release();
    await pool.end();
  }

  console.log("Готово.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
