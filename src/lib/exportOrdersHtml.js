// @ts-nocheck
/**
 * HTML-экспорт таблицы заказов с фото.
 * Открывается в любом браузере (включая Telegram in-app), легко печатать /
 * сохранить как PDF (Cmd+P → «Сохранить как PDF»).
 *
 * Где CSV не справится: фото товара, кликабельные ссылки, оформление под печать.
 */
import { formatOrderDisplayId } from '@/lib/orderDisplay';
import { getStatusLabel } from '@/lib/i18n';
import { api } from '@/api/client';
import { proxyImageUrl } from '@/lib/imageProxy';

/** Полный URL прокси (с origin) — для HTML открываемого вне Mini App. */
function absoluteProxyUrl(url) {
  const proxied = proxyImageUrl(url);
  if (!proxied || proxied.startsWith('data:')) return proxied;
  if (/^https?:\/\//i.test(proxied)) return proxied;
  // относительный путь → абсолютный
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${proxied.startsWith('/') ? '' : '/'}${proxied}`;
  }
  return proxied;
}

function isInTelegramMiniApp() {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(o) {
  const n = Number(o.price ?? 0);
  if (!Number.isFinite(n) || n === 0) return '—';
  const fmt = n.toLocaleString('ru-RU');
  const cur = String(o.currency || 'RUB').toUpperCase();
  if (cur === 'RUB') return `${fmt} ₽`;
  if (cur === 'USD') return `$${fmt}`;
  if (cur === 'EUR') return `€${fmt}`;
  return `${fmt} ${cur}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Строит HTML-документ.
 * @param {Array} orders — отфильтрованный массив заказов
 * @param {{ title?: string, clientName?: string }} meta
 */
export function buildOrdersHtml(orders, meta = {}) {
  const title = meta.title || 'Заказы Concierge';
  const clientName = meta.clientName ? `Клиент: ${escapeHtml(meta.clientName)}` : '';
  const exportDate = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const rows = orders.map((o) => {
    const img = String(o.image_url || '').trim();
    const proxied = img && !img.startsWith('data:') ? absoluteProxyUrl(img) : '';
    const imgCell = proxied
      ? `<img src="${escapeHtml(proxied)}" alt="" loading="lazy">`
      : '<div class="no-photo">—</div>';
    const link = img && !img.startsWith('data:')
      ? `<a href="${escapeHtml(img)}" target="_blank" rel="noopener">фото</a>`
      : '';
    const notes = String(o.notes || '').trim();
    return `
      <tr>
        <td class="photo">${imgCell}</td>
        <td class="name">
          <div class="item-name">${escapeHtml(o.item_name || '—')}</div>
          ${o.brand ? `<div class="brand">${escapeHtml(o.brand)}</div>` : ''}
        </td>
        <td class="size">${escapeHtml(o.item_size || '—')}</td>
        <td class="price">${escapeHtml(formatPrice(o))}</td>
        <td class="status">${escapeHtml(getStatusLabel(o.status, 'ru'))}</td>
        <td class="id"><code>${escapeHtml(formatOrderDisplayId(o))}</code></td>
        <td class="created">${escapeHtml(formatDate(o.created_date))}</td>
        <td class="link">${link}</td>
        <td class="notes">${escapeHtml(notes)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif;
      font-feature-settings: 'tnum' on;
      background: #fafafa; color: #111;
      -webkit-font-smoothing: antialiased;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }
    header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #ddd; }
    h1 { margin: 0 0 6px; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
    .meta { font-size: 12px; color: #666; }
    .meta strong { color: #111; }
    .count { font-weight: 500; color: #111; }

    table {
      width: 100%; border-collapse: collapse; background: #fff;
      border-radius: 12px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      font-size: 13px;
    }
    thead th {
      text-align: left; font-weight: 500;
      padding: 12px 10px;
      background: #f5f5f5; color: #555;
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
      border-bottom: 1px solid #e5e5e5;
    }
    tbody td {
      padding: 10px; border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
    }
    tbody tr:last-child td { border-bottom: 0; }

    .photo { width: 84px; }
    .photo img {
      width: 72px; height: 72px; object-fit: contain;
      border-radius: 8px; background: #fafafa;
      display: block;
    }
    .no-photo {
      width: 72px; height: 72px; border-radius: 8px;
      background: #f0f0f0; color: #aaa;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
    }

    .name { min-width: 180px; }
    .item-name { font-weight: 500; line-height: 1.3; }
    .brand { font-size: 11px; color: #666; margin-top: 3px; }

    .size { white-space: nowrap; font-weight: 500; }
    .price { white-space: nowrap; font-weight: 500; font-variant-numeric: tabular-nums; }
    .status { font-size: 12px; color: #555; white-space: nowrap; }
    .id { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 11px; color: #666; white-space: nowrap; }
    .created { font-size: 12px; color: #666; white-space: nowrap; }
    .link a { color: #0066ff; text-decoration: none; font-size: 12px; }
    .link a:hover { text-decoration: underline; }
    .notes { font-size: 12px; color: #555; max-width: 220px; }

    .empty { padding: 48px; text-align: center; color: #888; font-size: 14px; }

    @media print {
      body { background: #fff; }
      .wrap { max-width: 100%; padding: 0; }
      table { box-shadow: none; border: 1px solid #ddd; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        ${clientName ? `<strong>${clientName}</strong> · ` : ''}
        Экспортировано: ${escapeHtml(exportDate)} ·
        <span class="count">${orders.length} ${orders.length === 1 ? 'заказ' : (orders.length < 5 && orders.length > 0 ? 'заказа' : 'заказов')}</span>
      </div>
    </header>

    ${orders.length === 0 ? `
      <div class="empty">Нет заказов для экспорта.</div>
    ` : `
      <table>
        <thead>
          <tr>
            <th>Фото</th>
            <th>Товар</th>
            <th>Размер</th>
            <th>Цена</th>
            <th>Статус</th>
            <th>Номер</th>
            <th>Создан</th>
            <th>Ссылка</th>
            <th>Заметка</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `}
  </div>
</body>
</html>`;
}

/**
 * Скачать HTML-таблицу как файл.
 * В Telegram Mini App файл идёт через бота (sendDocument) → реально приходит
 * в чат с ботом, оттуда можно пересылать.
 * @returns {'bot' | 'download' | 'fail'}
 */
export async function exportOrdersHtml(orders, meta = {}) {
  if (!orders) return 'fail';
  const html = buildOrdersHtml(orders, meta);

  const ts = new Date().toISOString().slice(0, 10);
  const slug = meta.clientName
    ? meta.clientName.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').slice(0, 40)
    : 'all';
  const filename = `orders-${slug}-${ts}.html`;

  // Telegram Mini App → через бота
  if (isInTelegramMiniApp()) {
    try {
      await api.auth.shareDocumentViaBot({
        filename,
        content: html,
        mime: 'text/html',
        caption: meta.title || 'Заказы',
      });
      return 'bot';
    } catch (e) {
      console.warn('[exportHtml] bot share failed:', e?.message || e);
      // упадём в обычный путь ниже
    }
  }

  // Обычное скачивание
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
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
    return 'fail';
  }
}
