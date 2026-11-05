# Amorshitos

Lista de eventos compartida para dos personas. App web instalable (PWA), sin build: JavaScript puro.

- **Cuentas:** Google (Firebase Authentication). Solo entran los correos que tienen su documento en la colección `allowed` de Firestore.
- **Datos:** Firestore (`eventos/{id}` y `config/categorias`), con copia local para usar sin internet. En este repositorio solo está el código.
- **Ajustes:** las categorías (nombre y color) son compartidas por la pareja; el tema, el color de la app y el tamaño del texto se guardan en cada teléfono.
- **Reglas de seguridad:** `firestore.rules` (se publican a mano en Firebase Console → Firestore → Reglas).
- **Publicación:** GitHub Pages. Al cambiar cualquier archivo de la app, sube `VERSION` en `sw.js`.

## Probar en local

```bash
python -m http.server 8099
```

y abrir `http://localhost:8099/`. `localhost` ya está autorizado en Firebase Authentication.

## Agregar o quitar a alguien

Firebase Console → Firestore → colección `allowed`: un documento por correo (ID = el correo, campo `activo` = `si`). Borrar el documento quita el acceso.

## Íconos

`powershell -File tools/make-icons.ps1`
