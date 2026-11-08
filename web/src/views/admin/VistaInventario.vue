<script setup>
// -> Componente VistaInventario (Rediseñado - Experiencia Moderna, Intuitiva y Estética)
import { computed, onMounted, reactive, ref } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import {
  Boxes,
  History,
  AlertTriangle,
  Plus,
  Download,
  Search,
  Package,
  ArrowUpDown,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  FileText,
  LayoutGrid,
  List,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Filter,
  PackageX,
  PackageCheck,
  TrendingUp,
  Tag,
  Palette
} from 'lucide-vue-next';
import clienteApi from '@/services/clienteApi';
import { useNotificacion } from '@/composables/useNotificacion';
import { useImagenStorage } from '@/composables/useImagenStorage';
import ResumenInventario from '@/components/Inventario/ResumenInventario.vue';
import FiltrosInventario from '@/components/Inventario/FiltrosInventario.vue';
import TablaInventario from '@/components/Inventario/TablaInventario.vue';
import ModalInventario from '@/components/Inventario/ModalInventario.vue';
import PanelAlertasStock from '@/components/Inventario/PanelAlertasStock.vue';
import PanelAlertasAutomaticas from '@/components/Inventario/PanelAlertasAutomaticas.vue';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { exportarExcel, exportarPDF } from '@/composables/useExportarReporte';
import { COLUMNAS_KARDEX } from '@/utils/kardex';

const { notificarError, notificarExito, confirmarAccion } = useNotificacion();
const { resolverUrlImagen } = useImagenStorage();

// Pestañas y Vistas
const pestanaActiva = ref('existencias'); // 'existencias' | 'kardex' | 'alertas'
const subPestanaAlertas = ref('reposicion'); // 'reposicion' | 'sistema'
const vistaModo = ref('tabla'); // 'tabla' | 'cuadricula'

// Datos
const movimientos = ref([]);
const variantes = ref([]);
const resumen = ref({ total_movimientos: 0, entradas: 0, salidas: 0, ajustes: 0, anulados: 0 });
const cargando = ref(false);
const guardando = ref(false);
const modal = ref(false);
const editando = ref(null);

// Filtros de Existencias
const busquedaExistencias = ref('');
const filtroDisponibilidad = ref('todos'); // 'todos' | 'en_stock' | 'Bajo_stock' | 'agotados'
const filtroCategoria = ref('');
const ordenExistencias = ref('stock_asc'); // 'stock_asc' | 'stock_desc' | 'nombre_asc' | 'precio_desc'

// Filtros Consolidados del Kárdex (RF-031)
const busqueda = ref('');
const filtroTipo = ref('');
const filtroEstado = ref('');
const filtroAmbito = ref('');
const filtroProducto = ref('');
const filtroMateria = ref('');
const filtroUsuario = ref('');
const filtroDesde = ref('');
const filtroHasta = ref('');
const materias = ref([]);
const usuariosKardex = ref([]);
const exportando = ref(false);
const authStore = useAutenticacionStore();
const pagina = ref(1);
const ultimaPagina = ref(1);
const form = reactive({ variante_id: '', tipo_movimiento: 'entrada', concepto: '', observaciones: '', cantidad: '' });
const tokenAlertas = ref(0);

const variantesDeProductos = (data) => {
  const productos = Array.isArray(data) ? data : data?.data || [];
  return productos.flatMap((producto) => (producto.variantes || producto.variants || []).map((variante) => ({
    ...variante,
    producto,
    imagen_url: producto.imagenes?.find((img) => img.es_principal)?.ruta || producto.imagenes?.[0]?.ruta || null,
    label: `${producto.nombre || producto.name || `Producto ${producto.id_producto}`} · ${producto.color || 'Sin color'} · Talla ${variante.talla || 'Única'}`
  })));
};

// Categorías únicas para filtro en existencias
const categoriasExistencias = computed(() => {
  const categorias = new Set();
  variantes.value.forEach((v) => {
    const nombreCat = v.producto?.categoria?.nombre;
    if (nombreCat) categorias.add(nombreCat);
  });
  return Array.from(categorias).sort();
});

// Conteos rápidos de disponibilidad
const conteoDisponibilidad = computed(() => {
  const total = variantes.value.length;
  const enStock = variantes.value.filter((v) => Number(v.stock || 0) > 5).length;
  const bajoStock = variantes.value.filter((v) => Number(v.stock || 0) > 0 && Number(v.stock || 0) <= 5).length;
  const agotados = variantes.value.filter((v) => Number(v.stock || 0) <= 0).length;
  return { total, enStock, bajoStock, agotados };
});

