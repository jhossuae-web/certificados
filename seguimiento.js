/* Seguimiento anónimo de uso de la página del alumno: vistas, búsquedas y descargas.
   Solo funciona si config.json trae la dirección de estadísticas (ver estadisticas.gs). */
(function (root) {
'use strict';

let url = null, vid = '', lote = '', listo = null;

function idVisitante() {
  try {
    let v = localStorage.getItem('cert.vid');
    if (!v) { v = root.Cert.azar(12); localStorage.setItem('cert.vid', v); }
    return v;
  } catch (e) { return root.Cert.azar(12); }
}

function iniciar(codigoEvento) {
  lote = codigoEvento || ''; vid = idVisitante();
  listo = (async () => {
    try { const c = await (await fetch('config.json', { cache: 'no-store' })).json(); url = c.estadisticas || null; }
    catch (e) { url = null; }
  })();
  return listo;
}

async function enviar(tipo, extra) {
  try {
    await listo; if (!url) return;
    fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true,
      body: JSON.stringify(Object.assign({ tipo, lote, vid }, extra || {})) }).catch(() => {});
  } catch (e) { /* el seguimiento nunca debe romper la página */ }
}

root.Cert = Object.assign(root.Cert || {}, { rastro: { iniciar, enviar, fijarLote: l => { lote = l; } } });
})(window);
