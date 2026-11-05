// Amorshitos: lista de eventos compartida entre dos personas.
import * as cloud from './cloud.js';
import * as apariencia from './apariencia.js';
import { h, toast, openSheet, confirmAction, icon } from './ui.js';
import { todayStr, dayLabel, dayDetail, timeLabel, byDate } from './dates.js';
import { CATEGORIAS_BASE, tint, validar } from './categorias.js';
import { settingsView } from './ajustes.js';

apariencia.apply(); // antes de dibujar nada, para que no parpadee

const USER_KEY = 'amorshitos.user';
const EVENTS_KEY = 'amorshitos.events';
const CATS_KEY = 'amorshitos.categorias';
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

// status: loading | login | ok | denied;  tab: eventos | ajustes
const state = {
  status: 'loading',
  tab: 'eventos',
  user: store.read(USER_KEY),
  events: store.read(EVENTS_KEY) ?? [],
  categorias: validar(store.read(CATS_KEY)) ?? CATEGORIAS_BASE,
  filter: 'todos',
  error: '',
};
if (state.user) state.status = 'ok'; // primera pantalla al instante con lo último que se vio

const root = document.getElementById('app');

// Un evento cuya categoría ya no existe se muestra en gris.
const categoria = (id) => state.categorias.find((c) => c.id === id) ?? { id, nombre: 'Sin categoría', color: 'gris' };

// ---------- Pantallas ----------

function render() {
  const y = window.scrollY;
  const views = { loading: loadingView, login: loginView, denied: deniedView };
  if (state.status === 'ok') {
    root.replaceChildren(state.tab === 'ajustes' ? settingsView(ctx) : listView(), tabBar());
  } else {
    root.replaceChildren(views[state.status]());
  }
  window.scrollTo(0, y);
}

const ctx = {
  state,
  render,
  signOut: () => cloud.signOut(),
  setCategorias(items, save = false) {
    state.categorias = items;
    store.write(CATS_KEY, items);
    if (state.filter !== 'todos' && !items.some((c) => c.id === state.filter)) state.filter = 'todos';
    render();
    if (save) cloud.saveCategories(items).catch((err) => toast(cloud.friendlyError(err), 5000));
  },
};

const loadingView = () => h('main', { class: 'center-screen' }, h('div', { class: 'logo' }, icon('heart', 64)), h('p', { class: 'muted' }, 'Cargando…'));

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
    h('div', { class: 'logo' }, icon('heart', 72)),
    h('h1', {}, 'Amorshitos'),
    h('p', { class: 'muted' }, 'Nuestros eventos, solo para nosotros dos.'),
    button, error);
}

function deniedView() {
  return h('main', { class: 'center-screen' },
    h('div', { class: 'logo off' }, icon('heart', 72)),
    h('h1', {}, 'Sin acceso'),
    h('p', { class: 'muted' }, `La cuenta ${state.user?.email ?? ''} no está autorizada para esta app.`),
    h('button', { class: 'btn', onclick: cloud.signOut }, 'Entrar con otra cuenta'));
}

function tabBar() {
  const tab = (id, label, ico) => h('button', {
    class: state.tab === id ? 'on' : '',
    'aria-current': state.tab === id ? 'page' : false,
    onclick: () => {
      state.tab = id;
      render();
      window.scrollTo(0, 0);
    },
  }, icon(ico, 24), h('span', {}, label));
  return h('nav', { class: 'tabbar', 'aria-label': 'Secciones' }, tab('eventos', 'Eventos', 'list'), tab('ajustes', 'Ajustes', 'tune'));
}

function listView() {
  const today = todayStr();
  const visible = state.events.filter((e) => state.filter === 'todos' || e.color === state.filter);
  const upcoming = visible.filter((e) => e.fecha >= today).sort(byDate);
  const past = visible.filter((e) => e.fecha < today).sort((a, b) => byDate(b, a));

  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por color' },
    chip('todos', 'Todos'),
    ...state.categorias.map((c) => chip(c.id, c.nombre, c.color)));

  return h('main', { class: 'page' },
    h('header', { class: 'head' },
      h('h1', {}, h('span', { class: 'brand' }, icon('heart', 24)), 'Amorshitos')),
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
    style: color ? tint(color) : false,
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
  const cat = categoria(ev.color);
  return h('button', { class: 'event', style: tint(cat.color), title: cat.nombre, onclick: () => eventForm(ev) },
    h('span', { class: 'bar' }),
    h('span', { class: 'when' }, timeLabel(ev)),
    h('span', { class: 'what' },
      h('strong', {}, ev.titulo),
      nota && h('small', {}, nota)),
    h('span', { class: 'who' }, ev.pendiente ? 'Guardando…' : ev.por));
}

// ---------- Formulario de eventos ----------

function eventForm(ev = null) {
  const editing = !!ev;
  const titulo = h('input', { type: 'text', value: ev?.titulo ?? '', maxLength: 120, required: true, placeholder: 'Ej.: Cena con mis papás', autocomplete: 'off' });
  const fecha = h('input', { type: 'date', value: ev?.fecha ?? todayStr(), required: true });
  const inicio = h('input', { type: 'time', value: ev?.inicio ?? '' });
  const fin = h('input', { type: 'time', value: ev?.fin ?? '' });
  const allDay = h('input', { type: 'checkbox', checked: editing ? !ev.inicio : false, id: 'allday' });
  const nota = h('textarea', { rows: 3, maxLength: 500, placeholder: 'Opcional' }, ev?.nota ?? '');
  const exists = (id) => state.categorias.some((c) => c.id === id);
  let color = exists(ev?.color) ? ev.color : exists(state.filter) ? state.filter : state.categorias[0].id;

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
    swatches.replaceChildren(...state.categorias.map((c) => h('button', {
      type: 'button',
      class: `chip${c.id === color ? ' on' : ''}`,
      role: 'radio',
      'aria-checked': String(c.id === color),
      style: tint(c.color),
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
    state.status = 'ok';
  } else {
    state.status = 'login';
    state.tab = 'eventos';
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

// Si nadie ha cambiado las categorías todavía, rige la lista inicial.
function setCategorias(items) {
  ctx.setCategorias(validar(items) ?? CATEGORIAS_BASE);
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
cloud.start({ onUser: setUser, onEvents: setEvents, onCategories: setCategorias, onError: onCloudError }).catch(() => {
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
