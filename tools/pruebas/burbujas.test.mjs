// Simula la pantalla (sin navegador) y los cuadros a 60 por segundo para comprobar cómo se mueven las burbujas:
// que nunca se frenen, que la que queda siga su camino cuando la otra se va, que el brillo no parpadee
// mientras están juntas y que la que se va se desvanezca y se quite.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

let ahora = 1000;
let colas = [];
const temporizadores = [];
const elementos = [];

function elemento() {
  const clases = new Set();
  const e = {
    style: { setProperty() {}, transform: '' },
    className: '',
    classList: {
      add: (c) => clases.add(c),
      remove: (c) => clases.delete(c),
      toggle: (c, on) => (on ? clases.add(c) : clases.delete(c)),
    },
    append() {},
    setAttribute() {},
    remove() { e.quitado = true; },
    querySelector: () => ({ textContent: '' }),
    clases,
  };
  elementos.push(e);
  return e;
}

const unaPersona = { id: 'a', iniciales: 'JC', tono: 'x' };
const otraPersona = { id: 'b', iniciales: 'LV', tono: 'y' };
const trazas = { yo: [], ella: [] };
const marcas = {};

function cuadro() {
  ahora += 1000 / 60;
  for (let i = temporizadores.length - 1; i >= 0; i--) {
    if (temporizadores[i].en <= ahora) temporizadores.splice(i, 1)[0].f();
  }
  const f = colas.shift();
  if (f) f(ahora);
}

before(async () => {
  globalThis.performance = { now: () => ahora };
  globalThis.requestAnimationFrame = (f) => { colas.push(f); return colas.length; };
  globalThis.cancelAnimationFrame = () => { colas = []; };
  globalThis.innerWidth = 375;
  globalThis.innerHeight = 812;
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.addEventListener = () => {};
  globalThis.setTimeout = (f, ms) => { temporizadores.push({ f, en: ahora + ms }); return temporizadores.length; };
  globalThis.clearTimeout = () => {};
  const capa = elemento();
  elementos.length = 0;
  globalThis.document = { hidden: false, addEventListener() {}, getElementById: () => capa, createElement: () => elemento(), createElementNS: () => elemento() };

  const { update } = await import('../../js/burbujas.js');
  const correr = (segundos, fase) => {
    marcas[fase] = trazas.yo.length;
    for (let i = 0; i < segundos * 60; i++) {
      cuadro();
      const [mia, otra] = elementos.filter((e) => e.className.startsWith('burbuja'));
      const pos = (e) => { const m = e?.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/); return m ? [+m[1], +m[2]] : null; };
      trazas.yo.push({ fase, p: pos(mia), junta: mia?.clases.has('junta') });
      trazas.ella.push({ fase, p: pos(otra), junta: otra?.clases.has('junta'), sale: otra?.clases.has('sale'), quitada: !!otra?.quitado });
    }
  };
  update({ yo: unaPersona, otros: [] });
  correr(6, 'sola');
  update({ yo: unaPersona, otros: [otraPersona] });
  correr(8, 'pareja');
  update({ yo: unaPersona, otros: [] });
  correr(6, 'despues');
});

// Velocidad entre un dibujo y el siguiente (se dibuja a 30 cuadros por segundo).
function velocidades(desde, hasta) {
  const lista = [];
  let previo = null;
  for (let i = desde; i < hasta; i++) {
    const p = trazas.yo[i].p;
    if (!p) continue;
    if (!previo) previo = { p, i };
    else if (p[0] !== previo.p[0] || p[1] !== previo.p[1]) {
      lista.push(Math.hypot(p[0] - previo.p[0], p[1] - previo.p[1]) / ((i - previo.i) / 60));
      previo = { p, i }; // solo cuando se dibujó de nuevo: así el tiempo entre dibujos es el real
    }
  }
  return lista;
}

test('la burbuja propia nunca se queda quieta', () => {
  const v = velocidades(60, trazas.yo.length); // se omite el primer segundo (arranque)
  assert.ok(v.length > 100);
  assert.ok(Math.min(...v) > 15, `velocidad mínima ${Math.min(...v)}`);
});

test('al irse la otra persona, la que queda sigue con el mismo ritmo (no se reinicia)', () => {
  const v = velocidades(marcas.despues, marcas.despues + 90); // el primer segundo y medio tras la desconexión
  assert.ok(Math.min(...v) > 30 && Math.max(...v) < 90, `velocidades entre ${Math.min(...v)} y ${Math.max(...v)}`);
});

test('se juntan en pocos segundos y el brillo no parpadea mientras están las dos', () => {
  const desde = marcas.pareja;
  const unida = trazas.yo.findIndex((c, i) => i >= desde && c.junta);
  assert.ok(unida >= 0 && (unida - desde) / 60 < 5, 'tarda demasiado en juntarse');
  const fin = marcas.despues;
  for (let i = unida; i < fin; i++) {
    assert.ok(trazas.yo[i].junta, `la burbuja propia dejó de brillar en el cuadro ${i - unida}`);
    assert.ok(trazas.ella[i].junta, `la otra burbuja dejó de brillar en el cuadro ${i - unida}`);
  }
});

test('la que se va se desvanece y se quita', () => {
  const desde = marcas.despues;
  const desvanece = trazas.ella.findIndex((c, i) => i >= desde && c.sale);
  const quitada = trazas.ella.findIndex((c, i) => i >= desde && c.quitada);
  assert.ok(desvanece >= 0 && (desvanece - desde) / 60 < 1.2, 'no se desvanece a tiempo');
  assert.ok(quitada >= 0 && (quitada - desde) / 60 < 2.2, 'no se quita a tiempo');
  assert.ok(trazas.ella.slice(desde, desvanece).every((c) => c.p), 'desaparece antes de empezar a desvanecerse');
});

test('las burbujas se quedan dentro de la pantalla', () => {
  for (const c of trazas.yo) {
    if (!c.p) continue;
    assert.ok(c.p[0] >= 0 && c.p[0] <= 375 && c.p[1] >= 0 && c.p[1] <= 812, `fuera de pantalla: ${c.p}`);
  }
});
