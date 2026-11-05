// Pestaña de compras: lista compartida con ticks. Lo pendiente va por orden de nombre y lo ya comprado
// queda al final (también por nombre). Cualquiera de los dos puede agregar, marcar, renombrar y borrar.
import * as cloud from './cloud.js';
import { h, toast, openSheet, confirmAction } from './ui.js';

// Para comparar nombres sin importar mayúsculas ni tildes ("Café" = "cafe").
const clave = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
const falla = (e) => toast(cloud.friendlyError(e), 5000);

// ctx: { state }. La vista trae `refresh()` para actualizar solo las listas (sin tocar lo que se está escribiendo).
export function comprasView(ctx) {
  const { state } = ctx;
  const resumen = h('p', { class: 'muted small' });
  const listas = h('div', { class: 'compras' });

  const input = h('input', {
    type: 'text',
    value: state.borradorCompra ?? '',
    maxLength: 80,
    placeholder: 'Agregar a la lista (ej.: Leche)',
    autocomplete: 'off',
    enterkeyhint: 'done',
    'aria-label': 'Agregar a la lista de compras',
    oninput: () => { state.borradorCompra = input.value; },
  });

  function agregar() {
    const nombre = input.value.trim().replace(/\s+/g, ' ');
    if (!nombre) return;
    input.value = '';
    state.borradorCompra = '';
    const repetido = state.compras.find((c) => clave(c.nombre) === clave(nombre));
    if (!repetido) {
      cloud.agregarCompra(nombre, state.user).catch(falla);
    } else if (repetido.comprado) {
      cloud.marcarCompra(repetido.id, false, state.user).catch(falla); // ya estaba comprado: vuelve a pendiente
      toast(`"${repetido.nombre}" volvió a la lista.`);
    } else {
      toast(`"${repetido.nombre}" ya está en la lista.`);
    }
    input.focus();
  }

  function fila(c) {
    return h('li', { class: `compra${c.comprado ? ' hecho' : ''}` },
      h('input', {
        type: 'checkbox',
        checked: c.comprado,
        'aria-label': c.comprado ? `Volver a poner ${c.nombre} en la lista` : `Marcar ${c.nombre} como comprado`,
        onchange: (e) => cloud.marcarCompra(c.id, e.target.checked, state.user).catch(falla),
      }),
      h('button', { type: 'button', class: 'nombre', onclick: () => editar(c) },
        h('span', {}, c.nombre),
        c.comprado && c.compradoPor && h('small', {}, `Compró ${c.compradoPor}`)));
  }

  function refresh() {
    const pendientes = state.compras.filter((c) => !c.comprado).sort(porNombre);
    const comprados = state.compras.filter((c) => c.comprado).sort(porNombre);
    resumen.textContent = pendientes.length ? `${pendientes.length} por comprar` : 'Nada pendiente';
    listas.replaceChildren(...[
      pendientes.length
        ? h('ul', { class: 'lista-compras' }, pendientes.map(fila))
        : h('p', { class: 'empty' }, comprados.length ? 'Todo comprado.' : 'La lista está vacía. Agrega lo que falta arriba.'),
      comprados.length > 0 && h('section', { class: 'comprados' },
        h('div', { class: 'comprados-head' },
          h('h2', {}, `Comprados (${comprados.length})`),
          h('button', {
            type: 'button',
            class: 'btn small danger',
            onclick: async () => {
              if (!(await confirmAction('Borrar comprados', `¿Borrar los ${comprados.length} productos ya comprados de la lista?`, 'Borrar'))) return;
              cloud.borrarCompras(comprados.map((c) => c.id)).catch(falla);
            },
          }, 'Borrar comprados')),
        h('ul', { class: 'lista-compras' }, comprados.map(fila))),
    ].filter(Boolean));
  }

  function editar(c) {
    const nombre = h('input', { type: 'text', value: c.nombre, maxLength: 80, autocomplete: 'off' });
    const sheet = openSheet('Editar producto', h('form', {
      class: 'stack',
      onsubmit: (e) => {
        e.preventDefault();
        const nuevo = nombre.value.trim().replace(/\s+/g, ' ');
        if (!nuevo) return toast('Escribe un nombre.');
        if (state.compras.some((x) => x.id !== c.id && clave(x.nombre) === clave(nuevo))) return toast('Ya hay un producto con ese nombre.');
        sheet.close();
        if (nuevo !== c.nombre) cloud.renombrarCompra(c.id, nuevo).catch(falla);
      },
    },
    h('label', { class: 'field' }, 'Nombre', nombre),
    h('div', { class: 'row end' },
      h('button', {
        type: 'button',
        class: 'btn danger quiet',
        onclick: () => {
          sheet.close();
          cloud.borrarCompras([c.id]).catch(falla);
        },
      }, 'Eliminar'),
      h('button', { type: 'submit', class: 'btn primary' }, 'Guardar'))));
  }

  refresh();
  const vista = h('main', { class: 'page' },
    h('header', { class: 'head' }, h('h1', {}, 'Compras')),
    ctx.avisoSync?.(),
    h('form', { class: 'agregar', onsubmit: (e) => { e.preventDefault(); agregar(); } },
      input, h('button', { type: 'submit', class: 'btn primary' }, 'Agregar')),
    resumen,
    listas);
  vista.refresh = refresh;
  return vista;
}
