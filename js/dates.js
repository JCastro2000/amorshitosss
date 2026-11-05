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
