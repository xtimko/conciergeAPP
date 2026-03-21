/** Экранирование поля для CSV (RFC-совместимо для Excel). */
function escapeCell(val) {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const ORDER_COLUMNS = [
  { key: 'id', header: 'id' },
  { key: 'created_date', header: 'created_date' },
  { key: 'updated_date', header: 'updated_date' },
  { key: 'client_email', header: 'client_email' },
  { key: 'client_name', header: 'client_name' },
  { key: 'item_name', header: 'item_name' },
  { key: 'brand', header: 'brand' },
  { key: 'item_size', header: 'item_size' },
  { key: 'item_category', header: 'item_category' },
  { key: 'status', header: 'status' },
  { key: 'price', header: 'price' },
  { key: 'cost_price', header: 'cost_price' },
  { key: 'currency', header: 'currency' },
  { key: 'estimated_days', header: 'estimated_days' },
  { key: 'notes', header: 'notes' },
  { key: 'referrer_email', header: 'referrer_email' },
  { key: 'referrer_bonus', header: 'referrer_bonus' },
  { key: 'referral_bonus', header: 'referral_bonus' },
];

function buildCsvString(orders) {
  const header = ORDER_COLUMNS.map((c) => c.header).join(',');
  const body = orders
    .map((o) => ORDER_COLUMNS.map((c) => escapeCell(o[c.key])).join(','))
    .join('\n');
  return `\uFEFF${header}\n${body}`;
}

/**
 * Экспорт CSV: в Telegram Mini App надёжнее «Поделиться» файлом или копирование в буфер.
 * @returns {'share'|'download'|'clipboard'|'fail'}
 */
export async function exportOrdersCsv(orders, filename = 'orders-export.csv') {
  if (!orders?.length) return 'fail';

  const csv = buildCsvString(orders);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const file = new File([blob], filename, {
    type: 'text/csv',
    lastModified: Date.now(),
  });

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
      });
      return 'share';
    } catch (e) {
      if (e?.name === 'AbortError') return 'fail';
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2500);
    return 'download';
  } catch {
    /* continue */
  }

  try {
    await navigator.clipboard.writeText(csv);
    return 'clipboard';
  } catch {
    /* continue */
  }

  return 'fail';
}
