# Certificados

Plataforma para que los asistentes de un evento descarguen su certificado en PDF o PNG, con QR y código de validación. Funciona en GitHub Pages, sin servidor.

## Páginas

- `admin.html`: lista de eventos, creación y edición de eventos, y conexión con GitHub.
- `CODIGO/` (por ejemplo `/tia6/`): enlace corto de cada evento. El alumno escribe su registro, ve su certificado y lo descarga. Detrás está `certificado.html?e=CODIGO`, que también funciona.
- `panel.html`: estadísticas de uso (vistas, búsquedas, descargas, alumnos más buscados).
- `index.html`: verificación del certificado por código o por QR.

## Conexión con GitHub (una sola vez)

1. En GitHub: Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.
2. Elegir solo este repositorio y darle el permiso Contents: Read and write.
3. En `admin.html`, pestaña Conexión, pegar el repositorio (usuario/repositorio) y el token, y tocar Guardar y probar.

El token queda guardado solo en el navegador donde lo pegaste. No se sube al repositorio.

## Cómo se crea un evento

En `admin.html` tocar Nuevo evento:

1. Evento: nombre del evento, código de 4 letras o números (se sugiere solo con las siglas y lo puedes cambiar; si ya lo usa otro evento, avisa cuál), Institución o Empresa (opcional) y el Excel o CSV con registro y nombre completo.
2. Diseño: subir la imagen del certificado ya terminada (PNG, JPG o SVG) y arrastrar a su lugar el nombre, el QR, el código de validación y el texto "Verifica en". Se puede partir del diseño de otro evento.
3. Guardar y publicar: sube a GitHub el diseño, el archivo del evento y actualiza la lista de eventos.

Al terminar aparece el enlace para compartir con los alumnos y un CSV con los códigos y enlaces de validación.

## Qué cambia en cada certificado

Solo cuatro elementos: el nombre, el QR, el código de validación y el texto "Verifica en ...". Todo lo demás va dentro de la imagen del diseño. El nombre del evento no se imprime, solo sirve para identificarlo en la lista y en la página de validación.

## Editar un evento

Desde la lista, Editar permite cambiar el diseño y agregar alumnos nuevos. Los códigos ya entregados siguen siendo válidos. El código, el nombre del evento y la institución quedan fijos porque forman parte de la validación cifrada.

## Archivos que genera

- `CODIGO.json`: datos cifrados del evento y su diseño.
- `fondos/CODIGO.ext`: imagen del diseño de cada evento.
- `codigo/index.html`: carpeta pequeña por evento (en minúsculas) que da el enlace corto.
- `eventos.json`: lista de eventos para el panel de administración.

## Estadísticas

Los datos se guardan en una hoja de Google tuya, mediante `estadisticas.gs`. Se configura una sola vez desde `panel.html`, que explica los pasos y genera el `config.json` para subir al repositorio. Mientras `config.json` esté vacío no se cuenta nada.
Se registra: cada vista de la página del alumno, cada búsqueda (registro escrito, nombre si se encontró, y si tuvo resultado) y cada descarga (PDF o PNG). La hoja es privada y la lectura desde el panel pide la clave que pongas en el script.

## Privacidad

Los nombres no se guardan en texto plano. Cada registro va cifrado con una clave derivada del registro del alumno, y la validación del QR se cifra con el código de 10 caracteres de cada certificado. Quien conozca el registro de un alumno puede descargar su certificado, así que conviene usar registros que no sean fáciles de adivinar.
