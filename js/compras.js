// Pestaña de compras: lista compartida con ticks. Lo pendiente va por orden de nombre y lo ya comprado
// queda al final (también por nombre). Cualquiera de los dos puede agregar, marcar, editar y borrar.
//
// Lo comprado se puede "limpiar": el producto sale de la lista pero queda guardado (archivado), y reaparece
// como sugerencia al escribir, con los más comprados primero.
import * as cloud from './cloud.js';
import { h, toast, toastDeshacer, openSheet } from './ui.js';

// Para comparar nombres sin importar mayúsculas ni tildes ("Café" = "cafe").
export const clave = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
const falla = (e) => toast(cloud.friendlyError(e), 5000);
const MAX_SUGERENCIAS = 8;

// Los productos archivados que coinciden con lo que se escribe, los más comprados primero.
export function sugerencias(compras, texto) {
  const buscado = clave(texto);
  return compras
    .filter((c) => c.archivado && (!buscado || clave(c.nombre).includes(buscado)))
    .sort((a, b) => (b.veces ?? 0) - (a.veces ?? 0) || porNombre(a, b))
    .slice(0, MAX_SUGERENCIAS);
}

// El texto que se comparte por WhatsApp o donde sea.
export function textoLista(pendientes) {
  return ['🛒 Lista de compras', ...pendientes.map((c) => `• ${c.nombre}${c.cantidad ? ` (${c.cantidad})` : ''}`)].join('\n');
}

