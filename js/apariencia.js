// Apariencia de la app: tema, color principal y tamaño del texto. Se guarda en cada teléfono
// (cada persona elige la suya) y se aplica al arrancar para que no parpadee.

const KEY = 'amorshitos.apariencia';
export const BASE = { tema: 'sistema', acento: 'rosa', texto: 'normal' };
export const TEMAS = [['sistema', 'Del teléfono'], ['claro', 'Claro'], ['oscuro', 'Oscuro']];
export const TEXTOS = { pequeno: '15px', normal: '16px', grande: '18px' };
export const TEXTO_OPCIONES = [['pequeno', 'Pequeño'], ['normal', 'Normal'], ['grande', 'Grande']];

export function load() {
  try {
    return { ...BASE, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...BASE };
  }
}

export function save(patch) {
  const next = { ...load(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* sin almacenamiento */ }
  apply(next);
  return next;
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
  if (cfg.tema === 'claro') root.dataset.theme = 'light';
  else if (cfg.tema === 'oscuro') root.dataset.theme = 'dark';
  else root.removeAttribute('data-theme');
  root.style.fontSize = TEXTOS[cfg.texto] ?? TEXTOS.normal;
  root.style.setProperty('--accent', `var(--c-${cfg.acento})`);
  const styles = getComputedStyle(root);
  root.style.setProperty('--accent-ink', inkFor(styles.getPropertyValue(`--c-${cfg.acento}`)));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', styles.getPropertyValue('--bg').trim());
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => apply());
