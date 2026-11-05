// Pestaña de eventos: la lista agrupada por día, el formulario de evento y la navegación a la página de un evento.
import * as cloud from './cloud.js';
import { h, toast, toastDeshacer, openSheet, openMenu, confirmAction, icon } from './ui.js';
import { todayStr, addDays, dayLabel, dayDetail, timeLabel, byDate, ocurrencias, etiquetaRepite, REPETICIONES } from './dates.js';
import { tint } from './categorias.js';
import { state, categoria, ctx, tareasDe } from './estado.js';

const HORIZONTE_DIAS = 120; // hasta dónde se muestran las repeticiones
const MAX_REPETICIONES = 8; // por evento

export function listView() {
  const today = todayStr();
  const { proximos: upcoming, pasados: past } = repartir(state.events.filter((e) => state.filter === 'todos' || e.color === state.filter), today);

  // Las categorías con más eventos van primero; a igual cantidad, queda el orden de Ajustes.
  const total = (c) => state.events.filter((e) => e.color === c.id).length;
  const byUse = [...state.categorias].sort((a, b) => total(b) - total(a));
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por color' },
    chip('todos', 'Todos'),
    ...byUse.map((c) => chip(c.id, c.nombre, c.color)));

  return h('main', { class: 'page' },
    h('header', { class: 'head' },
      h('h1', {}, h('span', { class: 'brand' }, icon('heart', 24)), 'Amorshitos')),
    ctx.avisoSync?.(),
    chips,
    upcoming.length ? groups(upcoming) : h('p', { class: 'empty' }, state.events.length
      ? 'No hay eventos próximos con este color.'
      : 'Aún no hay eventos. Toca el + para agregar el primero.'),
    past.length > 0 && h('details', { class: 'past' },
      h('summary', {}, `Eventos pasados (${past.length})`),
      groups(past)),
    h('button', { class: 'fab', 'aria-label': 'Agregar evento', onclick: () => eventForm() }, '+'));
}

// Separa los eventos en próximos y pasados. Los que se repiten aparecen en sus próximas fechas
// (cada una con `ocu`, su fecha, y `original`, el evento completo) y no pasan nunca a "pasados".
export function repartir(eventos, hoy) {
  const hasta = addDays(hoy, HORIZONTE_DIAS);
  const proximos = [];
  const pasados = [];
  for (const ev of eventos) {
    if (!ev.repite) {
      (ev.fecha >= hoy ? proximos : pasados).push({ ...ev, ocu: ev.fecha, original: ev });
      continue;
    }
    for (const f of ocurrencias(ev.fecha, ev.repite, hoy, hasta, MAX_REPETICIONES)) proximos.push({ ...ev, fecha: f, ocu: f, original: ev });
  }
  return { proximos: proximos.sort(byDate), pasados: pasados.sort((a, b) => byDate(b, a)) };
}

