import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validar, tint, PALETA, CATEGORIAS_BASE, MAX_CATEGORIAS } from '../../js/categorias.js';

test('la lista inicial es válida', () => {
  assert.deepEqual(validar(CATEGORIAS_BASE), CATEGORIAS_BASE);
});

test('validar rechaza listas mal formadas', () => {
  assert.equal(validar(null), null);
  assert.equal(validar([]), null);
  assert.equal(validar([{ id: 'a', nombre: '', color: 'rosa' }]), null); // sin nombre
  assert.equal(validar([{ nombre: 'Sin id', color: 'rosa' }]), null);
  assert.equal(validar(Array.from({ length: MAX_CATEGORIAS + 1 }, (_, i) => ({ id: `c${i}`, nombre: `C${i}`, color: 'rosa' }))), null);
});

test('un color desconocido pasa a gris y los nombres largos se recortan', () => {
  const [c] = validar([{ id: 'x', nombre: `  ${'a'.repeat(40)}  `, color: 'turquesa-raro' }]);
  assert.equal(c.color, 'gris');
  assert.equal(c.nombre.length, 24);
});

test('tint devuelve la variable CSS del color (o gris si no existe)', () => {
  assert.equal(tint(PALETA[0].id), `--c: var(--c-${PALETA[0].id})`);
  assert.equal(tint('inexistente'), '--c: var(--c-gris)');
});
