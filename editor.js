/* Editor visual de la posición de nombre, QR, código y texto de verificación sobre el fondo del certificado.
   Se monta sobre los elementos de admin.html (ids que empiezan con ed). */
(function (root) {
'use strict';

const $ = id => document.getElementById(id);
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let pl = null, sel = -1, fondoNuevo = null, ultima = null, corriendo = false, pendiente = false, drag = null, nombreMuestra = '';
let alCambiar = null;

const base = () => (pl && pl.verificador) || new URL('./', location.href).href;
function datos() {
  const b = base();
  return { nombre: nombreMuestra || 'Nombre Apellido Apellido', codigo: 'ABCD 2345X 6789Z', enlace: b + '?c=ABCD2345X6789Z',
    enlacecorto: b.replace(/^https?:\/\//, '').replace(/\/$/, '') };
}
const cambio = () => { if (alCambiar) alCambiar(); };

function pedir() {
  if (!pl) return;
  if (corriendo) { pendiente = true; return; }
  corriendo = true;
  (async () => {
    try {
      const r = await root.Cert.dibujar(pl, datos()); ultima = r;
      r.canvas.id = 'edCv'; $('edCv').replaceWith(r.canvas); pintarCajas(); $('edFondoInfo').dataset.error = '';
    } catch (e) { $('edFondoInfo').textContent = 'No se pudo dibujar. Revisa que el fondo sea una imagen válida.'; }
    finally { corriendo = false; if (pendiente) { pendiente = false; pedir(); } }
  })();
}

function pintarCajas() {
  const c = $('edCajas'); c.textContent = '';
  if (!ultima) return;
  ultima.cajas.forEach((b, i) => {
    if (!b) return;
    const d = h('div', 'caja' + (i === sel ? ' sel' : ''));
    d.style.cssText = 'left:' + (100 * b.x / pl.ancho) + '%;top:' + (100 * b.y / pl.alto) + '%;width:' + (100 * b.w / pl.ancho) + '%;height:' + (100 * b.h / pl.alto) + '%';
    c.appendChild(d);
  });
}

/* El nombre, el QR, el código y el texto de verificación no se pueden quitar: sin ellos el certificado no funciona. */
function esFijo(el) { return el.tipo === 'qr' || /\{(nombre|codigo|enlacecorto|enlace)\}/.test(el.texto || ''); }
function quitar(i) {
  const el = pl.elementos[i]; if (!el || esFijo(el)) return;
  pl.elementos.splice(i, 1); sel = Math.min(i, pl.elementos.length - 1);
  refrescar(); pedir(); cambio();
}
function etiqueta(el) { return el.tipo === 'qr' ? 'Código QR' : el.tipo === 'linea' ? 'Línea' : el.texto; }
function pintarLista() {
  const l = $('edLista'); l.textContent = '';
  pl.elementos.forEach((el, i) => {
    const b = h('button', 'item' + (i === sel ? ' sel' : ''), etiqueta(el)); b.type = 'button';
    b.onclick = () => { sel = i; refrescar(); }; l.appendChild(b);
  });
}
function refrescar() { pintarLista(); pintarProps(); pintarCajas(); }

/* Arrastre */
function aPlantilla(e) { const r = $('edCv').getBoundingClientRect(), k = pl.ancho / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k }; }
function sincronizarXY() { const el = pl.elementos[sel]; if (!el) return; if ($('edX')) $('edX').value = el.x; if ($('edY')) $('edY').value = el.y; }

function montarArrastre() {
  const c = $('edCajas');
  c.addEventListener('pointerdown', e => {
    if (!ultima) return;
    const p = aPlantilla(e); let mejor = -1, area = Infinity;
    ultima.cajas.forEach((b, i) => {
      if (!b || p.x < b.x || p.x > b.x + b.w || p.y < b.y || p.y > b.y + b.h) return;
      const a = b.w * b.h; if (a < area) { area = a; mejor = i; }
    });
    if (mejor < 0) return;
    e.preventDefault(); c.focus(); c.setPointerCapture(e.pointerId);
    sel = mejor; const el = pl.elementos[mejor];
    drag = { x0: e.clientX, y0: e.clientY, ex: el.x, ey: el.y, k: p.k }; refrescar();
  });
  c.addEventListener('pointermove', e => {
    if (!drag || sel < 0) return;
    const el = pl.elementos[sel];
    el.x = Math.round(drag.ex + (e.clientX - drag.x0) * drag.k); el.y = Math.round(drag.ey + (e.clientY - drag.y0) * drag.k);
    sincronizarXY(); pedir(); cambio();
  });
  ['pointerup', 'pointercancel'].forEach(t => c.addEventListener(t, () => { drag = null; }));
  c.addEventListener('keydown', e => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel >= 0) { e.preventDefault(); quitar(sel); return; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || sel < 0) return;
    e.preventDefault(); const el = pl.elementos[sel], paso = e.shiftKey ? 20 : 4;
    el.x += d[0] * paso; el.y += d[1] * paso; sincronizarXY(); pedir(); cambio();
  });
}

/* Propiedades del elemento marcado */
function campo(padre, etiquetaTxt, tipo, valor, alEscribir, extra) {
  const l = h('label', '', etiquetaTxt); padre.appendChild(l);
  const i = document.createElement('input'); i.type = tipo; i.value = valor == null ? '' : valor; Object.assign(i, extra || {});
  i.addEventListener('input', () => alEscribir(i.value)); l.htmlFor = i.id = i.id || ('c' + Math.random().toString(36).slice(2, 7));
  padre.appendChild(i); return i;
}
function pintarProps() {
  const c = $('edProps'); c.textContent = '';
  const el = pl.elementos[sel];
  if (!el) { c.appendChild(h('p', 'ayuda', 'Marca un elemento en la lista o sobre el certificado para ajustarlo.')); return; }
  const num = (v, min) => Math.max(min == null ? -99999 : min, Math.round(+v || 0));
  const hacer = () => { pedir(); cambio(); };
  const dos = h('div', 'dos'); c.appendChild(dos);
  const a = h('div'), b = h('div'); dos.append(a, b);
  campo(a, 'Posición X', 'number', el.x, v => { el.x = num(v); hacer(); }, { id: 'edX' });
  campo(b, 'Posición Y', 'number', el.y, v => { el.y = num(v); hacer(); }, { id: 'edY' });
  if (el.tipo === 'qr') {
    campo(c, 'Tamaño del QR', 'number', el.tam, v => { el.tam = num(v, 120); hacer(); });
  } else if (el.tipo !== 'linea') {
    campo(c, 'Texto', 'text', el.texto, v => { el.texto = v; hacer(); pintarLista(); });
    c.appendChild(h('p', 'ayuda', 'Variables: {nombre} {codigo} {enlacecorto}'));
    c.appendChild(h('label', '', 'Fuente'));
    const sf = document.createElement('select');
    root.Cert.FUENTES.forEach((f, i) => { const o = h('option', '', f.n); o.value = i; sf.appendChild(o); });
    sf.value = Math.max(0, root.Cert.FUENTES.findIndex(f => f.f === el.familia && f.p === (el.peso || 400) && f.s === (el.estilo || 'normal')));
    sf.onchange = () => { const f = root.Cert.FUENTES[+sf.value]; el.familia = f.f; el.peso = f.p; el.estilo = f.s; hacer(); }; c.appendChild(sf);
    const d2 = h('div', 'dos'); c.appendChild(d2); const t1 = h('div'), t2 = h('div'); d2.append(t1, t2);
    campo(t1, 'Tamaño', 'number', el.tam, v => { el.tam = num(v, 10); if (el.tamMin > el.tam) el.tamMin = el.tam; hacer(); });
    campo(t2, 'Color', 'color', el.color || '#000000', v => { el.color = v; hacer(); });
    c.appendChild(h('label', '', 'Alineación'));
    const sa = document.createElement('select');
    [['center', 'Centrado'], ['left', 'Izquierda'], ['right', 'Derecha']].forEach(([v, n]) => { const o = h('option', '', n); o.value = v; sa.appendChild(o); });
    sa.value = el.alinear || 'center'; sa.onchange = () => { el.alinear = sa.value; hacer(); }; c.appendChild(sa);
    const d3 = h('div', 'dos'); c.appendChild(d3); const u1 = h('div'), u2 = h('div'); d3.append(u1, u2);
    campo(u1, 'Ancho máximo', 'number', el.ancho || '', v => { if (+v > 0) el.ancho = num(v, 50); else delete el.ancho; hacer(); });
    campo(u2, 'Espaciado entre letras', 'number', el.espaciado || 0, v => { el.espaciado = num(v, 0); hacer(); });
    const ch = h('label', 'chk'); const ci = document.createElement('input'); ci.type = 'checkbox'; ci.checked = !!el.mayusculas;
    ci.onchange = () => { el.mayusculas = ci.checked; hacer(); }; ch.append(ci, document.createTextNode('Todo en mayúsculas')); c.appendChild(ch);
  }
  if (esFijo(el)) c.appendChild(h('p', 'ayuda', 'Este elemento es parte de cada certificado, así que no se puede eliminar. Solo lo mueves o le cambias el estilo.'));
  else { const bx = h('button', 'mal', 'Eliminar este elemento'); bx.type = 'button'; bx.style.marginTop = '12px'; bx.onclick = () => quitar(sel); c.appendChild(bx); }
}

/* Fondo propio */
function montarFondo() {
  $('edFondo').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f || !pl) return;
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => {
      const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '');
      fondoNuevo = { file: f, ext };
      pl.fondo = url;
      if (img.naturalWidth && img.naturalHeight) pl.alto = Math.round(pl.ancho * img.naturalHeight / img.naturalWidth);
      $('edFondoInfo').textContent = 'Fondo cargado: ' + img.naturalWidth + ' x ' + img.naturalHeight + ' px.';
      pedir(); cambio();
    };
    img.onerror = () => { $('edFondoInfo').textContent = 'No pude leer esa imagen. Usa PNG, JPG o SVG.'; };
    img.src = url;
  });
}

let montado = false;
const Editor = {
  /* plantilla: objeto de plantilla; alCambiar: función que se llama al mover o editar algo. */
  iniciar(plantilla, cuandoCambia) {
    pl = JSON.parse(JSON.stringify(plantilla)); alCambiar = cuandoCambia || null; fondoNuevo = null; sel = pl.elementos.findIndex(e => /\{nombre\}/.test(e.texto || ''));
    if (!montado) { montado = true; montarArrastre(); montarFondo(); $('edAgregar').onclick = () => {
      pl.elementos.push({ texto: 'Texto nuevo', x: Math.round(pl.ancho / 2), y: Math.round(pl.alto / 2), familia: 'Lato', peso: 400, tam: 64, color: '#1f2f4d' });
      sel = pl.elementos.length - 1; refrescar(); pedir(); cambio(); }; }
    $('edFondo').value = ''; $('edFondoInfo').textContent = '';
    refrescar(); pedir();
  },
  fijarNombre(n) { nombreMuestra = n || ''; pedir(); },
  obtener() { return { plantilla: JSON.parse(JSON.stringify(pl)), fondoNuevo }; },
  redibujar: pedir
};
root.Cert = Object.assign(root.Cert || {}, { Editor });
})(window);
