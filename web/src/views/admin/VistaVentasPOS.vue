<script setup>
// -> Componente VistaVentasPOS: Historial de Ventas y Ventana para Registrar Venta en Físico con Factura automática
import { ref, computed, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Download,
  Eye,
  Ban,
  Loader2,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Receipt,
  UserRound,
  X
} from 'lucide-vue-next';
import html2pdf from 'html2pdf.js';
import ModalBase from '@/components/comunes/ModalBase.vue';
import PaginadorTabla from '@/components/comunes/PaginadorTabla.vue';
import clienteApi, { obtenerMensajeError } from '@/services/clienteApi';
import {
  MEDIOS_PAGO_POS,
  listarVentas,
  obtenerResumenVentas,
  registrarVenta,
  cancelarVenta
} from '@/services/ventaServicio';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import { filtrarCampo } from '@/utils/validacionCampos';

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError, confirmarAccion } = useNotificacion();

// Estado de la ventana modal de Venta en Físico
const modalVentaFisicaAbierto = ref(false);
const productos = ref([]);
const cargandoProductos = ref(false);
const busquedaPrenda = ref('');
const varianteSeleccionadaPorProducto = ref({});

// Datos de la venta física en curso
const bolsa = ref([]);
const medioPago = ref('efectivo');
const clienteNombre = ref('');
const clienteDocumento = ref('');
const clienteTelefono = ref('');
const notasVenta = ref('');
const procesandoCobro = ref(false);

// Comprobante / Factura recien emitida o seleccionada
const ventaReciente = ref(null);
const modalComprobanteAbierto = ref(false);
const comprobantePdfRef = ref(null);
const descargandoPdf = ref(false);

// Historial y Resumen de Ventas
const resumen = ref({ ventasHoy: 0, montoHoy: 0, montoActivas: 0, porMedioPago: {} });
const ventas = ref([]);
const cargandoVentas = ref(false);
const filtroMedioPago = ref('');
const paginaVentas = ref(1);
const totalPaginasVentas = ref(1);
const totalRegistrosVentas = ref(0);

function filtrarVenta(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  if (campo === 'cliente') clienteNombre.value = valor;
  if (campo === 'documento') clienteDocumento.value = valor;
  if (campo === 'telefono') clienteTelefono.value = valor;
  if (campo === 'notas') notasVenta.value = valor;
  evento.target.value = valor;
}

function filtrarBusqueda(evento) {
  busquedaPrenda.value = String(evento.target.value)
    .replace(/[^\p{L}\p{M}\p{N} 0-9_-]/gu, '')
    .slice(0, 100);
  evento.target.value = busquedaPrenda.value;
}

function normalizarProductoCatalogo(p = {}) {
  const idProducto = p.id_producto ?? p.id;
  const variantesRaw = Array.isArray(p.variantes) ? p.variantes : [];
  const variantes = variantesRaw.map((v) => ({
    idVariante: v.id_variante ?? v.id,
    talla: v.talla || 'Única',
    sku: v.sku || '',
    stock: Math.max(0, Number(v.stock ?? v.stock_actual ?? 0) || 0),
    precio: Number(v.precio_venta ?? v.precio ?? p.precio_venta ?? p.precio_base ?? 0) || 0
  }));

  return {
    idProducto,
    codigo: p.codigo || `PRD-${idProducto}`,
    nombre: p.nombre || 'Prenda',
    color: p.color || '',
    activo: p.estado !== 'Inactivo' && p.activo !== false,
    variantes
  };
}

async function cargarCatalogoPOS() {
  cargandoProductos.value = true;
  try {
    const res = await clienteApi.get('/productos');
    const raw = res.data?.data ?? res.data ?? [];
    const lista = Array.isArray(raw) ? raw : raw.data || [];
    productos.value = lista.map(normalizarProductoCatalogo).filter((p) => p.activo && p.variantes.length > 0);

    for (const prod of productos.value) {
      const conStock = prod.variantes.find((v) => v.stock > 0) || prod.variantes[0];
      if (conStock && !varianteSeleccionadaPorProducto.value[prod.idProducto]) {
        varianteSeleccionadaPorProducto.value[prod.idProducto] = conStock.idVariante;
      }
    }
  } catch (error) {
    notificarError(obtenerMensajeError(error, 'No se pudo cargar el catálogo de prendas.'));
  } finally {
    cargandoProductos.value = false;
  }
}

