/**
 * Доп. отступы контента Mini App под панель Telegram (кнопка закрыть и т.д.)
 * и нижнюю зону. Системный вырез/home — через env(safe-area-inset-*) + viewport-fit=cover.
 * @see https://core.telegram.org/bots/webapps
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function syncTelegramSafeAreas() {
  const root = document.documentElement;
  const tg = window.Telegram?.WebApp;

  if (!tg) {
    root.style.removeProperty('--tma-content-top');
    root.style.removeProperty('--tma-content-bottom');
    return;
  }

  const c = tg.contentSafeAreaInset || {};
  let top = num(c.top);
  let bottom = num(c.bottom);

  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  // Старые клиенты: 0 от API — запас под строку Mini App
  if (top === 0 && ios) top = 54;
  if (bottom === 0 && ios) bottom = 22;

  root.style.setProperty('--tma-content-top', `${top}px`);
  root.style.setProperty('--tma-content-bottom', `${bottom}px`);
}

export function initTelegramSafeAreas() {
  syncTelegramSafeAreas();
  window.Telegram?.WebApp?.onEvent?.('viewportChanged', syncTelegramSafeAreas);
}
