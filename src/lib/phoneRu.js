/** Хранение в API: +79991234567. Маска: +7(999)123-45-67 */

function normalize11(digits) {
  let d = String(digits || '').replace(/\D/g, '');
  if (d.startsWith('8') && d.length >= 11) d = '7' + d.slice(1);
  // 10 цифр: либо «9XXXXXXXXX» без кода страны, либо уже «7XXXXXXXXX» (частичный ввод).
  // Нельзя всегда делать '7'+d — иначе 7999123456 превращается в 77799123456 и ломается маска.
  if (d.length === 10 && !d.startsWith('7')) {
    d = d.startsWith('8') ? '7' + d.slice(1) : '7' + d;
  }
  if (!d.startsWith('7')) d = '7' + d.replace(/\D/g, '').replace(/^7+/, '').slice(0, 10);
  return d.slice(0, 11);
}

export function digitsToStorage(digits) {
  const d = normalize11(digits);
  return d.length ? `+${d}` : '';
}

export function parseStoredPhone(stored) {
  return normalize11(stored || '');
}

/** +7(999)123-45-67 из цифр 79991234567 */
export function formatPhoneMaskFromDigits(d11) {
  const d = normalize11(d11);
  if (!d || d === '7') return '+7(';
  const b = d.slice(1);
  if (!b.length) return '+7(';
  let s = '+7(' + b.slice(0, 3);
  if (b.length <= 3) return s;
  s += ')' + b.slice(3, 6);
  if (b.length <= 6) return s;
  s += '-' + b.slice(6, 8);
  if (b.length <= 8) return s;
  s += '-' + b.slice(8, 10);
  return s;
}

/** Ввод с клавиатуры: сырой текст → маска и значение для API */
export function phoneChangeFromRawInput(rawValue) {
  let d = String(rawValue || '').replace(/\D/g, '');
  if (!d.length) return { formatted: '', storage: '' };
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (d.startsWith('7')) d = d.slice(0, 11);
  else d = '7' + d.replace(/\D/g, '').slice(0, 10);

  const norm = normalize11(d);
  const formatted = formatPhoneMaskFromDigits(norm);
  const storage = norm.length > 1 ? `+${norm}` : '';
  return { formatted, storage };
}
