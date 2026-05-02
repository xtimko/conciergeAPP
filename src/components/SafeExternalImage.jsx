import React, { useEffect, useMemo, useState } from 'react';
import { normalizeImageUrlForDisplay } from '@/lib/imageUrl';

/**
 * Внешние URL часто блокируют запросы с Referer Mini App; Telegram при этом качает фото у себя.
 * referrerPolicy="no-referrer" + нормализация https обычно возвращает превью в приложении.
 */
export default function SafeExternalImage({ src, alt = '', className = '', onBroken, ...rest }) {
  const raw = String(src || '').trim();
  const primary = useMemo(() => normalizeImageUrlForDisplay(raw), [raw]);
  const [attempt, setAttempt] = useState(0);

  const candidates = useMemo(() => {
    const list = [];
    if (primary) list.push(primary);
    if (raw && raw !== primary) list.push(raw);
    return list;
  }, [primary, raw]);

  useEffect(() => {
    setAttempt(0);
  }, [raw]);

  const currentSrc = candidates[attempt] ?? '';

  if (!currentSrc) return null;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        if (attempt < candidates.length - 1) setAttempt((a) => a + 1);
        else onBroken?.();
      }}
      {...rest}
    />
  );
}
