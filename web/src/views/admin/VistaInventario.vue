<script setup>
// -> Componente VistaInventario
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
  HelpCircle
} from 'lucide-vue-next';
import clienteApi from '@/services/clienteApi';
import { useNotificacion } from '@/composables/useNotificacion';
import { useImagenStorage } from '@/composables/useImagenStorage';
import ResumenInventario from '@/components/Inventario/ResumenInventario.vue';
import FiltrosInventario from '@/components/Inventario/FiltrosInventario.vue';
import TablaInventario from '@/components/Inventario/TablaInventario.vue';
import ModalInventario from '@/components/Inventario/ModalInventario.vue';
import PanelAlertasStock from '@/components/Inventario/PanelAlertasStock.vue';

const { notificarError, notificarExito, confirmarAccion } = useNotificacion();
const { resolverUrlImagen } = useImagenStorage();

const pestanaActiva = ref('existencias'); // 'existencias' | 'kardex' | 'alertas'
const movimientos = ref([]);
const variantes = ref([]);
const resumen = ref({ total_movimientos: 0, entradas: 0, salidas: 0, ajustes: 0, anulados: 0 });
const cargando = ref(false);
const guardando = ref(false);
const modal = ref(false);
const editando = ref(null);
const busqueda = ref('');
const busquedaExistencias = ref('');
const filtroDisponibilidad = ref('todos'); // 'todos' | 'en_stock' | 'Bajo_stock' | 'agotados'
const filtroTipo = ref('');
const filtroEstado = ref('');
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
    label: `${producto.nombre || producto.name || `Producto ${producto.id_producto}`}  ${producto.color || 'Sin color'}  ${variante.talla || 'Sin talla'}`
  })));
};

// Variantes filtradas para la pestaña de Existencias en Vivo (Shopify / Katana style)
const existenciasFiltradas = computed(() => {
  let lista = variantes.value;
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

  if (filtroDisponibilidad.value === 'en_stock') {
    lista = lista.filter((v) => Number(v.stock || 0) > 5);
  } else if (filtroDisponibilidad.value === 'Bajo_stock') {
    lista = lista.filter((v) => Number(v.stock || 0) > 0 && Number(v.stock || 0) <= 5);
  } else if (filtroDisponibilidad.value === 'agotados') {
    lista = lista.filter((v) => Number(v.stock || 0) <= 0);
  }

  return lista;
});

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

  return {
    totalVariantes,
    totalUnidades,
    valorTotalInventario,
    agotadas,
    BajoStock
  };
});

const conteoAlertas = computed(() => ({
  agotados: metricasStock.value.agotadas,
  BajoStock: metricasStock.value.BajoStock
}));

const visibles = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  if (!termino) return movimientos.value;
  return movimientos.value.filter((m) =>
    `${m.concepto || ''} ${m.tipo_movimiento || ''} ${m.producto?.nombre || ''} ${m.producto?.color || ''} ${m.variante?.talla || ''}`
      .toLowerCase()
      .includes(termino)
  );
});

const varianteSeleccionada = computed(() =>
  variantes.value.find((v) => String(v.id_variante) === String(form.variante_id))
);

async function cargarMovimientos() {
  cargando.value = true;
  try {
    const params = { page: pagina.value };
    if (filtroTipo.value) params.tipo = filtroTipo.value;
    if (filtroEstado.value) params.estado = filtroEstado.value;
    const { data } = await clienteApi.get('/inventarios', { params });
    const paginaApi = data.data || {};
    movimientos.value = Array.isArray(paginaApi) ? paginaApi : paginaApi.data || [];
    ultimaPagina.value = paginaApi.last_page || 1;
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudieron cargar los movimientos.');
  } finally {
    cargando.value = false;
  }
}

async function cargarResumen() {
  try {
    resumen.value = (await clienteApi.get('/inventarios/resumen')).data.data || resumen.value;
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudo cargar el resumen.');
  }
}

