// Estado de la sincronización con la nube: cuántos cambios esperan salir, si hay conexión y cuándo llegó
// lo último. Alimenta el aviso que se ve arriba en cada pestaña y el panel "Estado" de Ajustes.
import { h } from './ui.js';
import { state } from './estado.js';

export const info = { ultimaVez: 0, ultimoError: '' };
let avisos = []; // los avisos que hay en pantalla, para actualizarlos sin redibujar nada

export function pendientes() {
  return [state.events, state.compras, state.tareas].reduce((n, lista) => n + lista.filter((x) => x.pendiente).length, 0);
}

export function textoAviso() {
  const n = pendientes();
  const cambios = n === 1 ? '1 cambio' : `${n} cambios`;
  if (!navigator.onLine) {
    return n
      ? `Sin conexión. ${cambios} se ${n === 1 ? 'enviará' : 'enviarán'} al volver el internet.`
      : 'Sin conexión. Puedes seguir usando la app; lo que cambies se enviará al volver el internet.';
  }
  return n ? `Enviando ${cambios}…` : '';
}

// Aviso para poner arriba de una pestaña; se mantiene al día solo.
export function aviso() {
  const el = h('p', { class: 'banner', role: 'status' });
  avisos.push(el);
  pintar(el);
  return el;
}

function pintar(el) {
  const texto = textoAviso();
  el.textContent = texto;
  el.hidden = !texto;
}

export function refrescar() {
  avisos = avisos.filter((el) => el.isConnected);
  avisos.forEach(pintar);
}

export function marcarActualizado() {
  info.ultimaVez = Date.now();
  info.ultimoError = '';
  refrescar();
}

export function registrarError(mensaje) {
  info.ultimoError = mensaje;
  refrescar();
}
