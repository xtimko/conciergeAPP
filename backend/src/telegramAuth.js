import crypto from "crypto";

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date") || 0);
  const userRaw = params.get("user");
  const checkData = [];

  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    checkData.push(`${key}=${value}`);
  }
  checkData.sort();

  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = null;
    }
  }

  const startParam = params.get("start_param") || "";

  return {
    hash,
    authDate,
    user,
    startParam,
    dataCheckString: checkData.join("\n")
  };
}

export function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) {
    return { ok: false, error: "Missing initData or bot token" };
  }

  const parsed = parseInitData(initData);
  if (!parsed.hash || !parsed.user?.id) {
    return { ok: false, error: "Invalid initData payload" };
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - parsed.authDate;
  if (!parsed.authDate || ageSeconds > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, error: "Expired Telegram auth data" };
  }

  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secret).update(parsed.dataCheckString).digest("hex");
  if (calculatedHash !== parsed.hash) {
    return { ok: false, error: "Telegram signature mismatch" };
  }

  const sp = (parsed.startParam || "").trim();
  return { ok: true, user: parsed.user, startParam: sp || undefined };
}

export function createTelegramTestInitData(user, botToken, authDate = Math.floor(Date.now() / 1000)) {
  const pairs = [
    ["auth_date", String(authDate)],
    ["query_id", "AAEAAAE"],
    ["user", JSON.stringify(user)]
  ];
  const dataCheckString = pairs
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const params = new URLSearchParams();
  for (const [k, v] of pairs) params.set(k, v);
  params.set("hash", hash);
  return params.toString();
}
