// Página de un evento: sus datos y una lista de tareas (con ticks) que comparten los dos.
// Las tareas pendientes van en el orden en que se agregaron y las hechas quedan al final.
import * as cloud from './cloud.js';
import { h, toast, toastDeshacer, openSheet, openMenu, icon } from './ui.js';
import { dayLabel, dayDetail, timeLabel, etiquetaRepite } from './dates.js';
import { tint } from './categorias.js';
import { tareasDe } from './estado.js';

const falla = (e) => toast(cloud.friendlyError(e), 5000);
const porOrden = (a, b) => a.orden - b.orden;

// ctx: { state, categoria(id), volver(), editarEvento(ev), eliminarEvento(ev) }. La vista trae `refresh()`.
export function eventoView(ctx) {
  const { state } = ctx;
  const evento = () => state.events.find((e) => e.id === state.evento);
  // Si el evento se repite, esta página es la de una fecha concreta (state.ocu) y tiene sus propias tareas.
  const fechaVista = () => (evento()?.repite ? state.ocu || evento().fecha : evento()?.fecha);
  const tareas = () => (evento() ? tareasDe(evento(), fechaVista()) : []);

  const titulo = h('h1', {});
  const info = h('section', { class: 'evento-info' });
  const avance = h('span', { class: 'muted small' });
  const listas = h('div', { class: 'compras' });

  const menuEvento = h('button', {
    type: 'button',
    class: 'iconbtn',
    'aria-label': 'Más opciones del evento',
    onclick: (e) => openMenu(e.currentTarget, [
      { label: 'Editar evento', onclick: () => ctx.editarEvento(evento()) },
      { label: 'Eliminar evento', danger: true, onclick: () => ctx.eliminarEvento(evento()) },
    ]),
  }, icon('more', 24));

  const input = h('input', {
    type: 'text',
    value: state.borradorTarea ?? '',
    maxLength: 120,
    placeholder: 'Agregar una tarea (ej.: Reservar mesa)',
    autocomplete: 'off',
    enterkeyhint: 'done',
    'aria-label': 'Agregar una tarea',
    oninput: () => { state.borradorTarea = input.value; },
  });

  function agregar() {
    const texto = input.value.trim().replace(/\s+/g, ' ');
    if (!texto) return;
    input.value = '';
    state.borradorTarea = '';
    cloud.agregarTarea(state.evento, texto, state.user, evento()?.repite ? fechaVista() : '').catch(falla);
    input.focus();
  }

  function fila(t) {
    return h('li', { class: `compra${t.hecha ? ' hecho' : ''}` },
      h('input', {
        type: 'checkbox',
        checked: t.hecha,
        'aria-label': t.hecha ? `Volver a poner "${t.texto}" como pendiente` : `Marcar "${t.texto}" como hecha`,
        onchange: (e) => cloud.marcarTarea(t.eventoId, t.id, e.target.checked, state.user).catch(falla),
      }),
      h('span', { class: 'nombre' },
        h('span', {}, t.texto),
        t.hecha && t.hechaPor && h('small', {}, `Hecha por ${t.hechaPor}`)),
      h('button', {
        type: 'button',
        class: 'iconbtn',
        'aria-label': `Más opciones de "${t.texto}"`,
        onclick: (e) => openMenu(e.currentTarget, [
          { label: 'Editar', onclick: () => editar(t) },
          { label: 'Eliminar', danger: true, onclick: () => borrar([t], 'Tarea eliminada') },
        ]),
      }, icon('more', 22)));
  }

  // Borra y deja un "Deshacer" por unos segundos.
  function borrar(lista, mensaje) {
    const eventoId = state.evento;
    cloud.borrarTareas(eventoId, lista.map((t) => t.id)).catch(falla);
    toastDeshacer(mensaje, () => cloud.restaurarTareas(eventoId, lista));
  }

  function editar(t) {
    const texto = h('input', { type: 'text', value: t.texto, maxLength: 120, autocomplete: 'off' });
    const sheet = openSheet('Editar tarea', h('form', {
      class: 'stack',
      onsubmit: (e) => {
        e.preventDefault();
        const nuevo = texto.value.trim().replace(/\s+/g, ' ');
        if (!nuevo) return toast('Escribe la tarea.');
        sheet.close();
        if (nuevo !== t.texto) cloud.editarTarea(t.eventoId, t.id, nuevo).catch(falla);
      },
    },
    h('label', { class: 'field' }, 'Tarea', texto),
    h('div', { class: 'row end' }, h('button', { type: 'submit', class: 'btn primary' }, 'Guardar'))));
  }

  function refresh() {
    const ev = evento();
    if (!ev) return;
    const cat = ctx.categoria(ev.color);
    const fecha = fechaVista();
    const dia = dayLabel(fecha);
    const nota = ev.nota?.trim();
    titulo.textContent = ev.titulo;
    info.style = tint(cat.color);
    info.replaceChildren(...[
      h('span', { class: 'bar' }),
      h('p', { class: 'cuando' }, ['Hoy', 'Mañana', 'Ayer'].includes(dia) ? `${dia} · ${dayDetail(fecha)}` : dia),
      h('p', { class: 'hora' }, timeLabel(ev)),
      ev.repite && h('p', { class: 'repite' }, `↻ ${etiquetaRepite(ev.repite)}`),
      h('p', { class: 'categoria' }, h('span', { class: 'dot' }), cat.nombre, ev.por && h('span', { class: 'muted' }, ` · agregado por ${ev.por}`)),
      nota && h('p', { class: 'nota' }, nota),
    ].filter(Boolean));

    const todas = tareas();
    const pendientes = todas.filter((t) => !t.hecha).sort(porOrden);
    const hechas = todas.filter((t) => t.hecha).sort(porOrden);
    avance.textContent = todas.length ? `${hechas.length} de ${todas.length} hechas` : '';
    listas.replaceChildren(...[
      pendientes.length
        ? h('ul', { class: 'lista-compras' }, pendientes.map(fila))
        : h('p', { class: 'empty' }, hechas.length ? '¡Todo listo!' : 'Aún no hay tareas. Agrega lo que hay que hacer para este evento.'),
      hechas.length > 0 && h('section', { class: 'comprados' },
        h('div', { class: 'comprados-head' },
          h('h2', {}, `Hechas (${hechas.length})`),
          h('button', {
            type: 'button',
            class: 'btn small danger',
            onclick: () => borrar(hechas, hechas.length === 1 ? '1 tarea hecha eliminada' : `${hechas.length} tareas hechas eliminadas`),
          }, 'Borrar hechas')),
        h('ul', { class: 'lista-compras' }, hechas.map(fila))),
    ].filter(Boolean));
  }

  refresh();
  const vista = h('main', { class: 'page' },
    h('header', { class: 'head evento-head' },
      h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Volver a la lista de eventos', onclick: ctx.volver }, icon('back', 24)),
      titulo,
      menuEvento),
    ctx.avisoSync?.(),
    info,
    h('div', { class: 'tareas-head' }, h('h2', {}, 'Tareas'), avance),
    h('form', { class: 'agregar', onsubmit: (e) => { e.preventDefault(); agregar(); } },
      input, h('button', { type: 'submit', class: 'btn primary' }, 'Agregar')),
    listas);
  vista.refresh = refresh;
  return vista;
}
