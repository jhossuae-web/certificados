/* Estadísticas del certificador, para pegar en una hoja de Google.
   1. Crea una hoja de cálculo nueva en Google Sheets.
   2. Menú Extensiones, Apps Script. Borra lo que haya y pega todo este código.
   3. Cambia CLAVE por una clave tuya (solo la usas en el panel de estadísticas).
   4. Implementar, Nueva implementación, tipo Aplicación web.
      Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
   5. Copia la URL que termina en /exec y pégala en el panel de estadísticas. */

const CLAVE = 'cambia esta clave';
const COLUMNAS = ['fecha', 'lote', 'tipo', 'vid', 'reg', 'nombre', 'formato', 'ok'];
const MAX_FILAS = 50000;

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName('Registro');
  if (!h) {
    h = ss.insertSheet('Registro');
    h.appendRow(COLUMNAS);
    h.setFrozenRows(1);
    h.getRange('A:A').setNumberFormat('@'); // fecha como texto
    h.getRange('E:E').setNumberFormat('@'); // registro como texto, conserva ceros
  }
  return h;
}

function texto_(v, n) { return String(v == null ? '' : v).slice(0, n); }

function salida_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* Recibe un evento desde la página del alumno. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  let tomado = false;
  try {
    const d = JSON.parse(e.postData.contents);
    if (['vista', 'busqueda', 'descarga'].indexOf(d.tipo) < 0) return salida_({ ok: false });
    lock.waitLock(10000); tomado = true;
    hoja_().appendRow([
      new Date().toISOString(), texto_(d.lote, 8), d.tipo, texto_(d.vid, 24),
      texto_(d.reg, 30), texto_(d.nombre, 120), texto_(d.formato, 6),
      d.ok === true ? 'si' : (d.ok === false ? 'no' : '')
    ]);
    return salida_({ ok: true });
  } catch (err) {
    return salida_({ ok: false });
  } finally {
    if (tomado) lock.releaseLock();
  }
}

/* Entrega los registros al panel, solo con la clave correcta. */
function doGet(e) {
  if (CLAVE === 'cambia esta clave') return salida_({ ok: false, error: 'Falta cambiar la CLAVE en el script' });
  if (!e || !e.parameter || e.parameter.clave !== CLAVE) return salida_({ ok: false, error: 'Clave incorrecta' });
  const h = hoja_(), n = h.getLastRow();
  if (n < 2) return salida_({ ok: true, filas: [] });
  const desde = Math.max(2, n - MAX_FILAS + 1);
  const v = h.getRange(desde, 1, n - desde + 1, COLUMNAS.length).getValues();
  const fecha = x => (x instanceof Date ? x.toISOString() : String(x));
  return salida_({
    ok: true,
    filas: v.map(f => ({ fecha: fecha(f[0]), lote: String(f[1]), tipo: String(f[2]), vid: String(f[3]),
      reg: String(f[4]), nombre: String(f[5]), formato: String(f[6]), ok: String(f[7]) }))
  });
}
