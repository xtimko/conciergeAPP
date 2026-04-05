import "./loadEnv.js";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import {
  createUserFromTelegram,
  nowIso,
  readDb,
  writeDb,
  nextOrderPublicId,
  ensureUserPublicIds
} from "./db.js";
import { verifyTelegramInitData } from "./telegramAuth.js";
import {
  notifyOrderInTelegramChat,
  deriveClientTelegramIdFromBody
} from "./telegramNotify.js";
import { mergeNotifyPreferences } from "./clientNotifications.js";
import { sendTelegramWelcomeWithWebApp } from "./telegramBotApi.js";
import { scheduleAdminOrderDigest } from "./adminOrderDigest.js";

const app = express();
const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:4173";
/** Публичный HTTPS URL Mini App (кнопка в боте и BotFather). Можно задать отдельно от CORS. */
const PUBLIC_APP_URL = String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_ORIGIN || "").replace(/\/$/, "");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_BOT_USERNAME = String(process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
const TELEGRAM_WEBHOOK_SECRET = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
const ALLOW_DEV_TELEGRAM_LOGIN = process.env.ALLOW_DEV_TELEGRAM_LOGIN === "true";

const REF_START_PREFIX = "ref_";

const ORDER_CREATE_IDEM_TTL_MS = Math.max(
  30_000,
  Number(process.env.ORDER_CREATE_IDEM_TTL_MS || 120_000)
);
const orderCreateIdem = new Map();

function sweepOrderCreateIdem() {
  const now = Date.now();
  for (const [k, v] of orderCreateIdem) {
    if (v.expiresAt <= now) orderCreateIdem.delete(k);
  }
}

function getIdempotentCreatedOrder(key) {
  sweepOrderCreateIdem();
  const k = String(key || "").trim();
  if (!k || k.length > 200) return null;
  const hit = orderCreateIdem.get(k);
  if (hit && hit.expiresAt > Date.now()) return hit.payload;
  return null;
}

function rememberIdempotentCreatedOrder(key, payload) {
  const k = String(key || "").trim();
  if (!k || k.length > 200) return;
  orderCreateIdem.set(k, { payload, expiresAt: Date.now() + ORDER_CREATE_IDEM_TTL_MS });
}

function parseRefTokenFromStartParam(startParam) {
  if (!startParam || typeof startParam !== "string") return null;
  const s = startParam.trim();
  if (!s.startsWith(REF_START_PREFIX)) return null;
  const token = s.slice(REF_START_PREFIX.length);
  if (!token || token.length > 64) return null;
  return token;
}

function normalizePublicId(input) {
  return String(input || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function resolveReferrerIdByToken(db, token) {
  const t = String(token || "").trim();
  if (!t) return null;

  // New opaque token format, e.g. CONXXXXXXXXXX
  const byLinkToken = db.users.find(
    (u) => String(u.referral_link_token || "").trim().toUpperCase() === t.toUpperCase()
  );
  if (byLinkToken) return byLinkToken.id;

  // Backward compatibility: old referral code format (REF-XXXXXXXX)
  const byReferralCode = db.users.find(
    (u) =>
      String(u.referral_code || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase() === normalizePublicId(t)
  );
  if (byReferralCode) return byReferralCode.id;

  // Backward compatibility: old links used raw internal user.id
  const byId = db.users.find((u) => String(u.id) === t);
  if (byId) return byId.id;

  // New compact format: public_id in normalized form (e.g. CLI000001)
  const want = normalizePublicId(t);
  if (!want) return null;
  const byPublic = db.users.find((u) => normalizePublicId(u.public_id) === want);
  return byPublic?.id || null;
}

function applyReferralToNewUser(db, newUser, referrerId) {
  if (!referrerId) return;
  const referrer = db.users.find((u) => u.id === referrerId);
  if (!referrer || referrer.id === newUser.id) return;
  const email = referrer.email || `tg_${referrer.telegram_id}@concierge-app.local`;
  newUser.referred_by = email;
  const name =
    referrer.full_name ||
    [referrer.first_name, referrer.last_name].filter(Boolean).join(" ") ||
    (referrer.telegram_username ? `@${String(referrer.telegram_username).replace(/^@/, "")}` : "");
  newUser.referred_by_name = name;
}

function takePendingReferrer(db, telegramUserId) {
  const tid = String(telegramUserId);
  if (!db.pending_referrals || typeof db.pending_referrals !== "object") return null;
  const refId = db.pending_referrals[tid];
  if (!refId) return null;
  delete db.pending_referrals[tid];
  return refId;
}

function storePendingReferrer(db, telegramUserId, referrerId) {
  if (!db.pending_referrals || typeof db.pending_referrals !== "object") {
    db.pending_referrals = {};
  }
  if (referrerId) {
    db.pending_referrals[String(telegramUserId)] = referrerId;
  } else {
    delete db.pending_referrals[String(telegramUserId)];
  }
}

if (!TELEGRAM_BOT_TOKEN) {
  console.warn(
    "[concierge] TELEGRAM_BOT_TOKEN пуст — вход через Telegram и уведомления о заказах не будут работать. Файл: backend/.env"
  );
} else {
  console.log("[concierge] TELEGRAM_BOT_TOKEN загружен — уведомления клиентам в Telegram включены.");
}
if (String(process.env.TELEGRAM_PROXY || process.env.TELEGRAM_HTTPS_PROXY || "").trim()) {
  console.log("[concierge] TELEGRAM_PROXY задан — sendMessage к Telegram через прокси (undici).");
}

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
/* data URL фото в заказах — без лимита мелкие запросы падают на больших снимках */
app.use(express.json({ limit: "32mb" }));

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
  // Важно: проверяем роль по актуальным данным в data.json, а не по полю role внутри JWT.
  // Иначе возможна рассинхронизация: роль пользователя могла поменяться в БД, но в токене осталась старая.
  const db = readDb();
  const userId = req.auth?.userId;
  const user = db.users?.find((u) => u.id === userId);
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
}

/** Одно число дней или диапазон "7-14" → верхняя граница в estimated_days + строка диапазона */
function normalizeEstimatedDays(body) {
  const raw = body?.estimated_days;
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return { estimated_days: 0, estimated_days_range: "" };
  const m = s.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return { estimated_days: hi, estimated_days_range: `${lo}-${hi}` };
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return { estimated_days: n, estimated_days_range: "" };
  return { estimated_days: 0, estimated_days_range: "" };
}

app.get("/api/health", (_, res) => res.json({ ok: true, db: "json" }));

/** Публичные настройки для фронта (реферальная ссылка t.me/...) */
app.get("/api/public/config", (_req, res) => {
  res.json({
    telegramBotUsername: TELEGRAM_BOT_USERNAME,
    publicAppUrl: PUBLIC_APP_URL || null
  });
});

app.post("/api/auth/telegram", (req, res) => {
  try {
    const initData = req.body?.initData || "";
    const initDataUnsafeUser = req.body?.initDataUnsafe?.user;
    let telegramUser = null;
    let startParam = null;

    if (initData && TELEGRAM_BOT_TOKEN) {
      const verified = verifyTelegramInitData(initData, TELEGRAM_BOT_TOKEN);
      if (!verified.ok) {
        return res.status(401).json({ message: verified.error });
      }
      telegramUser = verified.user;
      startParam = verified.startParam;
    } else if (ALLOW_DEV_TELEGRAM_LOGIN && initDataUnsafeUser?.id) {
      telegramUser = initDataUnsafeUser;
      startParam = req.body?.startParam || null;
    } else {
      return res.status(401).json({
        message: "Telegram auth required. Open app inside Telegram Mini App."
      });
    }

    const db = readDb();
    if (!db.pending_referrals) db.pending_referrals = {};

    if (!Array.isArray(db.users)) db.users = [];

    let user = db.users.find((u) => u.telegram_id === String(telegramUser.id));
    if (!user) {
      const before = db.users.length;
      user = createUserFromTelegram(telegramUser, db);
      user.telegram_username = telegramUser.username || "";
      if (db.users.length === 0) {
        user.role = "admin";
        user.profile_completed = true;
      }
    let refId = resolveReferrerIdByToken(db, parseRefTokenFromStartParam(startParam));
      if (!refId) refId = takePendingReferrer(db, telegramUser.id);
      applyReferralToNewUser(db, user, refId);
      db.users.push(user);
      writeDb(db);
      console.log(
        "[auth/telegram] created user telegram_id=",
        telegramUser.id,
        "db.users:",
        before,
        "->",
        db.users.length
      );
    } else if (telegramUser.username && user.telegram_username !== telegramUser.username) {
      user.telegram_username = telegramUser.username;
      const idx = db.users.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        db.users[idx] = { ...db.users[idx], telegram_username: telegramUser.username };
        writeDb(db);
      }
      console.log(
        "[auth/telegram] updated telegram_username user telegram_id=",
        telegramUser.id
      );
    }

    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    console.error("[auth/telegram] handler error:", e?.stack || e?.message || e);
    res.status(500).json({ message: "Telegram auth failed (server error)" });
  }
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
  "bonus_balance",
  "notify_preferences"
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
  let referred_by_name = u.referred_by_name || "";
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
    referred_by_name =
      referrer.full_name ||
      [referrer.first_name, referrer.last_name].filter(Boolean).join(" ") ||
      (referrer.telegram_username
        ? `@${String(referrer.telegram_username).replace(/^@/, "")}`
        : "");
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
    referred_by_name: referred_by_name || u.referred_by_name,
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
    if (USER_ME_ALLOWED.has(k)) {
      if (k === "notify_preferences") {
        patch[k] = mergeNotifyPreferences(db.users[idx], req.body.notify_preferences);
      } else {
        patch[k] = req.body[k];
      }
    }
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
  const me = db.users.find((u) => u.id === req.auth.userId);
  if (!me) return res.status(404).json({ message: "User not found" });
  // Важно: роль берем из БД, чтобы не зависеть от устаревшего JWT.
  if (me.role === "admin") return res.json(db.orders);
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

/** Откатывает уже примененные бонусы перед удалением заказа. */
function revertOrderBonusesIfApplied(db, order) {
  if (!order?.bonuses_applied) return;

  const refBonus = Number(order.referrer_bonus || 0);
  const referralBonus = Number(order.referral_bonus || 0);
  const mode = order.client_bonus_mode === "subtract" ? -1 : 1;
  const clientDelta = referralBonus * mode;

  if (clientDelta !== 0 && order.client_email) {
    const uidx = db.users.findIndex((u) => u.email === order.client_email);
    if (uidx >= 0) {
      db.users[uidx].bonus_balance = Number(db.users[uidx].bonus_balance || 0) - clientDelta;
    }
  }

  if (refBonus > 0 && order.referrer_email) {
    const ridx = db.users.findIndex((u) => u.email === order.referrer_email);
    if (ridx >= 0) {
      db.users[ridx].bonus_balance = Number(db.users[ridx].bonus_balance || 0) - refBonus;
    }
  }
}

app.post("/api/orders", authRequired, adminRequired, (req, res) => {
  const db = readDb();
  const body = req.body || {};
  const idemKey = String(body.idempotency_key || "").trim().slice(0, 200);
  if (idemKey) {
    const prev = getIdempotentCreatedOrder(idemKey);
    if (prev) return res.status(200).json(prev);
  }
  const est = normalizeEstimatedDays(body);
  const fxRaw = body.fx_rate_to_rub;
  const fxNum = fxRaw === undefined || fxRaw === "" ? 0 : Number(fxRaw);
  const currency = String(body.currency || "RUB").toUpperCase();
  const fx_rate_to_rub =
    currency === "RUB" ? 0 : Number.isFinite(fxNum) && fxNum > 0 ? fxNum : 0;

  const order = {
    id: nextOrderPublicId(db),
    client_email: body.client_email || "",
    client_telegram_id: deriveClientTelegramIdFromBody(body),
    client_name: body.client_name || "",
    item_name: body.item_name || "",
    item_size: body.item_size || "",
    item_category: body.item_category || "other",
    brand: body.brand || "",
    price: Number(body.price || 0),
    cost_price: Number(body.cost_price || 0),
    currency,
    fx_rate_to_rub,
    status: body.status || "confirmed",
    estimated_days: est.estimated_days,
    estimated_days_range: est.estimated_days_range,
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
  if (TELEGRAM_BOT_TOKEN && (order.client_email || order.client_telegram_id)) {
    notifyOrderInTelegramChat(TELEGRAM_BOT_TOKEN, db, order, "created");
  }
  if (idemKey) rememberIdempotentCreatedOrder(idemKey, order);
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
  if (body.estimated_days !== undefined) {
    const est = normalizeEstimatedDays({ estimated_days: body.estimated_days });
    body.estimated_days = est.estimated_days;
    body.estimated_days_range = est.estimated_days_range;
  }
  if (body.fx_rate_to_rub !== undefined) {
    const cur = String(body.currency !== undefined ? body.currency : before.currency || "RUB").toUpperCase();
    const fxRaw = body.fx_rate_to_rub;
    const fxNum = fxRaw === "" || fxRaw == null ? 0 : Number(fxRaw);
    body.fx_rate_to_rub =
      cur === "RUB" ? 0 : Number.isFinite(fxNum) && fxNum > 0 ? fxNum : 0;
  } else if (body.currency !== undefined) {
    const cur = String(body.currency || "RUB").toUpperCase();
    if (cur === "RUB") body.fx_rate_to_rub = 0;
  }
  db.orders[idx] = { ...before, ...body, updated_date: nowIso() };
  db.orders[idx].client_telegram_id = deriveClientTelegramIdFromBody(db.orders[idx]);
  applyOrderBonusesIfNeeded(db, db.orders[idx]);
  writeDb(db);
  const after = db.orders[idx];
  const statusChanged = before.status !== after.status;

  if (statusChanged) {
    console.log(
      `[orders] PATCH id=${after.id} статус: "${before.status}" -> "${after.status}" | client_email=${Boolean(after.client_email)} client_telegram_id=${Boolean(after.client_telegram_id)}`
    );
  }

  if (
    TELEGRAM_BOT_TOKEN &&
    statusChanged &&
    (after.client_email || after.client_telegram_id)
  ) {
    console.log(`[orders] отправляем Telegram-уведомление (status) для заказа ${after.id}`);
    notifyOrderInTelegramChat(TELEGRAM_BOT_TOKEN, db, after, "status");
  } else if (statusChanged) {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn("[orders] статус изменён, но TELEGRAM_BOT_TOKEN пуст — уведомление в Telegram не отправится.");
    } else if (!after.client_email && !after.client_telegram_id) {
      console.warn("[orders] статус изменён, но у заказа нет client_email / client_telegram_id — уведомление не отправится.");
    }
  }

  res.json(after);
});

app.delete("/api/orders/:id", authRequired, adminRequired, (req, res) => {
  const db = readDb();
  const idx = db.orders.findIndex((o) => o.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: "Order not found" });

  const order = db.orders[idx];
  revertOrderBonusesIfApplied(db, order);
  db.orders.splice(idx, 1);
  writeDb(db);

  res.json({ ok: true });
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

/**
 * Webhook Telegram Bot: /start → приветствие + кнопка Mini App; ref_ → pending для первого входа.
 * Настройка: setWebhook url=https://домен/api/telegram/webhook secret_token=TELEGRAM_WEBHOOK_SECRET
 */
app.post("/api/telegram/webhook", (req, res) => {
  if (TELEGRAM_WEBHOOK_SECRET) {
    const token = req.headers["x-telegram-bot-api-secret-token"];
    if (token !== TELEGRAM_WEBHOOK_SECRET) {
      return res.status(403).json({ ok: false });
    }
  }

  try {
    const msg = req.body?.message;
    const text = (msg?.text || "").trim();
    if (!msg?.chat?.id || !text.startsWith("/start")) {
      return res.json({ ok: true });
    }

    const fromId = msg.from?.id;
    if (!fromId) return res.json({ ok: true });

    const m = /^\/start(?:\s+(.+))?$/i.exec(text);
    const payload = (m && m[1]) ? String(m[1]).trim() : "";

    const db = readDb();
    if (!db.pending_referrals) db.pending_referrals = {};

    let referrerId = null;
    const token = parseRefTokenFromStartParam(payload);
    if (token) {
      const rid = resolveReferrerIdByToken(db, token);
      if (rid) {
        referrerId = rid;
        storePendingReferrer(db, fromId, rid);
      }
    } else {
      storePendingReferrer(db, fromId, null);
    }
    writeDb(db);

    if (TELEGRAM_BOT_TOKEN) {
      const welcomeHtml =
        "<b>Concierge</b>\n\n" +
        "Зайдите в приложение, чтобы пройти регистрацию и оформлять заказы.\n\n" +
        "Поделитесь <b>реферальной ссылкой</b> из раздела «Рефералы» в Mini App — " +
        "за каждый <b>доставленный</b> заказ приглашённого друга вам начисляются баллы.\n\n" +
        "Нажмите кнопку ниже 👇";
      const appUrl = PUBLIC_APP_URL && /^https:\/\//i.test(PUBLIC_APP_URL) ? PUBLIC_APP_URL : "";
      if (appUrl) {
        sendTelegramWelcomeWithWebApp(TELEGRAM_BOT_TOKEN, msg.chat.id, welcomeHtml, appUrl);
      } else {
        console.warn(
          "[concierge] webhook /start: задайте PUBLIC_APP_URL или FRONTEND_ORIGIN (HTTPS) для кнопки Mini App"
        );
      }
    }
  } catch (e) {
    console.warn("[concierge] telegram webhook:", e?.message || e);
  }
  res.json({ ok: true });
});

function migrateDbOnce() {
  const db = readDb();
  let changed = false;
  const existingTokens = new Set(
    (db.users || []).map((u) => String(u.referral_link_token || "").trim().toUpperCase()).filter(Boolean)
  );
  const genToken = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const maxAttempts = 10_000;
    for (let i = 0; i < maxAttempts; i += 1) {
      let suffix = "";
      for (let j = 0; j < 10; j += 1) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
      const token = `CON${suffix}`;
      if (!existingTokens.has(token)) {
        existingTokens.add(token);
        return token;
      }
    }
    return `CON${Date.now().toString(36).toUpperCase()}`;
  };
  if (!db.pending_referrals || typeof db.pending_referrals !== "object") {
    db.pending_referrals = {};
    changed = true;
  }
  if (!db.app_meta || typeof db.app_meta !== "object") {
    db.app_meta = {};
    changed = true;
  }
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
    if (u.notify_preferences === undefined) {
      u.notify_preferences = { orders: true, marketing: false, system: true };
      changed = true;
    }
    if (u.referred_by_name === undefined) {
      u.referred_by_name = "";
      changed = true;
    }
    if (!u.referral_link_token) {
      u.referral_link_token = genToken();
      changed = true;
    }
  }
  if (ensureUserPublicIds(db)) {
    changed = true;
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
    if (o.fx_rate_to_rub === undefined) {
      o.fx_rate_to_rub = 0;
      changed = true;
    }
  }
  if (changed) writeDb(db);
}

migrateDbOnce();

scheduleAdminOrderDigest(TELEGRAM_BOT_TOKEN);

app.listen(PORT, () => {
  console.log(`[concierge] API running on http://localhost:${PORT} (storage: data.json)`);
});
