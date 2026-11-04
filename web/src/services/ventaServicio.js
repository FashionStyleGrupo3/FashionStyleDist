import clienteApi from '@/services/clienteApi';
import { extraerDatos, extraerPaginado } from '@/utils/respuestaApi';

const RUTA = '/ventas';

export const MEDIOS_PAGO_POS = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'transferencia', etiqueta: 'Transferencia / Nequi / Daviplata' },
  { valor: 'debito', etiqueta: 'débito' },
  { valor: 'credito', etiqueta: 'Crédito' }
];

function normalizarDetalleVenta(d = {}) {
  const cantidad = Number(d.cantidad ?? 0) || 0;
  const precio = Number(d.precio_unitario ?? d.precio ?? 0) || 0;
  return {
    id: d.id ?? null,
    varianteId: d.variante_id ?? d.variante?.id_variante ?? null,
    nombre: d.variante?.producto?.nombre ?? d.producto?.nombre ?? d.nombre_producto ?? 'Prenda',
    talla: d.variante?.talla ?? d.talla ?? '',
    sku: d.variante?.sku ?? d.sku ?? '',
    cantidad,
    precio,
    subtotal: Number(d.subtotal ?? cantidad * precio) || 0
  };
}

export function normalizarVenta(v = {}) {
  const id = v.id ?? v.id_venta ?? null;
  const usuario = v.usuario ?? v.vendedor ?? v.cliente ?? {};
  const detallesCrudos = v.detalles ?? v.detalle_ventas ?? v.items ?? [];

  return {
    id,
    codigo: v.numero_comprobante ?? v.codigo ?? v.referencia ?? `VTA-${id}`,
    fecha: v.created_at ?? v.fecha_venta ?? v.fecha ?? null,
    estado: v.estado ?? 'Activa',
    medioPago: v.medio_pago ?? v.metodo_pago ?? 'efectivo',
    total: Number(v.total ?? v.monto_total ?? 0) || 0,
    notas: v.notas ?? v.observaciones ?? '',
    clienteNombre: v.cliente_nombre ?? usuario.nombre ?? 'Consumidor final',
    clienteDocumento: v.factura?.cliente_documento ?? v.cliente_documento ?? '',
    facturaId: v.factura?.id ?? v.factura_id ?? null,
    facturaNumero: v.factura?.numero_factura ?? null,
    facturaSubtotal: Number(v.factura?.subtotal ?? 0) || 0,
    facturaImpuesto: Number(v.factura?.impuesto ?? 0) || 0,
    detalles: Array.isArray(detallesCrudos) ? detallesCrudos.map(normalizarDetalleVenta) : [],
    original: v
  };
}

/**
 * GET /api/ventas?page=&medio_pago=&estado=&buscar=
 */
export async function listarVentas({ pagina = 1, medioPago = '', estado = '', buscar = '', porPagina = 15 } = {}) {
  const params = { page: pagina, per_page: porPagina };
  if (medioPago) params.medio_pago = medioPago;
  if (estado) params.estado = estado;
  if (buscar) params.buscar = buscar;

  const respuesta = await clienteApi.get(RUTA, { params });
  const paginado = extraerPaginado(respuesta);
  return { ...paginado, lista: paginado.lista.map(normalizarVenta) };
}

/**
 * GET /api/ventas/resumen
 */
export async function obtenerResumenVentas() {
  const respuesta = await clienteApi.get(`${RUTA}/resumen`);
  const datos = extraerDatos(respuesta) ?? {};
  return {
    ventasHoy: Number(datos.ventas_hoy ?? datos.total_ventas_hoy ?? 0) || 0,
    montoHoy: Number(datos.monto_hoy ?? datos.ingresos_hoy ?? 0) || 0,
    montoActivas: Number(datos.monto_activas ?? datos.total_activas ?? 0) || 0,
    porMedioPago: datos.por_medio_pago ?? datos.desglose_medios ?? datos.medios_pago ?? {}
  };
}

/**
 * POST /api/ventas
 */
export async function registrarVenta({
  items = [],
  medioPago = 'efectivo',
  notas = '',
  clienteNombre = '',
  clienteDocumento = ''
}) {
  const detalles = items.map((item) => ({
    variante_id: Number(item.varianteId),
    producto_id: item.productoId ? Number(item.productoId) : undefined,
    cantidad: Number(item.cantidad),
    precio_unitario: Number(item.precio)
  }));

  const payload = {
    medio_pago: medioPago,
    generar_factura: true,
    notas: String(notas || '').trim() || null,
    observaciones: String(notas || '').trim() || null,
    cliente_nombre: String(clienteNombre || '').trim() || null,
    cliente_documento: String(clienteDocumento || '').trim() || null,
    detalles,
    items: detalles
  };

  const respuesta = await clienteApi.post(RUTA, payload);
  return normalizarVenta(extraerDatos(respuesta));
}

/**
 * POST /api/ventas/{id}/cancelar
 */
export async function cancelarVenta(id, motivo = '') {
  const respuesta = await clienteApi.post(`${RUTA}/${id}/cancelar`, {
    motivo: String(motivo || '').trim() || 'Cancelacion desde panel administrativo'
  });
  return normalizarVenta(extraerDatos(respuesta));
}

export default {
  MEDIOS_PAGO_POS,
  normalizarVenta,
  listarVentas,
  obtenerResumenVentas,
  registrarVenta,
  cancelarVenta
};
