/* Núcleo compartido: cifrado, códigos y lectura de listas.
   Usa el mismo esquema que index.html (verificador): código = LOTE(4) + SECRETO(10),
   registro de validación cifrado con AES-GCM y clave PBKDF2 derivada del secreto. */
(function (root) {
'use strict';

const C = root.crypto || (typeof require === 'function' ? require('node:crypto').webcrypto : null);
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const enc = s => new TextEncoder().encode(s);
const hex = u => [...u].map(x => x.toString(16).padStart(2, '0')).join('');
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

function azar(n) {
  const b = new Uint8Array(n); C.getRandomValues(b);
  return [...b].map(x => ALFA[x % ALFA.length]).join(''); // 32 símbolos: sin sesgo
}

function normReg(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function limpiarNombre(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
function formatoCodigo(c) { return c.slice(0, 4) + ' ' + c.slice(4, 9) + ' ' + c.slice(9); }

async function idDe(texto) {
  return hex(new Uint8Array(await C.subtle.digest('SHA-256', enc(texto)))).slice(0, 24);
}
async function clave(secreto, sal, it) {
  const base = await C.subtle.importKey('raw', enc(secreto), 'PBKDF2', false, ['deriveKey']);
  return C.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: it, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function sellar(k, obj) {
  const iv = new Uint8Array(12); C.getRandomValues(iv);
  const ct = new Uint8Array(await C.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc(JSON.stringify(obj))));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
  return b64(out);
}
async function abrir(k, blob) {
  const r = unb64(blob);
  const pt = await C.subtle.decrypt({ name: 'AES-GCM', iv: r.slice(0, 12) }, k, r.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}

/* Interpreta filas de un Excel o CSV (arreglo de arreglos). Busca las columnas por encabezado
   (registro, nombre completo); si no hay encabezado usa la columna 1 y la 2. */
function leerFilas(filas) {
  const avisos = { duplicados: [], vacios: 0 };
  filas = filas.filter(f => f && f.some(c => String(c == null ? '' : c).trim() !== ''));
  if (!filas.length) return { alumnos: [], avisos };
  const cab = filas[0].map(c => String(c == null ? '' : c).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim());
  let ir = cab.findIndex(c => /^(registro|matricula|ru|codigo|cod|ci|id|nro|numero)\b/.test(c) || c.includes('registro'));
  let inom = cab.findIndex(c => /(nombre completo|nombres? y apellidos?|estudiante|alumno|participante)/.test(c));
  if (inom < 0) inom = cab.findIndex(c => /nombre/.test(c));
  let datos;
  if (ir >= 0 && inom >= 0 && ir !== inom) datos = filas.slice(1);
  else { ir = 0; inom = 1; datos = filas; }
  const vistos = new Set(), alumnos = [];
  for (const f of datos) {
    const reg = normReg(f[ir]), nombre = limpiarNombre(f[inom]);
    if (!reg || !nombre) { avisos.vacios++; continue; }
    if (vistos.has(reg)) { avisos.duplicados.push(reg); continue; }
    vistos.add(reg); alumnos.push({ reg, nombre, regOriginal: String(f[ir]).trim() });
  }
  return { alumnos, avisos };
}

/* Arma el archivo del evento (LOTE.json).
   d: parte de validación (la que lee index.html). r: parte de consulta por registro. */
async function construirLote(o) {
  const it = o.it || 100000, lote = o.lote;
  const sal = new Uint8Array(16); C.getRandomValues(sal);
  const json = { v: 1, lote, it, s: b64(sal),
    ev: { n: o.evento, f: o.fecha || '', e: o.emisor || '', h: o.horas || '' }, d: {}, r: {} };
  const usados = new Set(), filas = new Array(o.alumnos.length);
  let hechos = 0, i = 0;
  async function uno(idx) {
    const a = o.alumnos[idx];
    let p; do { p = azar(10); } while (usados.has(p)); usados.add(p);
    const kd = await clave(p, sal, it);
    const kr = await clave('R|' + lote + '|' + a.reg, sal, it);
    const f = [['Nombre completo', a.nombre], ['Evento', o.evento]];
    if (o.fecha) f.push(['Fecha', o.fecha]);
    if (o.horas) f.push(['Carga horaria', o.horas]);
    json.d[await idDe(lote + '|' + p)] = await sellar(kd, { e: o.emisor || '', f });
    json.r[await idDe('R|' + lote + '|' + a.reg)] = await sellar(kr, { n: a.nombre, p });
    filas[idx] = { reg: a.regOriginal || a.reg, nombre: a.nombre, codigo: formatoCodigo(lote + p) };
    hechos++; if (o.onProgreso) o.onProgreso(hechos, o.alumnos.length);
  }
  async function trabajador() { while (i < o.alumnos.length) await uno(i++); }
  await Promise.all(Array.from({ length: Math.min(8, o.alumnos.length) }, trabajador));
  return { json, filas };
}

/* Busca a un alumno por registro dentro del archivo del evento. */
async function buscar(j, registro) {
  const reg = normReg(registro);
  if (!reg || !j || !j.r) return null;
  const blob = j.r[await idDe('R|' + j.lote + '|' + reg)];
  if (!blob) return null;
  try {
    const k = await clave('R|' + j.lote + '|' + reg, unb64(j.s), j.it);
    const d = await abrir(k, blob);
    const codigo = j.lote + d.p;
    return { nombre: d.n, codigo, codigoFormato: formatoCodigo(codigo) };
  } catch (e) { return null; }
}

const api = { ALFA, azar, normReg, limpiarNombre, formatoCodigo, leerFilas, construirLote, buscar, idDe, clave, abrir, unb64 };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Cert = Object.assign(root.Cert || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
