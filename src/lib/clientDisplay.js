/**
 * Публичный идентификатор клиента для UI (без почты).
 */
export function getClientDisplayHandle(client) {
  if (!client) return '—';
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
