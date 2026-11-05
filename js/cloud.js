// Cuenta de Google y base de datos compartida (Firebase). Los eventos viven en Firestore, no en el repositorio.
//
// Estructura:
//   eventos/{id}        { titulo, fecha, inicio, fin, color (id de categoría), nota, por, creado, actualizado }
//   config/categorias   { items: [{ id, nombre, color }], actualizado }
// Solo pueden leer y escribir los correos que están en la colección "allowed" (ver firestore.rules).
// Firestore guarda una copia en el teléfono: sin internet se puede ver y editar, y se sincroniza al volver.
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

const MESSAGES = {
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
  'auth/cancelled-popup-request': 'Ya hay una ventana de Google abierta.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo otra vez.',
  'auth/network-request-failed': 'No hay conexión a internet.',
  'auth/operation-not-allowed': 'El acceso con Google no está activado en Firebase.',
  'auth/unauthorized-domain': 'Esta dirección no está autorizada en Firebase (Authentication → Configuración → Dominios autorizados).',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
  'permission-denied': 'Esta cuenta no tiene acceso.',
  unavailable: 'No se pudo conectar con la nube.',
};

export function friendlyError(e) {
  if (!navigator.onLine) return 'No hay conexión a internet.';
  return MESSAGES[e?.code] ?? MESSAGES[e?.code?.replace('firestore/', '')] ?? (e?.message ? `Error: ${e.message}` : 'Ocurrió un error inesperado.');
}

let loading;
function load() {
  loading ??= (async () => {
    const [app, auth, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    const application = app.initializeApp(firebaseConfig);
    let cloud;
    try {
      cloud = fs.initializeFirestore(application, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    } catch {
      cloud = fs.getFirestore(application); // sin almacenamiento local (modo privado): funciona solo con conexión
    }
    return { auth, fs, a: auth.getAuth(application), db: cloud };
  })().catch((e) => {
    loading = null; // se reintenta la próxima vez
    throw e;
  });
  return loading;
}

// onUser(usuario | null), onEvents(lista), onCategories(lista | null), onError(error)
export async function start({ onUser, onEvents, onCategories, onError }) {
  const { auth, fs, a, db } = await load();
  let unsubscribe = [];
  auth.onAuthStateChanged(a, (user) => {
    unsubscribe.forEach((u) => u());
    unsubscribe = [];
    if (!user) return onUser(null);
    onUser({ uid: user.uid, email: user.email, name: user.displayName?.split(' ')[0] || user.email.split('@')[0] });
    unsubscribe.push(
      fs.onSnapshot(fs.collection(db, 'eventos'), (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id, pendiente: d.metadata.hasPendingWrites }));
        onEvents(list.map(({ creado, actualizado, ...rest }) => rest));
      }, onError),
      fs.onSnapshot(fs.doc(db, 'config', 'categorias'), (snap) => onCategories(snap.data()?.items ?? null), onError),
    );
  });
}

export async function signIn() {
  const { auth, a } = await load();
  const provider = new auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await auth.signInWithPopup(a, provider);
}

export async function signOut() {
  const { auth, a } = await load();
  await auth.signOut(a);
}

// Crea (sin id) o modifica un evento. No espera a la nube: sin internet queda en cola.
export async function saveEvent(id, data, user) {
  const { fs, db } = await load();
  const ref = id ? fs.doc(db, 'eventos', id) : fs.doc(fs.collection(db, 'eventos'));
  const extra = id ? {} : { por: user.name, creado: fs.serverTimestamp() };
  return fs.setDoc(ref, { ...data, ...extra, actualizado: fs.serverTimestamp() }, { merge: true });
}

// Guarda la lista completa de categorías (la ven los dos).
export async function saveCategories(items) {
  const { fs, db } = await load();
  return fs.setDoc(fs.doc(db, 'config', 'categorias'), { items, actualizado: fs.serverTimestamp() });
}

export async function removeEvent(id) {
  const { fs, db } = await load();
  return fs.deleteDoc(fs.doc(db, 'eventos', id));
}

// Descarga el SDK por adelantado: la ventana de Google tiene que abrirse al instante al tocar el botón.
export const preload = () => load().catch(() => {});