// Variantes filtradas y ordenadas para la pestaña de Existencias
const existenciasFiltradas = computed(() => {
  let lista = [...variantes.value];
  const termino = busquedaExistencias.value.trim().toLowerCase();

  if (termino) {
    lista = lista.filter((v) => {
      const nombre = (v.producto?.nombre || '').toLowerCase();
      const codigo = (v.producto?.codigo || '').toLowerCase();
      const color = (v.producto?.color || '').toLowerCase();
      const talla = (v.talla || '').toLowerCase();
      const sku = (v.sku || '').toLowerCase();
      const categoria = (v.producto?.categoria?.nombre || '').toLowerCase();
      return (
        nombre.includes(termino) ||
        codigo.includes(termino) ||
        color.includes(termino) ||
        talla.includes(termino) ||
        sku.includes(termino) ||
        categoria.includes(termino)
      );
    });
  }

  // Filtro de categoría
  if (filtroCategoria.value) {
    lista = lista.filter((v) => v.producto?.categoria?.nombre === filtroCategoria.value);
  }

  // Filtro de disponibilidad
  if (filtroDisponibilidad.value === 'en_stock') {
    lista = lista.filter((v) => Number(v.stock || 0) > 5);
  } else if (filtroDisponibilidad.value === 'Bajo_stock') {
    lista = lista.filter((v) => Number(v.stock || 0) > 0 && Number(v.stock || 0) <= 5);
  } else if (filtroDisponibilidad.value === 'agotados') {
    lista = lista.filter((v) => Number(v.stock || 0) <= 0);
  }

  // Ordenamiento inteligente
  if (ordenExistencias.value === 'stock_asc') {
    lista.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
  } else if (ordenExistencias.value === 'stock_desc') {
    lista.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
  } else if (ordenExistencias.value === 'precio_desc') {
    lista.sort((a, b) => Number(b.precio_venta || 0) - Number(a.precio_venta || 0));
  } else if (ordenExistencias.value === 'nombre_asc') {
    lista.sort((a, b) => (a.producto?.nombre || '').localeCompare(b.producto?.nombre || ''));
  }

  return lista;
});

// Métricas ejecutivas del inventario
const metricasStock = computed(() => {
  const totalVariantes = variantes.value.length;
  const totalUnidades = variantes.value.reduce((acc, v) => acc + Math.max(0, Number(v.stock || 0)), 0);
  const valorTotalInventario = variantes.value.reduce((acc, v) => {
    const precio = Number(v.precio_venta || 0);
    const stock = Math.max(0, Number(v.stock || 0));
    return acc + (precio * stock);
  }, 0);
  const agotadas = variantes.value.filter((v) => Number(v.stock || 0) <= 0).length;
  const BajoStock = variantes.value.filter((v) => Number(v.stock || 0) > 0 && Number(v.stock || 0) <= 5).length;
  const saludPorcentaje = totalVariantes > 0
    ? Math.round(((totalVariantes - agotadas) / totalVariantes) * 100)
    : 100;

  return {
    totalVariantes,
    totalUnidades,
    valorTotalInventario,
    agotadas,
    BajoStock,
    saludPorcentaje
  };
});

const conteoAlertas = computed(() => ({
  agotados: metricasStock.value.agotadas,
  bajoStock: metricasStock.value.BajoStock
}));

const visibles = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  if (!termino) return movimientos.value;
  return movimientos.value.filter((m) =>
    `${m.concepto || ''} ${m.tipo_movimiento || ''} ${m.producto?.nombre || ''} ${m.producto?.color || ''} ${m.variante?.talla || ''} ${m.variante?.sku || ''}`
      .toLowerCase()
      .includes(termino)
  );
});

const varianteSeleccionada = computed(() =>
  variantes.value.find((v) => String(v.id_variante) === String(form.variante_id))
);

function obtenerPorcentajeBarraStock(stock) {
  const cantidad = Math.max(0, Number(stock || 0));
  if (cantidad <= 0) return 0;
  // Escala visual de 0 a 15 unidades como 100% de la barra
  return Math.min(100, Math.round((cantidad / 15) * 100));
}

function activarFiltroKpi(filtro) {
  pestanaActiva.value = 'existencias';
  filtroDisponibilidad.value = filtro;
}

async function cargarMovimientos({ silencioso = false } = {}) {
  if (!silencioso) cargando.value = true;
  try {
    const params = { page: pagina.value, ...parametrosKardex() };
    const { data } = await clienteApi.get('/inventarios', { params });
    const paginaApi = data.data || {};
    movimientos.value = Array.isArray(paginaApi) ? paginaApi : paginaApi.data || [];
    ultimaPagina.value = paginaApi.last_page || 1;
  } catch (error) {
    if (!silencioso) notificarError(error.response?.data?.message || 'No se pudieron cargar los movimientos.');
  } finally {
    if (!silencioso) cargando.value = false;
  }
}

function parametrosKardex() {
  const params = {};
  if (filtroTipo.value) params.tipo = filtroTipo.value;
  if (filtroEstado.value) params.estado = filtroEstado.value;
  if (filtroAmbito.value) params.ambito = filtroAmbito.value;
  if (filtroProducto.value) params.producto_id = filtroProducto.value;
  if (filtroMateria.value) params.materia_prima_id = filtroMateria.value;
  if (filtroUsuario.value) params.usuario_id = filtroUsuario.value;
  if (filtroDesde.value) params.fecha_inicio = filtroDesde.value;
  if (filtroHasta.value) params.fecha_fin = filtroHasta.value;
  if (busqueda.value.trim()) params.buscar = busqueda.value.trim();
  return params;
}

const productosFiltro = computed(() => {
  const vistos = new Map();
  variantes.value.forEach((v) => {
    const id = v.producto?.id_producto ?? v.producto_id;
    if (id && !vistos.has(id)) vistos.set(id, { id, nombre: v.producto?.nombre || `Producto ${id}` });
  });
  return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
});

