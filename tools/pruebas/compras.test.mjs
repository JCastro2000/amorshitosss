import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clave, porNombre, sugerencias, textoLista } from '../../js/compras.js';

test('los nombres se comparan sin importar mayúsculas ni tildes', () => {
  assert.equal(clave('  Café '), clave('cafe'));
  assert.notEqual(clave('leche'), clave('leches'));
});

test('el orden por nombre ignora mayúsculas y tildes', () => {
  const nombres = ['Zanahoria', 'azúcar', 'arroz', 'Café', 'Leche'].map((nombre) => ({ nombre }));
  assert.deepEqual(nombres.sort(porNombre).map((c) => c.nombre), ['arroz', 'azúcar', 'Café', 'Leche', 'Zanahoria']);
});

test('las sugerencias son los archivados, los más comprados primero, filtrados por lo escrito', () => {
  const compras = [
    { nombre: 'Leche', archivado: true, veces: 5 },
    { nombre: 'Lechuga', archivado: true, veces: 1 },
    { nombre: 'Arroz', archivado: true, veces: 9 },
    { nombre: 'Pan', archivado: false, veces: 20 }, // sigue en la lista: no se sugiere
  ];
  assert.deepEqual(sugerencias(compras, '').map((c) => c.nombre), ['Arroz', 'Leche', 'Lechuga']);
  assert.deepEqual(sugerencias(compras, 'LECH').map((c) => c.nombre), ['Leche', 'Lechuga']);
  assert.deepEqual(sugerencias(compras, 'xyz'), []);
});

test('el texto para compartir lista lo pendiente con su cantidad', () => {
  assert.equal(textoLista([{ nombre: 'Arroz', cantidad: '2 kg' }, { nombre: 'Leche' }]), '🛒 Lista de compras\n• Arroz (2 kg)\n• Leche');
});
