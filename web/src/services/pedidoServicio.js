import clienteApi from '@/services/clienteApi';
import { extraerDatos, extraerPaginado } from '@/utils/respuestaApi';
import { resolverUrlAlmacenamiento } from '@/composables/useImagenStorage';

const RUTA = '/pedidos';

/* Estados válidos del pedido (deben coincidir con el enum del backend). */
export const ESTADOS_PEDIDO = [
  { valor: 'Pendiente_Pago', etiqueta: 'Pendiente de pago', clases: 'bg-amber-50 text-amber-700 border-amber-200' },
  { valor: 'Pagado', etiqueta: 'Pagado', clases: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { valor: 'En_Preparacion', etiqueta: 'En preparación', clases: 'bg-blue-50 text-blue-700 border-blue-200' },
  { valor: 'Enviado', etiqueta: 'Enviado', clases: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { valor: 'Entregado', etiqueta: 'Entregado', clases: 'bg-gray-100 text-gray-700 border-gray-300' },
  { valor: 'Cancelado', etiqueta: 'Cancelado', clases: 'bg-red-50 text-red-700 border-red-200' },
  { valor: 'Revision_Pago', etiqueta: 'Pago en revisión', clases: 'bg-orange-50 text-orange-700 border-orange-200' }
];

/* Estados que asigna el sistema (reserva vencida o pago rechazado); no se eligen a mano. */
const ESTADOS_SISTEMA = [
  { valor: 'Expirado', etiqueta: 'Expirado', clases: 'bg-gray-100 text-gray-600 border-gray-200' },
  { valor: 'Rechazado', etiqueta: 'Pago rechazado', clases: 'bg-red-50 text-red-700 border-red-200' }
];

/* Estados en los que el pedido ya no avanza por el flujo de despacho. */
export const ESTADOS_SIN_FLUJO = ['Cancelado', 'Expirado', 'Rechazado', 'Revision_Pago'];

/* Estados que exigen transportadora y número de guía. */
export const ESTADOS_CON_GUIA = ['Enviado', 'Entregado'];

export const TRANSPORTADORAS_SUGERIDAS = [
  'Servientrega',
  'Coordinadora',
  'Interrapidísimo',
  'Envía',
  'TCC',
  'Deprisa',
  '4-72'
];

export function infoEstadoPedido(estado) {
  return ESTADOS_PEDIDO.find((e) => e.valor === estado)
    ?? ESTADOS_SISTEMA.find((e) => e.valor === estado)
    ?? { valor: estado, etiqueta: String(estado || 'Sin estado').replace(/_/g, ' '), clases: 'bg-gray-100 text-gray-600 border-gray-200' };
}

const ESTADOS_ALTERNOS = {
  pendiente: 'Pendiente_Pago',
  pagado: 'Pagado',
  preparacion: 'En_Preparacion',
  en_preparacion: 'En_Preparacion',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  revision_pago: 'Revision_Pago',
  expirado: 'Expirado',
  rechazado: 'Rechazado'
};

function normalizarEstado(valor) {
  if (!valor) return 'Pendiente_Pago';
  return ESTADOS_ALTERNOS[String(valor).toLowerCase()] ?? valor;
}

function normalizarDetalle(d = {}) {
  const cantidad = Number(d.cantidad ?? 0) || 0;
  const precio = Number(d.precio_unitario ?? d.precio ?? 0) || 0;
  const imagenes = d.producto?.imagenes ?? d.variante?.producto?.imagenes ?? [];
  const principal = imagenes.find((i) => i.es_principal) ?? imagenes[0] ?? null;

  return {
    id: d.id ?? null,
    productoId: d.producto_id ?? d.producto?.id_producto ?? d.variante?.producto_id ?? null,
    varianteId: d.producto_variante_id ?? d.variante?.id_variante ?? null,
    nombre: d.variante?.producto?.nombre ?? d.producto?.nombre ?? d.nombre_producto ?? 'Prenda',
    imagen: resolverUrlAlmacenamiento(principal),
    talla: d.variante?.talla ?? d.talla ?? '',
    sku: d.variante?.sku ?? d.sku ?? '',
    cantidad,
    precio,
    subtotal: Number(d.subtotal ?? cantidad * precio) || 0
  };
}

export function normalizarPedido(p = {}) {
  const id = p.id ?? p.id_pedido ?? null;
  const usuario = p.usuario ?? p.cliente ?? p.user ?? {};
  const detallesCrudos = p.detalles ?? p.detalle_pedidos ?? p.detalles_pedido ?? p.items ?? [];

  return {
    id,
    referencia: p.referencia ?? p.referencia_pasarela ?? p.codigo ?? `PED-${id}`,
    estado: normalizarEstado(p.estado),
    total: Number(p.monto_total ?? p.total ?? 0) || 0,
    subtotal: Number(p.subtotal ?? p.monto_subtotal ?? 0) || 0,
    envio: Number(p.costo_envio ?? p.envio ?? 0) || 0,
    fecha: p.created_at ?? p.fecha_pedido ?? p.fecha ?? null,
    fechaPedido: p.fecha_pedido ?? p.created_at ?? null,
    cliente: {
      nombre: usuario.nombre ?? p.nombre_cliente ?? 'Cliente',
      correo: usuario.correo ?? usuario.email ?? ''
    },
    telefono: p.telefono_contacto ?? '',
    direccion: p.direccion_envio ?? '',
    ciudad: p.ciudad_envio ?? '',
    departamento: p.departamento_envio ?? '',
    metodoPago: p.metodo_pago ?? '',
    notas: p.notas_cliente ?? '',
    empresaTransportadora: p.empresa_transportadora ?? '',
    numeroGuia: p.numero_guia ?? '',
    facturaId: p.factura?.id ?? p.factura_id ?? null,
    detalles: Array.isArray(detallesCrudos) ? detallesCrudos.map(normalizarDetalle) : [],
    original: p
  };
}

/**
 * GET /api/pedidos?page=&estado=&buscar=
 */
export async function listarPedidos({ pagina = 1, estado = '', buscar = '', porPagina = 15 } = {}) {
  const params = { page: pagina, per_page: porPagina };
  if (estado) params.estado = estado;
  if (buscar) params.buscar = buscar;

  const respuesta = await clienteApi.get(RUTA, { params });
  const paginado = extraerPaginado(respuesta);
  return { ...paginado, lista: paginado.lista.map(normalizarPedido) };
}

export async function obtenerPedido(id) {
  const respuesta = await clienteApi.get(`${RUTA}/${id}`);
  return normalizarPedido(extraerDatos(respuesta));
}

/**
 * PUT /api/pedidos/{id} con { estado, empresa_transportadora, numero_guia }
 */
export async function actualizarDespacho(id, { estado, empresaTransportadora, numeroGuia } = {}) {
  const datos = {};
  if (estado !== undefined) datos.estado = estado;
  if (empresaTransportadora !== undefined) {
    datos.empresa_transportadora = String(empresaTransportadora || '').trim() || null;
  }
  if (numeroGuia !== undefined) {
    datos.numero_guia = String(numeroGuia || '').trim() || null;
  }

  const respuesta = await clienteApi.put(`${RUTA}/${id}`, datos);
  return normalizarPedido(extraerDatos(respuesta));
}

export default {
  ESTADOS_PEDIDO,
  ESTADOS_SIN_FLUJO,
  ESTADOS_CON_GUIA,
  TRANSPORTADORAS_SUGERIDAS,
  infoEstadoPedido,
  normalizarPedido,
  listarPedidos,
  obtenerPedido,
  actualizarDespacho
};
