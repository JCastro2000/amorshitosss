// Amorshitos: lista de eventos compartida entre dos personas.
import * as cloud from './cloud.js';
import { h, toast, openSheet, confirmAction } from './ui.js';
import { todayStr, dayLabel, dayDetail, timeLabel, byDate } from './dates.js';

const CATEGORIAS = [
  { id: 'rosa', nombre: 'Los dos' },
  { id: 'azul', nombre: 'Trabajo' },
  { id: 'verde', nombre: 'Salud' },
  { id: 'naranja', nombre: 'Familia' },
  { id: 'morado', nombre: 'Amigos' },
  { id: 'gris', nombre: 'Otros' },
];
const categoria = (id) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS.at(-1);

const USER_KEY = 'amorshitos.user';
const EVENTS_KEY = 'amorshitos.events';
const store = {
  read(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  write(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch { /* sin almacenamiento */ }
  },
};

// status: loading | login | ok | denied
const state = {
  status: 'loading',
  user: store.read(USER_KEY),
  events: store.read(EVENTS_KEY) ?? [],
  filter: 'todos',
  error: '',
};
if (state.user) state.status = 'ok'; // primera pantalla al instante con lo último que se vio

const root = document.getElementById('app');

const heart = (size = 22) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
};

// ---------- Pantallas ----------

function render() {
  const y = window.scrollY;
  const views = { loading: loadingView, login: loginView, denied: deniedView, ok: listView };
  root.replaceChildren(views[state.status]());
  window.scrollTo(0, y);
}

const loadingView = () => h('main', { class: 'center-screen' }, h('div', { class: 'logo' }, heart(64)), h('p', { class: 'muted' }, 'Cargando…'));

function loginView() {
  const error = h('p', { class: 'error', hidden: !state.error }, state.error);
  const button = h('button', {
    class: 'btn primary big',
    onclick: async () => {
      button.disabled = true;
      error.hidden = true;
      try {
        await cloud.signIn();
      } catch (e) {
        error.textContent = cloud.friendlyError(e);
        error.hidden = false;
      }
      button.disabled = false;
    },
  }, 'Continuar con Google');
  return h('main', { class: 'center-screen' },
    h('div', { class: 'logo' }, heart(72)),
    h('h1', {}, 'Amorshitos'),
    h('p', { class: 'muted' }, 'Nuestros eventos, solo para nosotros dos.'),
    button, error);
}

function deniedView() {
  return h('main', { class: 'center-screen' },
    h('div', { class: 'logo off' }, heart(72)),
    h('h1', {}, 'Sin acceso'),
    h('p', { class: 'muted' }, `La cuenta ${state.user?.email ?? ''} no está autorizada para esta app.`),
    h('button', { class: 'btn', onclick: cloud.signOut }, 'Entrar con otra cuenta'));
}

function listView() {
  const today = todayStr();
  const visible = state.events.filter((e) => state.filter === 'todos' || e.color === state.filter);
  const upcoming = visible.filter((e) => e.fecha >= today).sort(byDate);
  const past = visible.filter((e) => e.fecha < today).sort((a, b) => byDate(b, a));

  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por color' },
    chip('todos', 'Todos'),
    ...CATEGORIAS.map((c) => chip(c.id, c.nombre, c.id)));

  return h('main', { class: 'page' },
    h('header', { class: 'head' },
      h('h1', {}, h('span', { class: 'brand' }, heart(24)), 'Amorshitos'),
      h('button', { class: 'avatar', 'aria-label': 'Cuenta', onclick: accountSheet }, (state.user?.name ?? '?').charAt(0).toUpperCase())),
    !navigator.onLine && h('p', { class: 'banner' }, 'Sin conexión. Lo que cambies se guardará y se enviará al volver el internet.'),
    chips,
    upcoming.length ? groups(upcoming) : h('p', { class: 'empty' }, state.events.length
      ? 'No hay eventos próximos con este color.'
      : 'Aún no hay eventos. Toca el + para agregar el primero.'),
    past.length > 0 && h('details', { class: 'past' },
      h('summary', {}, `Eventos pasados (${past.length})`),
      groups(past)),
    h('button', { class: 'fab', 'aria-label': 'Agregar evento', onclick: () => eventForm() }, '+'));
}

function chip(value, label, color) {
  return h('button', {
    class: `chip${state.filter === value ? ' on' : ''}`,
    'aria-pressed': String(state.filter === value),
    dataset: color ? { color } : {},
    onclick: () => {
      state.filter = value;
      render();
    },
  }, color && h('span', { class: 'dot' }), label);
}

function groups(list) {
  const days = new Map();
  for (const ev of list) {
    if (!days.has(ev.fecha)) days.set(ev.fecha, []);
    days.get(ev.fecha).push(ev);
  }
  return h('div', { class: 'days' }, [...days].map(([fecha, events]) => {
    const label = dayLabel(fecha);
    const detail = ['Hoy', 'Mañana', 'Ayer'].includes(label) ? dayDetail(fecha) : '';
    return h('section', { class: 'day' },
      h('h2', {}, label, detail && h('small', {}, detail)),
      events.map(eventCard));
  }));
}

function eventCard(ev) {
  const nota = ev.nota?.trim();
  return h('button', { class: 'event', dataset: { color: ev.color }, onclick: () => eventForm(ev) },
    h('span', { class: 'bar' }),
    h('span', { class: 'when' }, timeLabel(ev)),
    h('span', { class: 'what' },
      h('strong', {}, ev.titulo),
      nota && h('small', {}, nota)),
    h('span', { class: 'who' }, ev.pendiente ? 'Guardando…' : ev.por));
}

