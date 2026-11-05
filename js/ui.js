// Utilidades de interfaz: crear elementos, avisos y hojas inferiores.

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === false || value == null) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key in el && key !== 'list') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...kids.flat().filter((k) => k !== false && k != null));
  return el;
}

const ICONS = {
  list: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
  tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  chevron: 'M9.4 6 8 7.4l4.6 4.6L8 16.6 9.4 18l6-6z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  cart: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
};

export function icon(name, size = 22) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICONS[name]);
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

// Barra fija arriba: hay una versión nueva de la app. `alActualizar` recarga la página.
export function avisoVersion(alActualizar) {
  const barra = h('div', { class: 'aviso-version', role: 'status' },
    h('span', {}, 'Hay una versión nueva de Amorshitos'),
    h('button', { type: 'button', class: 'btn small primary', onclick: alActualizar }, 'Actualizar'),
    h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Cerrar aviso', onclick: () => barra.remove() }, '✕'));
  document.body.append(barra);
  return barra;
}

let toastTimer;
export function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

// Menú de tres puntitos: se abre junto al botón `anchor`. items: [{ label, danger, onclick }].
export function openMenu(anchor, items) {
  const close = () => {
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  const menu = h('div', { class: 'menu', role: 'menu' }, items.map((it) => h('button', {
    type: 'button',
    role: 'menuitem',
    class: it.danger ? 'danger' : '',
    onclick: () => {
      close();
      it.onclick();
    },
  }, it.label)));
  const backdrop = h('div', { class: 'menu-backdrop', onclick: close }, menu);
  document.body.append(backdrop);
  const r = anchor.getBoundingClientRect();
  const alto = menu.offsetHeight;
  menu.style.right = `${Math.max(8, innerWidth - r.right)}px`;
  menu.style.top = `${r.bottom + alto + 8 > innerHeight ? Math.max(8, r.top - alto - 4) : r.bottom + 4}px`; // si no cabe abajo, se abre hacia arriba
  document.addEventListener('keydown', onKey);
  menu.querySelector('button')?.focus();
  return { close };
}

// Hoja que sube desde abajo. Devuelve { close }.
export function openSheet(title, content, { onClose } = {}) {
  const onKey = (e) => e.key === 'Escape' && close();
  const backdrop = h('div', { class: 'backdrop', onclick: (e) => e.target === backdrop && close() },
    h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'sheet-head' },
        h('h2', {}, title),
        h('button', { class: 'iconbtn', 'aria-label': 'Cerrar', onclick: () => close() }, '✕')),
      h('div', { class: 'sheet-body' }, content)));
  function close() {
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    document.body.classList.remove('noscroll');
    onClose?.();
  }
  document.addEventListener('keydown', onKey);
  document.body.classList.add('noscroll');
  document.body.append(backdrop);
  return { close };
}

// Pregunta de sí o no. Devuelve una promesa con true/false.
export function confirmAction(title, message, okLabel = 'Aceptar') {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (value) => {
      answered = true;
      sheet.close();
      resolve(value);
    };
    const sheet = openSheet(title, h('div', { class: 'stack' },
      h('p', {}, message),
      h('div', { class: 'row end' },
        h('button', { class: 'btn', onclick: () => answer(false) }, 'Cancelar'),
        h('button', { class: 'btn danger', onclick: () => answer(true) }, okLabel))),
    { onClose: () => !answered && resolve(false) });
  });
}
