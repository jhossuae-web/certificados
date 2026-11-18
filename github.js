/* Guardado directo en el repositorio de GitHub desde el panel, con un token personal.
   El token queda solo en este navegador (localStorage) y nunca se sube al repositorio. */
(function (root) {
'use strict';

const LLAVE = 'cert.gh';
const enc = s => new TextEncoder().encode(s);

function config() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem(LLAVE) || '{}'); } catch (e) { c = {}; }
  if (!c.repo) {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/), seg = location.pathname.split('/')[1];
    if (m && seg && !/\.html?$/.test(seg)) c.repo = m[1] + '/' + seg;
  }
  c.rama = c.rama || 'main';
  return c;
}
function guardarConfig(c) { try { localStorage.setItem(LLAVE, JSON.stringify(c)); } catch (e) { /* sin almacenamiento */ } }
function olvidar() { try { localStorage.removeItem(LLAVE); } catch (e) { /* nada */ } }
const conectado = () => { const c = config(); return !!(c.token && c.repo); };

const b64texto = s => { const u = enc(s); let t = ''; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(t); };
const textoDeB64 = b => { const t = atob(b.replace(/\s/g, '')); return new TextDecoder().decode(Uint8Array.from(t, c => c.charCodeAt(0))); };
function b64archivo(file) {
  return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => mal(r.error); r.readAsDataURL(file); });
}

async function api(ruta, opciones) {
  const c = config(); if (!c.token || !c.repo) throw Object.assign(new Error('Falta conectar GitHub'), { codigo: 'sinconexion' });
  const base = c.api || 'https://api.github.com';
  const r = await fetch(base + '/repos/' + c.repo + ruta, Object.assign({}, opciones, {
    headers: Object.assign({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + c.token, 'X-GitHub-Api-Version': '2022-11-28' }, (opciones && opciones.headers) || {})
  }));
  return r;
}
function errorDe(r, texto) {
  const e = new Error(texto || ('GitHub respondió ' + r.status)); e.status = r.status;
  e.codigo = r.status === 401 || r.status === 403 ? 'permiso' : r.status === 404 ? 'noexiste' : (r.status === 409 || r.status === 422 ? 'conflicto' : 'error');
  return e;
}

/* Lee un archivo del repositorio. Devuelve { sha, texto } o null si no existe. */
async function leer(ruta) {
  const r = await api('/contents/' + ruta.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(config().rama), { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw errorDe(r);
  const j = await r.json();
  return { sha: j.sha, texto: j.content ? textoDeB64(j.content) : '' };
}
async function leerJson(ruta) { const a = await leer(ruta); return a ? { sha: a.sha, json: JSON.parse(a.texto) } : null; }

/* Crea o reemplaza un archivo. contenido: { texto } o { base64 }. Busca solo el sha si el archivo ya existe. */
async function escribir(ruta, contenido, mensaje, shaConocido) {
  for (let intento = 0; intento < 2; intento++) {
    let sha = shaConocido;
    if (sha === undefined || intento > 0) { const a = await leer(ruta); sha = a ? a.sha : undefined; }
    const cuerpo = { message: mensaje, content: contenido.base64 || b64texto(contenido.texto), branch: config().rama };
    if (sha) cuerpo.sha = sha;
    const r = await api('/contents/' + ruta.split('/').map(encodeURIComponent).join('/'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    if (r.ok) return r.json();
    if (intento === 0 && (r.status === 409 || r.status === 422)) continue;
    let msg = ''; try { msg = (await r.json()).message; } catch (e) { /* sin detalle */ }
    throw errorDe(r, msg);
  }
}
async function borrar(ruta, mensaje) {
  const a = await leer(ruta); if (!a) return;
  const r = await api('/contents/' + ruta.split('/').map(encodeURIComponent).join('/'), { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: mensaje, sha: a.sha, branch: config().rama }) });
  if (!r.ok) throw errorDe(r);
}

/* Comprueba que el token sirve y que puede escribir en el repositorio. */
async function probar() {
  const r = await api('', { cache: 'no-store' });
  if (r.status === 401) throw Object.assign(new Error('El token no es válido o venció.'), { codigo: 'permiso' });
  if (r.status === 404) throw Object.assign(new Error('No encuentro ese repositorio o el token no tiene acceso a él.'), { codigo: 'noexiste' });
  if (!r.ok) throw errorDe(r);
  const j = await r.json();
  if (!j.permissions || !j.permissions.push) throw Object.assign(new Error('El token no tiene permiso para escribir. Actívale Contents, Read and write.'), { codigo: 'permiso' });
  return j.full_name;
}

root.Cert = Object.assign(root.Cert || {}, { GH: { config, guardarConfig, olvidar, conectado, leer, leerJson, escribir, borrar, probar, b64archivo } });
})(window);
