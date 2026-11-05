// Categorías de eventos: cada una tiene un nombre y un color de la paleta. Son compartidas por la pareja
// (se guardan en Firestore, config/categorias). El id de un evento apunta al id de su categoría.

export const PALETA = [
  { id: 'rosa', nombre: 'Rosa' },
  { id: 'rojo', nombre: 'Rojo' },
  { id: 'naranja', nombre: 'Naranja' },
  { id: 'amarillo', nombre: 'Amarillo' },
  { id: 'verde', nombre: 'Verde' },
  { id: 'turquesa', nombre: 'Turquesa' },
  { id: 'azul', nombre: 'Azul' },
  { id: 'indigo', nombre: 'Índigo' },
  { id: 'morado', nombre: 'Morado' },
  { id: 'fucsia', nombre: 'Fucsia' },
  { id: 'marron', nombre: 'Marrón' },
  { id: 'gris', nombre: 'Gris' },
];

// Las que existen al empezar (mientras nadie las haya cambiado).
export const CATEGORIAS_BASE = [
  { id: 'rosa', nombre: 'Los dos', color: 'rosa' },
  { id: 'azul', nombre: 'Trabajo', color: 'azul' },
  { id: 'verde', nombre: 'Salud', color: 'verde' },
  { id: 'naranja', nombre: 'Familia', color: 'naranja' },
  { id: 'morado', nombre: 'Amigos', color: 'morado' },
  { id: 'gris', nombre: 'Otros', color: 'gris' },
];

export const MAX_CATEGORIAS = 24;
export const MAX_NOMBRE = 24;

// Variable CSS con el color de una categoría, para usar en el atributo style.
export const tint = (color) => `--c: var(--c-${PALETA.some((p) => p.id === color) ? color : 'gris'})`;

export const nuevoId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// Devuelve la lista si tiene el formato esperado; si no, null.
export function validar(items) {
  if (!Array.isArray(items) || !items.length || items.length > MAX_CATEGORIAS) return null;
  const clean = items.map((c) => ({
    id: typeof c?.id === 'string' ? c.id : null,
    nombre: typeof c?.nombre === 'string' ? c.nombre.trim().slice(0, MAX_NOMBRE) : '',
    color: PALETA.some((p) => p.id === c?.color) ? c.color : 'gris',
  }));
  return clean.every((c) => c.id && c.nombre) ? clean : null;
}
