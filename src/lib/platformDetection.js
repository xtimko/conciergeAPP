// @ts-nocheck
/**
 * Платформа и capability-детект для Liquid Glass редизайна.
 *
 * Telegram Mini App рендерится в WebView:
 *   - iOS    → WKWebView (Safari engine, версия совпадает с iOS)
 *   - Android→ Chrome WebView (Chromium)
 *   - tdesktop / macos / web → встроенный Chromium / Safari
 *
 * Liquid Glass — это визуальный язык Apple с iOS 26. Нативного CSS API нет,
 * мы имитируем эффект, но включаем «полную версию» только там, где железо/движок
 * её потянет: iOS 26+, современные Chromium/Firefox. Старые устройства получают
 * базовый glassmorphism (тот, что был до редизайна).
 *
 * Результат детекции — классы на <html>:
 *   - .platform-ios | .platform-android | .platform-desktop
 *   - .ios-26-plus  (только iOS 26+)
 *   - .liquid-glass-enabled (когда стоит включать продвинутый материал)
 *
 * Эти классы читает CSS (см. src/styles/liquid-glass.css).
 */

/** Достаём major-версию iOS из UA. Возвращает число или null. */
function parseIosMajorVersion(userAgent) {
  if (!userAgent) return null;
  // iPhone OS 26_0, iPhone OS 17_4_1, CPU OS 18_0 и т.п.
  const m = /OS (\d+)(?:[._](\d+))?(?:[._](\d+))? like Mac OS X/i.exec(userAgent);
  if (!m) return null;
  const major = Number(m[1]);
  return Number.isFinite(major) ? major : null;
}

/** Macintosh с touch (iPadOS прикидывается Mac в новых версиях). */
function isIpadOsLike(userAgent) {
  return /Macintosh/i.test(userAgent) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
}

function detectPlatform() {
  if (typeof window === 'undefined') return 'desktop';

  const tgPlatform = window.Telegram?.WebApp?.platform;
  if (tgPlatform === 'ios') return 'ios';
  if (tgPlatform === 'android') return 'android';
  if (tgPlatform === 'tdesktop' || tgPlatform === 'macos' || tgPlatform === 'web' || tgPlatform === 'weba' || tgPlatform === 'webk') {
    return 'desktop';
  }

  // Фолбэк: UA
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua) || isIpadOsLike(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

function detectIosMajor() {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  return parseIosMajorVersion(ua);
}

/** Поддерживает ли движок достаточный CSS для «полной» Liquid Glass-имитации. */
function supportsLiquidGlass() {
  if (typeof window === 'undefined') return false;
  if (!window.CSS || typeof window.CSS.supports !== 'function') return false;

  // Минимум: backdrop-filter (с префиксом и без), mask-image, color-mix
  const hasBackdrop =
    CSS.supports('backdrop-filter', 'blur(20px)') ||
    CSS.supports('-webkit-backdrop-filter', 'blur(20px)');
  if (!hasBackdrop) return false;

  // Эти фичи нужны для тонких эффектов (refraction edge / адаптивный тинт)
  const hasMask = CSS.supports('mask-image', 'linear-gradient(#000, #000)');
  const hasColorMix = CSS.supports('color', 'color-mix(in oklab, white, black)');

  return hasMask && hasColorMix;
}

/**
 * Главная функция: ставит классы на <html>. Вызывается один раз при загрузке.
 * Возвращает результат детекции (для отладки).
 */
export function initPlatformDetection() {
  if (typeof document === 'undefined') return null;

  const platform = detectPlatform();
  const iosMajor = platform === 'ios' ? detectIosMajor() : null;
  const isIos26Plus = platform === 'ios' && Number(iosMajor) >= 26;
  const canLiquid = supportsLiquidGlass();

  // Включаем «полный» Liquid Glass на:
  //  - iOS 26+ (там настоящий язык Liquid Glass и движок справится)
  //  - современный Chromium / десктоп (там точно хватит ресурсов)
  // На старых iOS (<= 25) и слабых Android — fallback.
  const enableLiquid =
    canLiquid && (
      isIos26Plus ||
      platform === 'desktop' ||
      (platform === 'android' && CSS.supports('mask-image', 'linear-gradient(#000, #000)'))
    );

  const root = document.documentElement;
  root.classList.add(`platform-${platform}`);
  if (isIos26Plus) root.classList.add('ios-26-plus');
  if (enableLiquid) root.classList.add('liquid-glass-enabled');

  const result = { platform, iosMajor, isIos26Plus, canLiquid, enableLiquid };
  if (typeof window !== 'undefined') {
    window.__concierge_platform = result;
  }
  return result;
}

export const Platform = {
  isIos: () => document?.documentElement?.classList?.contains('platform-ios') ?? false,
  isIos26Plus: () => document?.documentElement?.classList?.contains('ios-26-plus') ?? false,
  isAndroid: () => document?.documentElement?.classList?.contains('platform-android') ?? false,
  isDesktop: () => document?.documentElement?.classList?.contains('platform-desktop') ?? false,
  hasLiquidGlass: () => document?.documentElement?.classList?.contains('liquid-glass-enabled') ?? false,
};