async function cargarCatalogosFiltro() {
  try {
    const { data } = await clienteApi.get('/materias-primas', { params: { per_page: 500 } });
    const lista = data?.data?.data ?? data?.data ?? [];
    materias.value = (Array.isArray(lista) ? lista : []).map((m) => ({ id: m.id_material ?? m.id, nombre: m.nombre }));
  } catch {
    materias.value = [];
  }

  if (authStore.esAdmin) {
    try {
      const { data } = await clienteApi.get('/usuarios');
      const lista = data?.data ?? data ?? [];
      const personal = (Array.isArray(lista) ? lista : []).filter((u) =>
        (u.roles || []).some((r) => ['admin', 'empleado'].includes(r.name ?? r))
      );
      usuariosKardex.value = personal.map((u) => ({ id: u.id_usuario, nombre: u.nombre }));
      return;
    } catch {
      // respaldo de abajo
    }
  }
  const vistos = new Map();
  movimientos.value.forEach((m) => {
    if (m.usuario?.id_usuario) vistos.set(m.usuario.id_usuario, { id: m.usuario.id_usuario, nombre: m.usuario.nombre });
  });
  usuariosKardex.value = [...vistos.values()];
}

async function limpiarFiltrosKardex() {
  [filtroTipo, filtroEstado, filtroAmbito, filtroProducto, filtroMateria, filtroUsuario, filtroDesde, filtroHasta, busqueda]
    .forEach((filtro) => { filtro.value = ''; });
  await filtrar();
}

async function exportarKardex(formato) {
  exportando.value = true;
  try {
    const { data } = await clienteApi.get('/inventarios', { params: { ...parametrosKardex(), per_page: 100, page: 1 } });
    const paginaApi = data.data || {};
    let filas = paginaApi.data || [];
    for (let p = 2; p <= Math.min(paginaApi.last_page || 1, 10); p += 1) {
      const extra = await clienteApi.get('/inventarios', { params: { ...parametrosKardex(), per_page: 100, page: p } });
      filas = filas.concat(extra.data?.data?.data || []);
    }
    if (!filas.length) {
      notificarError('No hay movimientos con los filtros seleccionados.');
      return;
    }
    if (formato === 'excel') {
      await exportarExcel({ archivo: 'kardex_inventario', hojas: [{ nombre: 'Kárdex', titulo: 'Kárdex de inventario FashionStyle', columnas: COLUMNAS_KARDEX, filas }] });
    } else {
      await exportarPDF({ archivo: 'kardex_inventario', titulo: 'Kárdex de inventario', horizontal: true, secciones: [{ columnas: COLUMNAS_KARDEX, filas }] });
    }
    notificarExito(`Kárdex exportado (${filas.length} movimientos).`);
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudo exportar el kárdex.');
  } finally {
    exportando.value = false;
  }
}

async function exportarExistencias(formato) {
  if (!variantes.value.length) {
    return notificarError('No hay variantes para exportar.');
  }
  const columnas = [
    { titulo: 'Prenda', ancho: 32, valor: (v) => v.producto?.nombre || '' },
    { titulo: 'Código', ancho: 14, valor: (v) => v.producto?.codigo || '' },
    { titulo: 'Color', ancho: 12, valor: (v) => v.producto?.color || '' },
    { titulo: 'Categoría', ancho: 16, valor: (v) => v.producto?.categoria?.nombre || '' },
    { titulo: 'Talla', clave: 'talla', ancho: 8 },
    { titulo: 'SKU', clave: 'sku', ancho: 16 },
    { titulo: 'Precio venta', clave: 'precio_venta', formato: 'moneda', ancho: 14 },
    { titulo: 'Stock', clave: 'stock', formato: 'numero', ancho: 8 },
    { titulo: 'Estado', ancho: 12, valor: (v) => (Number(v.stock || 0) <= 0 ? 'Agotado' : Number(v.stock || 0) <= 5 ? 'Bajo stock' : 'Disponible') },
  ];
  try {
    if (formato === 'excel') {
      await exportarExcel({ archivo: 'inventario_existencias', hojas: [{ nombre: 'Existencias', titulo: 'Existencias por talla', columnas, filas: variantes.value }] });
    } else {
      await exportarPDF({ archivo: 'inventario_existencias', titulo: 'Existencias por talla', horizontal: true, secciones: [{ columnas, filas: variantes.value }] });
    }
    notificarExito('Reporte de existencias descargado.');
  } catch {
    notificarError('No se pudo generar el reporte de existencias.');
  }
}

async function cargarResumen({ silencioso = false } = {}) {
  try {
    resumen.value = (await clienteApi.get('/inventarios/resumen')).data.data || resumen.value;
  } catch (error) {
    if (!silencioso) notificarError(error.response?.data?.message || 'No se pudo cargar el resumen.');
  }
}

async function cargarVariantes({ silencioso = false } = {}) {
  try {
    variantes.value = variantesDeProductos((await clienteApi.get('/productos')).data);
  } catch (error) {
    if (!silencioso) notificarError(error.response?.data?.message || 'No se pudieron cargar las variantes.');
  }
}

function limpiarForm() {
  Object.assign(form, { variante_id: '', tipo_movimiento: 'entrada', concepto: '', observaciones: '', cantidad: '' });
}

