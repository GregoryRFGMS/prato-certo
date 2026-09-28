import test from 'node:test';
import assert from 'node:assert/strict';
import { unitCost, recipeCost, contribution, suggested } from './domain.js';
test('converte kg para g e divide pelo rendimento', () => {
  const i = { id: 1, price: 40, amount: 1, unit: 'kg' };
  assert.equal(unitCost(i), 0.04);
  assert.equal(recipeCost({ yield: 2, items: [{ id: 1, qty: 300 }] }, [i]), 6);
});
test('embalagem por unidade', () =>
  assert.equal(unitCost({ price: 60, amount: 50, unit: 'un' }), 1.2));
test('margem inclui taxa sobre venda e despesa unitária', () =>
  assert.equal(contribution(30, 10, 10, 2), 15));
test('preço sugerido atinge margem com taxas', () => assert.equal(suggested(10, 2, 10, 30), 20));
test('rejeita valores impossíveis', () => {
  assert.throws(() => suggested(10, 0, 20, 80));
  assert.throws(() => recipeCost({ yield: 0, items: [] }, []));
});
test('snapshot preserva custo após alteração do insumo', () => {
  const i = { id: 1, price: 40, amount: 1, unit: 'kg' },
    r = { yield: 1, items: [{ id: 1, qty: 100 }] };
  const sale = { cost: recipeCost(r, [i]) };
  i.price = 50;
  assert.equal(sale.cost, 4);
  assert.equal(recipeCost(r, [i]), 5);
});
