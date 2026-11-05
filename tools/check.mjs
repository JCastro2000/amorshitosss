// Chequeo antes de publicar: node tools/check.mjs   (o: npm run check)
//   1. Todos los archivos JS tienen la sintaxis correcta.
//   2. El service worker (sw.js) guarda para uso sin internet todos los archivos de la app, y ninguno falta.
//   3. Si cambió algo de la app, se subió VERSION en sw.js (si no, los teléfonos podrían quedarse con lo viejo).
//   4. Pasan las pruebas automáticas (tools/pruebas).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');
const problemas = [];
const aviso = (mensaje) => problemas.push(mensaje);

// Archivos que se cargan solo en localhost y no hace falta guardar para uso sin internet.
const SOLO_LOCAL = new Set(['js/simulador.js']);

// 1. Sintaxis
const archivosJs = readdirSync(join(raiz, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`);
const herramientas = readdirSync(join(raiz, 'tools')).filter((f) => f.endsWith('.mjs')).map((f) => `tools/${f}`);
for (const f of [...archivosJs, 'sw.js', ...herramientas]) {
  const r = spawnSync(process.execPath, ['--check', join(raiz, f)], { encoding: 'utf8' });
  if (r.status !== 0) aviso(`Error de sintaxis en ${f}:\n${r.stderr.trim()}`);
}

// 2. Archivos guardados por el service worker
const sw = leer('sw.js');
const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
for (const f of archivosJs) {
  if (!SOLO_LOCAL.has(f) && !shell.includes(f)) aviso(`${f} no está en SHELL de sw.js: la app fallaría sin internet.`);
}
for (const f of shell) {
  if (f !== './' && !existsSync(join(raiz, f))) aviso(`sw.js guarda ${f}, pero ese archivo no existe.`);
}
for (const ruta of [...leer('index.html').matchAll(/(?:href|src)="([^"#]+)"/g)].map((m) => m[1]).filter((r) => !/^https?:/.test(r))) {
  if (!existsSync(join(raiz, ruta))) aviso(`index.html apunta a ${ruta}, que no existe.`);
}

// 3. VERSION subida si algo de la app cambió respecto del último commit
const version = (texto) => texto.match(/const VERSION = "?'?([^'";]+)/)?.[1];
try {
  const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8' }).trim();
  const cambiados = [...new Set([...git('diff', '--name-only', 'HEAD').split('\n'), ...git('ls-files', '--others', '--exclude-standard').split('\n')])]
    .filter((f) => /^(js|css|icons)\//.test(f) || ['index.html', 'manifest.webmanifest'].includes(f))
    .filter((f) => !SOLO_LOCAL.has(f));
  const anterior = version(git('show', 'HEAD:sw.js'));
  if (cambiados.length && version(sw) === anterior) {
    aviso(`Cambiaron archivos de la app (${cambiados.join(', ')}) pero VERSION sigue en ${anterior}. Súbela en sw.js.`);
  }
} catch {
  // sin git: se omite este chequeo
}

// 4. Pruebas
const pruebas = spawnSync(process.execPath, ['--test', 'tools/pruebas/*.test.mjs'], { encoding: 'utf8', cwd: raiz });
if (pruebas.status !== 0) aviso(`Fallaron las pruebas:\n${pruebas.stdout}\n${pruebas.stderr}`.trim());

if (problemas.length) {
  console.error(`✗ ${problemas.length} problema(s):\n\n${problemas.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`✓ Todo en orden: ${archivosJs.length} archivos JS, ${shell.length} guardados para uso sin internet, versión ${version(sw)}, pruebas pasando.`);
