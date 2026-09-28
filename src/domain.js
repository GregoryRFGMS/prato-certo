export const money = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
export const pct = (n) => `${Number(n).toFixed(1).replace('.', ',')}%`;
export const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function unitCost(i) {
  if (!(i.amount > 0) || !(i.price >= 0))
    throw Error('Informe quantidade positiva e preço válido.');
  return i.price / (i.amount * ({ kg: 1000, L: 1000, g: 1, ml: 1, un: 1 }[i.unit] || 1));
}
export function recipeCost(r, ins) {
  if (!(r.yield > 0)) throw Error('O rendimento precisa ser maior que zero.');
  return (
    r.items.reduce((s, it) => {
      const i = ins.find((i) => i.id === it.id);
      if (!i || !(it.qty > 0)) throw Error('Revise os ingredientes e quantidades.');
      return s + unitCost(i) * it.qty;
    }, 0) / r.yield
  );
}
export function contribution(price, cost, fee = 0, extra = 0) {
  return round(price * (1 - fee / 100) - cost - extra);
}
export function suggested(cost, extra, fee, target) {
  if (target < 0 || fee < 0 || target + fee >= 100)
    throw Error('A soma da margem e das taxas deve ser menor que 100%.');
  return Math.ceil(((cost + extra) / (1 - (fee + target) / 100)) * 100) / 100;
}
export const baseUnit = (u) => ({ kg: 'g', L: 'ml', g: 'g', ml: 'ml', un: 'un' })[u];
