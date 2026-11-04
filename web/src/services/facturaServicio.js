import clienteApi from '@/services/clienteApi';
import { extraerDatos, extraerPaginado } from '@/utils/respuestaApi';

const RUTA = '/facturas';

export const EXTENSIONES_CARGA_MASIVA = ['xlsx', 'csv'];
export const TAMANO_MAXIMO_CARGA_MB = 5;

function normalizarDetalle(d = {}) {
  const cantidad = Number(d.cantidad ?? 0) || 0;
  const precio = Number(d.precio_unitario ?? d.precio ?? 0) || 0;
  return {
    descripcion: d.descripcion
      ?? d.variante?.producto?.nombre
      ?? d.producto?.nombre
      ?? d.nombre_producto
      ?? 'Prenda',
    talla: d.variante?.talla ?? d.talla ?? '',
    cantidad,
    precio,
    subtotal: Number(d.subtotal ?? cantidad * precio) || 0
  };
}

export function normalizarFactura(f = {}) {
  const id = f.id ?? f.id_factura ?? null;
  const pedido = f.pedido ?? {};
  const venta = f.venta ?? {};
  const usuario = pedido.usuario ?? venta.cliente ?? venta.usuario ?? f.usuario ?? {};
  const detallesCrudos = f.detalles ?? pedido.detalles ?? venta.detalles ?? [];

  const subtotal = Number(f.subtotal ?? 0) || 0;
  const impuestos = Number(f.impuestos ?? f.iva ?? f.valor_iva ?? 0) || 0;
  const descuento = Number(f.descuento ?? 0) || 0;
  const pedidoId = f.pedido_id ?? null;
  const ventaId = f.venta_id ?? null;

  return {
    id,
    numero: f.numero_factura ?? f.numero ?? f.consecutivo ?? `FAC-${id}`,
    fecha: f.fecha_emision ?? f.created_at ?? null,
    estado: f.estado ?? 'Emitida',
    pedidoId,
    ventaId,
    origen: pedidoId ? 'pedido' : ventaId ? 'venta' : 'manual',
    subtotal,
    impuestos,
    descuento,
    total: Number(f.total ?? f.monto_total ?? subtotal + impuestos - descuento) || 0,
    metodoPago: f.metodo_pago ?? venta.medio_pago ?? pedido.metodo_pago ?? '',
    notas: f.notas ?? f.observaciones ?? '',
    cliente: {
      nombre: f.cliente_nombre ?? usuario.nombre ?? 'Consumidor final',
      documento: f.cliente_documento ?? f.nit ?? usuario.documento ?? '',
      correo: f.cliente_correo ?? usuario.correo ?? usuario.email ?? '',
      direccion: f.cliente_direccion ?? pedido.direccion_envio ?? '',
      ciudad: pedido.ciudad_envio ?? ''
    },
    detalles: Array.isArray(detallesCrudos) ? detallesCrudos.map(normalizarDetalle) : [],
    original: f
  };
}

/**
 * GET /api/facturas?page=&buscar=
 */
export async function listarFacturas({ pagina = 1, buscar = '', porPagina = 15 } = {}) {
  const params = { page: pagina, per_page: porPagina };
  if (buscar) params.buscar = buscar;

  const respuesta = await clienteApi.get(RUTA, { params });
  const paginado = extraerPaginado(respuesta);
  return { ...paginado, lista: paginado.lista.map(normalizarFactura) };
}

/**
 * GET /api/facturas/{id} (se usa para tener los detalles completos en la vista previa).
 */
export async function obtenerFactura(id) {
  const respuesta = await clienteApi.get(`${RUTA}/${id}`);
  return normalizarFactura(extraerDatos(respuesta));
}

/**
 * POST /api/facturas — Creacion manual asociada a una venta o a un pedido.
 */