// ctx: { state, avisoSync }. La vista trae `refresh()` para actualizar solo las listas (sin tocar lo que se está escribiendo).
export function comprasView(ctx) {
  const { state } = ctx;
  const resumen = h('p', { class: 'muted small' });
  const sugeridas = h('div', { class: 'sugerencias', hidden: true });
  const listas = h('div', { class: 'compras' });
  const compartirBtn = h('button', { type: 'button', class: 'btn small', onclick: compartir }, 'Compartir');

  const input = h('input', {
    type: 'text',
    value: state.borradorCompra ?? '',
    maxLength: 80,
    placeholder: 'Agregar a la lista (ej.: Leche)',
    autocomplete: 'off',
    enterkeyhint: 'done',
    'aria-label': 'Agregar a la lista de compras',
    oninput: () => {
      state.borradorCompra = input.value;
      pintarSugerencias();
    },
  });
  const cantidad = h('input', { type: 'text', class: 'cantidad', maxLength: 20, placeholder: 'Cant.', autocomplete: 'off', 'aria-label': 'Cantidad (opcional)' });

  function agregar() {
    const nombre = input.value.trim().replace(/\s+/g, ' ');
    if (!nombre) return;
    const cant = cantidad.value.trim();
    input.value = '';
    cantidad.value = '';
    state.borradorCompra = '';
    const repetido = state.compras.find((c) => clave(c.nombre) === clave(nombre));
    if (!repetido) {
      cloud.agregarCompra(nombre, state.user, cant).catch(falla);
    } else if (repetido.archivado) {
      cloud.reactivarCompra(repetido.id, cant || undefined).catch(falla); // ya lo habían comprado antes: vuelve a la lista
    } else if (repetido.comprado) {
      cloud.reactivarCompra(repetido.id, cant || undefined).catch(falla);
      toast(`"${repetido.nombre}" volvió a la lista.`);
    } else {
      toast(`"${repetido.nombre}" ya está en la lista.`);
    }
    pintarSugerencias();
    input.focus();
  }

  function pintarSugerencias() {
    const lista = sugerencias(state.compras, input.value);
    sugeridas.hidden = !lista.length;
    sugeridas.replaceChildren(...(lista.length ? [
      h('span', { class: 'muted small' }, input.value.trim() ? 'Ya los has comprado:' : 'Sueles comprar:'),
      ...lista.map((c) => h('button', {
        type: 'button',
        class: 'chip',
        onclick: () => {
          cloud.reactivarCompra(c.id).catch(falla);
          input.value = '';
          state.borradorCompra = '';
          input.focus();
        },
      }, `+ ${c.nombre}`)),
    ] : []));
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
        c.cantidad && h('small', { class: 'cant' }, c.cantidad),
        c.comprado && c.compradoPor && h('small', {}, `Compró ${c.compradoPor}`)));
  }

  const activas = () => state.compras.filter((c) => !c.archivado);

  function refresh() {
    const pendientes = activas().filter((c) => !c.comprado).sort(porNombre);
    const comprados = activas().filter((c) => c.comprado).sort(porNombre);
    resumen.textContent = pendientes.length ? `${pendientes.length} por comprar` : 'Nada pendiente';
    compartirBtn.hidden = !pendientes.length;
    pintarSugerencias();
    listas.replaceChildren(...[
      pendientes.length
        ? h('ul', { class: 'lista-compras' }, pendientes.map(fila))
        : h('p', { class: 'empty' }, comprados.length ? 'Todo comprado.' : 'La lista está vacía. Agrega lo que falta arriba.'),
      comprados.length > 0 && h('section', { class: 'comprados' },
        h('div', { class: 'comprados-head' },
          h('h2', {}, `Comprados (${comprados.length})`),
          h('button', {
            type: 'button',
            class: 'btn small',
            onclick: () => {
              const ids = comprados.map((c) => c.id);
              cloud.archivarCompras(ids).catch(falla);
              toastDeshacer(ids.length === 1 ? '1 producto comprado quitado de la lista' : `${ids.length} productos comprados quitados de la lista`, () => cloud.archivarCompras(ids, false));
            },
          }, 'Limpiar comprados')),
        h('ul', { class: 'lista-compras' }, comprados.map(fila))),
    ].filter(Boolean));
  }

  async function compartir() {
    const pendientes = activas().filter((c) => !c.comprado).sort(porNombre);
    if (!pendientes.length) return;
    const texto = textoLista(pendientes);
    try {
      if (navigator.share) await navigator.share({ title: 'Lista de compras', text: texto });
      else window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    } catch { /* la persona cerró el menú de compartir */ }
  }

  function editar(c) {
    const nombre = h('input', { type: 'text', value: c.nombre, maxLength: 80, autocomplete: 'off' });
    const cant = h('input', { type: 'text', value: c.cantidad ?? '', maxLength: 20, placeholder: 'Ej.: 2 kg', autocomplete: 'off' });
    const sheet = openSheet('Editar producto', h('form', {
      class: 'stack',
      onsubmit: (e) => {
        e.preventDefault();
        const nuevo = nombre.value.trim().replace(/\s+/g, ' ');
        if (!nuevo) return toast('Escribe un nombre.');
        if (state.compras.some((x) => x.id !== c.id && clave(x.nombre) === clave(nuevo))) return toast('Ya hay un producto con ese nombre.');
        sheet.close();
        if (nuevo !== c.nombre || cant.value.trim() !== (c.cantidad ?? '')) cloud.editarCompra(c.id, nuevo, cant.value.trim()).catch(falla);
      },
    },
    h('label', { class: 'field' }, 'Nombre', nombre),
    h('label', { class: 'field' }, 'Cantidad (opcional)', cant),
    h('div', { class: 'row end' },
      h('button', {
        type: 'button',
        class: 'btn danger quiet',
        onclick: () => {
          sheet.close();
          cloud.borrarCompras([c.id]).catch(falla);
          toastDeshacer(`"${c.nombre}" eliminado`, () => cloud.restaurarCompras([c]));
        },
      }, 'Eliminar'),
      h('button', { type: 'submit', class: 'btn primary' }, 'Guardar'))));
  }

  refresh();
  const vista = h('main', { class: 'page' },
    h('header', { class: 'head' }, h('h1', {}, 'Compras'), compartirBtn),
    ctx.avisoSync?.(),
    h('form', { class: 'agregar', onsubmit: (e) => { e.preventDefault(); agregar(); } },
      input, cantidad, h('button', { type: 'submit', class: 'btn primary' }, 'Agregar')),
    sugeridas,
    resumen,
    listas);
  vista.refresh = refresh;
  return vista;
}
