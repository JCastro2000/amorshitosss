// Presencia: avisa a la nube que esta persona tiene la app abierta ("latido" cada minuto) y mantiene
// las burbujas de conexión según quién esté conectado.
import * as cloud from './cloud.js';
import * as apariencia from './apariencia.js';
import * as burbujas from './burbujas.js';
import { state } from './estado.js';

const LATIDO_MS = 60000; // cada cuánto avisa que sigue conectado
const VIGENCIA_MS = 150000; // sin latido en este tiempo, se considera desconectado
let presencia = [];
let simulada = false; // solo en localhost: ver js/simulador.js
let latidoTimer = null;
let refrescoTimer = null;

export const diagnostico = { ultimoError: '', ultimoLatido: 0 };

const conectado = () => state.status === 'ok' && !!state.user && document.visibilityState === 'visible';

function latir() {
  if (!conectado()) return;
  cloud.latido(state.user, true).then(
    () => { diagnostico.ultimoLatido = Date.now(); diagnostico.ultimoError = ''; },
    (e) => { diagnostico.ultimoError = cloud.friendlyError(e); }, // queda a la vista en Ajustes → Estado
  );
}

export function actualizar() {
  if (!conectado() || apariencia.load().burbujas === false) return burbujas.update({ yo: null, otros: [] });
  const iniciales = (p) => p.iniciales || p.nombre?.charAt(0).toUpperCase() || '?';
  // Cada persona tiene siempre el mismo color, en los dos teléfonos: se reparten según el orden de sus ids.
  const gente = simulada ? [...presencia, { id: 'simulada', iniciales: 'LV', ultima: Date.now() }] : presencia;
  const ids = [...new Set([state.user.uid, ...gente.map((p) => p.id)])].sort();
  const tono = (id) => (ids.indexOf(id) === 0 ? 'var(--c-rosa)' : 'var(--c-morado)');
  const otros = gente
    .filter((p) => p.id !== state.user.uid && Date.now() - p.ultima < VIGENCIA_MS)
    .map((p) => ({ id: p.id, iniciales: iniciales(p), tono: tono(p.id) }));
  burbujas.update({ yo: { id: state.user.uid, iniciales: iniciales(state.user), tono: tono(state.user.uid) }, otros });
}

export function iniciar() {
  detener();
  latir();
  latidoTimer = setInterval(latir, LATIDO_MS);
  refrescoTimer = setInterval(actualizar, 20000); // para notar a quien dejó de latir
  actualizar();
}

export function detener() {
  clearInterval(latidoTimer);
  clearInterval(refrescoTimer);
}

// La app pasa a segundo plano o se cierra: avisa que ya no está y quita las burbujas.
export function salir() {
  detener();
  if (state.user) cloud.latido(state.user, false).catch(() => {});
  burbujas.update({ yo: null, otros: [] });
}

export function apagar() {
  detener();
  burbujas.update({ yo: null, otros: [] });
}

export function onPresencia(list) {
  presencia = list;
  actualizar();
}

// Solo en localhost: simula que la otra persona se conecta o se desconecta.
export function simular(conectada) {
  simulada = conectada;
  actualizar();
}
