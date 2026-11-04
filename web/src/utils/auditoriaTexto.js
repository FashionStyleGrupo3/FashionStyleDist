import { Package, ShoppingBag, Boxes, UserCog, FileText } from 'lucide-vue-next';

/**
 * Convierte los registros crudos de la Bitácora (modelo, accion, JSON de
 * datos anteriores/nuevos) en frases y datos legibles para una persona.
 */

export const MODELOS = {
  Producto: { nombre: 'producto', articulo: 'el', plural: 'Productos', icono: Package },
  Venta: { nombre: 'venta', articulo: 'la', plural: 'Ventas', icono: ShoppingBag },
  Inventario: { nombre: 'movimiento de inventario', articulo: 'el', plural: 'Inventario', icono: Boxes },
  User: { nombre: 'usuario', articulo: 'el', plural: 'Usuarios', icono: UserCog }
};

const MODELO_GENERICO = { nombre: 'registro', articulo: 'el', plural: 'Registros', icono: FileText };

export const ACCIONES = {
  created: { etiqueta: 'Creado', verbo: 'creó', clases: 'bg-emerald-50 text-emerald-700 ring-emerald-200', punto: 'bg-emerald-500' },
  updated: { etiqueta: 'Modificado', verbo: 'modificó', clases: 'bg-amber-50 text-amber-700 ring-amber-200', punto: 'bg-amber-500' },
  deleted: { etiqueta: 'Eliminado', verbo: 'eliminó', clases: 'bg-red-50 text-red-700 ring-red-200', punto: 'bg-red-500' }
};

const ETIQUETAS = {
  // Producto
  codigo: 'código',
  nombre: 'Nombre',
  descripcion: 'Descripcion',
  color: 'Color',
  categoria_id: 'Categorá',
  catalogo_id: 'coleccion',
  precio_venta: 'Precio de venta',
  activo: 'Activo',
  publicado: 'Publicado en la tienda',
  // Venta
  numero_comprobante: 'N.º de comprobante',
  pedido_id: 'Pedido',
  usuario_id: 'Responsable',
  cliente_nombre: 'Cliente',
  categoria: 'Categorá',
  notas: 'Notas',
  fecha_venta: 'Fecha de venta',
  monto_total: 'Total',
  medio_pago: 'Medio de pago',
  estado: 'Estado',
  cancelada: 'Cancelada',
  // Inventario
  producto_id: 'Producto',
  variante_id: 'Variante',
  tipo_movimiento: 'Tipo de movimiento',
  concepto: 'Concepto',
  observaciones: 'Observaciones',
  cantidad: 'Cantidad',
  fecha_registro: 'Fecha de registro',
  diferencia: 'Diferencia de stock',
  // Usuario
  correo: 'Correo',
  correo_pendiente: 'Correo pendiente de confirmar',
  telefono: 'teléfono',
  direccion: 'Direccion',
  ciudad: 'Ciudad',
  email_verified_at: 'Correo verificado el',
  terminos_version: 'version de términos',
  terminos_aceptados_at: 'Términos aceptados el',
  foto_perfil: 'Foto de perfil'
};

// Campos técnicos que no aportan nada a quien lee la Bitácora.
const OCULTOS = new Set([
  'id', 'created_at', 'updated_at', 'deleted_at', 'remember_token', 'google_id',
  'codigo_verificacion', 'codigo_verificacion_enviado_at',
  'codigo_cambio_correo', 'codigo_cambio_correo_enviado_at'
]);

const BOOLEANOS = new Set(['activo', 'publicado', 'cancelada']);
const DINERO = new Set(['precio_venta', 'monto_total', 'precio', 'costo', 'valor']);

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function infoModelo(modelo) {
  const clase = String(modelo || '').split('\\').pop();
  return { clave: clase, ...(MODELOS[clase] || { ...MODELO_GENERICO, nombre: clase.toLowerCase() || 'registro' }) };
}

export function etiquetaCampo(campo) {
  if (ETIQUETAS[campo]) return ETIQUETAS[campo];
  const limpio = campo.replace(/_id$/, '').replace(/_/g, ' ');
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function esCampoVisible(campo) {
  return !OCULTOS.has(campo) && !campo.startsWith('id_') && !campo.startsWith('password');
}

export function formatearFecha(valor, conHora = true) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(conHora ? { hour: 'numeric', minute: '2-digit' } : {})
  });
}

