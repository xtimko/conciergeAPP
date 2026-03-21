/** Сборка полного адреса доставки (как на сервере). */
export function buildClientDeliveryAddress(c) {
  if (!c) return '';
  const parts = [
    c.city && `г. ${c.city}`,
    c.address_street,
    c.address_house && `д. ${c.address_house}`,
    c.address_apartment && `кв. ${c.address_apartment}`,
    c.address_floor && `эт. ${c.address_floor}`,
    c.address_entrance && `подъезд ${c.address_entrance}`,
    c.intercom && `домофон ${c.intercom}`,
  ].filter(Boolean);
  let s = parts.join(', ');
  if (c.courier_comment) s += (s ? '. ' : '') + String(c.courier_comment).trim();
  return s || c.delivery_address || '';
}