function abrirVentanaVentaFisica() {
  modalVentaFisicaAbierto.value = true;
  if (!productos.value.length) {
    cargarCatalogoPOS();
  }
}

function cerrarVentanaVentaFisica() {
  if (procesandoCobro.value) return;
  modalVentaFisicaAbierto.value = false;
}

const productosFiltrados = computed(() => {
  const q = busquedaPrenda.value.trim().toLowerCase();
  if (!q) return productos.value;
  return productos.value.filter((p) => {
    const coincideProducto = `${p.nombre} ${p.codigo} ${p.color}`.toLowerCase().includes(q);
    const coincideSku = p.variantes.some((v) => String(v.sku || '').toLowerCase().includes(q));
    return coincideProducto || coincideSku;
  });
});

function varianteActivaDe(producto) {
  const idVar = varianteSeleccionadaPorProducto.value[producto.idProducto];
  return producto.variantes.find((v) => String(v.idVariante) === String(idVar)) || producto.variantes[0];
}

function agregarABolsa(producto) {
  const variante = varianteActivaDe(producto);
  if (!variante || variante.stock <= 0) {
    notificarError('Esta talla no tiene existencias disponibles en bodega.');
    return;
  }

  const existente = bolsa.value.find((item) => String(item.varianteId) === String(variante.idVariante));
  if (existente) {
    if (existente.cantidad >= variante.stock) {
      notificarError(`Stock mximo alcanzado (${variante.stock} unidades).`);
      return;
    }
    existente.cantidad += 1;
  } else {
    bolsa.value.push({
      productoId: producto.idProducto,
      varianteId: variante.idVariante,
      nombre: producto.nombre,
      talla: variante.talla,
      sku: variante.sku,
      precio: variante.precio,
      stockMaximo: variante.stock,
      cantidad: 1
    });
  }
}

function cambiarCantidadBolsa(item, delta) {
  const nueva = item.cantidad + delta;
  if (nueva <= 0) {
    bolsa.value = bolsa.value.filter((i) => i.varianteId !== item.varianteId);
    return;
  }
  if (nueva > item.stockMaximo) {
    notificarError(`Solo hay ${item.stockMaximo} unidades disponibles.`);
    return;
  }
  item.cantidad = nueva;
}

function eliminarDeBolsa(varianteId) {
  bolsa.value = bolsa.value.filter((i) => i.varianteId !== varianteId);
}

const totalUnidadesBolsa = computed(() => bolsa.value.reduce((acc, i) => acc + i.cantidad, 0));
const totalCobrarBolsa = computed(() => bolsa.value.reduce((acc, i) => acc + i.cantidad * i.precio, 0));

async function confirmarVentaFisica() {
  if (!bolsa.value.length) return;
  procesandoCobro.value = true;

  try {
    const snapshotItems = bolsa.value.map((i) => ({
      nombre: i.nombre,
      talla: i.talla,
      sku: i.sku,
      cantidad: i.cantidad,
      precio: i.precio,
      subtotal: i.cantidad * i.precio
    }));

    const notasFinales = [
      clienteTelefono.value.trim() ? `Tel: ${clienteTelefono.value.trim()}` : '',
      notasVenta.value.trim()
    ]
      .filter(Boolean)
      .join(' · ');

    const creada = await registrarVenta({
      items: bolsa.value,
      medioPago: medioPago.value,
      notas: notasFinales,
      clienteNombre: clienteNombre.value.trim() || 'Consumidor final',
      clienteDocumento: clienteDocumento.value.trim() || ''
    });

    ventaReciente.value = {
      ...creada,
      clienteDocumento: creada.clienteDocumento || clienteDocumento.value.trim(),
      total: creada.total || totalCobrarBolsa.value,
      detalles: creada.detalles?.length ? creada.detalles : snapshotItems
    };

    bolsa.value = [];
    clienteNombre.value = '';
    clienteDocumento.value = '';
    clienteTelefono.value = '';
    notasVenta.value = '';
    modalVentaFisicaAbierto.value = false;
    modalComprobanteAbierto.value = true;

    notificarExito(
      creada.facturaNumero
        ? `Venta física registrada y factura ${creada.facturaNumero} generada automáticamente.`
        : 'Venta física registrada y factura generada automáticamente.'
    );

    await Promise.all([cargarCatalogoPOS(), cargarHistorialYResumen()]);
  } catch (error) {
    notificarError(obtenerMensajeError(error, 'No se pudo procesar la venta física.'));
  } finally {
    procesandoCobro.value = false;
  }
}

