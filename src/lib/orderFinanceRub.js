// @ts-nocheck
/** Множитель: цена в валюте → рубли (fx = рублей за 1 единицу валюты). */
export function orderFxMultiplier(order) {
  const c = String(order?.currency || 'RUB').toUpperCase();
  const fx = Number(order?.fx_rate_to_rub ?? 0);
  if (c === 'RUB') return 1;
  if (fx > 0) return fx;
  return 1;
}

export function orderPriceRub(order) {
  return Number(order?.price || 0) * orderFxMultiplier(order);
}

export function orderCostRub(order) {
  return Number(order?.cost_price || 0) * orderFxMultiplier(order);
}

export function orderProfitRub(order) {
  return orderPriceRub(order) - orderCostRub(order);
}
