// Amorshitos: eventos, compras y tareas compartidos entre dos personas.
// Este archivo arma la pantalla y conecta la nube con el resto de los módulos.
import * as cloud from './cloud.js';
import * as apariencia from './apariencia.js';
import * as presencia from './presencia.js';
import * as sync from './sync.js';
import { h, toast, icon, avisoVersion } from './ui.js';
import { CATEGORIAS_BASE, validar } from './categorias.js';
import { state, store, CLAVES, ctx } from './estado.js';
import { settingsView } from './ajustes.js';
import { comprasView } from './compras.js';
import { eventoView } from './evento.js';
import { listView, volver, eliminarEvento, eventForm, iniciarNavegacion } from './eventos.js';

apariencia.apply(); // antes de dibujar nada, para que no parpadee

const root = document.getElementById('app');
let vistaCompras = null; // la pestaña de compras abierta, para actualizar sus listas sin redibujarla entera
let vistaEvento = null; // la página del evento abierta, ídem

// Compara datos de la nube con lo que ya se tiene: si no cambió nada, no hace falta volver a dibujar.
const mismo = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const falla = (err) => toast(cloud.friendlyError(err), 5000);

// ---------- Pantallas ----------

function render() {
  const y = window.scrollY;
  const views = { loading: loadingView, login: loginView, denied: deniedView };
  vistaCompras = null;
  vistaEvento = null;
  if (state.status === 'ok') {
    let vista;
    if (state.evento && !state.events.some((e) => e.id === state.evento)) state.evento = null; // ya no existe
    if (state.evento) vista = vistaEvento = eventoView(ctx);
    else if (state.tab === 'ajustes') vista = settingsView(ctx);
    else if (state.tab === 'compras') vista = vistaCompras = comprasView(ctx);
    else vista = listView();
    root.replaceChildren(vista, tabBar());
  } else {
    root.replaceChildren(views[state.status]());
  }
  window.scrollTo(0, y);
}

Object.assign(ctx, {
  render,
  avisoSync: sync.aviso,
  volver,
  editarEvento: (ev) => eventForm(ev),
  eliminarEvento,
  signOut: () => cloud.signOut(),
  // Cambia la apariencia en este teléfono y, si toca al estilo compartido, la manda a la nube.
  setApariencia(patch) {
    const next = apariencia.save(patch);
    presencia.actualizar();
    if (['tema', 'fondo', 'acento', 'burbujas'].some((k) => k in patch)) {
      cloud.saveAppearance(apariencia.compartido(next)).catch(falla);
    }
    render();
  },
  setFoto: (dataUrl) => cloud.savePhoto(dataUrl),
  setCategorias(items, save = false) {
    state.categorias = items;
    store.write(CLAVES.categorias, items);
    if (state.filter !== 'todos' && !items.some((c) => c.id === state.filter)) state.filter = 'todos';
    render();
    if (save) cloud.saveCategories(items).catch(falla);
  },
});

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
      if (state.evento && history.state?.evento) history.replaceState(null, ''); // sale de la página del evento
      state.evento = null;
      state.tab = id;
      render();
      window.scrollTo(0, 0);
    },
  }, icon(ico, 24), h('span', {}, label));
  return h('nav', { class: 'tabbar', 'aria-label': 'Secciones' }, tab('eventos', 'Eventos', 'list'), tab('compras', 'Compras', 'cart'), tab('ajustes', 'Ajustes', 'tune'));
}

// ---------- Datos que llegan de la nube ----------

function setUser(user) {
  state.user = user;
  state.error = '';
  store.write(CLAVES.user, user);
  if (user) {
    state.status = 'ok';
    if (document.visibilityState === 'visible') presencia.iniciar();
  } else {
    presencia.apagar();
    state.status = 'login';
    state.tab = 'eventos';
    state.events = [];
    state.compras = [];
    state.tareas = [];
    state.evento = null;
    state.ocu = null;
    store.write(CLAVES.tareas, null);
    store.write(CLAVES.events, null);
    store.write(CLAVES.compras, null);
  }
  render();
}

