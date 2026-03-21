import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { createUserFromTelegram, nowIso, readDb, writeDb } from "./db.js";
import { verifyTelegramInitData } from "./telegramAuth.js";
import { sendTelegramMessage, formatOrderStatusMessageRu } from "./telegramNotify.js";

const app = express();
const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:4173";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOW_DEV_TELEGRAM_LOGIN = process.env.ALLOW_DEV_TELEGRAM_LOGIN === "true";

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
}

function authRequired(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function adminRequired(req, res, next) {
  if (req.auth?.role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
}

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.post("/api/auth/telegram", (req, res) => {
  const initData = req.body?.initData || "";
  const initDataUnsafeUser = req.body?.initDataUnsafe?.user;
  let telegramUser = null;

  if (initData && TELEGRAM_BOT_TOKEN) {
    const verified = verifyTelegramInitData(initData, TELEGRAM_BOT_TOKEN);
    if (!verified.ok) {
      return res.status(401).json({ message: verified.error });
    }
    telegramUser = verified.user;
  } else if (ALLOW_DEV_TELEGRAM_LOGIN && initDataUnsafeUser?.id) {
    telegramUser = initDataUnsafeUser;
  } else {
    return res.status(401).json({
      message: "Telegram auth required. Open app inside Telegram Mini App."
    });
  }

  const db = readDb();
  let user = db.users.find((u) => u.telegram_id === String(telegramUser.id));
  if (!user) {
    user = createUserFromTelegram(telegramUser);
    user.telegram_username = telegramUser.username || "";
    if (db.users.length === 0) {
      user.role = "admin";
      user.profile_completed = true;
    }
    db.users.push(user);
    writeDb(db);
  } else if (telegramUser.username && user.telegram_username !== telegramUser.username) {
    user.telegram_username = telegramUser.username;
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      db.users[idx] = { ...db.users[idx], telegram_username: telegramUser.username };
      writeDb(db);
    }
  }

  const token = signToken(user);
  res.json({ token, user });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.auth.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

const USER_ME_ALLOWED = new Set([
  "first_name",
  "last_name",
  "phone",
  "city",
  "delivery_address",
  "address_street",
  "address_house",
  "address_apartment",
  "address_floor",
  "address_entrance",
  "intercom",
  "courier_comment",
  "language",
  "theme",
  "referral_code",
  "bonus_balance"
]);

function normalizePhoneRu(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+7${digits}`;
  if (digits.startsWith("8") && digits.length === 11) return `+7${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 11) return `+${digits}`;
  if (raw?.trim().startsWith("+")) return raw.trim();
  return raw?.trim() || "";
}

function buildDeliveryAddress(p) {
  const parts = [
    p.city && `г. ${p.city}`,
    p.address_street,
    p.address_house && `д. ${p.address_house}`,
    p.address_apartment && `кв. ${p.address_apartment}`,
    p.address_floor && `эт. ${p.address_floor}`,
    p.address_entrance && `подъезд ${p.address_entrance}`,
    p.intercom && `домофон ${p.intercom}`
  ].filter(Boolean);
  let s = parts.join(", ");
  if (p.courier_comment) s += (s ? ". " : "") + p.courier_comment;
  return s;
}

app.post("/api/users/complete-onboarding", authRequired, (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === req.auth.userId);
  if (idx < 0) return res.status(404).json({ message: "User not found" });
  const u = db.users[idx];
  if (u.profile_completed) {
    return res.status(400).json({ message: "Profile already completed" });
  }

  const first_name = String(req.body.first_name || "").trim();
  const last_name = String(req.body.last_name || "").trim();
  const phone = normalizePhoneRu(req.body.phone);
  const city = String(req.body.city || "").trim();
  const address_street = String(req.body.address_street || "").trim();
  const address_house = String(req.body.address_house || "").trim();
  const address_apartment = String(req.body.address_apartment || "").trim();
  const address_floor = String(req.body.address_floor || "").trim();
  const address_entrance = String(req.body.address_entrance || "").trim();
  const intercom = String(req.body.intercom || "").trim();
  const courier_comment = String(req.body.courier_comment || "").trim();
  const referral_code_input = String(req.body.referral_code || "").trim().replace(/\s+/g, "").toUpperCase();

  if (!first_name || !last_name) {
    return res.status(400).json({ message: "Имя и фамилия обязательны" });
  }
  if (!phone || phone.length < 12) {
    return res.status(400).json({ message: "Укажите корректный телефон в формате +7" });
  }
  if (!city) {
    return res.status(400).json({ message: "Укажите город" });
  }

  const email = `tg_${u.telegram_id}@concierge-app.local`;

  let referred_by = u.referred_by || "";
  if (referral_code_input) {
    const referrer = db.users.find(
      (x) => x.referral_code && x.referral_code.replace(/\s+/g, "").toUpperCase() === referral_code_input
    );
    if (!referrer) {
      return res.status(400).json({ message: "Реферальный код не найден" });
    }
    if (referrer.id === u.id) {
      return res.status(400).json({ message: "Нельзя использовать свой код" });
    }
    referred_by = referrer.email || `tg_${referrer.telegram_id}@concierge-app.local`;
  }

  const delivery_address = buildDeliveryAddress({
    city,
    address_street,
    address_house,
    address_apartment,
    address_floor,
    address_entrance,
    intercom,
    courier_comment
  });

  db.users[idx] = {
    ...u,
    first_name,
    last_name,
    full_name: [first_name, last_name].filter(Boolean).join(" "),
    email,
    phone,
    city,
    address_street,
    address_house,
    address_apartment,
    address_floor,
    address_entrance,
    intercom,
    courier_comment,
    delivery_address,
    referred_by: referred_by || u.referred_by,
    profile_completed: true,
    updated_date: nowIso()
  };
  writeDb(db);
  res.json(db.users[idx]);
});

const ADDRESS_FIELDS = new Set([
  "city",
  "address_street",
  "address_house",
  "address_apartment",
  "address_floor",
  "address_entrance",
  "intercom",
  "courier_comment"
]);

app.patch("/api/users/me", authRequired, (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === req.auth.userId);
  if (idx < 0) return res.status(404).json({ message: "User not found" });
  const patch = {};
  for (const k of Object.keys(req.body || {})) {
    if (USER_ME_ALLOWED.has(k)) patch[k] = req.body[k];
  }
  let merged = { ...db.users[idx], ...patch, updated_date: nowIso() };
  if ([...ADDRESS_FIELDS].some((k) => patch[k] !== undefined)) {
    merged.delivery_address = buildDeliveryAddress(merged);
  }
  db.users[idx] = merged;
  writeDb(db);
  res.json(db.users[idx]);
});

app.get("/api/users", authRequired, adminRequired, (_, res) => {
  const db = readDb();
  res.json(db.users);
});

app.patch("/api/users/:id", authRequired, adminRequired, (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: "User not found" });
  db.users[idx] = { ...db.users[idx], ...req.body, updated_date: nowIso() };
  writeDb(db);
  res.json(db.users[idx]);
});

