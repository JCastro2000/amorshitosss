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

let toastTimer;
export function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
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