function setEvents(list) {
  sync.marcarActualizado();
  const cambio = !mismo(state.events, list);
  state.events = list;
  store.write(CLAVES.events, list.filter((e) => !e.pendiente));
  if (state.status === 'denied') {
    state.status = 'ok';
    return render();
  }
  if (!cambio) return;
  if (state.evento && list.some((e) => e.id === state.evento)) {
    vistaEvento?.refresh(); // con la página abierta solo se actualiza su contenido: no se interrumpe lo que se escribe
    return;
  }
  if (state.evento) {
    toast('Este evento se eliminó.');
    volver();
    return;
  }
  render();
}

// Si nadie ha cambiado las categorías todavía, rige la lista inicial.
function setCategorias(items) {
  const nuevas = validar(items) ?? CATEGORIAS_BASE;
  if (!mismo(state.categorias, nuevas)) ctx.setCategorias(nuevas);
}

// Lo que cambió la otra persona (o este mismo usuario en otro teléfono).
function onApariencia(data) {
  const antes = apariencia.load();
  if (data) apariencia.applyRemote(data);
  presencia.actualizar(); // por si la otra persona las prendió o apagó
  if (!mismo(antes, apariencia.load())) render();
}

function onFoto(data) {
  if (data && data !== apariencia.loadFoto()) {
    apariencia.setFotoRemota(data);
    render();
  }
}

// Si la pestaña de compras está abierta se actualizan solo sus listas, para no interrumpir lo que se escribe.
function onCompras(list) {
  sync.marcarActualizado();
  if (mismo(state.compras, list)) return;
  state.compras = list;
  store.write(CLAVES.compras, list.filter((c) => !c.pendiente));
  vistaCompras?.refresh();
}

// Las tareas de todos los eventos: actualizan la página abierta o el avance que se ve en la lista.
function onTareas(list) {
  sync.marcarActualizado();
  if (mismo(state.tareas, list)) return;
  state.tareas = list;
  store.write(CLAVES.tareas, list.filter((t) => !t.pendiente));
  if (vistaEvento) vistaEvento.refresh();
  else if (state.status === 'ok' && state.tab === 'eventos' && !state.evento) render();
}

function onError(e) {
  sync.registrarError(cloud.friendlyError(e));
  if (e?.code === 'permission-denied') {
    state.status = 'denied';
    render();
  } else {
    toast(cloud.friendlyError(e), 5000);
  }
}

// ---------- Arranque ----------

// Para probar las burbujas sin otra persona: panel que simula que la pareja se conecta y desconecta (solo localhost).
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  import('./simulador.js').then((m) => m.init({ onChange: presencia.simular }));
}

iniciarNavegacion();
render();
cloud.start({ onUser: setUser, onEvents: setEvents, onCategories: setCategorias, onApariencia, onFoto, onPresencia: presencia.onPresencia, onCompras, onTareas, onError }).catch(() => {
  // No se pudo cargar Firebase (sin internet la primera vez): si ya había sesión se sigue con lo guardado.
  if (!state.user) {
    state.status = 'login';
    state.error = 'No hay conexión. Conéctate a internet para entrar por primera vez.';
    render();
  }
});

addEventListener('online', () => { sync.refrescar(); render(); });
addEventListener('offline', () => { sync.refrescar(); render(); });
document.addEventListener('visibilitychange', () => {
  if (state.status !== 'ok') return;
  if (document.visibilityState === 'visible') {
    render(); // cambia "Hoy" al pasar la medianoche
    presencia.iniciar();
  } else {
    presencia.salir();
  }
});
addEventListener('pagehide', () => state.user && cloud.latido(state.user, false).catch(() => {}));

// Service worker: deja la app disponible sin conexión y avisa cuando hay una versión nueva.
if ('serviceWorker' in navigator) {
  const teniaVersion = !!navigator.serviceWorker.controller; // false solo la primera vez que se instala
  let avisado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!teniaVersion || avisado) return;
    avisado = true;
    avisoVersion(() => location.reload());
  });
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const buscar = () => reg.update().catch(() => {});
      setInterval(buscar, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && buscar());
    }).catch(() => {});
  });
}