export async function crearFactura({ origen, referenciaId, fechaEmision, clienteDocumento, notas }) {
  const id = Number(referenciaId);
  const payload = {
    pedido_id: origen === 'pedido' ? id : null,
    venta_id: origen === 'venta' ? id : null,
    fecha_emision: fechaEmision || null,
    cliente_documento: String(clienteDocumento || '').trim() || null,
    notas: String(notas || '').trim() || null
  };

  const respuesta = await clienteApi.post(RUTA, payload);
  return normalizarFactura(extraerDatos(respuesta));
}

/**
 * POST /api/facturas/carga-masiva — multipart/form-data con el campo "archivo".
 * Se fuerza el Content-Type porque clienteApi usa application/json por defecto
 * y axios convertirá el FormData a JSON.
 */
export async function cargarFacturasMasivo(archivo, { alProgresar } = {}) {
  const formData = new FormData();
  formData.append('archivo', archivo);

  const respuesta = await clienteApi.post(`${RUTA}/carga-masiva`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    onUploadProgress: (evento) => {
      if (alProgresar && evento.total) {
        alProgresar(Math.round((evento.loaded * 100) / evento.total));
      }
    }
  });

  const datos = extraerDatos(respuesta) ?? {};
  const errores = datos.errores ?? datos.errors ?? datos.fallidas ?? [];
  return {
    importadas: Number(datos.importadas ?? datos.creadas ?? datos.total_importadas ?? 0) || 0,
    errores: Array.isArray(errores) ? errores : [],
    mensaje: respuesta.data?.message ?? datos.message ?? ''
  };
}

export function validarArchivoCargaMasiva(archivo) {
  if (!archivo) return 'Selecciona un archivo.';
  const extension = String(archivo.name.split('.').pop() || '').toLowerCase();
  if (!EXTENSIONES_CARGA_MASIVA.includes(extension)) {
    return 'Formato no permitido. Solo se aceptan archivos .xlsx o .csv.';
  }
  if (archivo.size > TAMANO_MAXIMO_CARGA_MB * 1024 * 1024) {
    return `El archivo supera el límite de ${TAMANO_MAXIMO_CARGA_MB} MB.`;
  }
  return null;
}

/** Plantilla CSV de ejemplo para la carga masiva. */
export function descargarPlantillaCsv() {
  const contenido = [
    'pedido_id,venta_id,fecha_emision,cliente_documento,notas',
    '15,,2026-10-16,1020304050,Factura pedido online',
    ',8,2026-10-16,,Venta de mostrador'
  ].join('\n');

  const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'plantilla_facturas.csv';
  enlace.click();
  URL.revokeObjectURL(url);
}

/**
 * Emite una factura automáticamente para un pedido confirmado (vá Wompi o eCommerce)
 * sin requerir ingreso manual de IDs.
 */
export async function autoFacturarPedido(pedido, { transaccionWompi = null, notasAdicionales = '' } = {}) {
  const pedidoId = Number(pedido?.id ?? pedido);
  const cliente = pedido?.cliente ?? pedido?.usuario ?? {};
  const doc = cliente?.documento || cliente?.numero_documento || '';

  let notaAuto = `Facturación automática pedido #${pedidoId}`;
  if (pedido?.referencia) {
    notaAuto += ` · Ref: ${pedido.referencia}`;
  }
  if (transaccionWompi?.id) {
    notaAuto += ` · Transaccion Wompi: ${transaccionWompi.id} (${transaccionWompi.payment_method_type || 'Aprobada'})`;
  } else if (pedido?.metodoPago) {
    notaAuto += ` · Pago: ${pedido.metodoPago}`;
  }
  if (notasAdicionales) {
    notaAuto += ` | ${notasAdicionales}`;
  }

  return await crearFactura({
    origen: 'pedido',
    referenciaId: pedidoId,
    fechaEmision: new Date().toISOString().slice(0, 10),
    clienteDocumento: doc,
    notas: notaAuto
  });
}

export default {
  normalizarFactura,
  listarFacturas,
  obtenerFactura,
  crearFactura,
  autoFacturarPedido,
  cargarFacturasMasivo,
  validarArchivoCargaMasiva,
  descargarPlantillaCsv
};
