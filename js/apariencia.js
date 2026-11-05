// Apariencia de la app: tema, fondo, color principal y tamaño del texto.
// El tema, el fondo, el color y la foto son de la pareja y se sincronizan entre los teléfonos (Firestore);
// el tamaño del texto es de cada teléfono. Todo se guarda también en el teléfono y se aplica al arrancar
// para que no parpadee.
import { PALETA } from './categorias.js';

const KEY = 'amorshitos.apariencia';
const FOTO_KEY = 'amorshitos.foto';
export const MAX_FOTO = 700000; // caracteres; Firestore admite 1 MB por documento
export const BASE = { tema: 'sistema', fondo: 'ninguno', acento: 'rosa', texto: 'normal' };
export const TEMAS = [['sistema', 'Del teléfono'], ['claro', 'Claro'], ['oscuro', 'Oscuro']];
export const TEXTOS = { pequeno: '15px', normal: '16px', grande: '18px' };
export const TEXTO_OPCIONES = [['pequeno', 'Pequeño'], ['normal', 'Normal'], ['grande', 'Grande']];

// Fondos: cada uno tiene versión clara y oscura (según el tema elegido) y sugiere un color principal.
export const FONDOS = [
  { id: 'ninguno', nombre: 'Sencillo' },
  { id: 'amor', nombre: 'Amor', acento: 'rosa' },
  { id: 'aurora', nombre: 'Aurora boreal', acento: 'turquesa' },
  { id: 'sunset', nombre: 'Sunset', acento: 'rosa' },
  { id: 'foto', nombre: 'Nuestra foto', acento: 'rosa' },
];

export function load() {
  try {
    return { ...BASE, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...BASE };
  }
}

// Lo que se comparte con la pareja.
export const compartido = (cfg = load()) => ({ tema: cfg.tema, fondo: cfg.fondo, acento: cfg.acento });

// Aplica lo que llegó de la nube (ignora valores desconocidos).
export function applyRemote(data) {
  const patch = {};
  if (TEMAS.some(([id]) => id === data?.tema)) patch.tema = data.tema;
  if (FONDOS.some((f) => f.id === data?.fondo)) patch.fondo = data.fondo;
  if (PALETA.some((p) => p.id === data?.acento)) patch.acento = data.acento;
  if (Object.keys(patch).length) save(patch);
}

export function save(patch) {
  const next = { ...load(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* sin almacenamiento */ }
  apply(next);
  return next;
}

// ---------- Foto de fondo (se guarda en el teléfono, reducida) ----------

export const loadFoto = () => {
  try {
    return localStorage.getItem(FOTO_KEY);
  } catch {
    return null;
  }
};

// Guarda una foto que llegó de la nube.
export function setFotoRemota(dataUrl) {
  try {
    localStorage.setItem(FOTO_KEY, dataUrl);
  } catch { /* sin almacenamiento */ }
  apply();
}

// Reduce la imagen elegida y la guarda; se sube a la nube, así que tiene que pesar poco
// (lado mayor 1280 px y JPEG, bajando la calidad hasta que quepa). Devuelve la imagen como texto.
export async function saveFoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      el.src = url;
    });
    let data = '';
    for (const [lado, calidad] of [[1280, 0.78], [1024, 0.7], [800, 0.6]]) {
      const scale = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      data = canvas.toDataURL('image/jpeg', calidad);
      if (data.length < MAX_FOTO) break;
    }
    if (data.length >= MAX_FOTO) throw new Error('La imagen es demasiado grande.');
    localStorage.setItem(FOTO_KEY, data);
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Texto blanco u oscuro encima del color principal, según cuánta luz tenga.
function inkFor(hex) {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#1d1316' : '#ffffff';
}

export function apply(cfg = load()) {
  const root = document.documentElement;
  const foto = cfg.fondo === 'foto' ? loadFoto() : null;
  // Sin foto guardada, "Nuestra foto" se ve como Sencillo.
  const fondo = FONDOS.find((f) => f.id === cfg.fondo && f.id !== 'ninguno' && (f.id !== 'foto' || foto));

  if (fondo) {
    const oscuro = cfg.tema === 'oscuro' || (cfg.tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.fondo = fondo.id;
    root.dataset.theme = oscuro ? 'dark' : 'light'; // con fondo, el tema siempre queda explícito
  } else {
    root.removeAttribute('data-fondo');
    if (cfg.tema === 'claro') root.dataset.theme = 'light';
    else if (cfg.tema === 'oscuro') root.dataset.theme = 'dark';
    else root.removeAttribute('data-theme');
  }
  if (foto) root.style.setProperty('--fondo-foto', `url("${foto}")`);
  else root.style.removeProperty('--fondo-foto');

  root.style.fontSize = TEXTOS[cfg.texto] ?? TEXTOS.normal;
  root.style.setProperty('--accent', `var(--c-${cfg.acento})`);
  const styles = getComputedStyle(root);
  root.style.setProperty('--accent-ink', inkFor(styles.getPropertyValue(`--c-${cfg.acento}`)));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', styles.getPropertyValue('--bg').trim());
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => apply());
