// Burbujas de conexión: una burbuja con un corazón y las iniciales por cada persona que tiene la app abierta.
// Flotan por la pantalla; cuando están las dos personas, se acercan y se juntan, y cuando una se va, se separan.
// Las burbujas no reciben toques (no tapan nada). Con "reducir movimiento" quedan quietas abajo.

const TAM = 64; // diámetro de la burbuja
const ABAJO = 92; // espacio para la barra de pestañas
const ARRIBA = 56;

const reducido = matchMedia('(prefers-reduced-motion: reduce)');
let capa = null;
let yo = null; // { id, iniciales, tono }
let otro = null;
const nodos = new Map(); // id → elemento
let frame = 0;
let ultimo = 0;
let juntas = 0; // 0 = separadas, 1 = juntas (se mueve suave hacia el objetivo)
const t0 = performance.now();

const CORAZON = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

function crear(p) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CORAZON);
  svg.append(path);
  const iniciales = document.createElement('span');
  iniciales.className = 'ini';
  iniciales.textContent = p.iniciales;
  const el = document.createElement('div');
  el.className = 'burbuja';
  el.style.setProperty('--tono', p.tono);
  el.append(svg, iniciales);
  capa.append(el);
  return el;
}

// me: { id, iniciales, tono } o null (burbujas apagadas); others: lista con el mismo formato.
export function update({ yo: me, otros }) {
  capa ??= document.getElementById('burbujas');
  if (!capa) return;
  yo = me;
  otro = me ? otros[0] ?? null : null;

  const vivos = new Map([yo, otro].filter(Boolean).map((p) => [p.id, p]));
  for (const [id, el] of nodos) {
    if (!vivos.has(id)) {
      el.remove();
      nodos.delete(id);
    }
  }
  for (const [id, p] of vivos) {
    if (!nodos.has(id)) nodos.set(id, crear(p));
    else {
      nodos.get(id).querySelector('.ini').textContent = p.iniciales;
      nodos.get(id).style.setProperty('--tono', p.tono);
    }
  }
  arrancar();
}

function arrancar() {
  cancelAnimationFrame(frame);
  frame = 0;
  if (!nodos.size) return;
  if (reducido.matches) {
    juntas = otro ? 1 : 0;
    dibujar(0);
  } else if (!document.hidden) {
    ultimo = performance.now();
    frame = requestAnimationFrame(paso);
  }
}

function paso(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  const objetivo = otro ? 1 : 0;
  juntas += (objetivo - juntas) * (1 - Math.exp(-dt * 1.4)); // se acercan en un par de segundos
  dibujar((ahora - t0) / 1000);
  frame = requestAnimationFrame(paso);
}

const mezcla = (a, b, k) => a + (b - a) * k;

// Camino suave por la pantalla (curva de Lissajous): cada burbuja tiene el suyo.
function camino(t, f, area) {
  const cx = (area.x0 + area.x1) / 2;
  const cy = (area.y0 + area.y1) / 2;
  const ax = ((area.x1 - area.x0) / 2) * f.ax;
  const ay = ((area.y1 - area.y0) / 2) * f.ay;
  return [
    cx + ax * Math.sin(t * f.wx + f.px),
    cy + ay * Math.sin(t * f.wy + f.py) + 5 * Math.sin(t * 1.7 + f.px), // un leve vaivén, como si flotara
  ];
}

const CAMINOS = {
  yo: { ax: 0.95, ay: 0.9, wx: 0.11, wy: 0.083, px: 0, py: 1.3 },
  otro: { ax: 0.95, ay: 0.9, wx: 0.087, wy: 0.103, px: 2.4, py: 0.4 },
  juntas: { ax: 0.7, ay: 0.7, wx: 0.07, wy: 0.057, px: 1.1, py: 2.2 },
};

function dibujar(t) {
  const area = { x0: TAM / 2 + 8, x1: innerWidth - TAM / 2 - 8, y0: ARRIBA + TAM / 2, y1: innerHeight - ABAJO - TAM / 2 };
  const quietas = reducido.matches;
  const k = juntas * juntas * (3 - 2 * juntas); // suaviza el acercamiento
  const pareja = [yo, otro].filter(Boolean).sort((a, b) => (a.id < b.id ? -1 : 1)); // el mismo orden en los dos teléfonos
  const centro = quietas ? [innerWidth / 2, area.y1] : camino(t, CAMINOS.juntas, area);

  for (const [id, el] of nodos) {
    const esYo = id === yo?.id;
    let [x, y] = quietas
      ? [esYo ? area.x0 + TAM : area.x1 - TAM, area.y1]
      : camino(t, esYo ? CAMINOS.yo : CAMINOS.otro, area);
    if (otro) {
      const lado = pareja[0].id === id ? -1 : 1;
      x = mezcla(x, centro[0] + lado * TAM * 0.38, k);
      y = mezcla(y, centro[1], k);
    }
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.classList.toggle('junta', !!otro && juntas > 0.97);
  }
}

addEventListener('resize', () => nodos.size && reducido.matches && dibujar(0));
document.addEventListener('visibilitychange', arrancar);
