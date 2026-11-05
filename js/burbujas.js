// Burbujas de conexión: una burbuja con un corazón y las iniciales por cada persona que tiene la app abierta.
// Flotan sin parar por la pantalla (nunca se quedan quietas tapando algo). Cuando está la otra persona, se
// acerca hasta donde estás tú y se juntan y viajan juntas; cuando se va, tu burbuja sigue exactamente con el
// mismo movimiento (no se reinicia) y la otra se desvanece. No reciben toques.
// Con "reducir movimiento" quedan quietas abajo.

const TAM = 64; // diámetro de la burbuja
const ABAJO = 92; // espacio para la barra de pestañas
const ARRIBA = 56;
const SEPARACION = 0.38; // cuánto se solapan al juntarse (proporción del diámetro)
const SALIDA_MS = 650; // duración del desvanecido
const DEMORA_SALIDA_MS = 700; // la que se va sigue un momento su camino antes de desvanecerse
const VELOCIDAD = 50; // px por segundo, igual para todas: al juntarse o separarse no hay cambio de ritmo

const reducido = matchMedia('(prefers-reduced-motion: reduce)');
let capa = null;
let yo = null; // { id, iniciales, tono }
let otro = null; // la otra persona conectada
let saliente = null; // la otra persona justo después de irse (mientras se desvanece)
const nodos = new Map(); // id → { el, saliendo, timer }
let frame = 0;
let ultimo = 0;
let acumulado = 0; // tiempo desde el último dibujo: se dibuja a 30 cuadros por segundo para cuidar la batería
let enPareja = false; // una vez juntas, el brillo se mantiene mientras estén las dos (aunque una vaya un poco rezagada)
const t0 = performance.now();

// Cada burbuja avanza siempre a velocidad constante, curvando suave y rebotando en los bordes de la pantalla.
const cuerpo = (giro, fase) => ({ x: null, y: null, a: Math.random() * Math.PI * 2, giro, fase });
const cuerpos = { yo: cuerpo(0.9, 0), otro: cuerpo(1.1, 2.4), centro: cuerpo(0.8, 4.1) };

const CORAZON = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const zona = () => ({ x0: TAM / 2 + 8, x1: innerWidth - TAM / 2 - 8, y0: ARRIBA + TAM / 2, y1: innerHeight - ABAJO - TAM / 2 });

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
  el.className = 'burbuja nueva';
  el.style.setProperty('--tono', p.tono);
  el.append(svg, iniciales);
  capa.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('nueva'))); // entra inflándose
  return el;
}

// Muestra a esta persona (la crea o, si se estaba yendo, la rescata).
function mostrar(p) {
  let n = nodos.get(p.id);
  if (!n) {
    n = { el: crear(p), saliendo: false, timer: 0 };
    nodos.set(p.id, n);
  } else {
    clearTimeout(n.timer);
    n.saliendo = false;
    n.el.classList.remove('sale');
    n.el.querySelector('.ini').textContent = p.iniciales;
    n.el.style.setProperty('--tono', p.tono);
  }
}

// La retira tras `demora` ms con un desvanecido.
function retirar(id, demora = 0) {
  const n = nodos.get(id);
  if (!n || n.saliendo) return;
  n.saliendo = true;
  n.timer = setTimeout(() => {
    n.el.classList.add('sale');
    n.timer = setTimeout(() => {
      n.el.remove();
      nodos.delete(id);
      if (saliente?.id === id) saliente = null;
      if (!nodos.size) parar();
    }, SALIDA_MS);
  }, reducido.matches ? 0 : demora);
}

// Cuando llega la otra persona entra por arriba o por abajo, y el punto de encuentro es donde está tu burbuja.
function prepararEncuentro() {
  const area = zona();
  const mitad = TAM * SEPARACION;
  const c = cuerpos.centro;
  colocar(cuerpos.yo, area);
  c.x = Math.min(Math.max(cuerpos.yo.x ?? (area.x0 + area.x1) / 2, area.x0 + mitad), area.x1 - mitad);
  c.y = cuerpos.yo.y ?? (area.y0 + area.y1) / 2;
  c.a = cuerpos.yo.a;
  const o = cuerpos.otro;
  o.x = area.x0 + Math.random() * (area.x1 - area.x0);
  o.y = Math.random() < 0.5 ? area.y0 : area.y1;
}

// me: { id, iniciales, tono } o null (burbujas apagadas); otros: lista con el mismo formato.
export function update({ yo: me, otros }) {
  capa ??= document.getElementById('burbujas');
  if (!capa) return;
  const nuevoOtro = me ? otros[0] ?? null : null;

  if (me) mostrar(me);
  else if (yo) retirar(yo.id);

  if (nuevoOtro) {
    if (!otro) prepararEncuentro();
    mostrar(nuevoOtro);
    saliente = null;
  } else if (otro) {
    saliente = otro;
    retirar(otro.id, me ? DEMORA_SALIDA_MS : 0);
  }
  yo = me;
  otro = nuevoOtro;
  arrancar();
}