app.get("/api/orders", authRequired, (req, res) => {
  const db = readDb();
  if (req.auth.role === "admin") return res.json(db.orders);
  const me = db.users.find((u) => u.id === req.auth.userId);
  const mine = db.orders.filter((o) => o.client_email === me?.email);
  res.json(mine);
});

/** Начисляет бонусы по заказу один раз при статусе delivered. */
function applyOrderBonusesIfNeeded(db, order) {
  if (order.bonuses_applied || order.status !== "delivered") return;
  const idx = db.orders.findIndex((o) => o.id === order.id);
  if (idx < 0) return;

  const refBonus = Number(order.referrer_bonus || 0);
  const referralBonus = Number(order.referral_bonus || 0);
  const mode = order.client_bonus_mode === "subtract" ? -1 : 1;
  const clientDelta = referralBonus * mode;

  if (clientDelta !== 0 && order.client_email) {
    const uidx = db.users.findIndex((u) => u.email === order.client_email);
    if (uidx >= 0) {
      db.users[uidx].bonus_balance = Number(db.users[uidx].bonus_balance || 0) + clientDelta;
    }
  }
  if (refBonus > 0 && order.referrer_email) {
    const ridx = db.users.findIndex((u) => u.email === order.referrer_email);
    if (ridx >= 0) {
      db.users[ridx].bonus_balance = Number(db.users[ridx].bonus_balance || 0) + refBonus;
    }
  }
  db.orders[idx].bonuses_applied = true;
}

