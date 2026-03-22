/**
 * Публичный идентификатор клиента для UI (без почты).
 */
export function getClientDisplayHandle(client) {
  if (!client) return '—';
  if (client.public_id) return client.public_id;
  const u = client.telegram_username && String(client.telegram_username).replace(/^@/, '').trim();
  if (u) return `@${u}`;
  if (client.telegram_id != null && String(client.telegram_id).trim() !== '') {
    return `TG ${String(client.telegram_id)}`;
  }
  const id = client.id != null ? String(client.id) : '';
  if (id.length <= 12) return id || '—';
  return `${id.slice(0, 8)}…`;
}

export function getClientPrimaryName(client) {
  if (!client) return '';
  const n = [client.first_name, client.last_name].filter(Boolean).join(' ').trim();
  if (n) return n;
  if (client.full_name) return String(client.full_name).trim();
  return '';
}

/** Стабильный «email» заказа, если у клиента нет почты (связь с бэкендом). */
export function getClientEmailForOrder(client) {
  if (!client) return '';
  const e = (client.email || '').trim();
  if (e) return e;
  if (client.telegram_id != null && String(client.telegram_id).trim() !== '') {
    return `tg-${String(client.telegram_id).trim()}@client.internal`;
  }
  return `id-${String(client.id).trim()}@client.internal`;
}

/** Короткий номер клиента CLI-000001 (после миграции на бэкенде). */
export function getClientPublicId(client) {
  if (!client) return '—';
  if (client.public_id) return client.public_id;
  const id = String(client.id || '');
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}