function parar() {
  cancelAnimationFrame(frame);
  frame = 0;
}

function arrancar() {
  if (!nodos.size) return parar();
  if (reducido.matches) {
    parar();
    dibujar(0, 0);
  } else if (!frame && !document.hidden) {
    ultimo = performance.now();
    acumulado = 0;
    frame = requestAnimationFrame(paso);
  }
}

const CUADRO_MIN = 1 / 30 - 0.003;

function paso(ahora) {
  acumulado += Math.min(0.1, (ahora - ultimo) / 1000);
  ultimo = ahora;
  if (acumulado >= CUADRO_MIN) {
    dibujar((ahora - t0) / 1000, Math.min(0.05, acumulado));
    acumulado = 0;
  }
  frame = requestAnimationFrame(paso);
}

const mezcla = (a, b, k) => a + (b - a) * k;

// Gira `a` hacia `b` por el camino más corto.
const girarHacia = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

function colocar(c, area) {
  if (c.x != null) return;
  c.x = mezcla(area.x0, area.x1, Math.random());
  c.y = mezcla(area.y0, area.y1, Math.random());
}

function avanzar(c, dt, t, area) {
  colocar(c, area);
  c.a += Math.sin(t * 0.5 + c.fase) * c.giro * dt; // curva suave
  c.x += Math.cos(c.a) * VELOCIDAD * dt;
  c.y += Math.sin(c.a) * VELOCIDAD * dt;
  if (c.x < area.x0) { c.x = area.x0; c.a = Math.PI - c.a; }
  else if (c.x > area.x1) { c.x = area.x1; c.a = Math.PI - c.a; }
  if (c.y < area.y0) { c.y = area.y0; c.a = -c.a; }
  else if (c.y > area.y1) { c.y = area.y1; c.a = -c.a; }
}

function dibujar(t, dt) {
  const area = zona();
  const quietas = reducido.matches;
  const mitad = TAM * SEPARACION;
  const emparejado = otro ?? saliente;
  const juntas = !!otro && !!yo; // viajan en pareja
  const pareja = [yo, emparejado].filter(Boolean).sort((a, b) => (a.id < b.id ? -1 : 1)); // el mismo orden en los dos teléfonos
  const lado = (id) => (pareja.length === 2 && pareja[0].id === id ? -1 : 1);
  if (!otro || !yo) enPareja = false;
  let unidas = false;
  Object.values(cuerpos).forEach((c) => colocar(c, area));

  if (!quietas) {
    avanzar(cuerpos.centro, dt, t, { ...area, x0: area.x0 + mitad, x1: area.x1 - mitad }); // el punto de encuentro deja sitio a las dos
    if (juntas) {
      // Se acercan al punto de encuentro y lo acompañan, con la misma dirección que lleva.
      const jala = 1 - Math.exp(-dt * 2.6);
      const c = cuerpos.centro;
      let lejos = 0;
      for (const [id, b] of [[yo.id, cuerpos.yo], [otro.id, cuerpos.otro]]) {
        avanzar(b, dt, t, area); // sigue avanzando mientras se acerca, así no queda rezagada respecto al punto de encuentro
        const tx = c.x + lado(id) * mitad;
        b.x = mezcla(b.x, tx, jala);
        b.y = mezcla(b.y, c.y, jala);
        b.a = girarHacia(b.a, c.a, jala);
        lejos = Math.max(lejos, Math.hypot(b.x - tx, b.y - c.y));
      }
      if (lejos < 14) enPareja = true; // ya están juntas
      else if (lejos > 120) enPareja = false; // se desordenó (por ejemplo, giró la pantalla): vuelven a acercarse
      unidas = enPareja;
    } else {
      // Cada una sigue por su cuenta, desde donde estaba y con la dirección que llevaba: no se reinicia nada.
      avanzar(cuerpos.yo, dt, t, area);
      avanzar(cuerpos.otro, dt, t, area);
    }
  } else {
    unidas = juntas;
  }

  for (const [id, n] of nodos) {
    const esYo = id === yo?.id;
    const b = esYo ? cuerpos.yo : cuerpos.otro;
    let x;
    let y;
    if (quietas) {
      [x, y] = juntas ? [innerWidth / 2 + lado(id) * mitad, area.y1] : [esYo ? area.x0 + TAM : area.x1 - TAM, area.y1];
    } else {
      x = b.x;
      y = b.y + 4 * Math.sin(t * 1.7 + b.fase); // un leve vaivén, como si flotara
    }
    n.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    n.el.classList.toggle('junta', unidas);
  }
}

addEventListener('resize', () => nodos.size && reducido.matches && dibujar(0, 0));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) parar();
  else arrancar();
});
