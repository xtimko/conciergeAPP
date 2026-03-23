// @ts-nocheck
/** База API: из .env или тот же домен что и фронт (прод без localhost на телефоне). */
function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return "http://localhost:8787/api";
}

/** Для отладки в консоли: откуда идут запросы */
export function getApiBaseDebug() {
  return getApiBase();
}

const TOKEN_KEY = "concierge_jwt";

const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getToken();
  const url = `${getApiBase()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      ...options
    });
  } catch (e) {
    const err = new Error(
      `Нет связи с API (${getApiBase()}). Проверь nginx / VITE_API_BASE_URL / что бэкенд запущен.`
    );
    err.status = 0;
    err.network = true;
    err.cause = e;
    throw err;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return res.json();
}

function sortByCreatedDateDesc(list) {
  return [...list].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
}

async function loginDev() {
  const webApp = window.Telegram?.WebApp;
  const payload = {
    initData: webApp?.initData || "",
    initDataUnsafe: webApp?.initDataUnsafe || null
  };

  if (!payload.initData && !payload.initDataUnsafe?.user) {
    const err = new Error("Telegram Mini App is required for login.");
    err.status = 401;
    throw err;
  }

  const result = await request("/auth/telegram", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setToken(result.token);
  return result.user;
}

export const base44 = {
  auth: {
    async me() {
      try {
        return await request("/auth/me");
      } catch (error) {
        if (error.status === 401) {
          return loginDev();
        }
        throw error;
      }
    },
    async updateMe(payload) {
      return request("/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    },
    async completeOnboarding(payload) {
      return request("/users/complete-onboarding", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    async referralsStats() {
      return request("/referrals/stats");
    },
    logout() {
      clearToken();
      window.location.reload();
    },
    redirectToLogin() {
      loginDev()
        .then(() => window.location.reload())
        .catch((error) => {
          console.error("Telegram login failed:", error?.message || error);
          throw error;
        });
    }
  },
  entities: {
    User: {
      async list() {
        return request("/users");
      },
      async filter(query) {
        const users = await request("/users");
        return users.filter((u) =>
          Object.entries(query).every(([k, v]) => String(u[k] || "") === String(v || ""))
        );
      },
      async update(id, payload) {
        return request(`/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      }
    },
    Order: {
      async list() {
        const orders = await request("/orders");
        return sortByCreatedDateDesc(orders);
      },
      async filter(query) {
        const orders = await request("/orders");
        const filtered = orders.filter((o) =>
          Object.entries(query).every(([k, v]) => String(o[k] || "") === String(v || ""))
        );
        return sortByCreatedDateDesc(filtered);
      },
      async create(payload) {
        return request("/orders", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      },
      async update(id, payload) {
        return request(`/orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      }
    }
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) return { file_url: "" };
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ file_url: reader.result });
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      }
    }
  }
};