export function formatearValor(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return '—';

  if (BOOLEANOS.has(campo)) return Number(valor) === 1 || valor === true ? 'Sí' : 'No';
  if (DINERO.has(campo) && !Number.isNaN(Number(valor))) return moneda.format(Number(valor));
  if (campo === 'foto_perfil') return 'Imagen cargada';
  if (campo.endsWith('_id')) return `#${valor}`;
  if (campo.endsWith('_at') || campo.startsWith('fecha_')) return formatearFecha(valor);

  if (typeof valor === 'object') return Object.values(valor).join(', ');

    const texto = String(valor);
    const corto = texto.length > 90 ? `${texto.slice(0, 90)}…` : texto;
    return /^[a-záéíóúüñÁÉÍÓÚÜÑ]/.test(corto) ? corto.charAt(0).toUpperCase() + corto.slice(1) : corto;
}

function nombreDelRegistro(item, datos) {
  const candidato = datos.nombre || datos.numero_comprobante || datos.concepto || datos.cliente_nombre || datos.correo;
  return candidato ? String(candidato) : null;
}

function verboEspecial(item, cambios) {
  if (item.accion !== 'updated' || cambios.length === 0) return null;

  const porCampo = Object.fromEntries(cambios.map((c) => [c.campo, c]));

  if (cambios.length === 1 && porCampo.activo) {
    return porCampo.activo.nuevoCrudo ? 'activó' : 'desactivó';
  }
  if (porCampo.cancelada && porCampo.cancelada.nuevoCrudo) return 'canceló';
  if (porCampo.estado && String(porCampo.estado.nuevoCrudo).toLowerCase() === 'anulado') return 'anuló';

  return null;
}

/**
 * Devuelve todo lo necesario para pintar un registro de la Bitácora.
 */
export function describirAuditoria(item) {
  const modelo = infoModelo(item.modelo);
  const accion = ACCIONES[item.accion] || { ...ACCIONES.updated, etiqueta: item.accion || 'accion', verbo: 'registró' };

  const antes = item.datos_anteriores || {};
  const nuevos = item.datos_nuevos || {};

  // Datos de referencia para nombrar el registro (aunque el cambio no los incluya).
  const referencia = { ...antes, ...nuevos };
  const nombre = nombreDelRegistro(item, referencia);

  let cambios = [];
  let datos = [];

  if (item.accion === 'updated') {
    const campos = [...new Set([...Object.keys(antes), ...Object.keys(nuevos)])].filter(esCampoVisible);

    cambios = campos
      .map((campo) => ({
        campo,
        etiqueta: etiquetaCampo(campo),
        antes: formatearValor(campo, antes[campo]),
        nuevo: formatearValor(campo, nuevos[campo]),
        nuevoCrudo: nuevos[campo]
      }))
      .filter((c) => c.antes !== c.nuevo);
  } else {
    const origen = item.accion === 'deleted' ? antes : nuevos;

    datos = Object.keys(origen)
      .filter(esCampoVisible)
      .filter((campo) => origen[campo] !== null && origen[campo] !== '')
      .map((campo) => ({
        campo,
        etiqueta: etiquetaCampo(campo),
        valor: formatearValor(campo, origen[campo])
      }));
  }

  const soloInterno = item.accion === 'updated' && cambios.length === 0;

  return {
    modelo,
    accion,
    actor: item.usuario?.nombre || 'El sistema',
    verbo: verboEspecial(item, cambios) || accion.verbo,
    sujeto: nombre || (item.modelo_id ? `#${item.modelo_id}` : ''),
    cambios,
    datos,
    soloInterno
  };
}

export function tiempoRelativo(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';

  const segundos = Math.round((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 45) return 'hace unos segundos';
  if (segundos < 3600) return `hace ${Math.round(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.round(segundos / 3600)} h`;

  return fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
}

export function etiquetaDia(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';

  const inicio = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicio(new Date()) - inicio(fecha)) / 86400000);

  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';

  const texto = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}