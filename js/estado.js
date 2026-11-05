// Estado compartido de la app y acceso al almacenamiento del teléfono.
import { CATEGORIAS_BASE, validar } from './categorias.js';

export const CLAVES = {
  user: 'amorshitos.user',
  events: 'amorshitos.events',
  categorias: 'amorshitos.categorias',
  compras: 'amorshitos.compras',
  tareas: 'amorshitos.tareas',
};

export const store = {
  read(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  write(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch { /* sin almacenamiento */ }
  },
};

// status: loading | login | ok | denied;  tab: eventos | compras | ajustes
export const state = {
  status: 'loading',
  tab: 'eventos',
  user: store.read(CLAVES.user),
  events: store.read(CLAVES.events) ?? [],
  compras: store.read(CLAVES.compras) ?? [],
  borradorCompra: '', // lo que se está escribiendo en "Agregar a la lista"
  tareas: store.read(CLAVES.tareas) ?? [], // tareas de todos los eventos
  borradorTarea: '', // lo que se está escribiendo en "Agregar una tarea"
  evento: null, // id del evento abierto (su página con la lista de tareas)
  categorias: validar(store.read(CLAVES.categorias)) ?? CATEGORIAS_BASE,
  filter: 'todos',
  error: '',
};
if (state.user) state.status = 'ok'; // primera pantalla al instante con lo último que se vio

// Un evento cuya categoría ya no existe se muestra en gris.
export const categoria = (id) => state.categorias.find((c) => c.id === id) ?? { id, nombre: 'Sin categoría', color: 'gris' };

// Funciones que cada módulo necesita de los demás (render, volver, etc.). app.js las completa al arrancar.
export const ctx = { state, categoria };