async function cargarVariantes() {
  try {
    variantes.value = variantesDeProductos((await clienteApi.get('/productos')).data);
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudieron cargar las variantes.');
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
  form.concepto = tipo === 'entrada' ? 'Recepcion de produccion / compra' : tipo === 'salida' ? 'Uso o merma interna' : 'Ajuste de conteo físico';
  modal.value = true;
}

function abrirReposicion(alerta) {
  const existe = variantes.value.some((v) => String(v.id_variante) === String(alerta.idVariante));
  if (!existe) {
    variantes.value.push({
      id_variante: alerta.idVariante,
      producto_id: alerta.idProducto,
      talla: alerta.talla,
      label: `${alerta.nombreProducto}  ${alerta.color || 'Sin color'}  ${alerta.talla}`
    });
  }

  editando.value = null;
  Object.assign(form, {
    variante_id: alerta.idVariante,
    tipo_movimiento: 'entrada',
    concepto: 'reposicion de stock',
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
      notificarExito('Movimiento actualizado.');
    } else {
      if (!form.variante_id || form.cantidad === '') return notificarError('Selecciona una variante e indica la cantidad.');
      if (!Number.isInteger(Number(form.cantidad)) || Number(form.cantidad) < 0) return notificarError('La cantidad debe ser un entero no negativo.');
      if (Number(form.cantidad) > 1000000) return notificarError('La cantidad mxima permitida es 1.000.000.');
      if (['entrada', 'salida'].includes(form.tipo_movimiento) && Number(form.cantidad) < 1) return notificarError('Entrada y salida requieren una cantidad mayor que cero.');

      await clienteApi.post('/inventarios', {
        producto_id: varianteSeleccionada.value?.producto_id || varianteSeleccionada.value?.producto?.id_producto || null,
        variante_id: Number(form.variante_id),
        tipo_movimiento: form.tipo_movimiento,
        concepto: form.concepto.trim(),
        observaciones: form.observaciones || null,
        cantidad: Number(form.cantidad)
      });
      notificarExito('Movimiento creado y stock actualizado.');
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
    titulo: 'Anular movimiento',
    texto: 'Ánular este movimiento? El backend revertir su saldo y no podrís deshacerlo manualmente.',
    textoBotonConfirmar: 'S, anular'
  });

  if (!confirmado) return;

  try {
    await clienteApi.post(`/inventarios/${movimiento.id}/anular`);
    await Promise.all([cargarMovimientos(), cargarResumen(), cargarVariantes()]);
    tokenAlertas.value++;
    notificarExito('Movimiento anulado.');
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

function exportarStockCSV() {
  if (!variantes.value.length) {
    return notificarError('No hay variantes para exportar.');
  }

  const encabezados = ['ID_Variante', 'Prenda', 'Codigo', 'Color', 'Categoria', 'Talla', 'SKU', 'Precio_Venta', 'Stock_Actual', 'Estado_Stock'];
  const filas = variantes.value.map((v) => {
    const estado = Number(v.stock || 0) <= 0 ? 'Agotado' : Number(v.stock || 0) <= 5 ? 'Bajo Stock' : 'Disponible';
    return [
      v.id_variante,
      `"${(v.producto?.nombre || '').replace(/"/g, '""')}"`,
      `"${v.producto?.codigo || ''}"`,
      `"${v.producto?.color || ''}"`,
      `"${v.producto?.categoria?.nombre || ''}"`,
      `"${v.talla || ''}"`,
      `"${v.sku || ''}"`,
      v.precio_venta || 0,
      v.stock || 0,
      estado
    ].join(',');
  });

  const contenido = [encabezados.join(','), ...filas].join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.setAttribute('href', url);
  enlace.setAttribute('download', `inventario_existencias_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  notificarExito('Reporte de existencias descargado en CSV.');
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(valor || 0);
}

onMounted(() => {
  cargarMovimientos();
  cargarResumen();
  cargarVariantes();
});
useRecargaAutomatica(() => Promise.all([cargarMovimientos(), cargarResumen(), cargarVariantes()]));
</script>

<template>
  <div class="vista-inventario space-y-6">
    <!-- Header Principal -->
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
          Gestión de Inventario y Kárdex
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
          Trazabilidad de prendas por variantes, control de existencias en alamacen y auditorá contable.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
          @click="exportarStockCSV"
        >
          <Download class="w-4 h-4 text-gray-500" />
          <span>Exportar CSV</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-pink-700 transition"
          @click="() => abrirNuevo('entrada')"
        >
          <Plus class="w-4 h-4" />
          <span>Registrar movimiento</span>
        </button>
      </div>
    </div>

    <!-- Mtricas Ejecutivas de Inventario (Shopify / Katana style) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Variantes activas</span>
          <Boxes class="w-4 h-4 text-gray-400" />
        </div>
        <p class="mt-2 text-2xl font-black text-gray-900">{{ metricasStock.totalVariantes }}</p>
        <p class="text-xs text-gray-500 mt-0.5">SKUs unicos registrados</p>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidades en bodega</span>
          <Package class="w-4 h-4 text-emerald-600" />
        </div>
        <p class="mt-2 text-2xl font-black text-emerald-600">{{ metricasStock.totalUnidades }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Prendas físicas disponibles</p>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Valoracion comercial</span>
          <ArrowUpDown class="w-4 h-4 text-purple-600" />
        </div>
        <p class="mt-2 text-2xl font-black text-purple-600">{{ formatoMoneda(metricasStock.valorTotalInventario) }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Estimado a precio de venta</p>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Atencion requerida</span>
          <AlertTriangle class="w-4 h-4 text-amber-500" />
        </div>
        <p class="mt-2 text-2xl font-black text-amber-600">
          {{ metricasStock.agotadas + metricasStock.BajoStock }}
        </p>
        <p class="text-xs text-gray-500 mt-0.5">
          {{ metricasStock.agotadas }} agotadas  {{ metricasStock.BajoStock }} Bajo stock
        </p>
      </div>
    </div>

    <!-- navegacion por Pestañas (Shopify / Katana Style) -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-2 sm:gap-6 overflow-x-auto" aria-label="Pestañas de Inventario">
        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-semibold transition"
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

        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-semibold transition"
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

        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-semibold transition"
          :class="
            pestanaActiva === 'alertas'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestanaActiva = 'alertas'"
        >
          <AlertTriangle class="w-4 h-4 text-amber-500" />
          <span>Alertas y reposicion</span>
          <span
            v-if="conteoAlertas.agotados + conteoAlertas.BajoStock > 0"
            class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 font-bold"
          >
            {{ conteoAlertas.agotados + conteoAlertas.BajoStock }}
          </span>
        </button>
      </nav>
    </div>

    <!-- PESTAÁ 1: EXISTENCIAS POR PRENDA Y TALLA (Shopify / Katana MRP inspired) -->
    <div v-if="pestanaActiva === 'existencias'" class="space-y-4">
      <!-- Barra de Filtros y Bísqueda de Existencias -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="busquedaExistencias"
              type="text"
              maxlength="100"
              placeholder="Buscar por nombre de prenda, código, color, talla o SKU..."
              class="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-corporativo-rosa focus:ring-1 focus:ring-corporativo-rosa focus:outline-none"
              @input="(e)=>{ busquedaExistencias = String(e.target.value).replace(/[^\p{L}\p{M}\p{N} 0-9_-]/gu,'').slice(0,100); e.target.value = busquedaExistencias; }"
            />
        </div>

        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition"
              :class="filtroDisponibilidad === 'todos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtroDisponibilidad = 'todos'"
            >
              Todos ({{ variantes.length }})
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition"
              :class="filtroDisponibilidad === 'en_stock' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtroDisponibilidad = 'en_stock'"
            >
              En stock
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition"
              :class="filtroDisponibilidad === 'Bajo_stock' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtroDisponibilidad = 'Bajo_stock'"
            >
              Bajo stock (=5)
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition"
              :class="filtroDisponibilidad === 'agotados' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtroDisponibilidad = 'agotados'"
            >
              Agotados
            </button>
          </div>
        </div>
      </div>

      <!-- Tabla de Existencias en Vivo -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
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
                <th class="py-3.5 px-4 text-center">Stock Disponible</th>
                <th class="py-3.5 px-4 text-right">Acciones Rpidas</th>
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
                      class="h-10 w-10 rounded-lg object-cover border border-gray-200 bg-gray-50 shrink-0"
                    />
                    <div>
                      <p class="font-bold text-gray-900 leading-tight">
                        {{ variante.producto?.nombre || 'Prenda sin nombre' }}
                      </p>
                      <p class="text-xs text-gray-400">
                        Cd: {{ variante.producto?.codigo || `ID-${variante.producto?.id_producto}` }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Categoría -->
                <td class="py-3 px-3">
                  <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {{ variante.producto?.categoria?.nombre || 'General' }}
                  </span>
                </td>

                <!-- Color -->
                <td class="py-3 px-3 text-gray-700 font-medium">
                  {{ variante.producto?.color || 'N/A' }}
                </td>

                <!-- Talla -->
                <td class="py-3 px-3">
                  <span class="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                    {{ variante.talla }}
                  </span>
                </td>

                <!-- SKU -->
                <td class="py-3 px-3 font-mono text-xs text-gray-600">
                  {{ variante.sku || '—' }}
                </td>

                <!-- Precio -->
                <td class="py-3 px-3 text-right font-medium text-gray-900">
                  {{ formatoMoneda(variante.precio_venta) }}
                </td>

                <!-- Stock con Semforo Inteligente -->
                <td class="py-3 px-4 text-center">
                  <span
                    v-if="Number(variante.stock || 0) > 5"
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60"
                  >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    {{ variante.stock }} en stock
                  </span>
                  <span
                    v-else-if="Number(variante.stock || 0) > 0"
                    class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/60"
                  >
                    <AlertTriangle class="w-3.5 h-3.5" />
                    {{ variante.stock }} pocas uds.
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200/60"
                  >
                    <XCircle class="w-3.5 h-3.5" />
                    Agotado
                  </span>
                </td>

                <!-- Acciones Rpidas -->
                <td class="py-3 px-4 text-right">
                  <div class="inline-flex items-center gap-1">
                    <button
                      type="button"
                      title="Registrar Entrada rpida"
                      class="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      @click="() => abrirNuevo('entrada', variante.id_variante)"
                    >
                      <PlusCircle class="w-3.5 h-3.5" />
                      <span>Entrada</span>
                    </button>

                    <button
                      type="button"
                      title="Registrar Salida / Merma"
                      class="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                      @click="() => abrirNuevo('salida', variante.id_variante)"
                    >
                      <MinusCircle class="w-3.5 h-3.5" />
                      <span>Salida</span>
                    </button>

                    <button
                      type="button"
                      title="Ajuste de Conteo Físico"
                      class="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition"
                      @click="() => abrirNuevo('ajuste', variante.id_variante)"
                    >
                      <SlidersHorizontal class="w-3.5 h-3.5" />
                      <span>Ajuste</span>
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!existenciasFiltradas.length">
                <td colspan="8" class="text-center py-12 text-gray-500">
                  <Package class="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p class="font-medium">No se encontraron prendas con los criterios seleccionados.</p>
                  <p class="text-xs text-gray-400 mt-1">Prueba cambiando el trmino de búsqueda o el filtro de disponibilidad.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PESTAÁ 2: HISTORIAL KÁRDEX -->
    <div v-if="pestanaActiva === 'kardex'" class="panel space-y-6">
      <ResumenInventario :resumen="resumen" :alertas="conteoAlertas" />

      <FiltrosInventario
        v-model:busqueda="busqueda"
        v-model:tipo="filtroTipo"
        v-model:estado="filtroEstado"
        @filtrar="filtrar"
      />

      <TablaInventario
        :movimientos="visibles"
        :cargando="cargando"
        @editar="abrirEdicion"
        @anular="anular"
      />

      <div class="paginacion flex items-center justify-between p-4 border-t border-gray-100 text-xs text-gray-600">
        <span>página {{ pagina }} de {{ ultimaPagina }} ({{ resumen.total_movimientos || 0 }} movimientos totales)</span>

        <div class="flex gap-2">
          <button
            :disabled="pagina === 1"
            class="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition font-medium"
            @click="cambiarPagina(pagina - 1)"
          >
            Anterior
          </button>

          <button
            :disabled="pagina === ultimaPagina"
            class="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition font-medium"
            @click="cambiarPagina(pagina + 1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>

    <!-- PESTAÁ 3: ALERTAS Y reposicion -->
    <div v-if="pestanaActiva === 'alertas'" class="space-y-6">
      <PanelAlertasStock
        :umbral-inicial="5"
        :recargar-token="tokenAlertas"
        @reponer="abrirReposicion"
      />
    </div>

    <!-- Modal para Nuevo Movimiento o Edicion -->
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