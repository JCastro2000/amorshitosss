// Solo para probar en localhost: panel flotante que simula que la pareja se conecta y se desconecta.
// No toca la nube (no escribe nada en Firestore). La app lo carga únicamente si la dirección es localhost.
import { h } from './ui.js';

const ESPERA_CONECTADA = 8000;
const ESPERA_DESCONECTADA = 5000;

export function init({ onChange }) {
  let conectada = false;
  let auto = null;

  const estado = h('span', { class: 'sim-estado' }, 'desconectada');
  const conectar = h('button', { type: 'button', onclick: () => poner(true) }, 'Conectar');
  const desconectar = h('button', { type: 'button', onclick: () => poner(false) }, 'Desconectar');
  const alternar = h('button', { type: 'button', onclick: () => (auto ? detener() : empezar()) }, 'Automático');

  function poner(valor) {
    conectada = valor;
    estado.textContent = valor ? 'conectada' : 'desconectada';
    estado.classList.toggle('on', valor);
    onChange(valor);
  }

  function empezar() {
    alternar.classList.add('on');
    const ciclo = () => {
      poner(!conectada);
      auto = setTimeout(ciclo, conectada ? ESPERA_CONECTADA : ESPERA_DESCONECTADA);
    };
    ciclo();
  }

  function detener() {
    clearTimeout(auto);
    auto = null;
    alternar.classList.remove('on');
  }

  document.body.append(h('div', { class: 'simulador', role: 'group', 'aria-label': 'Simulador de conexión (solo localhost)' },
    h('strong', {}, 'Simular a Lorena: '), estado, conectar, desconectar, alternar));
}
