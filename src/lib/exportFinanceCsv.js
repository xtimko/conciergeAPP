import { exportCsvString } from '@/lib/exportOrdersCsv';

function escapeCell(val) {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers, rows) {
  const h = headers.join(',');
  const b = rows.map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n');
  return `\uFEFF${h}\n${b}`;
}

/** Доставленные заказы с колонкой profit */
export function buildDeliveredPnLCsv(orders) {
  const delivered = (orders || []).filter((o) => o.status === 'delivered');
  const headers = [
    'id',
    'created_date',
    'client_name',
    'item_name',
    'brand',
    'price',
    'cost_price',
    'profit',
    'currency',
  ];
  const rows = delivered.map((o) => {
    const price = Number(o.price || 0);
    const cost = Number(o.cost_price || 0);
    return [
      o.id,
      o.created_date,
      o.client_name,
      o.item_name,
      o.brand,
      price,
      cost,
      price - cost,
      o.currency || 'RUB',
    ];
  });
  return rowsToCsv(headers, rows);
}

/** Помесячная сводка по доставленным (по дате создания заказа) */
export function buildMonthlyDeliveredSummaryCsv(orders) {
  const delivered = (orders || []).filter((o) => o.status === 'delivered');
  const byMonth = {};
  for (const o of delivered) {
    const raw = o.created_date;
    const m = typeof raw === 'string' && raw.length >= 7 ? raw.slice(0, 7) : null;
    if (!m) continue;
    if (!byMonth[m]) byMonth[m] = { revenue: 0, cost: 0, count: 0 };
    byMonth[m].revenue += Number(o.price || 0);
    byMonth[m].cost += Number(o.cost_price || 0);
    byMonth[m].count += 1;
  }
  const sorted = Object.keys(byMonth).sort();
  const headers = ['month', 'delivered_orders', 'revenue', 'cost', 'profit'];
  const rows = sorted.map((month) => {
    const v = byMonth[month];
    return [month, v.count, v.revenue, v.cost, v.revenue - v.cost];
  });
  return rowsToCsv(headers, rows);
}

export async function exportDeliveredPnLFile(orders, filename = 'delivered-pnl.csv') {
  const delivered = (orders || []).filter((o) => o.status === 'delivered');
  if (!delivered.length) return 'empty';
  return exportCsvString(buildDeliveredPnLCsv(orders), filename);
}

export async function exportMonthlySummaryFile(orders, filename = 'finance-by-month.csv') {
  const delivered = (orders || []).filter((o) => o.status === 'delivered');
  if (!delivered.length) return 'empty';
  return exportCsvString(buildMonthlyDeliveredSummaryCsv(orders), filename);
}
