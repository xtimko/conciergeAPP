/**
 * Единая логика поиска клиента: как в разделе «Клиенты» (подстрока по полям)
 * + public_id / цифры CLI, телефон и Telegram ID по цифрам, @ник без @.
 */
export function clientMatchesSearch(client, qRaw) {
  const q = String(qRaw || '').trim().toLowerCase();
  if (!q) return false;

  const qNoAt = q.replace(/^@/, '');
  const tgNorm = String(client.telegram_username || '')
    .toLowerCase()
    .replace(/^@/, '');

  const baseFields = [
    client.full_name,
    client.first_name,
    client.last_name,
    client.email,
    client.phone,
    client.city,
    client.referral_code,
    client.id,
    client.telegram_id,
    client.telegram_username,
    client.public_id,
  ];

  if (baseFields.some((f) => String(f || '').toLowerCase().includes(q))) {
    return true;
  }

  if (tgNorm && qNoAt.length > 0 && tgNorm.includes(qNoAt)) {
    return true;
  }

  const qDigits = q.replace(/\D/g, '');
  if (qDigits.length >= 2) {
    const phoneDigits = String(client.phone || '').replace(/\D/g, '');
    if (phoneDigits && phoneDigits.includes(qDigits)) return true;

    const pidDigits = String(client.public_id || '').replace(/\D/g, '');
    if (pidDigits && (pidDigits === qDigits || pidDigits.endsWith(qDigits))) return true;

    const tgIdDigits = String(client.telegram_id || '').replace(/\D/g, '');
    if (tgIdDigits && tgIdDigits.includes(qDigits)) return true;
  }

  return false;
}

/**
 * Список клиентов для раздела «Клиенты»: пустой запрос — все клиенты.
 */
export function filterClientsForAdminList(clients, query) {
  const q = String(query || '').trim();
  if (!q) return clients;
  return clients.filter((c) => clientMatchesSearch(c, q));
}

/**
 * Подсказки при оформлении заказа: пустой ввод — пустой список.
 */
export function filterClientsForOrderAutocomplete(clients, query) {
  const q = String(query || '').trim();
  if (!q) return [];
  return clients.filter((c) => clientMatchesSearch(c, q));
}
