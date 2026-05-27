import { formatOrderDisplayId } from '@/lib/orderDisplay';
import { api } from '@/api/client';

/** В Telegram Mini App? */
function isInTelegramMiniApp() {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
}

/** Экранирование поля для CSV (RFC-совместимо для Excel). */
function escapeCell(val) {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const ORDER_COLUMNS = [
  { key: 'номер', header: 'номер', compute: (o) => formatOrderDisplayId(o) },
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
  { key: 'estimated_days_range', header: 'estimated_days_range' },
  { key: 'notes', header: 'notes' },
  { key: 'referrer_email', header: 'referrer_email' },
  { key: 'referrer_bonus', header: 'referrer_bonus' },
  { key: 'referral_bonus', header: 'referral_bonus' },
];

function buildCsvString(orders) {
  const header = ORDER_COLUMNS.map((c) => c.header).join(',');
  const body = orders
    .map((o) =>
      ORDER_COLUMNS.map((c) => {
        const raw = c.compute ? c.compute(o) : o[c.key];
        return escapeCell(raw);
      }).join(','),
    )
    .join('\n');
  return `\uFEFF${header}\n${body}`;
}

/**
 * Экспорт готовой CSV-строки (с BOM):
 *  - в Telegram Mini App → через бота (sendDocument) — файл приходит в чат с ботом, оттуда пересылается
 *  - в браузере → стандартное скачивание / clipboard как fallback
 * @returns {'bot'|'share'|'download'|'clipboard'|'fail'}
 */
export async function exportCsvString(csv, filename = 'export.csv') {
  if (csv == null || csv === '') return 'fail';

  // 1) В Telegram Mini App — через бота (надёжный путь, файл реально приходит)
  if (isInTelegramMiniApp()) {
    try {
      await api.auth.shareDocumentViaBot({
        filename,
        content: csv,
        mime: 'text/csv',
      });
      return 'bot';
    } catch (e) {
      console.warn('[exportCsv] bot share failed:', e?.message || e);
      // упадём в обычный путь ниже
    }
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // 2) Обычное скачивание (десктоп / мобильный браузер)
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

  // 3) Last resort — буфер обмена
  try {
    await navigator.clipboard.writeText(csv);
    return 'clipboard';
  } catch {
    /* continue */
  }

  return 'fail';
}

/**
 * Экспорт CSV: в Telegram Mini App надёжнее «Поделиться» файлом или копирование в буфер.
 * @returns {'share'|'download'|'clipboard'|'fail'}
 */
export async function exportOrdersCsv(orders, filename = 'orders-export.csv') {
  if (!orders?.length) return 'fail';
  return exportCsvString(buildCsvString(orders), filename);
}