function abrirNuevo(tipo = 'entrada', varianteId = null) {
  editando.value = null;
  limpiarForm();
  if (varianteId) {
    form.variante_id = varianteId;
  }
  form.tipo_movimiento = tipo;
  form.concepto = tipo === 'entrada'
    ? 'Recepción de confección / compra'
    : tipo === 'salida'
    ? 'Uso o merma interna'
    : 'Ajuste de conteo físico';
  modal.value = true;
}

function abrirReposicion(alerta) {
  const existe = variantes.value.some((v) => String(v.id_variante) === String(alerta.idVariante));
  if (!existe) {
    variantes.value.push({
      id_variante: alerta.idVariante,
      producto_id: alerta.idProducto,
      talla: alerta.talla,
      label: `${alerta.nombreProducto} · ${alerta.color || 'Sin color'} · Talla ${alerta.talla}`
    });
  }

  editando.value = null;
  Object.assign(form, {
    variante_id: alerta.idVariante,
    tipo_movimiento: 'entrada',
    concepto: 'Reposición de stock agotado',
    observaciones: `Stock al registrar: ${alerta.stock}`,
    cantidad: ''
  });
  modal.value = true;
}

function abrirEdicion(movimiento) {
  editando.value = movimiento;
  Object.assign(form, { concepto: movimiento.concepto || '', observaciones: movimiento.observaciones || '' });
  modal.value = true;
}

function cerrarModal() {
  if (!guardando.value) modal.value = false;
}

async function guardar() {
  if (!form.concepto.trim()) return notificarError('El concepto es obligatorio.');
  guardando.value = true;
  try {
    if (editando.value) {
      await clienteApi.put(`/inventarios/${editando.value.id}`, {
        concepto: form.concepto.trim(),
        observaciones: form.observaciones || null
      });
      notificarExito('Movimiento actualizado correctamente.');
    } else {
      if (!form.variante_id || form.cantidad === '') return notificarError('Selecciona una variante e indica la cantidad.');
      if (!Number.isInteger(Number(form.cantidad)) || Number(form.cantidad) < 0) return notificarError('La cantidad debe ser un entero no negativo.');
      if (Number(form.cantidad) > 1000000) return notificarError('La cantidad máxima permitida es 1.000.000.');
      if (['entrada', 'salida'].includes(form.tipo_movimiento) && Number(form.cantidad) < 1) return notificarError('Entrada y salida requieren una cantidad mayor que cero.');

      await clienteApi.post('/inventarios', {
        producto_id: varianteSeleccionada.value?.producto_id || varianteSeleccionada.value?.producto?.id_producto || null,
        variante_id: Number(form.variante_id),
        tipo_movimiento: form.tipo_movimiento,
        concepto: form.concepto.trim(),
        observaciones: form.observaciones || null,
        cantidad: Number(form.cantidad)
      });
      notificarExito('Movimiento registrado y stock actualizado con éxito.');
    }
    modal.value = false;
    await Promise.all([cargarMovimientos(), cargarResumen(), cargarVariantes()]);
    tokenAlertas.value++;
  } catch (error) {
    notificarError(error.response?.data?.message || Object.values(error.response?.data?.errors || {}).flat().join(' ') || 'No se pudo guardar el movimiento.');
  } finally {
    guardando.value = false;
  }
}

async function anular(movimiento) {
  if (movimiento.estado === 'Anulado') return;

  const confirmado = await confirmarAccion({
    titulo: 'Anular movimiento de inventario',
    texto: `¿Deseas anular el movimiento #${movimiento.id} (${movimiento.concepto})? El sistema revertirá su efecto en el stock de forma permanente.`,
    textoBotonConfirmar: 'Sí, anular movimiento'
  });

  if (!confirmado) return;

  try {
    await clienteApi.post(`/inventarios/${movimiento.id}/anular`);
    await Promise.all([cargarMovimientos(), cargarResumen(), cargarVariantes()]);
    tokenAlertas.value++;
    notificarExito('Movimiento anulado y saldo de stock recalculado.');
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudo anular el movimiento.');
  }
}

async function filtrar() {
  pagina.value = 1;
  await cargarMovimientos();
}

async function cambiarPagina(numero) {
  if (numero < 1 || numero > ultimaPagina.value) return;
  pagina.value = numero;
  await cargarMovimientos();
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(valor || 0);
}

onMounted(async () => {
  cargarResumen();
  cargarVariantes();
  await cargarMovimientos();
  cargarCatalogosFiltro();
});

useRecargaAutomatica(
  () => Promise.all([
    cargarMovimientos({ silencioso: true }),
    cargarResumen({ silencioso: true }),
    cargarVariantes({ silencioso: true })
  ]),
  { intervaloSondeo: 60000 }
);
</script>

