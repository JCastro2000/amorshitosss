// Pestaña de ajustes: categorías de colores (compartidas), apariencia (de cada teléfono) y cuenta.
import { h, openSheet, confirmAction, toast, icon } from './ui.js';
import { PALETA, MAX_CATEGORIAS, MAX_NOMBRE, tint, nuevoId } from './categorias.js';
import * as apariencia from './apariencia.js';

// ctx: { state, render, setCategorias(items, guardar), signOut }
export function settingsView(ctx) {
  const { state } = ctx;
  const cfg = apariencia.load();
  const change = (patch) => {
    apariencia.save(patch);
    ctx.render();
  };

  const version = h('span', {}, '');
  caches.keys().then((keys) => {
    const name = keys.find((k) => /^amorshitos-v/.test(k));
    if (name) version.textContent = `Versión ${name.replace('amorshitos-', '')}`;
  }).catch(() => {});

  return h('main', { class: 'page' },
    h('header', { class: 'head' }, h('h1', {}, 'Ajustes')),

    h('section', { class: 'panel' },
      h('h2', {}, 'Categorías'),
      h('p', { class: 'muted small' }, 'Los colores clasifican los eventos. Los cambios los ven los dos.'),
      h('div', { class: 'cats' }, state.categorias.map((c) => h('button', { class: 'cat', style: tint(c.color), onclick: () => categoryForm(ctx, c) },
        h('span', { class: 'dot' }),
        h('span', { class: 'name' }, c.nombre),
        h('span', { class: 'count muted small' }, countLabel(state.events.filter((e) => e.color === c.id).length)),
        icon('chevron', 20)))),
      state.categorias.length < MAX_CATEGORIAS && h('button', { class: 'btn', onclick: () => categoryForm(ctx, null) }, '+ Agregar categoría')),

    h('section', { class: 'panel' },
      h('h2', {}, 'Apariencia'),
      h('div', { class: 'field' }, h('span', {}, 'Tema'),
        segmented(apariencia.TEMAS, cfg.tema, (tema) => change({ tema }))),
      h('div', { class: 'field' }, h('span', {}, 'Color de la app'),
        h('div', { class: 'chips wrap', role: 'radiogroup', 'aria-label': 'Color de la app' }, PALETA.map((p) => h('button', {
          type: 'button',
          class: `swatch${p.id === cfg.acento ? ' on' : ''}`,
          style: tint(p.id),
          role: 'radio',
          'aria-checked': String(p.id === cfg.acento),
          'aria-label': p.nombre,
          onclick: () => change({ acento: p.id }),
        })))),
      h('div', { class: 'field' }, h('span', {}, 'Tamaño del texto'),
        segmented(apariencia.TEXTO_OPCIONES, cfg.texto, (texto) => change({ texto })))),

    h('section', { class: 'panel' },
      h('h2', {}, 'Cuenta'),
      h('p', {}, h('strong', {}, state.user.name), h('br'), h('span', { class: 'muted' }, state.user.email)),
      h('button', { class: 'btn', onclick: ctx.signOut }, 'Cerrar sesión'),
      h('p', { class: 'muted small' }, 'Amorshitos · ', version)));
}

const countLabel = (n) => (n === 0 ? 'sin eventos' : n === 1 ? '1 evento' : `${n} eventos`);

function segmented(options, value, onPick) {
  return h('div', { class: 'segmented', role: 'radiogroup' }, options.map(([id, label]) => h('button', {
    type: 'button',
    class: id === value ? 'on' : '',
    role: 'radio',
    'aria-checked': String(id === value),
    onclick: () => onPick(id),
  }, label)));
}

function categoryForm(ctx, cat) {
  const { state } = ctx;
  const editing = !!cat;
  const nombre = h('input', { type: 'text', value: cat?.nombre ?? '', maxLength: MAX_NOMBRE, placeholder: 'Ej.: Viajes', autocomplete: 'off' });
  let color = cat?.color ?? PALETA.find((p) => !state.categorias.some((c) => c.color === p.id))?.id ?? PALETA[0].id;

  const swatches = h('div', { class: 'chips wrap', role: 'radiogroup', 'aria-label': 'Color' });
  const paint = () => swatches.replaceChildren(...PALETA.map((p) => h('button', {
    type: 'button',
    class: `swatch${p.id === color ? ' on' : ''}`,
    style: tint(p.id),
    role: 'radio',
    'aria-checked': String(p.id === color),
    'aria-label': p.nombre,
    onclick: () => {
      color = p.id;
      paint();
    },
  })));
  paint();

  const form = h('form', {
    class: 'stack',
    onsubmit: (e) => {
      e.preventDefault();
      const name = nombre.value.trim();
      if (!name) return toast('Escribe un nombre.');
      if (state.categorias.some((c) => c.id !== cat?.id && c.nombre.toLowerCase() === name.toLowerCase())) return toast('Ya hay una categoría con ese nombre.');
      const items = editing
        ? state.categorias.map((c) => (c.id === cat.id ? { ...c, nombre: name, color } : c))
        : [...state.categorias, { id: nuevoId(), nombre: name, color }];
      sheet.close();
      ctx.setCategorias(items, true);
    },
  },
  h('label', { class: 'field' }, 'Nombre', nombre),
  h('div', { class: 'field' }, h('span', {}, 'Color'), swatches),
  h('div', { class: 'row end' },
    editing && state.categorias.length > 1 && h('button', {
      type: 'button',
      class: 'btn danger quiet',
      onclick: async () => {
        const used = state.events.filter((e) => e.color === cat.id).length;
        const detail = used ? ` Sus ${used} ${used === 1 ? 'evento quedará' : 'eventos quedarán'} sin color.` : '';
        if (!(await confirmAction('Eliminar categoría', `¿Eliminar "${cat.nombre}"?${detail}`, 'Eliminar'))) return;
        sheet.close();
        ctx.setCategorias(state.categorias.filter((c) => c.id !== cat.id), true);
      },
    }, 'Eliminar'),
    h('button', { type: 'submit', class: 'btn primary' }, editing ? 'Guardar' : 'Agregar')));

  const sheet = openSheet(editing ? 'Editar categoría' : 'Nueva categoría', form);
  if (!editing) setTimeout(() => nombre.focus(), 50);
}
