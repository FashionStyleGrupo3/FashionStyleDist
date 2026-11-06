import api from '@/services/clienteApi';
import { useAutenticacionStore } from '@/stores/autenticacion';

const RUTA = '/promociones';
const TTL_CACHE_MS = 60_000;
const PORCENTAJE_MAXIMO = 90;

let cacheVigentes = null;
let cacheMarca = 0;
let peticionEnCurso = null;

/* Normalizacion */

function aBooleano(valor) {
  if (valor === undefined || valor === null) return true;
  return [true, 1, '1', 'true', 'activa'].includes(valor);
}

function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.promociones)) return data.promociones;
  return [];
}

export function normalizarPromocion(p = {}) {
  const tipoCrudo = String(p.tipo_descuento ?? p.tipo ?? 'porcentaje').toLowerCase();
  return {
    id: p.id_promocion ?? p.id ?? null,
    nombre: p.nombre ?? p.titulo ?? 'Promocion',
    descripcion: p.descripcion ?? '',
    tipo: ['monto', 'valor', 'fijo'].includes(tipoCrudo) ? 'monto' : 'porcentaje',
    valor: Number(p.valor ?? p.porcentaje_descuento ?? p.descuento ?? 0) || 0,
    idProducto: p.id_producto ?? p.producto_id ?? p.producto?.id_producto ?? null,
    nombreProducto: p.producto?.nombre ?? p.nombre_producto ?? null,
    fechaInicio: p.fecha_inicio ?? null,
    fechaFin: p.fecha_fin ?? null,
    activa: aBooleano(p.activa ?? p.estado),
    original: p
  };
}

function resolverUsuarioId(form = {}) {
  if (form.usuario_id) return Number(form.usuario_id);
  try {
    const authStore = useAutenticacionStore();
    return Number(authStore.usuario?.id_usuario || authStore.usuario?.id || 1);
  } catch {
    return 1;
  }
}

/* Convierte el formulario del front al formato que espera el backend. */
export function aPayloadBackend(form) {
  return {
    nombre: String(form.nombre || '').trim(),
    descripcion: String(form.descripcion || '').trim() || null,
    tipo: form.tipo === 'monto' ? 'monto' : 'porcentaje',
    valor: Number(form.valor),
    producto_id: form.alcance === 'prenda'
      ? (Number(form.idProducto ?? form.producto_id) || null)
      : (form.producto_id ? Number(form.producto_id) : null),
    fecha_inicio: form.fechaInicio ?? form.fecha_inicio ?? null,
    fecha_fin: form.fechaFin ?? form.fecha_fin ?? null,
    activa: Boolean(form.activa ?? true),
    usuario_id: resolverUsuarioId(form)
  };
}

/* CRUD */

export async function listarPromociones(params = {}) {
  const respuesta = await api.get(RUTA, { params });
  const datos = respuesta.data?.data ?? respuesta.data;
  return extraerLista(datos).map(normalizarPromocion);
}

export async function crearPromocion(form) {
  const respuesta = await api.post(RUTA, aPayloadBackend(form));
  const datos = respuesta.data?.data ?? respuesta.data;
  invalidarCachePromociones();
  return normalizarPromocion(datos);
}

export async function actualizarPromocion(id, form) {
  const respuesta = await api.put(`${RUTA}/${id}`, aPayloadBackend(form));
  const datos = respuesta.data?.data ?? respuesta.data;
  invalidarCachePromociones();
  return normalizarPromocion(datos);
}

export async function eliminarPromocion(id) {
  await api.delete(`${RUTA}/${id}`);
  invalidarCachePromociones();
}

/* Vigencia */

const oyentesInvalidacion = new Set();

export function alInvalidarPromociones(callback) {
  if (typeof callback === 'function') {
    oyentesInvalidacion.add(callback);
    return () => oyentesInvalidacion.delete(callback);
  }
  return () => {};
}

function aFecha(valor) {
  if (!valor) return null;
  const str = String(valor).trim().replace(' ', 'T');
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diaLocal(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function estaVigente(promo, ahora = new Date()) {
  if (!promo?.activa || promo.valor <= 0) return false;
  // Se comparan días calendario (YYYY-MM-DD): el backend manda "2026-11-05 00:00:00" y,
  // comparando horas, una promoción de un solo día quedaba vencida desde las 00:00:01.
  const hoy = diaLocal(ahora);
  const inicio = promo.fechaInicio ? String(promo.fechaInicio).slice(0, 10) : '';
  const fin = promo.fechaFin ? String(promo.fechaFin).slice(0, 10) : '';
  if (inicio && hoy < inicio) return false;
  if (fin && hoy > fin) return false;
  return true;
}

export function invalidarCachePromociones() {
  cacheVigentes = null;
  cacheMarca = 0;
  for (const cb of oyentesInvalidacion) {
    try {
      cb();
    } catch (e) {
      console.warn('Error en oyente de invalidación de promociones:', e);
    }
  }
}

/** Promociones vigentes con caché de 1 minuto compartida por toda la tienda. */
export async function obtenerPromocionesVigentes({ forzar = false } = {}) {
  if (!forzar && cacheVigentes && Date.now() - cacheMarca < TTL_CACHE_MS) return cacheVigentes;
  if (!forzar && peticionEnCurso) return peticionEnCurso;

  peticionEnCurso = listarPromociones({ vigentes: 1 })
    .then((lista) => {
      cacheVigentes = lista.filter((p) => estaVigente(p));
      cacheMarca = Date.now();
      return cacheVigentes;
    })
    .finally(() => {
      peticionEnCurso = null;
    });

  return peticionEnCurso;
}

/* Descuentos */

function idDeProducto(producto) {
  return producto?.id_producto ?? producto?.id ?? null;
}

function montoDescuento(precio, promo) {
  if (promo.tipo === 'monto') return Math.min(precio, promo.valor);
  const porcentaje = Math.min(PORCENTAJE_MAXIMO, Math.max(0, promo.valor));
  return Math.round((precio * porcentaje) / 100);
}

export function calcularPrecioPromocional(producto, precioBase, promociones = []) {
  const precio = Math.max(0, Number(precioBase) || 0);
  const id = idDeProducto(producto);

  const aplicables = promociones.filter(
    (p) => estaVigente(p) && (p.idProducto === null || Number(p.idProducto) === Number(id))
  );

  let mejor = null;
  let mejorAhorro = 0;
  for (const promo of aplicables) {
    const ahorro = montoDescuento(precio, promo);
    if (ahorro > mejorAhorro) {
      mejor = promo;
      mejorAhorro = ahorro;
    }
  }

  return {
    precioOriginal: precio,
    precioFinal: precio - mejorAhorro,
    ahorro: mejorAhorro,
    porcentaje: precio > 0 ? Math.round((mejorAhorro / precio) * 100) : 0,
    promocion: mejor
  };
}

export default {
  listarPromociones,
  crearPromocion,
  actualizarPromocion,
  eliminarPromocion,
  obtenerPromocionesVigentes,
  invalidarCachePromociones,
  alInvalidarPromociones,
  calcularPrecioPromocional,
  normalizarPromocion,
  aPayloadBackend,
  estaVigente
};