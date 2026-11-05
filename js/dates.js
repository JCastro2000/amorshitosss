// Fechas como texto "AAAA-MM-DD" y horas como "HH:MM" (así se ordenan solas y no dependen de la zona horaria).

const pad = (n) => String(n).padStart(2, '0');
export const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => dateStr(new Date());

// Mediodía local: evita que el horario de verano mueva el día.
export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateStr(d);
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const long = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
const longYear = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// "Hoy", "Mañana", "Ayer" o "Sábado 8 de noviembre".
export function dayLabel(s) {
  const today = todayStr();
  if (s === today) return 'Hoy';
  if (s === addDays(today, 1)) return 'Mañana';
  if (s === addDays(today, -1)) return 'Ayer';
  const d = parseDate(s);
  return cap((d.getFullYear() === new Date().getFullYear() ? long : longYear).format(d));
}

// Fecha corta bajo "Hoy"/"Mañana": "sábado 8 de noviembre".
export const dayDetail = (s) => long.format(parseDate(s));

export const timeLabel = (ev) => (!ev.inicio ? 'Todo el día' : ev.fin ? `${ev.inicio} – ${ev.fin}` : ev.inicio);

// Orden de la lista: por día, luego "todo el día" primero, luego por hora y título.
export const byDate = (a, b) => a.fecha.localeCompare(b.fecha)
  || (a.inicio ?? '').localeCompare(b.inicio ?? '')
  || a.titulo.localeCompare(b.titulo, 'es');

// ---------- Eventos que se repiten ----------

export const REPETICIONES = [['', 'No se repite'], ['semanal', 'Cada semana'], ['mensual', 'Cada mes'], ['anual', 'Cada año']];
export const etiquetaRepite = (r) => REPETICIONES.find(([id]) => id === r)?.[1] ?? '';

const diasDelMes = (y, m) => new Date(y, m, 0).getDate(); // m: 1 a 12
const diasEntre = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const armar = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// La fecha número `n` de una serie que empieza en `base` (n = 0 es la propia fecha base).
// Si el día no existe en ese mes (31 de febrero, 29 de febrero sin bisiesto), cae en el último día del mes.
export function ocurrenciaN(base, repite, n) {
  if (repite === 'semanal') return addDays(base, 7 * n);
  const [y, m, d] = base.split('-').map(Number);
  if (repite === 'mensual') {
    const meses = m - 1 + n;
    const yy = y + Math.floor(meses / 12);
    const mm = (meses % 12) + 1;
    return armar(yy, mm, Math.min(d, diasDelMes(yy, mm)));
  }
  if (repite === 'anual') return armar(y + n, m, Math.min(d, diasDelMes(y + n, m)));
  return base;
}

// Las fechas de la serie que caen entre `desde` y `hasta` (como máximo `max`).
export function ocurrencias(base, repite, desde, hasta, max = 10) {
  if (!['semanal', 'mensual', 'anual'].includes(repite)) return [];
  let n = 0;
  if (desde > base) { // salto aproximado para no recorrer años enteros de a una
    const [y0, m0] = base.split('-').map(Number);
    const [y1, m1] = desde.split('-').map(Number);
    const estimado = repite === 'semanal' ? Math.floor(diasEntre(base, desde) / 7) : repite === 'mensual' ? (y1 - y0) * 12 + (m1 - m0) : y1 - y0;
    n = Math.max(0, estimado - 1);
  }
  const fechas = [];
  for (; fechas.length < max && n < 100000; n++) {
    const f = ocurrenciaN(base, repite, n);
    if (f > hasta) break;
    if (f >= desde) fechas.push(f);
  }
  return fechas;
}