async function descargarComprobantePdf() {
  if (!comprobantePdfRef.value || !ventaReciente.value) return;
  descargandoPdf.value = true;
  try {
    await html2pdf()
      .set({
        margin: 10,
        filename: `Factura-${ventaReciente.value.facturaNumero || ventaReciente.value.codigo || ventaReciente.value.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
      })
      .from(comprobantePdfRef.value)
      .save();
    notificarExito('Factura descargada en PDF.');
  } catch {
    notificarError('No se pudo exportar la factura en PDF.');
  } finally {
    descargandoPdf.value = false;
  }
}

async function cargarHistorialYResumen() {
  cargandoVentas.value = true;
  try {
    const [resLista, resResumen] = await Promise.all([
      listarVentas({ pagina: paginaVentas.value, medioPago: filtroMedioPago.value }),
      obtenerResumenVentas().catch(() => ({ ventasHoy: 0, montoHoy: 0, montoActivas: 0, porMedioPago: {} }))
    ]);
    ventas.value = resLista.lista;
    paginaVentas.value = resLista.paginaActual;
    totalPaginasVentas.value = resLista.totalPaginas;
    totalRegistrosVentas.value = resLista.totalRegistros;
    resumen.value = resResumen;
  } catch (error) {
    notificarError(obtenerMensajeError(error, 'No se pudo cargar el historial de ventas.'));
  } finally {
    cargandoVentas.value = false;
  }
}

async function anularVentaConfirmada(venta) {
  const ok = await confirmarAccion({
    titulo: `Cancelar venta #${venta.id}`,
    texto: 'Se anular la venta, su factura asociada y el backend revertir automáticamente el stock al inventario (Kárdex).',
    textoBotonConfirmar: 'S, cancelar venta'
  });
  if (!ok) return;

  try {
    await cancelarVenta(venta.id);
    notificarExito(`Venta #${venta.id} cancelada y existencias restituidas.`);
    await cargarHistorialYResumen();
  } catch (error) {
    notificarError(obtenerMensajeError(error, 'No se pudo cancelar la venta.'));
  }
}

function verComprobanteDeHistorial(venta) {
  ventaReciente.value = venta;
  modalComprobanteAbierto.value = true;
}

function formatearFecha(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

onMounted(() => {
  cargarHistorialYResumen();
});
useRecargaAutomatica(() => Promise.all([cargarCatalogoPOS(), cargarHistorialYResumen()]));
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
          Ventas y Facturación en Tienda
        </h1>
        <p class="mt-0.5 text-xs sm:text-sm text-gray-500">
          Consulta las ventas registradas o abre la ventana de venta física para generar su factura automáticamente.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          @click="cargarHistorialYResumen">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': cargandoVentas }" />
          Actualizar
        </button>

        <button type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-pink-700"
          @click="abrirVentanaVentaFisica">
          <ShoppingBag class="h-4 w-4" />
          Registrar Venta en Físico
        </button>
      </div>
    </div>

    <!-- Tarjetas de resumen -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Ventas hoy</p>
          <p class="mt-1 text-2xl font-extrabold text-gray-900">{{ resumen.ventasHoy }}</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-corporativo-rosa">
          <Receipt class="h-5 w-5" />
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Ingresos hoy</p>
          <p class="mt-1 text-2xl font-extrabold text-emerald-600">{{ formatearCOP(resumen.montoHoy) }}</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <DollarSign class="h-5 w-5" />
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Total ventas activas</p>
          <p class="mt-1 text-2xl font-extrabold text-corporativo-rosa">{{ formatearCOP(resumen.montoActivas) }}</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <TrendingUp class="h-5 w-5" />
        </div>
      </div>
    </div>

    <!-- Tabla de ventas -->
    <section class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="filtroMedioPago === '' ? 'border-corporativo-rosa bg-corporativo-rosa text-white' : 'border-gray-300 bg-white text-gray-600'"
            @click="filtroMedioPago = ''; paginaVentas = 1; cargarHistorialYResumen()">
            Todos los medios
          </button>
          <button v-for="m in MEDIOS_PAGO_POS" :key="m.valor" type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="filtroMedioPago === m.valor ? 'border-corporativo-rosa bg-corporativo-rosa text-white' : 'border-gray-300 bg-white text-gray-600'"
            @click="filtroMedioPago = m.valor; paginaVentas = 1; cargarHistorialYResumen()">
            {{ m.etiqueta }}
          </button>
        </div>
      </div>

      <div v-if="cargandoVentas" class="flex flex-col items-center justify-center py-16 text-gray-500">
        <Loader2 class="h-8 w-8 animate-spin text-corporativo-rosa" />
        <p class="mt-2 text-sm">Cargando historial de ventas...</p>
      </div>

      <div v-else-if="!ventas.length" class="py-16 text-center text-sm text-gray-500">
        No hay ventas registradas para este filtro.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3 font-semibold">Venta</th>
              <th class="px-5 py-3 font-semibold">Fecha</th>
              <th class="px-5 py-3 font-semibold">Comprador</th>
              <th class="px-5 py-3 font-semibold">Medio de pago</th>
              <th class="px-5 py-3 font-semibold">Factura automática</th>
              <th class="px-5 py-3 font-semibold">Estado</th>
              <th class="px-5 py-3 font-semibold text-right">Total</th>
              <th class="px-5 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="venta in ventas" :key="venta.id" class="hover:bg-gray-50">
              <td class="px-5 py-3 font-bold text-gray-900">#{{ venta.id }}</td>
              <td class="px-5 py-3 text-xs text-gray-600">{{ formatearFecha(venta.fecha) }}</td>
              <td class="px-5 py-3">
                <p class="font-medium text-gray-800">{{ venta.clienteNombre }}</p>
                <p v-if="venta.clienteDocumento" class="text-[11px] text-gray-400">Doc: {{ venta.clienteDocumento }}</p>
              </td>
              <td class="px-5 py-3 uppercase text-xs font-semibold text-gray-700">{{ venta.medioPago }}</td>
              <td class="px-5 py-3">
                <span v-if="venta.facturaNumero"
                  class="rounded-full border border-pink-200 bg-pink-50 px-2.5 py-0.5 text-[11px] font-bold text-corporativo-rosa">
                  {{ venta.facturaNumero }}
                </span>
                <span v-else class="text-xs text-emerald-700 font-semibold">Emitida</span>
              </td>
              <td class="px-5 py-3">
                <span class="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" :class="String(venta.estado).toLowerCase().includes('cancel')
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
                  {{ venta.estado }}
                </span>
              </td>
              <td class="px-5 py-3 text-right font-extrabold text-gray-900">{{ formatearCOP(venta.total) }}</td>
              <td class="px-5 py-3">
                <div class="flex justify-end gap-2">
                  <button type="button"
                    class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-corporativo-rosa hover:text-corporativo-rosa"
                    @click="verComprobanteDeHistorial(venta)">
                    <Eye class="h-3.5 w-3.5" /> Ver Factura
                  </button>
                  <button v-if="!String(venta.estado).toLowerCase().includes('cancel')" type="button"
                    class="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                    @click="anularVentaConfirmada(venta)">
                    <Ban class="h-3.5 w-3.5" /> Anular
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginadorTabla :pagina-actual="paginaVentas" :total-paginas="totalPaginasVentas"
        :total-registros="totalRegistrosVentas"
        @cambiar-pagina="(p) => { paginaVentas = p; cargarHistorialYResumen(); }" />
    </section>

    <!-- VENTANA MODAL: REGISTRAR VENTA EN FÍSICO -->
    <ModalBase :abierto="modalVentaFisicaAbierto" titulo="Registrar Venta en Físico" ancho-max="max-w-5xl"
      @cerrar="cerrarVentanaVentaFisica">
      <div class="flex flex-col max-h-[85vh]">
        <!-- Cabecera de la ventana -->
        <header class="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-white">
          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-corporativo-rosa">
              <ShoppingBag class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-extrabold text-gray-900">
                Nueva Venta en Tienda física
              </h2>
              <p class="text-xs text-gray-500">
                Selecciona las prendas, aáde los datos del comprador (opcional) y el sistema generar la factura
                automáticamente por el valor del producto.
              </p>
            </div>
          </div>

          <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            @click="cerrarVentanaVentaFisica">
            <X class="h-5 w-5" />
          </button>
        </header>

        <!-- Cuerpo de la ventana -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 overflow-y-auto bg-gray-50/60">
          <!-- Columna izquierda: seleccion de productos (3 cols) -->
          <div class="lg:col-span-3 space-y-4">
            <div class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div class="relative flex-1">
                <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input v-model="busquedaPrenda" type="search" maxlength="100"
                  placeholder="Buscar prenda por nombre, código o SKU..."
                  class="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-corporativo-rosa focus:bg-white focus:outline-none"
                  @input="filtrarBusqueda" />
              </div>
              <button type="button"
                class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                @click="cargarCatalogoPOS">
                <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': cargandoProductos }" />
              </button>
            </div>

            <div v-if="cargandoProductos"
              class="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-12 text-gray-500">
              <Loader2 class="h-7 w-7 animate-spin text-corporativo-rosa" />
              <p class="mt-2 text-xs">Cargando prendas disponibles...</p>
            </div>

            <div v-else-if="!productosFiltrados.length"
              class="rounded-xl border border-gray-200 bg-white p-10 text-center text-xs text-gray-500">
              No se encontraron prendas activas con ese criterio.
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[52vh] overflow-y-auto pr-1">
              <article v-for="prod in productosFiltrados" :key="prod.idProducto"
                class="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-corporativo-rosa">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="font-mono text-[10px] text-gray-400">{{ prod.codigo }}</p>
                      <h3 class="text-xs sm:text-sm font-bold text-gray-900">{{ prod.nombre }}</h3>
                    </div>
                    <span class="text-xs sm:text-sm font-extrabold text-corporativo-rosa whitespace-nowrap">
                      {{ formatearCOP(varianteActivaDe(prod)?.precio || 0) }}
                    </span>
                  </div>

                  <div class="mt-2.5">
                    <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Talla (stock disponible):
                    </p>
                    <div class="flex flex-wrap gap-1">
                      <button v-for="v in prod.variantes" :key="v.idVariante" type="button" :disabled="v.stock <= 0"
                        class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                        :class="String(varianteSeleccionadaPorProducto[prod.idProducto]) === String(v.idVariante)
                          ? 'border-corporativo-rosa bg-corporativo-rosa text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-corporativo-rosa'"
                        @click="varianteSeleccionadaPorProducto[prod.idProducto] = v.idVariante">
                        <span>{{ v.talla }}</span>
                        <span class="rounded-full px-1 text-[10px]"
                          :class="String(varianteSeleccionadaPorProducto[prod.idProducto]) === String(v.idVariante) ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'">
                          {{ v.stock }}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <button type="button" :disabled="!varianteActivaDe(prod) || varianteActivaDe(prod).stock <= 0"
                  class="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-black disabled:opacity-40"
                  @click="agregarABolsa(prod)">
                  <Plus class="h-3.5 w-3.5" /> Aádir producto
                </button>
              </article>
            </div>
          </div>

          <!-- Columna derecha: Productos seleccionados + Datos opcionales del comprador (2 cols) -->
          <div
            class="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div class="space-y-4">
              <!-- Productos en la venta -->
              <div>
                <div class="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 class="text-sm font-bold text-gray-900">Productos a Facturar</h3>
                  <span class="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-bold text-corporativo-rosa">
                    {{ totalUnidadesBolsa }} un.
                  </span>
                </div>

                <div v-if="!bolsa.length" class="py-6 text-center text-xs text-gray-400">
                  Aáde al menos una prenda de la lista izquierda.
                </div>

                <ul v-else class="mt-2 max-h-40 divide-y divide-gray-100 overflow-y-auto">
                  <li v-for="item in bolsa" :key="item.varianteId"
                    class="py-2 flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0 flex-1">
                      <p class="font-bold text-gray-900 truncate">{{ item.nombre }}</p>
                      <p class="text-gray-500">Talla {{ item.talla }} · {{ formatearCOP(item.precio) }}</p>
                    </div>
                    <div class="flex items-center gap-1">
                      <button type="button" class="rounded border p-1 hover:bg-gray-50"
                        @click="cambiarCantidadBolsa(item, -1)">
                        <Minus class="h-3 w-3" />
                      </button>
                      <span class="w-5 text-center font-bold">{{ item.cantidad }}</span>
                      <button type="button" class="rounded border p-1 hover:bg-gray-50"
                        @click="cambiarCantidadBolsa(item, 1)">
                        <Plus class="h-3 w-3" />
                      </button>
                      <button type="button" class="ml-1 text-red-500 hover:text-red-700"
                        @click="eliminarDeBolsa(item.varianteId)">
                        <Trash2 class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                </ul>
              </div>

              <!-- Datos opcionales de la persona que compr -->
              <div class="space-y-3 border-t border-gray-100 pt-3">
                <div class="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <UserRound class="h-4 w-4 text-corporativo-rosa" />
                  <span>Datos del comprador <small class="font-normal text-gray-400">(Opcional)</small></span>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Nombre del comprador (opcional)
                  </label>
                  <input v-model="clienteNombre" type="text" maxlength="100"
                    placeholder="Si se deja vacó: Consumidor final"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
                    @input="filtrarVenta('cliente', 'persona', 100, $event)" />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Cdula / NIT (opcional)
                    </label>
                    <input v-model="clienteDocumento" type="text" inputmode="numeric" maxlength="20"
                      placeholder="Ej. 1020304050"
                      class="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
                      @input="filtrarVenta('documento', 'identificacion', 20, $event)" />
                  </div>

                  <div>
                    <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Telfono (opcional)
                    </label>
                    <input v-model="clienteTelefono" type="tel" inputmode="tel" maxlength="20"
                      placeholder="Ej. 3001234567"
                      class="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
                      @input="filtrarVenta('telefono', 'telefono', 20, $event)" />
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Medio de pago *
                  </label>
                  <select v-model="medioPago"
                    class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-corporativo-rosa focus:outline-none">
                    <option v-for="m in MEDIOS_PAGO_POS" :key="m.valor" :value="m.valor">
                      {{ m.etiqueta }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Observaciones (opcional)
                  </label>
                  <input v-model="notasVenta" type="text" maxlength="250"
                    placeholder="Nota adicional para la factura..."
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
                    @input="filtrarVenta('notas', 'texto', 250, $event)" />
                </div>
              </div>
            </div>

            <!-- Pie de cobro y facturacion automática -->
            <div class="mt-4 border-t border-gray-200 pt-3">
              <div class="flex items-baseline justify-between">
                <span class="text-xs font-bold uppercase text-gray-500">Total Factura</span>
                <span class="text-xl font-extrabold text-corporativo-rosa">{{ formatearCOP(totalCobrarBolsa) }}</span>
              </div>
              <p class="mt-0.5 text-[11px] text-gray-400">
                Al confirmar, se genera automáticamente la factura por este valor.
              </p>

              <button type="button" :disabled="!bolsa.length || procesandoCobro"
                class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-pink-700 disabled:opacity-40"
                @click="confirmarVentaFisica">
                <Loader2 v-if="procesandoCobro" class="h-4 w-4 animate-spin" />
                <CreditCard v-else class="h-4 w-4" />
                Confirmar Venta y Generar Factura automática
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>

    <!-- Modal Factura / Comprobante PDF -->
    <ModalBase :abierto="modalComprobanteAbierto" titulo="Factura de Venta Emitida automáticamente"
      @cerrar="modalComprobanteAbierto = false">
      <div v-if="ventaReciente">
        <header class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="h-5 w-5 text-emerald-600" />
            <h3 class="text-base font-bold text-gray-900">
              Venta #{{ ventaReciente.id }}
              <span v-if="ventaReciente.facturaNumero" class="text-corporativo-rosa">· Factura {{
                ventaReciente.facturaNumero }}</span>
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" :disabled="descargandoPdf"
              class="inline-flex items-center gap-1.5 rounded-xl bg-corporativo-rosa px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-pink-700"
              @click="descargarComprobantePdf">
              <Download class="h-4 w-4" /> Descargar PDF
            </button>
            <button type="button" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              @click="modalComprobanteAbierto = false">
              <X class="h-5 w-5" />
            </button>
          </div>
        </header>

        <div class="p-6 bg-gray-50">
          <div ref="comprobantePdfRef"
            class="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-xs text-gray-800 shadow-sm">
            <div class="text-center border-b border-gray-200 pb-3">
              <p class="text-lg font-black text-gray-900">Fashion<span class="text-corporativo-rosa">Style</span></p>
              <p class="text-gray-500">Factura de Venta en Tienda física</p>
              <p class="mt-1 font-bold text-gray-900">
                <span v-if="ventaReciente.facturaNumero">{{ ventaReciente.facturaNumero }} · </span>
                Venta #{{ ventaReciente.id }}
              </p>
              <p class="text-[11px] text-gray-400">{{ formatearFecha(ventaReciente.fecha || new Date()) }}</p>
            </div>

            <div class="mt-3 space-y-1">
              <p><strong>Comprador:</strong> {{ ventaReciente.clienteNombre || 'Consumidor final' }}</p>
              <p v-if="ventaReciente.clienteDocumento"><strong>Documento / NIT:</strong> {{
                ventaReciente.clienteDocumento }}</p>
              <p><strong>Medio de pago:</strong> <span class="uppercase">{{ ventaReciente.medioPago }}</span></p>
              <p v-if="ventaReciente.notas"><strong>Observaciones:</strong> {{ ventaReciente.notas }}</p>
            </div>

            <table class="mt-4 w-full border-t border-b border-gray-200 py-2">
              <thead>
                <tr class="text-left text-[11px] uppercase text-gray-400">
                  <th class="py-1.5">Prenda</th>
                  <th class="py-1.5 text-center">Cant.</th>
                  <th class="py-1.5 text-right">Precio Unit.</th>
                  <th class="py-1.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(d, idx) in ventaReciente.detalles" :key="idx">
                  <td class="py-1.5">{{ d.nombre }} <span v-if="d.talla">({{ d.talla }})</span></td>
                  <td class="py-1.5 text-center">{{ d.cantidad }}</td>
                  <td class="py-1.5 text-right">{{ formatearCOP(d.precio) }}</td>
                  <td class="py-1.5 text-right font-semibold">{{ formatearCOP(d.subtotal) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="mt-3 flex justify-between text-sm font-extrabold text-gray-900">
              <span>Total facturado:</span>
              <span class="text-corporativo-rosa">{{ formatearCOP(ventaReciente.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  </div>
</template>