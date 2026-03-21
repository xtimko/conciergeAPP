import { useState, useEffect } from 'react';

/**
 * true, когда виртуальная клавиатура сильно уменьшает viewport (iOS / Telegram WebView).
 * Чтобы спрятать fixed-таббар и не перекрывать поля ввода.
 */
export function useVisualKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return undefined;

    const check = () => {
      const innerH = window.innerHeight;
      const vh = vv.height;
      const top = vv.offsetTop || 0;
      const lost = innerH - vh;
      /* порог: клавиатура «съела» заметную высоту или сдвинула viewport */
      setOpen(lost > 100 || top > 48);
    };

    check();
    vv.addEventListener('resize', check);
    vv.addEventListener('scroll', check);

    const onFocusIn = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
        requestAnimationFrame(check);
      }
    };
    const onFocusOut = () => requestAnimationFrame(() => setTimeout(check, 120));

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return open;
}
