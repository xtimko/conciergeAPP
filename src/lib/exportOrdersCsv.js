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
  { key: 'currency', header: 'currency' },
  { key: 'estimated_days', header: 'estimated_days' },
  { key: 'notes', header: 'notes' },
  { key: 'referrer_email', header: 'referrer_email' },
  { key: 'referrer_bonus', header: 'referrer_bonus' },
  { key: 'referral_bonus', header: 'referral_bonus' },
];

/**
 * @param {object[]} orders
 * @param {string} [filename]
 */
export function downloadOrdersCsv(orders, filename = 'orders-export.csv') {
  const lines = [
    ORDER_COLUMNS.map((c) => c.header).join(','),
    ...orders.map((o) =>
      ORDER_COLUMNS.map((c) => escapeCell(o[c.key])).join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
