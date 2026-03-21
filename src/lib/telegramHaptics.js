/**
 * Безопасные вызовы HapticFeedback в Telegram Mini App (вне TG — no-op).
 * @see https://core.telegram.org/bots/webapps#hapticfeedback
 */

function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp?.HapticFeedback : null;
}

export function hapticImpact(style = 'light') {
  try {
    tg()?.impactOccurred(style);
  } catch {
    /* ignore */
  }
}

export function hapticNotification(type = 'success') {
  try {
    tg()?.notificationOccurred(type);
  } catch {
    /* ignore */
  }
}

export function hapticSuccess() {
  hapticNotification('success');
}

export function hapticError() {
  hapticNotification('error');
}

export function hapticWarning() {
  hapticNotification('warning');
}

export function hapticSelection() {
  try {
    tg()?.selectionChanged();
  } catch {
    /* ignore */
  }
}
