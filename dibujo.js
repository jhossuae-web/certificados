/* Dibuja el certificado sobre un canvas a partir de plantilla.json.
   El fondo es una sola imagen que se reutiliza; solo cambian los textos, el código y el QR. */
(function (root) {
'use strict';

/* Tipografías disponibles para nombre y textos. */
const FUENTES = [
  { n: 'Cormorant negrita', f: 'Cormorant', p: 700, s: 'normal', archivo: 'fonts/cormorant700.woff2' },
  { n: 'Cormorant cursiva', f: 'Cormorant', p: 600, s: 'italic', archivo: 'fonts/cormorant600i.woff2' },
  { n: 'Playfair negrita', f: 'Playfair', p: 700, s: 'normal', archivo: 'fonts/playfair700.woff2' },
  { n: 'Lora negrita', f: 'Lora', p: 700, s: 'normal', archivo: 'fonts/lora700.woff2' },
  { n: 'Lora cursiva', f: 'Lora', p: 400, s: 'italic', archivo: 'fonts/lora400i.woff2' },
  { n: 'Great Vibes (caligrafía)', f: 'GreatVibes', p: 400, s: 'normal', archivo: 'fonts/greatvibes400.woff2' },
  { n: 'Dancing Script (caligrafía)', f: 'DancingScript', p: 700, s: 'normal', archivo: 'fonts/dancingscript700.woff2' },
  { n: 'Montserrat normal', f: 'Montserrat', p: 400, s: 'normal', archivo: 'fonts/montserrat400.woff2' },
  { n: 'Montserrat negrita', f: 'Montserrat', p: 700, s: 'normal', archivo: 'fonts/montserrat700.woff2' },
  { n: 'Poppins normal', f: 'Poppins', p: 400, s: 'normal', archivo: 'fonts/poppins400.woff2' },
  { n: 'Poppins seminegrita', f: 'Poppins', p: 600, s: 'normal', archivo: 'fonts/poppins600.woff2' },
  { n: 'Lato normal', f: 'Lato', p: 400, s: 'normal', archivo: 'fonts/lato400.woff2' },
  { n: 'Lato negrita', f: 'Lato', p: 700, s: 'normal', archivo: 'fonts/lato700.woff2' }
];
const fuentesCargadas = {}, imagenes = {};

function cargarFuente(f) {
  if (!fuentesCargadas[f.archivo]) fuentesCargadas[f.archivo] = (async () => {
    const ff = new FontFace(f.f, 'url(' + f.archivo + ')', { weight: String(f.p), style: f.s });
    await ff.load(); document.fonts.add(ff);
  })();
  return fuentesCargadas[f.archivo];
}
function cargarImagen(src) {
  if (!imagenes[src]) imagenes[src] = new Promise((ok, mal) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = () => { delete imagenes[src]; mal(new Error('No se pudo cargar el fondo ' + src)); }; i.src = src;
  });
  return imagenes[src];
}
async function cargarRecursos(pl) {
  const usadas = FUENTES.filter(f => pl.elementos.some(e => e.familia === f.f && (e.peso || 400) === f.p && (e.estilo || 'normal') === f.s));
  const [img] = await Promise.all([cargarImagen(pl.fondo), ...usadas.map(cargarFuente)]);
  return { img };
}
const esSvg = src => /\.svg(\?|$)/i.test(src);

const fuente = (el, tam) => (el.estilo || 'normal') + ' ' + (el.peso || 400) + ' ' + tam + 'px ' + el.familia;

function envolver(ctx, texto, ancho) {
  const pal = texto.split(' '), lineas = []; let act = '';
  for (const p of pal) {
    const prueba = act ? act + ' ' + p : p;
    if (act && ctx.measureText(prueba).width > ancho) { lineas.push(act); act = p; } else act = prueba;
  }
  if (act) lineas.push(act);
  return lineas;
}

function ajustar(ctx, texto, el) {
  let tam = el.tam; const min = el.tamMin || Math.round(tam * 0.5), maxL = el.maxLineas || 1, ancho = el.ancho || 1e9;
  for (;;) {
    ctx.font = fuente(el, tam);
    const lineas = envolver(ctx, texto, ancho);
    if (lineas.length <= maxL || tam <= min) return { lineas, tam };
    tam = Math.max(min, Math.floor(tam * 0.94));
  }
}

function dibujarQR(ctx, el, url) {
  const qr = root.qrcode(0, 'M'); qr.addData(url); qr.make();
  const n = qr.getModuleCount(), q = el.margen == null ? 3 : el.margen;
  const celda = Math.floor(el.tam / (n + 2 * q)), lado = celda * (n + 2 * q);
  const x0 = Math.round(el.x - lado / 2), y0 = Math.round(el.y - lado / 2);
  ctx.fillStyle = el.fondo || '#ffffff'; ctx.fillRect(x0, y0, lado, lado);
  ctx.fillStyle = el.color || '#111111';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (qr.isDark(r, c)) ctx.fillRect(x0 + (c + q) * celda, y0 + (r + q) * celda, celda, celda);
  return { x: x0, y: y0, w: lado, h: lado };
}

/* datos: { nombre, evento, fecha, emisor, horas, codigo, enlace, enlacecorto } */
async function dibujar(pl, datos) {
  const { img } = await cargarRecursos(pl);
  const cv = document.createElement('canvas'); cv.width = pl.ancho; cv.height = pl.alto;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0, pl.ancho, pl.alto);
  const zonas = {}, cajas = [];
  for (const [idx, el] of pl.elementos.entries()) {
    if (el.si && !datos[el.si]) continue;
    if (el.tipo === 'linea') {
      ctx.strokeStyle = el.color || '#000'; ctx.lineWidth = el.grosor || 2;
      ctx.beginPath(); ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.stroke();
    } else if (el.tipo === 'qr') {
      zonas.qr = dibujarQR(ctx, el, datos.enlace); cajas[idx] = zonas.qr;
    } else {
      let t = String(el.texto).replace(/\{(\w+)\}/g, (m, k) => datos[k] == null ? '' : datos[k]);
      if (el.mayusculas) t = t.toUpperCase();
      const { lineas, tam } = ajustar(ctx, t, el);
      ctx.font = fuente(el, tam); ctx.fillStyle = el.color || '#000'; ctx.textBaseline = 'alphabetic';
      const esp = el.espaciado || 0; if ('letterSpacing' in ctx) ctx.letterSpacing = esp + 'px';
      const al = el.alinear || 'center'; ctx.textAlign = al;
      const dx = al === 'center' ? esp / 2 : 0, alto = el.altoLinea || Math.round(tam * 1.25);
      lineas.forEach((l, i) => ctx.fillText(l, el.x + dx, el.y + i * alto));
      const w = Math.max(40, ...lineas.map(l => ctx.measureText(l).width));
      cajas[idx] = { x: al === 'center' ? el.x - w / 2 : al === 'right' ? el.x - w : el.x, y: el.y - tam * 0.85, w, h: (lineas.length - 1) * alto + tam * 1.05 };
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
  }
  return { canvas: cv, zonas, cajas };
}

function nombreArchivo(nombre, extension) {
  const limpio = ('Certificado ' + nombre).replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim()
    .toLowerCase().replace(/(^|\s)\p{L}/gu, m => m.toUpperCase());
  return limpio + '.' + extension;
}
function guardar(blob, nombre) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function descargarPNG(res, nombre) {
  return new Promise(ok => res.canvas.toBlob(b => { guardar(b, nombreArchivo(nombre, 'png')); ok(); }, 'image/png'));
}
function descargarPDF(pl, res, nombre, enlace) {
  const { jsPDF } = root.jspdf, ancho = 297, alto = +(297 * pl.alto / pl.ancho).toFixed(2);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [ancho, alto] });
  const png = esSvg(pl.fondo);
  pdf.addImage(res.canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.95), png ? 'PNG' : 'JPEG', 0, 0, ancho, alto, undefined, 'FAST');
  const q = res.zonas.qr, k = ancho / pl.ancho;
  if (q && enlace) pdf.link(q.x * k, q.y * k, q.w * k, q.h * k, { url: enlace });
  pdf.setProperties({ title: 'Certificado ' + nombre });
  guardar(pdf.output('blob'), nombreArchivo(nombre, 'pdf'));
}

root.Cert = Object.assign(root.Cert || {}, { dibujar, descargarPNG, descargarPDF, nombreArchivo, FUENTES, cargarImagen });
})(window);
