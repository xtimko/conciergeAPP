import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { createUserFromTelegram, nowIso, readDb, writeDb } from "./db.js";
import { verifyTelegramInitData } from "./telegramAuth.js";

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
    if (db.users.length === 0) user.role = "admin";
    db.users.push(user);
    writeDb(db);
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

app.patch("/api/users/me", authRequired, (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === req.auth.userId);
  if (idx < 0) return res.status(404).json({ message: "User not found" });
  db.users[idx] = { ...db.users[idx], ...req.body, updated_date: nowIso() };
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

app.post("/api/orders", authRequired, adminRequired, (req, res) => {
  const db = readDb();
  const order = {
    id: nanoid(),
    client_email: req.body.client_email || "",
    client_name: req.body.client_name || "",
    item_name: req.body.item_name || "",
    item_size: req.body.item_size || "",
    item_category: req.body.item_category || "other",
    brand: req.body.brand || "",
    price: Number(req.body.price || 0),
    currency: req.body.currency || "RUB",
    status: req.body.status || "pending",
    estimated_days: Number(req.body.estimated_days || 0),
    image_url: req.body.image_url || "",
    notes: req.body.notes || "",
    referrer_bonus: Number(req.body.referrer_bonus || 0),
    referral_bonus: Number(req.body.referral_bonus || 0),
    referrer_email: req.body.referrer_email || "",
    created_date: nowIso(),
    updated_date: nowIso()
  };
  db.orders.push(order);
  writeDb(db);
  res.status(201).json(order);
});

app.patch("/api/orders/:id", authRequired, adminRequired, (req, res) => {
  const db = readDb();
  const idx = db.orders.findIndex((o) => o.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: "Order not found" });
  const before = db.orders[idx];
  db.orders[idx] = { ...before, ...req.body, updated_date: nowIso() };

  // Bonus application on order update.
  if (Number(req.body.referral_bonus || 0) > 0) {
    const uidx = db.users.findIndex((u) => u.email === db.orders[idx].client_email);
    if (uidx >= 0) db.users[uidx].bonus_balance = Number(db.users[uidx].bonus_balance || 0) + Number(req.body.referral_bonus);
  }
  if (Number(req.body.referrer_bonus || 0) > 0 && db.orders[idx].referrer_email) {
    const ridx = db.users.findIndex((u) => u.email === db.orders[idx].referrer_email);
    if (ridx >= 0) db.users[ridx].bonus_balance = Number(db.users[ridx].bonus_balance || 0) + Number(req.body.referrer_bonus);
  }

  writeDb(db);
  res.json(db.orders[idx]);
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