// ---------- Formularios ----------

function accountSheet() {
  const sheet = openSheet('Cuenta', h('div', { class: 'stack' },
    h('p', {}, h('strong', {}, state.user.name), h('br'), h('span', { class: 'muted' }, state.user.email)),
    h('button', {
      class: 'btn',
      onclick: async () => {
        sheet.close();
        await cloud.signOut();
      },
    }, 'Cerrar sesión')));
}

function eventForm(ev = null) {
  const editing = !!ev;
  const titulo = h('input', { type: 'text', value: ev?.titulo ?? '', maxLength: 120, required: true, placeholder: 'Ej.: Cena con mis papás', autocomplete: 'off' });
  const fecha = h('input', { type: 'date', value: ev?.fecha ?? todayStr(), required: true });
  const inicio = h('input', { type: 'time', value: ev?.inicio ?? '' });
  const fin = h('input', { type: 'time', value: ev?.fin ?? '' });
  const allDay = h('input', { type: 'checkbox', checked: editing ? !ev.inicio : false, id: 'allday' });
  const nota = h('textarea', { rows: 3, maxLength: 500, placeholder: 'Opcional' }, ev?.nota ?? '');
  let color = ev?.color ?? (state.filter !== 'todos' ? state.filter : CATEGORIAS[0].id);

  const times = h('div', { class: 'row' },
    h('label', { class: 'field' }, 'Desde', inicio),
    h('label', { class: 'field' }, 'Hasta', fin));
  const syncTimes = () => {
    times.hidden = allDay.checked;
  };
  allDay.addEventListener('change', syncTimes);
  syncTimes();

  const swatches = h('div', { class: 'chips wrap', role: 'radiogroup', 'aria-label': 'Color' });
  const paint = () => {
    swatches.replaceChildren(...CATEGORIAS.map((c) => h('button', {
      type: 'button',
      class: `chip${c.id === color ? ' on' : ''}`,
      role: 'radio',
      'aria-checked': String(c.id === color),
      dataset: { color: c.id },
      onclick: () => {
        color = c.id;
        paint();
      },
    }, h('span', { class: 'dot' }), c.nombre)));
  };
  paint();

  const form = h('form', {
    class: 'stack',
    onsubmit: (e) => {
      e.preventDefault();
      const data = {
        titulo: titulo.value.trim(),
        fecha: fecha.value,
        inicio: allDay.checked ? '' : inicio.value,
        fin: allDay.checked || !inicio.value ? '' : fin.value,
        color,
        nota: nota.value.trim(),
      };
      if (!data.titulo) return toast('Escribe un título.');
      if (!data.fecha) return toast('Elige el día.');
      if (data.inicio && data.fin && data.fin <= data.inicio) return toast('La hora de término debe ser después de la de inicio.');
      sheet.close();
      cloud.saveEvent(ev?.id, data, state.user).catch((err) => toast(cloud.friendlyError(err), 5000));
      if (!navigator.onLine) toast('Sin conexión: se enviará al volver el internet.');
    },
  },
  h('label', { class: 'field' }, 'Título', titulo),
  h('label', { class: 'field' }, 'Día', fecha),
  h('label', { class: 'check' }, allDay, 'Todo el día'),
  times,
  h('div', { class: 'field' }, h('span', {}, 'Color'), swatches),
  h('label', { class: 'field' }, 'Nota', nota),
  h('div', { class: 'row end' },
    editing && h('button', {
      type: 'button',
      class: 'btn danger quiet',
      onclick: async () => {
        if (!(await confirmAction('Eliminar evento', `¿Eliminar "${ev.titulo}"? También desaparece para tu pareja.`, 'Eliminar'))) return;
        sheet.close();
        cloud.removeEvent(ev.id).catch((err) => toast(cloud.friendlyError(err), 5000));
      },
    }, 'Eliminar'),
    h('button', { type: 'submit', class: 'btn primary' }, editing ? 'Guardar' : 'Agregar')));

  const sheet = openSheet(editing ? 'Editar evento' : 'Nuevo evento', form);
  if (!editing) setTimeout(() => titulo.focus(), 50);
}

// ---------- Arranque ----------

function setUser(user) {
  state.user = user;
  state.error = '';
  store.write(USER_KEY, user);
  if (user) {
    if (state.status !== 'ok') state.status = 'ok';
  } else {
    state.status = 'login';
    state.events = [];
    store.write(EVENTS_KEY, null);
  }
  render();
}

function setEvents(list) {
  state.events = list;
  store.write(EVENTS_KEY, list.filter((e) => !e.pendiente));
  if (state.status === 'denied') state.status = 'ok';
  render();
}

function onCloudError(e) {
  if (e?.code === 'permission-denied') {
    state.status = 'denied';
    render();
  } else {
    toast(cloud.friendlyError(e), 5000);
  }
}

render();
cloud.start({ onUser: setUser, onEvents: setEvents, onError: onCloudError }).catch(() => {
  // No se pudo cargar Firebase (sin internet la primera vez): si ya había sesión se sigue con lo guardado.
  if (!state.user) {
    state.status = 'login';
    state.error = 'No hay conexión. Conéctate a internet para entrar por primera vez.';
    render();
  }
});

addEventListener('online', render);
addEventListener('offline', render);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && state.status === 'ok' && render()); // cambia "Hoy" al pasar la medianoche

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
