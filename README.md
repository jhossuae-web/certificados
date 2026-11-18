# Certificados

Plataforma para que los asistentes de un evento descarguen su certificado en PDF o PNG, con QR y código de validación.

## Páginas

- `admin.html`: la institución carga el Excel (registro y nombre completo) y obtiene el archivo del evento.
- `certificado.html?e=CODIGO`: el alumno escribe su registro, ve su certificado y lo descarga.
- `index.html`: verificación del certificado por código o por QR.

## Cómo se usa

1. Abrir `admin.html`, llenar los datos del evento y subir el Excel.
2. Descargar el archivo del evento (`CODIGO.json`) y subirlo a la carpeta principal del repositorio.
3. Compartir con los alumnos el enlace que muestra el panel.

## Diseño del certificado

El fondo es una sola imagen (`fondo.svg`) y se reutiliza para todos. Solo cambian nombre, código y QR.
Para usar otro diseño, reemplazar `fondo.svg` por un PNG o JPG con proporción A4 horizontal (3508 x 2480) y ajustar posiciones y tamaños en `plantilla.json`.

## Privacidad

Los nombres no se guardan en texto plano. Cada registro va cifrado con una clave derivada del registro del alumno, y la validación del QR se cifra con el código de 10 caracteres de cada certificado. Quien conozca el registro de un alumno puede descargar su certificado, así que conviene usar registros que no sean fáciles de adivinar.
