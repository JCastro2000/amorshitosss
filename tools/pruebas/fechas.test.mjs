import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dateStr, byDate, timeLabel, ocurrenciaN, ocurrencias, etiquetaRepite } from '../../js/dates.js';

test('addDays cruza meses y años', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(dateStr(new Date(2026, 0, 5)), '2026-01-05');
});

test('la lista ordena por día, "todo el día" primero y luego por hora', () => {
  const eventos = [
    { fecha: '2026-11-07', inicio: '20:00', titulo: 'Cena' },
    { fecha: '2026-11-07', inicio: '', titulo: 'Cumpleaños' },
    { fecha: '2026-11-06', inicio: '23:00', titulo: 'Película' },
    { fecha: '2026-11-07', inicio: '09:30', titulo: 'Dentista' },
  ];
  assert.deepEqual(eventos.sort(byDate).map((e) => e.titulo), ['Película', 'Cumpleaños', 'Dentista', 'Cena']);
});

test('textos de hora', () => {
  assert.equal(timeLabel({ inicio: '', fin: '' }), 'Todo el día');
  assert.equal(timeLabel({ inicio: '18:30', fin: '' }), '18:30');
  assert.equal(timeLabel({ inicio: '18:30', fin: '20:00' }), '18:30 – 20:00');
});

test('repetición mensual: si el día no existe, cae en el último del mes', () => {
  assert.equal(ocurrenciaN('2026-01-31', 'mensual', 1), '2026-02-28');
  assert.equal(ocurrenciaN('2026-01-31', 'mensual', 2), '2026-03-31');
  assert.equal(ocurrenciaN('2026-11-22', 'mensual', 2), '2027-01-22');
});

test('repetición anual: el 29 de febrero cae en el 28 los años sin bisiesto', () => {
  assert.equal(ocurrenciaN('2024-02-29', 'anual', 1), '2025-02-28');
  assert.equal(ocurrenciaN('2024-02-29', 'anual', 4), '2028-02-29');
});

test('las fechas de una serie dentro de un rango', () => {
  assert.deepEqual(ocurrencias('2026-11-22', 'mensual', '2026-11-05', '2027-03-05'), ['2026-11-22', '2026-12-22', '2027-01-22', '2027-02-22']);
  assert.deepEqual(ocurrencias('2025-01-06', 'semanal', '2026-11-05', '2026-11-30', 8), ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
  assert.deepEqual(ocurrencias('2020-03-15', 'anual', '2026-11-05', '2028-12-31'), ['2027-03-15', '2028-03-15']); // serie antigua
  assert.deepEqual(ocurrencias('2026-12-01', 'mensual', '2026-11-05', '2027-01-31'), ['2026-12-01', '2027-01-01']); // aún no empieza
  assert.deepEqual(ocurrencias('2026-11-05', '', '2026-11-05', '2027-01-31'), []); // no se repite
  assert.equal(ocurrencias('2026-01-01', 'semanal', '2026-01-01', '2036-01-01', 5).length, 5); // respeta el máximo
});

test('etiquetas de repetición', () => {
  assert.equal(etiquetaRepite('mensual'), 'Cada mes');
  assert.equal(etiquetaRepite(''), 'No se repite');
});
