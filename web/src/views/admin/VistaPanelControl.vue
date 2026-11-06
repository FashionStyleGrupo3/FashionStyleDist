<script setup>
// -> Panel de control: indicadores de ventas, producción e inventario.
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  LifeBuoy,
  Loader2,
  Receipt,
  RefreshCw,
  Scissors,
  Shirt,
  ShoppingBag,
  Truck,
  UsersRound,
  Wallet,
} from 'lucide-vue-next';
import clienteApi from '@/services/clienteApi';
import GraficoPanel from '@/components/admin/GraficoPanel.vue';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { useNotificacion } from '@/composables/useNotificacion';
import { exportarExcel, exportarPDF } from '@/composables/useExportarReporte';

const authStore = useAutenticacionStore();
const { notificarError, notificarExito } = useNotificacion();

const PALETA = {
  negro: '#111111',
  pizarra: '#56657a',
  arena: '#d4c2a8',
  arenaSuave: '#ece5da',
  rojo: '#d9434b',
  ambar: '#c08a2b',
  verde: '#3f7d5c',
};

const meses = ref(6);
const datos = ref(null);
const cargando = ref(false);
const exportando = ref(false);

const saludo = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
});

const primerNombre = computed(() => {
  const nombre = String(authStore.usuario?.nombre || '').trim();
  return nombre ? nombre.split(' ')[0] : 'equipo';
});

const rolActual = computed(() => (authStore.esAdmin ? 'Administrador' : 'Equipo FashionStyle'));

const fechaHoy = computed(() => {
  const texto = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
});

const formatoCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);
const formatoNumero = (v) => new Intl.NumberFormat('es-CO').format(Number(v) || 0);
const nombreMes = (clave) => {
  const [anio, mes] = String(clave).split('-').map(Number);
  const texto = new Date(anio, (mes || 1) - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const ETIQUETA_ESTADO = { planificada: 'Planificada', en_proceso: 'En proceso', pausada: 'Pausada', completada: 'Completada', cancelada: 'Cancelada' };

const kpis = computed(() => {
  const k = datos.value?.kpis ?? {};
  return [
    { titulo: 'Ventas de hoy', valor: formatoCOP(k.ventas_hoy), icono: Wallet },
    { titulo: 'Ventas del mes', valor: formatoCOP(k.ventas_mes), detalle: `${formatoNumero(k.transacciones_mes)} transacciones`, icono: Receipt },
    { titulo: 'Pedidos por despachar', valor: formatoNumero(k.pedidos_pendientes), icono: Truck },
    { titulo: 'Órdenes de producción activas', valor: formatoNumero(k.ordenes_activas), icono: Scissors },
    { titulo: 'Unidades en bodega', valor: formatoNumero(k.stock_total), icono: Boxes },
    { titulo: 'Alertas de stock', valor: formatoNumero(k.alertas_pendientes), icono: AlertTriangle, alerta: Number(k.alertas_pendientes) > 0 },
  ];
});

const graficoVentas = computed(() => {
  const serie = datos.value?.ventas_por_mes ?? [];
  return {
    etiquetas: serie.map((m) => nombreMes(m.mes)),
    series: [
      { nombre: 'Tienda física (POS)', datos: serie.map((m) => m.pos), color: PALETA.pizarra },
      { nombre: 'Tienda en línea', datos: serie.map((m) => m.web), color: PALETA.arena },
    ],
  };
});

const graficoProduccion = computed(() => {
  const serie = datos.value?.produccion_por_mes ?? [];
  return {
    etiquetas: serie.map((m) => nombreMes(m.mes)),
    series: [
      { nombre: 'Unidades planificadas', datos: serie.map((m) => m.planificadas), color: PALETA.arena },
      { nombre: 'Unidades completadas', datos: serie.map((m) => m.completadas), color: PALETA.negro },
    ],
  };
});

const graficoAlertas = computed(() => {
  const niveles = datos.value?.inventario?.alertas_por_nivel ?? {};
  return {
    etiquetas: ['Agotado', 'Crítico', 'Bajo'],
    series: [{ datos: [niveles.AGOTADO || 0, niveles.CRITICO || 0, niveles.BAJO || 0], color: [PALETA.rojo, PALETA.ambar, PALETA.pizarra] }],
  };
});

const graficoMedios = computed(() => {
  const medios = datos.value?.ventas_por_medio ?? [];
  const colores = [PALETA.negro, PALETA.pizarra, PALETA.arena, PALETA.verde, PALETA.ambar, PALETA.arenaSuave];
  return {
    etiquetas: medios.map((m) => m.medio),
    series: [{ datos: medios.map((m) => m.monto), color: medios.map((_, i) => colores[i % colores.length]) }],
  };
});

const sinAlertas = computed(() => graficoAlertas.value.series[0].datos.every((v) => !v));

const modulos = computed(() => [
  { nombre: 'Inventario / Kárdex', ruta: '/admin/inventario', icono: Boxes },
  { nombre: 'Punto de venta', ruta: '/admin/ventas', icono: Receipt },
  { nombre: 'Pedidos y facturas', ruta: '/admin/pedidos', icono: Truck },
  { nombre: 'Gestión de prendas', ruta: { name: 'gestion-prendas' }, icono: Shirt },
  { nombre: 'Producción / costos', ruta: '/admin/produccion', icono: Scissors },
  { nombre: 'Pagos y dispersión', ruta: '/admin/pagos', icono: CreditCard },
  { nombre: 'Clientes y usuarios', ruta: '/admin/seguridad', icono: UsersRound },
  ...(authStore.esAdmin ? [{ nombre: 'Bitácora', ruta: '/admin/seguridad/auditoria', icono: ClipboardList }] : []),
  { nombre: 'Centro de ayuda', ruta: '/admin/ayuda', icono: LifeBuoy },
  { nombre: 'Ver tienda', ruta: '/', icono: ShoppingBag },
]);

async function cargar({ silencioso = false } = {}) {
  if (!silencioso) cargando.value = true;
  try {
    const { data } = await clienteApi.get('/dashboard', { params: { meses: meses.value } });
    datos.value = data?.data ?? null;
  } catch (error) {
    if (!silencioso) notificarError(error.response?.data?.message || 'No se pudieron cargar los indicadores del panel.');
  } finally {
    if (!silencioso) cargando.value = false;
  }
}

function seccionesReporte() {
  const d = datos.value ?? {};
  return [
    {
      nombre: 'Indicadores',
      titulo: 'Indicadores principales',
      columnas: [{ titulo: 'Indicador', clave: 'titulo', ancho: 34 }, { titulo: 'Valor', clave: 'valor', ancho: 22 }],
      filas: kpis.value.map((k) => ({ titulo: k.titulo, valor: k.valor })),
    },
    {
      nombre: 'Ventas por mes',
      titulo: 'Ventas por mes y canal',
      columnas: [
        { titulo: 'Mes', ancho: 12, valor: (f) => nombreMes(f.mes) },
        { titulo: 'Tienda física (POS)', clave: 'pos', formato: 'moneda', ancho: 20 },
        { titulo: 'Tienda en línea', clave: 'web', formato: 'moneda', ancho: 20 },
        { titulo: 'Total', formato: 'moneda', ancho: 20, valor: (f) => Number(f.pos) + Number(f.web) },
        { titulo: 'Transacciones', clave: 'cantidad', formato: 'numero', ancho: 14 },
      ],
      filas: d.ventas_por_mes ?? [],
    },
    {
      nombre: 'Producción',
      titulo: 'Producción por mes (unidades)',
      columnas: [
        { titulo: 'Mes', ancho: 12, valor: (f) => nombreMes(f.mes) },
        { titulo: 'Planificadas', clave: 'planificadas', formato: 'numero', ancho: 14 },
        { titulo: 'Completadas', clave: 'completadas', formato: 'numero', ancho: 14 },
      ],
      filas: d.produccion_por_mes ?? [],
    },
    {
      nombre: 'Menor stock',
      titulo: 'Prendas con menor stock',
      columnas: [
        { titulo: 'Prenda', clave: 'producto', ancho: 34 },
        { titulo: 'Talla', clave: 'talla', ancho: 8 },
        { titulo: 'Stock', clave: 'stock', formato: 'numero', ancho: 10 },
      ],
      filas: d.inventario?.menor_stock ?? [],
    },
  ];
}

async function exportar(formato) {
  if (!datos.value) return;
  exportando.value = true;
  try {
    const secciones = seccionesReporte();
    if (formato === 'excel') {
      await exportarExcel({ archivo: 'reporte_panel_control', hojas: secciones });
    } else {
      await exportarPDF({
        archivo: 'reporte_panel_control',
        titulo: 'Reporte de ventas, producción e inventario',
        subtitulo: `Últimos ${meses.value} meses · generado el ${new Date().toLocaleString('es-CO')}`,
        secciones,
      });
    }
    notificarExito('Reporte descargado.');
  } catch {
    notificarError('No se pudo generar el reporte.');
  } finally {
    exportando.value = false;
  }
}

onMounted(cargar);
useRecargaAutomatica(() => cargar({ silencioso: true }), { recursos: ['ventas', 'pedidos', 'ordenes-produccion', 'inventarios', 'checkout', 'pagos'], intervaloSondeo: 60000 });
</script>

<template>
  <div class="space-y-6">
    <header class="relative overflow-hidden rounded-3xl bg-tienda-negro px-6 py-8 text-white sm:px-10">
      <div class="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5"></div>
      <div class="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-2xl">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80 ring-1 ring-white/15">
              <CalendarDays class="h-3.5 w-3.5" />
              {{ fechaHoy }}
            </span>
            <span class="rounded-full bg-tienda-arena px-3 py-1 text-[11px] font-bold text-tienda-negro">{{ rolActual }}</span>
          </div>
          <h1 class="admin-panel__titulo text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{{ saludo }}, {{ primerNombre }}</h1>
          <p class="mt-2 text-sm leading-relaxed text-white/70">
            Ventas, producción e inventario de FashionStyle en un solo lugar.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <select v-model.number="meses" class="h-9 rounded-lg border border-white/30 bg-transparent px-2 text-xs font-semibold text-white" @change="cargar">
            <option class="text-tienda-negro" :value="3">Últimos 3 meses</option>
            <option class="text-tienda-negro" :value="6">Últimos 6 meses</option>
            <option class="text-tienda-negro" :value="12">Últimos 12 meses</option>
          </select>
          <button type="button" class="admin-header__action" :disabled="cargando" @click="cargar">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': cargando }" /><span class="hidden sm:inline">Actualizar</span>
          </button>
          <button type="button" class="admin-header__action" title="Descargar Excel" :disabled="exportando || !datos" @click="exportar('excel')">
            <Download class="h-4 w-4" /><span class="hidden sm:inline">Excel</span>
          </button>
          <button type="button" class="admin-header__action" title="Descargar PDF" :disabled="exportando || !datos" @click="exportar('pdf')">
            <FileText class="h-4 w-4" /><span class="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>
    </header>

    <div v-if="cargando && !datos" class="flex items-center justify-center gap-2 rounded-2xl border border-tienda-borde bg-white p-10 text-sm text-tienda-gris">
      <Loader2 class="h-4 w-4 animate-spin" /> Cargando indicadores...
    </div>

    <template v-if="datos">
      <section class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <article
          v-for="kpi in kpis"
          :key="kpi.titulo"
          class="rounded-2xl border bg-white p-4"
          :class="kpi.alerta ? 'border-tienda-rojo/40' : 'border-tienda-borde'"
        >
          <component :is="kpi.icono" class="h-5 w-5" :class="kpi.alerta ? 'text-tienda-rojo' : 'text-tienda-pizarra'" />
          <p class="mt-3 text-[11px] font-semibold uppercase tracking-wide text-tienda-gris">{{ kpi.titulo }}</p>
          <p class="mt-1 text-lg font-semibold text-tienda-negro">{{ kpi.valor }}</p>
          <p v-if="kpi.detalle" class="text-[11px] text-tienda-gris">{{ kpi.detalle }}</p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-3">
        <article class="min-w-0 rounded-2xl border border-tienda-borde bg-white p-5 xl:col-span-2">
          <h2 class="text-base font-semibold">Ventas por mes</h2>
          <p class="mb-4 text-xs text-tienda-gris">Tienda física (POS) y pedidos pagados en línea.</p>
          <GraficoPanel tipo="bar" apilado moneda :etiquetas="graficoVentas.etiquetas" :series="graficoVentas.series" />
        </article>
        <article class="min-w-0 rounded-2xl border border-tienda-borde bg-white p-5">
          <h2 class="text-base font-semibold">Ventas por medio de pago</h2>
          <p class="mb-4 text-xs text-tienda-gris">Periodo seleccionado.</p>
          <GraficoPanel v-if="graficoMedios.etiquetas.length" tipo="doughnut" moneda :etiquetas="graficoMedios.etiquetas" :series="graficoMedios.series" />
          <p v-else class="py-16 text-center text-sm text-tienda-gris">Aún no hay ventas en este periodo.</p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-3">
        <article class="min-w-0 rounded-2xl border border-tienda-borde bg-white p-5 xl:col-span-2">
          <h2 class="text-base font-semibold">Producción</h2>
          <p class="mb-4 text-xs text-tienda-gris">Unidades planificadas frente a unidades terminadas e ingresadas al kárdex.</p>
          <GraficoPanel tipo="line" :etiquetas="graficoProduccion.etiquetas" :series="graficoProduccion.series" />
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="(total, estado) in datos.ordenes_por_estado"
              :key="estado"
              class="rounded-full border border-tienda-borde bg-tienda-crema px-3 py-1 text-xs font-semibold text-tienda-texto"
            >
              {{ ETIQUETA_ESTADO[estado] || estado }}: {{ total }}
            </span>
          </div>
        </article>
        <article class="min-w-0 rounded-2xl border border-tienda-borde bg-white p-5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h2 class="text-base font-semibold">Inventario</h2>
              <p class="mb-4 text-xs text-tienda-gris">Alertas automáticas pendientes.</p>
            </div>
            <RouterLink to="/admin/inventario" class="text-xs font-semibold text-tienda-pizarra hover:underline">Ver kárdex</RouterLink>
          </div>
          <GraficoPanel v-if="!sinAlertas" tipo="doughnut" :alto="180" :etiquetas="graficoAlertas.etiquetas" :series="graficoAlertas.series" />
          <p v-else class="py-8 text-center text-sm text-tienda-gris">Sin alertas de stock pendientes.</p>
          <ul class="mt-4 divide-y divide-tienda-borde text-sm">
            <li v-for="item in datos.inventario.menor_stock.slice(0, 5)" :key="`${item.producto}-${item.talla}`" class="flex items-center justify-between py-2">
              <span class="truncate pr-2">{{ item.producto }} <span class="text-tienda-gris">· {{ item.talla }}</span></span>
              <span class="font-semibold" :class="item.stock <= 0 ? 'text-tienda-rojo' : 'text-tienda-negro'">{{ item.stock }}</span>
            </li>
          </ul>
          <p class="mt-3 text-xs text-tienda-gris">
            Materias primas bajo su mínimo: <strong class="text-tienda-negro">{{ datos.inventario.materias_bajo_minimo }}</strong>
          </p>
        </article>
      </section>
    </template>

    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-tienda-gris">Accesos rápidos</h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <RouterLink
          v-for="mod in modulos"
          :key="mod.nombre"
          :to="mod.ruta"
          class="group flex items-center justify-between gap-2 rounded-2xl border border-tienda-borde bg-white px-4 py-3 text-sm font-semibold text-tienda-negro transition hover:border-tienda-negro"
        >
          <span class="flex min-w-0 items-center gap-2">
            <component :is="mod.icono" class="h-4 w-4 shrink-0 text-tienda-pizarra" />
            <span class="truncate">{{ mod.nombre }}</span>
          </span>
          <ArrowRight class="h-4 w-4 shrink-0 text-tienda-gris transition group-hover:translate-x-0.5" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-tienda .admin-panel__titulo {
  color: #fff;
}
</style>