app.post("/api/orders", authRequired, adminRequired, (req, res) => {
  const db = readDb();
  const body = req.body || {};
  const order = {
    id: nanoid(),
    client_email: body.client_email || "",
    client_name: body.client_name || "",
    item_name: body.item_name || "",
    item_size: body.item_size || "",
    item_category: body.item_category || "other",
    brand: body.brand || "",
    price: Number(body.price || 0),
    cost_price: Number(body.cost_price || 0),
    currency: body.currency || "RUB",
    status: body.status || "pending",
    estimated_days: Number(body.estimated_days || 0),
    image_url: body.image_url || "",
    notes: body.notes || "",
    referrer_bonus: Number(body.referrer_bonus || 0),
    referral_bonus: Number(body.referral_bonus || 0),
    referrer_email: body.referrer_email || "",
    client_bonus_mode: body.client_bonus_mode === "subtract" ? "subtract" : "add",
    bonuses_applied: false,
    created_date: nowIso(),
    updated_date: nowIso()
  };
  db.orders.push(order);
  applyOrderBonusesIfNeeded(db, order);
  writeDb(db);
  res.status(201).json(order);
});

app.patch("/api/orders/:id", authRequired, adminRequired, (req, res) => {
  const db = readDb();
  const idx = db.orders.findIndex((o) => o.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: "Order not found" });
  const before = db.orders[idx];
  const body = { ...(req.body || {}) };
  delete body.bonuses_applied;
  if (body.client_bonus_mode !== undefined) {
    body.client_bonus_mode = body.client_bonus_mode === "subtract" ? "subtract" : "add";
  }
  db.orders[idx] = { ...before, ...body, updated_date: nowIso() };
  applyOrderBonusesIfNeeded(db, db.orders[idx]);
  writeDb(db);
  const after = db.orders[idx];

  if (TELEGRAM_BOT_TOKEN && before.status !== after.status && after.client_email) {
    const client = db.users.find((u) => u.email === after.client_email);
    const tgId = client?.telegram_id;
    if (tgId) {
      const msg = formatOrderStatusMessageRu(after);
      sendTelegramMessage(TELEGRAM_BOT_TOKEN, tgId, msg).catch(() => {});
    }
  }

  res.json(after);
});

app.get("/api/referrals/stats", authRequired, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.auth.userId);
  if (!me) return res.status(404).json({ message: "User not found" });
  const invites = db.users.filter((u) => u.referred_by === me.email);
  const referrals = invites.map((inv) => {
    const totalFromFriend = db.orders
      .filter(
        (o) =>
          o.client_email === inv.email &&
          o.referrer_email === me.email &&
          o.status === "delivered"
      )
      .reduce((s, o) => s + Number(o.referrer_bonus || 0), 0);
    return { ...inv, bonus_from_friend: totalFromFriend };
  });
  res.json({ referrals });
});

function migrateDbOnce() {
  const db = readDb();
  let changed = false;
  for (const u of db.users) {
    if (u.profile_completed === undefined) {
      u.profile_completed = true;
      changed = true;
    }
    if (!u.email && u.telegram_id) {
      u.email = `tg_${u.telegram_id}@concierge-app.local`;
      changed = true;
    }
    if (u.telegram_username === undefined) {
      u.telegram_username = "";
      changed = true;
    }
    if (u.address_entrance === undefined) {
      u.address_entrance = "";
      changed = true;
    }
  }
  for (const o of db.orders) {
    if (o.bonuses_applied === undefined) {
      o.bonuses_applied = false;
      changed = true;
    }
    if (o.client_bonus_mode === undefined) {
      o.client_bonus_mode = "add";
      changed = true;
    }
    if (o.cost_price === undefined) {
      o.cost_price = 0;
      changed = true;
    }
  }
  if (changed) writeDb(db);
}

migrateDbOnce();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
