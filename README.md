# Amorshitos

Eventos, compras y tareas compartidos entre dos personas. App web instalable (PWA), sin build: JavaScript puro.

## Qué hace

- **Eventos:** lista agrupada por día, con color por categoría, página de cada evento con su lista de tareas y eventos que se repiten (cada semana, mes o año).
- **Compras:** lista compartida con ticks; lo pendiente va por nombre y lo comprado al final. Lo que se limpia queda como sugerencia, con cantidad opcional y botón para compartir por WhatsApp.
- **Ajustes:** categorías, tema claro/oscuro, fondos (Amor, Aurora boreal, Sunset o una foto) y color de la app. Todo compartido por la pareja salvo el tamaño del texto.
- **Burbujas de conexión:** un corazón con iniciales por cada persona que tiene la app abierta; se juntan cuando están las dos.
- **Deshacer** al borrar, aviso de **versión nueva** y panel **Estado** de la sincronización.

## Cómo está armado

- **Cuentas:** Google (Firebase Authentication). Solo entran los correos que tienen su documento en la colección `allowed` de Firestore.
- **Datos:** Firestore, con copia local para usar sin internet. En este repositorio solo está el código.
  `eventos/{id}` (con sus `tareas/{id}`), `compras/{id}`, `presencia/{uid}` y `config/{categorias, apariencia, foto}`.
- **Reglas de seguridad:** `firestore.rules`. Cada documento solo acepta los campos que la app usa; se publican a mano en Firebase Console → Firestore → Reglas.
- **Clave de API:** restringida a `jcastro2000.github.io`, `amorshitos.firebaseapp.com`, `amorshitos.web.app` y `localhost:8099` (Google Cloud → APIs y servicios → Credenciales).
- **Publicación:** GitHub Pages.

### Código (`js/`)

| Archivo | Para qué sirve |
| --- | --- |
| `app.js` | Arranque, pantalla, pestañas y conexión con la nube |
| `estado.js` | Estado compartido y almacenamiento local |
| `cloud.js` | Todo lo que habla con Firebase |
| `eventos.js`, `evento.js` | Lista de eventos, formulario y página de un evento |
| `compras.js` | Pestaña de compras |
| `ajustes.js`, `apariencia.js`, `categorias.js` | Ajustes, temas y categorías |
| `presencia.js`, `burbujas.js`, `simulador.js` | Conexión de la pareja y burbujas (el simulador solo carga en localhost) |
| `sync.js` | Estado de la sincronización |
| `dates.js`, `ui.js` | Fechas y piezas de interfaz |

## Trabajar en local

```bash
python -m http.server 8099
```

y abrir `http://localhost:8099/`. En `localhost` aparece un panel para simular que la pareja se conecta y desconecta.

## Antes de publicar

```bash
npm run check
```

(o `node tools/check.mjs`) revisa la sintaxis, que `sw.js` guarde todos los archivos para uso sin internet, que se haya **subido `VERSION` en `sw.js`** si cambió algo de la app, y corre las pruebas (`npm test`, en `tools/pruebas/`).

## Agregar o quitar a alguien

Firebase Console → Firestore → colección `allowed`: un documento por correo (ID = el correo, campo `activo` = `si`). Borrar el documento quita el acceso.

## Íconos

`powershell -File tools/make-icons.ps1`