<template>
  <div class="vista-inventario space-y-6">
    <!-- Header Principal -->
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 rounded-lg bg-pink-50 border border-pink-200/80 px-2.5 py-0.5 text-xs font-bold text-pink-700">
            <Sparkles class="h-3 w-3" />
            FashionStyle Bodega & Kárdex
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight mt-1">
          Inventario y Control de Stock
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
          Trazabilidad de prendas por variantes y tallas, auditoría contable y alertas de reposición inmediata.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
          @click="exportarExistencias('excel')"
        >
          <Download class="w-4 h-4 text-emerald-600" />
          <span>Excel</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
          @click="exportarExistencias('pdf')"
        >
          <FileText class="w-4 h-4 text-rose-600" />
          <span>PDF</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-pink-700 transition"
          @click="() => abrirNuevo('entrada')"
        >
          <Plus class="w-4 h-4" />
          <span>Registrar Movimiento</span>
        </button>
      </div>
    </div>

    <!-- Métricas Ejecutivas de Inventario (Interactivas y Estéticas) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Variantes en Catálogo -->
      <div
        class="group relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
        @click="activarFiltroKpi('todos')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Variantes Activas</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-700 group-hover:bg-gray-200 transition">
            <Boxes class="w-4 h-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{{ metricasStock.totalVariantes }}</p>
        <div class="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>SKUs únicos en catálogo</span>
          <span class="text-[11px] font-semibold text-corporativo-rosa group-hover:underline">Ver todas →</span>
        </div>
      </div>

      <!-- 2. Unidades Físicas en Bodega -->
      <div
        class="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer"
        @click="activarFiltroKpi('en_stock')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider">Unidades en Bodega</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition">
            <Package class="w-4 h-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">{{ metricasStock.totalUnidades }}</p>
        <div class="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>{{ metricasStock.saludPorcentaje }}% con disponibilidad</span>
          <span class="text-[11px] font-semibold text-emerald-700 group-hover:underline">En stock →</span>
        </div>
      </div>

      <!-- 3. Valoración Comercial Estimada -->
      <div class="relative overflow-hidden rounded-2xl border border-purple-100 bg-white p-4 shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-purple-700 uppercase tracking-wider">Valoración Comercial</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <TrendingUp class="w-4 h-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">{{ formatoMoneda(metricasStock.valorTotalInventario) }}</p>
        <p class="text-xs text-gray-500 mt-1">Estimado a precio de venta</p>
      </div>

      <!-- 4. Atención Requerida (Agotadas y Bajo Stock) -->
      <div
        class="group relative overflow-hidden rounded-2xl border transition-all cursor-pointer p-4 shadow-sm hover:shadow-md"
        :class="
          metricasStock.agotadas + metricasStock.BajoStock > 0
            ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400'
            : 'border-gray-200 bg-white'
        "
        @click="activarFiltroKpi('Bajo_stock')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-800 uppercase tracking-wider">Atención Requerida</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-200 transition">
            <AlertTriangle class="w-4 h-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
          {{ metricasStock.agotadas + metricasStock.BajoStock }}
        </p>
        <div class="mt-1 flex items-center justify-between text-xs text-gray-600">
          <span>
            <strong class="text-rose-600">{{ metricasStock.agotadas }}</strong> agotadas ·
            <strong class="text-amber-600">{{ metricasStock.BajoStock }}</strong> bajo stock
          </span>
          <span class="text-[11px] font-semibold text-amber-700 group-hover:underline">Revisar →</span>
        </div>
      </div>
    </div>

    <!-- Navegación por Pestañas Principales -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-2 sm:gap-6 overflow-x-auto" aria-label="Pestañas de Inventario">
        <!-- Pestaña 1: Existencias -->
        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-bold transition whitespace-nowrap"
          :class="
            pestanaActiva === 'existencias'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestanaActiva = 'existencias'"
        >
          <Boxes class="w-4 h-4" />
          <span>Existencias por Prenda y Talla</span>
          <span class="ml-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-700 font-bold">
            {{ variantes.length }}
          </span>
        </button>

        <!-- Pestaña 2: Kárdex -->
        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-bold transition whitespace-nowrap"
          :class="
            pestanaActiva === 'kardex'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestanaActiva = 'kardex'"
        >
          <History class="w-4 h-4" />
          <span>Historial Kárdex</span>
          <span class="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-bold">
            {{ resumen.total_movimientos || 0 }}
          </span>
        </button>

        <!-- Pestaña 3: Alertas -->
        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-bold transition whitespace-nowrap"
          :class="
            pestanaActiva === 'alertas'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestanaActiva = 'alertas'"
        >
          <AlertTriangle class="w-4 h-4 text-amber-500" />
          <span>Alertas y Reposición</span>
          <span
            v-if="conteoAlertas.agotados + conteoAlertas.bajoStock > 0"
            class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 font-bold"
          >
            {{ conteoAlertas.agotados + conteoAlertas.bajoStock }}
          </span>
        </button>
      </nav>
    </div>

    <!-- =========================================================================
         PESTAÑA 1: EXISTENCIAS POR PRENDA Y TALLA (Vista Dual Tabla / Cuadrícula)
         ========================================================================= -->
    <div v-if="pestanaActiva === 'existencias'" class="space-y-4 animate-fadeIn">
      <!-- Toolbar de Búsqueda, Filtros y Switcher de Vista -->
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm">
        <!-- Buscador con icono y botón de limpiar -->
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            v-model="busquedaExistencias"
            type="text"
            maxlength="100"
            placeholder="Buscar por nombre, código de prenda, color, talla o SKU..."
            class="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-gray-200 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
          />
          <button
            v-if="busquedaExistencias"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            @click="busquedaExistencias = ''"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Filtro de Categoría -->
          <select
            v-model="filtroCategoria"
            class="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 focus:border-corporativo-rosa focus:outline-none transition"
          >
            <option value="">Todas las categorías</option>
            <option v-for="cat in categoriasExistencias" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>

          <!-- Selector de Orden -->
          <select
            v-model="ordenExistencias"
            class="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 focus:border-corporativo-rosa focus:outline-none transition"
          >
            <option value="stock_asc">Stock: Menor a Mayor</option>
            <option value="stock_desc">Stock: Mayor a Menor</option>
            <option value="nombre_asc">Nombre: A - Z</option>
            <option value="precio_desc">Mayor Precio</option>
          </select>

          <!-- Chips de Disponibilidad (Rápidos) -->
          <div class="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-bold rounded-lg transition"
              :class="filtroDisponibilidad === 'todos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtroDisponibilidad = 'todos'"
            >
              Todos ({{ conteoDisponibilidad.total }})
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-bold rounded-lg transition"
              :class="filtroDisponibilidad === 'en_stock' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtroDisponibilidad = 'en_stock'"
            >
              En stock ({{ conteoDisponibilidad.enStock }})
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-bold rounded-lg transition"
              :class="filtroDisponibilidad === 'Bajo_stock' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtroDisponibilidad = 'Bajo_stock'"
            >
              Bajo stock ({{ conteoDisponibilidad.bajoStock }})
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-bold rounded-lg transition"
              :class="filtroDisponibilidad === 'agotados' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtroDisponibilidad = 'agotados'"
            >
              Agotados ({{ conteoDisponibilidad.agotados }})
            </button>
          </div>

          <!-- Switcher Vista Tabla vs Cuadrícula (Cards) -->
          <div class="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              class="p-1.5 rounded-lg transition"
              :class="vistaModo === 'tabla' ? 'bg-white text-corporativo-rosa shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              title="Vista en tabla detallada"
              @click="vistaModo = 'tabla'"
            >
              <List class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg transition"
              :class="vistaModo === 'cuadricula' ? 'bg-white text-corporativo-rosa shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              title="Vista en tarjetas con fotos"
              @click="vistaModo = 'cuadricula'"
            >
              <LayoutGrid class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- VISTA 1: TABLA DETALLADA -->
      <div v-if="vistaModo === 'tabla'" class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-gray-600">
            <thead class="bg-gray-50/80 text-xs font-semibold uppercase text-gray-500 border-b border-gray-100">
              <tr>
                <th class="py-3.5 px-4">Prenda / Estilo</th>
                <th class="py-3.5 px-3">Categoría</th>
                <th class="py-3.5 px-3">Color</th>
                <th class="py-3.5 px-3">Talla</th>
                <th class="py-3.5 px-3">SKU Trazable</th>
                <th class="py-3.5 px-3 text-right">Precio Venta</th>
                <th class="py-3.5 px-4 text-center">Nivel de Stock</th>
                <th class="py-3.5 px-4 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="variante in existenciasFiltradas"
                :key="variante.id_variante"
                class="hover:bg-pink-50/20 transition-colors"
              >
                <!-- Prenda con Miniatura -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <img
                      :src="resolverUrlImagen(variante.imagen_url)"
                      :alt="variante.producto?.nombre"
                      class="h-11 w-11 rounded-xl object-cover border border-gray-200 bg-gray-50 shrink-0 shadow-sm transition hover:scale-105"
                    />
                    <div>
                      <p class="font-bold text-gray-900 leading-tight">
                        {{ variante.producto?.nombre || 'Prenda sin nombre' }}
                      </p>
                      <p class="text-xs text-gray-400 font-mono mt-0.5">
                        Cód: {{ variante.producto?.codigo || `ID-${variante.producto?.id_producto}` }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Categoría -->
                <td class="py-3 px-3">
                  <span class="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {{ variante.producto?.categoria?.nombre || 'General' }}
                  </span>
                </td>

                <!-- Color -->
                <td class="py-3 px-3">
                  <span class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-800">
                    <span class="h-2.5 w-2.5 rounded-full border border-gray-300 bg-gray-200"></span>
                    {{ variante.producto?.color || 'N/A' }}
                  </span>
                </td>

                <!-- Talla -->
                <td class="py-3 px-3">
                  <span class="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-800 border border-slate-200">
                    {{ variante.talla }}
                  </span>
                </td>

                <!-- SKU -->
                <td class="py-3 px-3 font-mono text-xs text-gray-600">
                  {{ variante.sku || '—' }}
                </td>

                <!-- Precio -->
                <td class="py-3 px-3 text-right font-black text-gray-900">
                  {{ formatoMoneda(variante.precio_venta) }}
                </td>

                <!-- Nivel de Stock con Indicador Visual y Barra -->
                <td class="py-3 px-4 min-w-[140px]">
                  <div class="flex flex-col items-center gap-1">
                    <span
                      v-if="Number(variante.stock || 0) > 5"
                      class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/60"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" />
                      {{ variante.stock }} en stock
                    </span>
                    <span
                      v-else-if="Number(variante.stock || 0) > 0"
                      class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200/60"
                    >
                      <AlertTriangle class="w-3.5 h-3.5" />
                      {{ variante.stock }} pocas uds.
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200/60"
                    >
                      <XCircle class="w-3.5 h-3.5" />
                      Agotado
                    </span>

                    <!-- Mini barra de progreso de stock -->
                    <div class="w-24 stock-health-bar">
                      <div
                        class="stock-health-fill"
                        :class="{
                          'ok': Number(variante.stock || 0) > 5,
                          'low': Number(variante.stock || 0) > 0 && Number(variante.stock || 0) <= 5,
                          'out': Number(variante.stock || 0) <= 0
                        }"
                        :style="{ width: `${obtenerPorcentajeBarraStock(variante.stock)}%` }"
                      ></div>
                    </div>
                  </div>
                </td>

                <!-- Acciones Rápidas -->
                <td class="py-3 px-4 text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1">
                    <button
                      type="button"
                      title="Registrar entrada (+)"
                      class="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
                      @click="() => abrirNuevo('entrada', variante.id_variante)"
                    >
                      <PlusCircle class="w-3.5 h-3.5" />
                      <span>Entrada</span>
                    </button>

                    <button
                      type="button"
                      title="Registrar salida o merma (-)"
                      class="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200/80 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-sm"
                      @click="() => abrirNuevo('salida', variante.id_variante)"
                    >
                      <MinusCircle class="w-3.5 h-3.5" />
                      <span>Salida</span>
                    </button>

                    <button
                      type="button"
                      title="Ajuste de conteo físico (~)"
                      class="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200/80 px-2 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition shadow-sm"
                      @click="() => abrirNuevo('ajuste', variante.id_variante)"
                    >
                      <SlidersHorizontal class="w-3.5 h-3.5" />
                      <span>Ajuste</span>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Estado Vacío -->
              <tr v-if="!existenciasFiltradas.length">
                <td colspan="8" class="text-center py-16 text-gray-500">
                  <Package class="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p class="font-bold text-gray-800 text-base">No se encontraron prendas</p>
                  <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    No hay prendas registradas que coincidan con los filtros de búsqueda o disponibilidad seleccionados.
                  </p>
                  <button
                    type="button"
                    class="mt-3 inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    @click="() => { busquedaExistencias = ''; filtroDisponibilidad = 'todos'; filtroCategoria = ''; }"
                  >
                    Restablecer filtros
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VISTA 2: CUADRÍCULA DE TARJETAS (Visual Boutique Grid) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="variante in existenciasFiltradas"
          :key="variante.id_variante"
          class="prenda-grid-card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm"
        >
          <div>
            <!-- Imagen con badge de estado -->
            <div class="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 mb-3 border border-gray-100">
              <img
                :src="resolverUrlImagen(variante.imagen_url)"
                :alt="variante.producto?.nombre"
                class="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                <span class="inline-flex rounded-md bg-white/95 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-gray-800 shadow-sm border border-gray-200/60">
                  {{ variante.producto?.categoria?.nombre || 'General' }}
                </span>
              </div>
              <div class="absolute top-2 right-2">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold shadow-sm"
                  :class="{
                    'bg-emerald-500 text-white': Number(variante.stock || 0) > 5,
                    'bg-amber-500 text-white': Number(variante.stock || 0) > 0 && Number(variante.stock || 0) <= 5,
                    'bg-rose-600 text-white': Number(variante.stock || 0) <= 0
                  }"
                >
                  {{ variante.stock }} uds
                </span>
              </div>
            </div>

            <!-- Título y Código -->
            <h3 class="font-extrabold text-gray-900 text-sm leading-snug truncate" :title="variante.producto?.nombre">
              {{ variante.producto?.nombre || 'Prenda sin nombre' }}
            </h3>
            <p class="text-[11px] text-gray-400 font-mono mt-0.5">
              SKU: {{ variante.sku || 'N/A' }} · Talla: <strong class="text-gray-800">{{ variante.talla }}</strong>
            </p>

            <!-- Color y Precio -->
            <div class="mt-2 flex items-center justify-between text-xs pt-2 border-t border-gray-100">
              <span class="text-gray-500 flex items-center gap-1">
                <Palette class="w-3.5 h-3.5 text-gray-400" />
                {{ variante.producto?.color || 'Sin color' }}
              </span>
              <span class="font-black text-gray-900 text-sm">
                {{ formatoMoneda(variante.precio_venta) }}
              </span>
            </div>

            <!-- Barra de salud de stock -->
            <div class="mt-2.5">
              <div class="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>Disponibilidad</span>
                <span class="font-bold" :class="Number(variante.stock || 0) > 5 ? 'text-emerald-600' : Number(variante.stock || 0) > 0 ? 'text-amber-600' : 'text-rose-600'">
                  {{ Number(variante.stock || 0) > 5 ? 'En stock' : Number(variante.stock || 0) > 0 ? 'Bajo stock' : 'Agotado' }}
                </span>
              </div>
              <div class="w-full stock-health-bar">
                <div
                  class="stock-health-fill"
                  :class="{
                    'ok': Number(variante.stock || 0) > 5,
                    'low': Number(variante.stock || 0) > 0 && Number(variante.stock || 0) <= 5,
                    'out': Number(variante.stock || 0) <= 0
                  }"
                  :style="{ width: `${obtenerPorcentajeBarraStock(variante.stock)}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Botones de Acción Rápida en Tarjeta -->
          <div class="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              class="flex flex-col items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/80 p-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
              title="Entrada rápida"
              @click="() => abrirNuevo('entrada', variante.id_variante)"
            >
              <PlusCircle class="w-3.5 h-3.5 mb-0.5" />
              <span>Entrada</span>
            </button>

            <button
              type="button"
              class="flex flex-col items-center justify-center rounded-xl bg-rose-50 border border-rose-200/80 p-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition shadow-sm"
              title="Salida o merma"
              @click="() => abrirNuevo('salida', variante.id_variante)"
            >
              <MinusCircle class="w-3.5 h-3.5 mb-0.5" />
              <span>Salida</span>
            </button>

            <button
              type="button"
              class="flex flex-col items-center justify-center rounded-xl bg-purple-50 border border-purple-200/80 p-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition shadow-sm"
              title="Ajuste de conteo"
              @click="() => abrirNuevo('ajuste', variante.id_variante)"
            >
              <SlidersHorizontal class="w-3.5 h-3.5 mb-0.5" />
              <span>Ajuste</span>
            </button>
          </div>
        </div>

        <!-- Estado Vacío en Cuadrícula -->
        <div v-if="!existenciasFiltradas.length" class="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
          <Package class="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p class="font-bold text-gray-800 text-base">No se encontraron prendas</p>
          <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Prueba ajustando los términos de búsqueda o el filtro de disponibilidad.
          </p>
        </div>
      </div>
    </div>

    <!-- =========================================================================
         PESTAÑA 2: HISTORIAL KÁRDEX
         ========================================================================= -->
    <div v-if="pestanaActiva === 'kardex'" class="space-y-4 animate-fadeIn">
      <!-- Tarjetas de Resumen de Kárdex -->
      <ResumenInventario :resumen="resumen" :alertas="conteoAlertas" />

      <!-- Barra de Filtros Consolidados (RF-031) -->
      <FiltrosInventario
        v-model:busqueda="busqueda"
        v-model:tipo="filtroTipo"
        v-model:estado="filtroEstado"
        v-model:ambito="filtroAmbito"
        v-model:producto-id="filtroProducto"
        v-model:materia-id="filtroMateria"
        v-model:usuario-id="filtroUsuario"
        v-model:fecha-inicio="filtroDesde"
        v-model:fecha-fin="filtroHasta"
        :productos="productosFiltro"
        :materias="materias"
        :usuarios="usuariosKardex"
        @filtrar="filtrar"
        @limpiar="limpiarFiltrosKardex"
      />

      <!-- Botones de Exportar Kárdex -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-semibold text-gray-500">
          Mostrando movimientos del registro contable de almacén
        </span>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
            :disabled="exportando"
            @click="exportarKardex('excel')"
          >
            <Download class="h-3.5 w-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
            :disabled="exportando"
            @click="exportarKardex('pdf')"
          >
            <FileText class="h-3.5 w-3.5 text-rose-600" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <!-- Tabla del Kárdex -->
      <TablaInventario
        :movimientos="visibles"
        :cargando="cargando"
        @editar="abrirEdicion"
        @anular="anular"
      />

      <!-- Paginación Moderna -->
      <div class="flex items-center justify-between rounded-2xl border border-gray-200/90 bg-white px-4 py-3 text-xs text-gray-600 shadow-sm">
        <span class="font-medium">
          Página <strong class="text-gray-900">{{ pagina }}</strong> de <strong class="text-gray-900">{{ ultimaPagina }}</strong>
          ({{ resumen.total_movimientos || 0 }} movimientos totales)
        </span>

        <div class="flex gap-2">
          <button
            :disabled="pagina === 1"
            class="rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm"
            @click="cambiarPagina(pagina - 1)"
          >
            ← Anterior
          </button>

          <button
            :disabled="pagina === ultimaPagina"
            class="rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm"
            @click="cambiarPagina(pagina + 1)"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>

    <!-- =========================================================================
         PESTAÑA 3: ALERTAS Y REPOSICIÓN
         ========================================================================= -->
    <div v-if="pestanaActiva === 'alertas'" class="space-y-4 animate-fadeIn">
      <!-- Selector de Sub-pestaña para Alertas -->
      <div class="flex items-center justify-between border-b border-gray-200 pb-3">
        <div class="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition"
            :class="subPestanaAlertas === 'reposicion' ? 'bg-white text-corporativo-rosa shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            @click="subPestanaAlertas = 'reposicion'"
          >
            <PackageX class="w-3.5 h-3.5 text-rose-500" />
            <span>Reposición Rápida de Variantes</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition"
            :class="subPestanaAlertas === 'sistema' ? 'bg-white text-corporativo-rosa shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            @click="subPestanaAlertas = 'sistema'"
          >
            <Sparkles class="w-3.5 h-3.5 text-amber-500" />
            <span>Alertas Automáticas del Sistema (RF-070)</span>
          </button>
        </div>
      </div>

      <!-- Panel de Reposición Rápida -->
      <div v-if="subPestanaAlertas === 'reposicion'">
        <PanelAlertasStock
          :recargar-token="tokenAlertas"
          @reponer="abrirReposicion"
        />
      </div>

      <!-- Panel de Alertas Automáticas (RF-070) -->
      <div v-if="subPestanaAlertas === 'sistema'">
        <PanelAlertasAutomaticas />
      </div>
    </div>

    <!-- Modal para Nuevo Movimiento o Edición -->
    <ModalInventario
      :abierto="modal"
      :editando="editando"
      :variantes="variantes"
      :form="form"
      :guardando="guardando"
      @guardar="guardar"
      @cerrar="cerrarModal"
    />
  </div>
</template>

<style src="../../assets/estilos/Inventario.css"></style>