function chip(value, label, color) {
  return h('button', {
    class: `chip${state.filter === value ? ' on' : ''}`,
    'aria-pressed': String(state.filter === value),
    style: color ? tint(color) : false,
    onclick: () => {
      state.filter = value;
      ctx.render();
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
  const tareas = tareasDe(ev.original, ev.ocu);
  const hechas = tareas.filter((t) => t.hecha).length;
  return h('div', { class: 'event', style: tint(cat.color), title: cat.nombre },
    h('span', { class: 'bar' }),
    h('button', { type: 'button', class: 'abrir', 'aria-label': `Abrir ${ev.titulo}`, onclick: () => abrirEvento(ev.id, ev.original.repite ? ev.ocu : null) },
      h('span', { class: 'when' }, timeLabel(ev)),
      h('span', { class: 'what' },
        h('strong', {}, ev.titulo),
        nota && h('small', {}, nota),
        ev.repite && h('small', { class: 'repite' }, `↻ ${etiquetaRepite(ev.repite)}`),
        tareas.length > 0 && h('small', { class: 'avance' }, `✓ ${hechas} de ${tareas.length} tareas`)),
      h('span', { class: 'who' }, ev.pendiente ? 'Guardando…' : ev.por)),
    h('button', {
      type: 'button',
      class: 'mas',
      'aria-label': `Más opciones de ${ev.titulo}`,
      onclick: (e) => openMenu(e.currentTarget, [
        { label: ev.repite ? 'Editar (todas las repeticiones)' : 'Editar', onclick: () => eventForm(ev.original) },
        { label: ev.repite ? 'Eliminar (todas las repeticiones)' : 'Eliminar', danger: true, onclick: () => eliminarEvento(ev.original) },
      ]),
    }, icon('more', 22)));
}

// ---------- Página de un evento ----------

export function abrirEvento(id, ocu = null) {
  state.tab = 'eventos';
  state.evento = id;
  state.ocu = ocu;
  state.borradorTarea = '';
  history.pushState({ evento: id, ocu }, ''); // así el botón "atrás" del teléfono vuelve a la lista
  ctx.render();
  window.scrollTo(0, 0);
}

export function volver() {
  if (history.state?.evento) history.back();
  else {
    state.evento = null;
    ctx.render();
  }
}

export function iniciarNavegacion() {
  addEventListener('popstate', () => {
    state.evento = history.state?.evento ?? null;
    state.ocu = history.state?.ocu ?? null;
    ctx.render();
  });
}

export async function eliminarEvento(ev) {
  if (!(await confirmAction('Eliminar evento', `¿Eliminar "${ev.titulo}"? También desaparece para tu pareja, con sus tareas.`, 'Eliminar'))) return;
  const eraElAbierto = state.evento === ev.id;
  if (eraElAbierto) state.evento = null; // para que el aviso de "evento eliminado" no salga por esto
  const tareas = state.tareas.filter((t) => t.eventoId === ev.id);
  cloud.removeEvent(ev.id, tareas.map((t) => t.id)).catch((err) => toast(cloud.friendlyError(err), 5000));
  toastDeshacer(`"${ev.titulo}" eliminado`, () => cloud.restaurarEvento(ev, tareas));
  if (eraElAbierto) {
    if (history.state?.evento) history.back();
    else ctx.render();
  }
}

// ---------- Formulario de eventos ----------

export function eventForm(ev = null) {
  const editing = !!ev;
  const titulo = h('input', { type: 'text', value: ev?.titulo ?? '', maxLength: 120, required: true, placeholder: 'Ej.: Cena con mis papás', autocomplete: 'off' });
  const fecha = h('input', { type: 'date', value: ev?.fecha ?? todayStr(), required: true });
  const inicio = h('input', { type: 'time', value: ev?.inicio ?? '' });
  const fin = h('input', { type: 'time', value: ev?.fin ?? '' });
  const allDay = h('input', { type: 'checkbox', checked: editing ? !ev.inicio : false, id: 'allday' });
  const nota = h('textarea', { rows: 3, maxLength: 500, placeholder: 'Opcional' }, ev?.nota ?? '');
  const repite = h('select', {}, REPETICIONES.map(([valor, etiqueta]) => h('option', { value: valor, selected: valor === (ev?.repite ?? '') }, etiqueta)));
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
        repite: repite.value,
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
  h('label', { class: 'field' }, 'Repetir', repite),
  h('div', { class: 'field' }, h('span', {}, 'Color'), swatches),
  h('label', { class: 'field' }, 'Nota', nota),
  h('div', { class: 'row end' },
    editing && h('button', {
      type: 'button',
      class: 'btn danger quiet',
      onclick: () => {
        sheet.close();
        eliminarEvento(ev);
      },
    }, 'Eliminar'),
    h('button', { type: 'submit', class: 'btn primary' }, editing ? 'Guardar' : 'Agregar')));

  const sheet = openSheet(editing ? 'Editar evento' : 'Nuevo evento', form);
  if (!editing) setTimeout(() => titulo.focus(), 50);
}
