import { useState, useEffect } from 'react';

function isTextFieldFocused() {
  const el = document.activeElement;
  if (!el || el === document.body) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = String(el.type || 'text').toLowerCase();
    const skip = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'hidden', 'file', 'image', 'range', 'color']);
    return !skip.has(type);
  }
  if (el.isContentEditable) return true;
  return false;
}

/**
 * true, когда открыта виртуальная клавиатура или сфокусировано текстовое поле.
 * Скрывает fixed-таббар (Telegram WebView / iOS часто не даёт стабильный visualViewport).
 */
export function useVisualKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;

    const check = () => {
      let vvOpen = false;
      if (vv) {
        const innerH = window.innerHeight;
        const vh = vv.height;
        const top = vv.offsetTop || 0;
        const lost = innerH - vh;
        vvOpen = lost > 72 || top > 28;
      }
      const focusOpen = isTextFieldFocused();
      setOpen(vvOpen || focusOpen);
    };

    check();

    if (vv) {
      vv.addEventListener('resize', check);
      vv.addEventListener('scroll', check);
    }
    window.addEventListener('resize', check);

    const onFocusIn = () => {
      requestAnimationFrame(() => requestAnimationFrame(check));
    };
    const onFocusOut = () => {
      requestAnimationFrame(() => setTimeout(check, 80));
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', check);
        vv.removeEventListener('scroll', check);
      }
      window.removeEventListener('resize', check);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return open;
}
