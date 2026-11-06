<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import {
  Building2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Info,
  Calculator,
  Receipt,
  Wallet,
  ShoppingBag,
  Store,
  History,
  Percent,
  Search,
  Eye,
  Loader2,
  ChevronRight,
  Clock
} from 'lucide-vue-next';
import VisorFacturaFashion from '@/components/facturas/VisorFacturaFashion.vue';
import DetallePagoDispersion from '@/components/pagos/Detallepagodispersion.vue';
import {
  obtenerConfiguracionPasarela,
  guardarConfiguracionPasarela,
  calcularDispersionFondos,
  obtenerControlParaleloPagos,
  obtenerDispersiones,
  registrarDispersion,
  validarCuentasParaReparto
} from '@/services/pagoServicio';
import { listarFacturas } from '@/services/facturaServicio';
import { filtrarCampo, filtrarNumero } from '@/utils/validacionCampos';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import { obtenerMensajeError } from '@/services/clienteApi';

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError, confirmarAccion } = useNotificacion();

// Bancos y billeteras habituales en Colombia
const BANCOS = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA Colombia',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Banco Caja Social',
  'Scotiabank Colpatria',
  'Banco Itaú',
  'Banco Agrario',
  'Banco Falabella',
  'Banco Pichincha',
  'Bancoomeva',
  'Nequi',
  'Daviplata',
  'Lulo Bank',
  'Nu Colombia'
];

// Colores para identificar cada cuenta en la barra de reparto
const COLORES = ['#111111', '#56657a', '#d4c2a8', '#8a6f4d', '#7d8a9c', '#b5a385'];
const colorDe = (indice) => COLORES[indice % COLORES.length];

const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ---------- Estado ----------
const configuracion = ref(obtenerConfiguracionPasarela());
const instantanea = ref('');
const cargandoControl = ref(false);
const mensajeError = ref('');
const montoSimulado = ref('200000');

const controlParalelo = ref({
  recaudoWompiOnline: 0,
  cantidadPedidosPagados: 0,
  recaudoPosMostrador: 0,
  cantidadVentasPos: 0,
  recaudoTotalConsolidado: 0,
  facturasEmitidas: 0,
  transacciones: []
});

const cuentas = computed(() => configuracion.value?.cuentas_bancarias || []);
const cuentasActivas = computed(() => cuentas.value.filter((c) => c.activa));

function tomarInstantanea() {
  instantanea.value = JSON.stringify(cuentas.value);
}
const cambiosSinGuardar = computed(() => JSON.stringify(cuentas.value) !== instantanea.value);

// ---------- Reparto ----------
const totalPorcentajes = computed(() =>
  redondear(cuentasActivas.value.reduce((acc, c) => acc + (Number(c.porcentaje) || 0), 0))
);
const diferencia = computed(() => redondear(100 - totalPorcentajes.value));
const repartoCompleto = computed(() => diferencia.value === 0);

const nombreCuenta = (cuenta, indice) => cuenta.concepto?.trim() || `Cuenta ${indice + 1}`;

// Qué le falta a cada cuenta activa (solo se exige a las activas)
function faltantes(cuenta) {
  const lista = [];
  if (!cuenta.banco) lista.push('banco');
  if (String(cuenta.numero_cuenta || '').replace(/-/g, '').length < 6) lista.push('numero');
  if (!String(cuenta.titular || '').trim()) lista.push('titular');
  return lista;
}
const falta = (cuenta, campo) => cuenta.activa && faltantes(cuenta).includes(campo);

const problemas = computed(() => {
  const lista = [];
  if (!cuentasActivas.value.length) {
    lista.push('Activa al menos una cuenta para recibir el dinero.');
  } else if (diferencia.value > 0) {
    lista.push(`Falta repartir ${diferencia.value}% para llegar a 100%.`);
  } else if (diferencia.value < 0) {
    lista.push(`Te pasaste por ${Math.abs(diferencia.value)}%. Baja algún porcentaje.`);
  }
  cuentas.value.forEach((c, i) => {
    if (!c.activa) return;
    const f = faltantes(c);
    if (f.length) {
      const nombres = { banco: 'banco', numero: 'número de cuenta', titular: 'titular' };
      lista.push(`"${nombreCuenta(c, i)}": completa ${f.map((x) => nombres[x]).join(', ')}.`);
    }
  });
  return lista;
});
const puedeGuardar = computed(() => problemas.value.length === 0 && cambiosSinGuardar.value);

const segmentos = computed(() =>
  cuentas.value
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.activa && Number(c.porcentaje) > 0)
    .map(({ c, i }) => ({
      id: c.id,
      nombre: nombreCuenta(c, i),
      porcentaje: Number(c.porcentaje),
      color: colorDe(i)
    }))
);

// ---------- Simulador ----------
const montoNumerico = computed(() => Number(montoSimulado.value) || 0);
const simulacion = computed(() => {
  const repartido = calcularDispersionFondos(montoNumerico.value, cuentas.value);
  return repartido.map((r) => ({
    ...r,
    color: colorDe(cuentas.value.findIndex((c) => c.id === r.id)),
    nombre: nombreCuenta(r, cuentas.value.findIndex((c) => c.id === r.id))
  }));
});
function filtrarMonto(evento) {
  const valor = filtrarNumero(evento.target.value, 9, 0);
  montoSimulado.value = valor;
  evento.target.value = valor;
}

// ---------- Acciones sobre cuentas ----------
function bancosDe(cuenta) {
  return cuenta.banco && !BANCOS.includes(cuenta.banco) ? [cuenta.banco, ...BANCOS] : BANCOS;
}

function filtrarCuenta(cuenta, campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  cuenta[campo] = valor;
  evento.target.value = valor;
}

function normalizarPorcentaje(cuenta) {
  let v = Number(cuenta.porcentaje);
  if (Number.isNaN(v)) v = 0;
  cuenta.porcentaje = redondear(Math.min(100, Math.max(0, v)));
}

function ajustarConDiferencia(cuenta) {
  cuenta.porcentaje = redondear(Math.min(100, Math.max(0, (Number(cuenta.porcentaje) || 0) + diferencia.value)));
}

function repartirEnPartesIguales() {
  const activas = cuentasActivas.value;
  if (!activas.length) return;
  const base = Math.floor(100 / activas.length);
  const resto = 100 - base * activas.length;
  activas.forEach((c, i) => {
    c.porcentaje = base + (i === 0 ? resto : 0);
  });
}

function agregarCuentaBancaria() {
  const nuevoId = cuentas.value.length ? Math.max(...cuentas.value.map((c) => c.id)) + 1 : 1;
  configuracion.value.cuentas_bancarias.push({
    id: nuevoId,
    banco: '',
    tipo_cuenta: 'Ahorros',
    numero_cuenta: '',
    titular: '',
    concepto: '',
    porcentaje: 0,
    activa: true
  });
}

async function eliminarCuenta(cuenta, indice) {
  const confirmado = await confirmarAccion({
    titulo: `¿Quitar "${nombreCuenta(cuenta, indice)}"?`,
    texto: 'Se borra de la lista. Los cambios se aplican cuando guardes.',
    textoBotonConfirmar: 'Sí, quitar'
  });
  if (!confirmado) return;
  configuracion.value.cuentas_bancarias = cuentas.value.filter((c) => c.id !== cuenta.id);
}

function guardar() {
  if (!puedeGuardar.value) return;
  try {
    configuracion.value = guardarConfiguracionPasarela(configuracion.value);
    cuentasGuardadas.value = JSON.parse(JSON.stringify(configuracion.value.cuentas_bancarias));
    tomarInstantanea();
    notificarExito('Reparto guardado');
  } catch {
    notificarError('No se pudo guardar el reparto. Intenta de nuevo.');
  }
}

// ---------- Recaudo e historial ----------
async function cargarControlParalelo() {
  cargandoControl.value = true;
  mensajeError.value = '';
  try {
    controlParalelo.value = await obtenerControlParaleloPagos();
  } catch (error) {
    mensajeError.value = obtenerMensajeError(
      error,
      'No se pudo cargar el resumen de pagos. Revisa tu conexión y pulsa Actualizar.'
    );
  } finally {
    cargandoControl.value = false;
  }
}

function formatearFecha(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ---------- Pestañas, filtros y factura ----------
const pestanaActiva = ref('historial'); // 'historial' | 'reparto'
const busqueda = ref('');
const filtroCanal = ref('todos'); // 'todos' | 'online' | 'mostrador'

const esOnline = (tx) => /online|wompi|l[ií]nea/i.test(String(tx.canal || ''));
const transacciones = computed(() => controlParalelo.value.transacciones || []);
const conteoCanal = computed(() => ({
  todos: transacciones.value.length,
  online: transacciones.value.filter(esOnline).length,
  mostrador: transacciones.value.filter((t) => !esOnline(t)).length
}));
const transaccionesFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  return transacciones.value.filter((tx) => {
    if (filtroCanal.value === 'online' && !esOnline(tx)) return false;
    if (filtroCanal.value === 'mostrador' && esOnline(tx)) return false;
    if (!q) return true;
    return [tx.id, tx.referencia, tx.cliente, tx.factura_numero, tx.metodo_pago]
      .some((v) => String(v ?? '').toLowerCase().includes(q));
  });
});
const FILTROS_CANAL = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'online', texto: 'Tienda en línea' },
  { valor: 'mostrador', texto: 'Mostrador' }
];

const visorAbierto = ref(false);
const facturaVisor = ref(null);
const abriendoFacturaId = ref(null);

// Arma una factura mínima con lo que ya trae el historial (por si el detalle completo no carga)
function facturaBasica(tx) {
  return {
    numero: tx.factura_numero || undefined,
    total: Number(tx.monto) || 0,
    fecha: tx.fecha,
    metodoPago: tx.metodo_pago,
    cliente: { nombre: tx.cliente || 'Consumidor final' },
    notas: tx.referencia ? `Ref: ${tx.referencia}` : ''
  };
}

async function abrirFactura(tx) {
  if (abriendoFacturaId.value) return;
  abriendoFacturaId.value = tx.id;
  let factura = facturaBasica(tx);
  try {
    const idDirecto = tx.factura_id ?? tx.id_factura;
    if (idDirecto) {
      factura = { ...factura, id: idDirecto };
    } else if (tx.factura_numero) {
      // Se busca la factura por su número para traer el detalle completo (prendas, IVA, cliente)
      const { lista } = await listarFacturas({ buscar: tx.factura_numero, porPagina: 5 });
      const exacta = lista.find((f) => String(f.numero) === String(tx.factura_numero)) || lista[0];
      if (exacta?.id) factura = { ...factura, id: exacta.id };
    }
  } catch {
    // Si falla la búsqueda se muestra la factura básica con los datos del historial
  } finally {
    facturaVisor.value = factura;
    visorAbierto.value = true;
    abriendoFacturaId.value = null;
  }
}

// ---------- Detalle del pago y reparto ----------
const dispersiones = ref(obtenerDispersiones());
const cuentasGuardadas = ref([]);
const detalleAbierto = ref(false);
const pagoDetalle = ref(null);

const repartido = (tx) => !!dispersiones.value[String(tx.id)];
const pendientes = computed(() => transacciones.value.filter((t) => !repartido(t)));
const problemasReparto = computed(() => validarCuentasParaReparto(cuentasGuardadas.value));
const dispersionDetalle = computed(() =>
  pagoDetalle.value ? dispersiones.value[String(pagoDetalle.value.id)] || null : null
);

function abrirDetalle(tx) {
  pagoDetalle.value = tx;
  detalleAbierto.value = true;
}

function irAReparto() {
  detalleAbierto.value = false;
  pestanaActiva.value = 'reparto';
}

function verFacturaDesdeDetalle() {
  const tx = pagoDetalle.value;
  detalleAbierto.value = false;
  if (tx) abrirFactura(tx);
}

function repartirPago(tx) {
  if (cambiosSinGuardar.value) {
    notificarError('Tienes cambios sin guardar en el reparto. Guárdalos primero.');
    return;
  }
  try {
    registrarDispersion(tx, cuentasGuardadas.value);
    dispersiones.value = obtenerDispersiones();
    notificarExito(`Reparto registrado para ${tx.id}`);
  } catch (error) {
    notificarError(error.message || 'No se pudo registrar el reparto.');
  }
}

async function repartirPendientes() {
  if (cambiosSinGuardar.value) {
    notificarError('Tienes cambios sin guardar en el reparto. Guárdalos primero.');
    return;
  }
  if (problemasReparto.value.length) {
    pestanaActiva.value = 'reparto';
    return;
  }
  const lista = [...pendientes.value];
  const confirmado = await confirmarAccion({
    titulo: `¿Repartir ${lista.length} ${lista.length === 1 ? 'pago' : 'pagos'}?`,
    texto: 'Se usarán los porcentajes guardados y se creará un comprobante por cada pago.',
    textoBotonConfirmar: 'Sí, repartir'
  });
  if (!confirmado) return;
  lista.forEach((tx) => {
    try {
      registrarDispersion(tx, cuentasGuardadas.value);
    } catch {
      /* si uno falla, los demás siguen */
    }
  });
  dispersiones.value = obtenerDispersiones();
  notificarExito('Reparto registrado');
}

onMounted(() => {
  configuracion.value = obtenerConfiguracionPasarela();
  cuentasGuardadas.value = JSON.parse(JSON.stringify(configuracion.value.cuentas_bancarias));
  dispersiones.value = obtenerDispersiones();
  tomarInstantanea();
  cargarControlParalelo();
});
</script>

<template>
  <div class="w-full max-w-none space-y-6">
    <!-- Encabezado -->
    <header class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-4 border-b border-gray-200">
      <div class="max-w-2xl">
        <h1 class="text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
          Pagos y reparto del dinero
        </h1>
        <p class="text-sm text-gray-600 mt-1">
          Cuando un cliente paga, el dinero se divide entre las cuentas que configures aquí.
          Tú solo decides cuánto va a cada una.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-sm"
          @click="cargarControlParalelo"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': cargandoControl }" />
          <span>Actualizar</span>
        </button>
      </div>
    </header>

    <!-- Error de carga -->
    <div v-if="mensajeError" class="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-sm text-red-800">
      <AlertCircle class="w-5 h-5 text-red-600 shrink-0" />
      <span>{{ mensajeError }}</span>
    </div>

    <!-- Resumen de recaudo (siempre visible) -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <Wallet class="w-4 h-4" /> Dinero recibido
        </div>
        <p class="mt-2 text-xl font-extrabold text-gray-900">{{ formatearCOP(controlParalelo.recaudoTotalConsolidado) }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Tienda en línea + mostrador</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <ShoppingBag class="w-4 h-4" /> Pagos con Wompi
        </div>
        <p class="mt-2 text-xl font-extrabold text-gray-900">{{ formatearCOP(controlParalelo.recaudoWompiOnline) }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ controlParalelo.cantidadPedidosPagados }} pedidos pagados</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <Store class="w-4 h-4" /> Ventas en mostrador
        </div>
        <p class="mt-2 text-xl font-extrabold text-gray-900">{{ formatearCOP(controlParalelo.recaudoPosMostrador) }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ controlParalelo.cantidadVentasPos }} ventas</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <Receipt class="w-4 h-4" /> Facturas emitidas
        </div>
        <p class="mt-2 text-xl font-extrabold text-gray-900">{{ controlParalelo.facturasEmitidas }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Una por cada pago confirmado</p>
      </div>
    </section>

    <!-- Pestañas -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-2 sm:gap-6 overflow-x-auto" aria-label="Pestañas de pagos">
        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-semibold transition whitespace-nowrap"
          :class="
            pestanaActiva === 'historial'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestanaActiva = 'historial'"
        >
          <History class="w-4 h-4" />
          <span>Historial de pagos</span>
          <span class="ml-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-700 font-bold">
            {{ transacciones.length }}
          </span>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-semibold transition whitespace-nowrap"
          :class="
            pestanaActiva === 'reparto'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestanaActiva = 'reparto'"
        >
          <Percent class="w-4 h-4" />
          <span>Reparto del dinero</span>
          <span
            class="ml-1 rounded-full px-2 py-0.5 text-xs font-bold"
            :class="problemas.length ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'"
          >
            {{ totalPorcentajes }}%
          </span>
          <span
            v-if="cambiosSinGuardar"
            class="w-2 h-2 rounded-full bg-amber-500"
            title="Hay cambios sin guardar"
          ></span>
        </button>
      </nav>
    </div>

    <!-- Pestaña: Historial -->
    <section v-if="pestanaActiva === 'historial'" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-5 sm:px-6 py-4 border-b border-gray-100 space-y-3">
        <div>
          <h2 class="text-base font-bold text-gray-900">Historial de pagos</h2>
          <p class="text-xs text-gray-500">
            Cada pago confirmado genera su venta y su factura. Pulsa «Ver detalle» para ver la factura y cómo se repartió el dinero.
          </p>
        </div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por canal">
            <button
              v-for="f in FILTROS_CANAL"
              :key="f.valor"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition"
              :class="
                filtroCanal === f.valor
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              "
              :aria-pressed="filtroCanal === f.valor"
              @click="filtroCanal = f.valor"
            >
              {{ f.texto }}
              <span class="opacity-70">{{ conteoCanal[f.valor] }}</span>
            </button>
          </div>
          <div class="relative w-full md:w-72">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              v-model="busqueda"
              type="search"
              maxlength="60"
              placeholder="Buscar por cliente, pedido o factura"
              aria-label="Buscar en el historial de pagos"
              class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-corporativo-rosa"
            />
          </div>
        </div>
      </div>

      <div
        v-if="transacciones.length && pendientes.length"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-3 bg-amber-50 border-b border-amber-200"
      >
        <p class="flex items-center gap-2 text-sm text-amber-900">
          <Clock class="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>{{ pendientes.length }}</strong>
            {{ pendientes.length === 1 ? 'pago sin repartir' : 'pagos sin repartir' }}
          </span>
        </p>
        <button
          type="button"
          class="px-3.5 py-2 text-xs font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition"
          @click="repartirPendientes"
        >
          {{ problemasReparto.length ? 'Configurar el reparto' : 'Repartir pendientes' }}
        </button>
      </div>

      <div v-if="!transacciones.length" class="py-12 px-6 text-center">
        <p class="text-sm font-semibold text-gray-800">Todavía no hay pagos registrados</p>
        <p class="text-xs text-gray-600 mt-1">Aparecerán aquí cuando un cliente pague.</p>
      </div>

      <div v-else-if="!transaccionesFiltradas.length" class="py-12 px-6 text-center">
        <p class="text-sm font-semibold text-gray-800">No hay pagos con ese filtro</p>
        <button
          type="button"
          class="mt-2 text-xs font-semibold text-corporativo-rosa hover:underline"
          @click="busqueda = ''; filtroCanal = 'todos'"
        >
          Quitar filtros
        </button>
      </div>

      <div v-else class="overflow-x-auto w-full">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-600">
              <th class="px-5 py-3 font-semibold">Pago</th>
              <th class="px-5 py-3 font-semibold">Dónde se vendió</th>
              <th class="px-5 py-3 font-semibold">Cliente</th>
              <th class="px-5 py-3 font-semibold">Medio de pago</th>
              <th class="px-5 py-3 font-semibold">Factura</th>
              <th class="px-5 py-3 font-semibold">Reparto</th>
              <th class="px-5 py-3 font-semibold">Fecha</th>
              <th class="px-5 py-3 font-semibold text-right">Valor</th>
              <th class="px-5 py-3"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="tx in transaccionesFiltradas"
              :key="tx.id"
              class="hover:bg-gray-50 cursor-pointer"
              @click="abrirDetalle(tx)"
            >
              <td class="px-5 py-3">
                <p class="font-bold text-gray-900">{{ tx.id }}</p>
                <p class="font-mono text-[11px] text-gray-500">{{ tx.referencia }}</p>
              </td>
              <td class="px-5 py-3 text-xs font-semibold text-gray-700">{{ tx.canal }}</td>
              <td class="px-5 py-3 text-gray-800">{{ tx.cliente }}</td>
              <td class="px-5 py-3 text-xs font-semibold text-gray-700">{{ tx.metodo_pago }}</td>
              <td class="px-5 py-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  :title="`Ver ${tx.factura_numero || 'factura'}`"
                  :disabled="abriendoFacturaId === tx.id"
                  @click.stop="abrirFactura(tx)"
                >
                  <Loader2 v-if="abriendoFacturaId === tx.id" class="w-3 h-3 animate-spin" />
                  <Eye v-else class="w-3 h-3" />
                  {{ tx.factura_numero || 'Ver factura' }}
                </button>
              </td>
              <td class="px-5 py-3">
                <span
                  v-if="repartido(tx)"
                  class="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700"
                >
                  <CheckCircle2 class="w-3 h-3" /> Repartido
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800"
                >
                  <Clock class="w-3 h-3" /> Pendiente
                </span>
              </td>
              <td class="px-5 py-3 text-xs text-gray-600">{{ formatearFecha(tx.fecha) }}</td>
              <td class="px-5 py-3 text-right font-extrabold text-gray-900">{{ formatearCOP(tx.monto) }}</td>
              <td class="px-5 py-3 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs font-bold text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-900 hover:text-white hover:border-gray-900 transition"
                  :aria-label="`Ver detalle del pago ${tx.id}`"
                  @click.stop="abrirDetalle(tx)"
                >
                  Ver detalle <ChevronRight class="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Pestaña: Reparto del dinero -->
    <div v-if="pestanaActiva === 'reparto'" class="space-y-6">
      <!-- Cómo funciona -->
      <ol class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <li class="flex items-start gap-3 rounded-2xl bg-white border border-gray-200 p-4">
          <span class="w-7 h-7 shrink-0 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center">1</span>
          <div>
            <p class="text-sm font-bold text-gray-900">El cliente paga</p>
            <p class="text-xs text-gray-600 mt-0.5">Con Wompi en la tienda en línea o en el mostrador.</p>
          </div>
        </li>
        <li class="flex items-start gap-3 rounded-2xl bg-white border border-gray-200 p-4">
          <span class="w-7 h-7 shrink-0 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center">2</span>
          <div>
            <p class="text-sm font-bold text-gray-900">Se reparte el dinero</p>
            <p class="text-xs text-gray-600 mt-0.5">Según los porcentajes que dejes abajo.</p>
          </div>
        </li>
        <li class="flex items-start gap-3 rounded-2xl bg-white border border-gray-200 p-4">
          <span class="w-7 h-7 shrink-0 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center">3</span>
          <div>
            <p class="text-sm font-bold text-gray-900">Se factura solo</p>
            <p class="text-xs text-gray-600 mt-0.5">La venta y su factura quedan registradas en el historial.</p>
          </div>
        </li>
      </ol>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <!-- Columna principal: cuentas -->
        <div class="lg:col-span-2 space-y-5">
          <!-- Estado del reparto -->
          <section
            class="rounded-2xl border p-5"
            :class="repartoCompleto && !problemas.length ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <CheckCircle2 v-if="repartoCompleto && !problemas.length" class="w-5 h-5 text-emerald-600" />
                <AlertCircle v-else class="w-5 h-5 text-amber-600" />
                <p class="text-sm font-bold" :class="repartoCompleto && !problemas.length ? 'text-emerald-900' : 'text-amber-900'">
                  {{ repartoCompleto && !problemas.length ? 'Todo listo: el reparto suma 100%' : 'Aún no se puede guardar' }}
                </p>
              </div>
              <div class="flex items-center gap-4">
                <p class="text-2xl font-extrabold text-gray-900 leading-none">
                  {{ totalPorcentajes }}<span class="text-base font-bold text-gray-500"> de 100%</span>
                </p>
              <button
                type="button"
                :disabled="!puedeGuardar"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                @click="guardar"
              >
                <Save class="w-4 h-4" />
                <span>Guardar cambios</span>
              </button>
              </div>
            </div>

            <!-- Barra de reparto -->
            <div class="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-white/80 border border-black/5" role="img" :aria-label="`Reparto actual: ${totalPorcentajes}% de 100%`">
              <div
                v-for="s in segmentos"
                :key="s.id"
                class="h-full transition-all"
                :style="{ width: Math.min(s.porcentaje, 100) + '%', backgroundColor: s.color }"
                :title="`${s.nombre}: ${s.porcentaje}%`"
              ></div>
            </div>
            <ul v-if="segmentos.length" class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
              <li v-for="s in segmentos" :key="s.id" class="inline-flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: s.color }"></span>
                {{ s.nombre }} <strong>{{ s.porcentaje }}%</strong>
              </li>
            </ul>

            <ul v-if="problemas.length" class="mt-4 space-y-1 text-sm text-amber-900 list-disc pl-5">
              <li v-for="p in problemas" :key="p">{{ p }}</li>
            </ul>
            <p v-else-if="cambiosSinGuardar" class="mt-4 text-sm text-emerald-900">
              Tienes cambios sin guardar. Pulsa «Guardar cambios».
            </p>
          </section>

          <!-- Lista de cuentas -->
          <section class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-pink-50 text-corporativo-rosa flex items-center justify-center">
                  <Building2 class="w-5 h-5" />
                </div>
                <div>
                  <h2 class="text-base sm:text-lg font-bold text-gray-900">¿A qué cuentas llega el dinero?</h2>
                  <p class="text-xs text-gray-600">Agrega una cuenta por cada destino y dile qué porcentaje recibe.</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-if="cuentasActivas.length > 1"
                  type="button"
                  class="px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                  @click="repartirEnPartesIguales"
                >
                  Repartir en partes iguales
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition shadow-sm"
                  @click="agregarCuentaBancaria"
                >
                  <Plus class="w-4 h-4" />
                  <span>Agregar cuenta</span>
                </button>
              </div>
            </div>

            <div v-if="!cuentas.length" class="py-10 text-center">
              <p class="text-sm font-semibold text-gray-800">Aún no hay cuentas</p>
              <p class="text-xs text-gray-600 mt-1">Pulsa «Agregar cuenta» para crear la primera.</p>
            </div>

            <div class="space-y-4">
              <article
                v-for="(cuenta, i) in cuentas"
                :key="cuenta.id"
                class="rounded-xl border bg-gray-50/60 p-4 space-y-4 transition"
                :class="cuenta.activa ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70'"
              >
                <!-- Cabecera de la cuenta -->
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: colorDe(i) }"></span>
                    <span class="text-sm font-bold text-gray-900 truncate">{{ nombreCuenta(cuenta, i) }}</span>
                    <span v-if="!cuenta.activa" class="text-[11px] font-semibold text-gray-600 bg-gray-200 rounded-full px-2 py-0.5">
                      Pausada
                    </span>
                  </div>
                  <div class="flex items-center gap-3">
                    <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                      <input type="checkbox" v-model="cuenta.activa" class="rounded text-corporativo-rosa" />
                      <span>Recibe dinero</span>
                    </label>
                    <button
                      v-if="cuentas.length > 1"
                      type="button"
                      class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Quitar cuenta"
                      :aria-label="`Quitar ${nombreCuenta(cuenta, i)}`"
                      @click="eliminarCuenta(cuenta, i)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Para qué es -->
                <div>
                  <label :for="`concepto-${cuenta.id}`" class="block text-xs font-semibold text-gray-700 mb-1">
                    ¿Para qué es este dinero?
                  </label>
                  <input
                    :id="`concepto-${cuenta.id}`"
                    v-model="cuenta.concepto"
                    type="text"
                    maxlength="50"
                    placeholder="Ej. Mano de obra, Operación de la tienda, Telas"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa"
                    @input="filtrarCuenta(cuenta, 'concepto', 'comercial', 50, $event)"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  <!-- Banco -->
                  <div class="sm:col-span-3">
                    <label :for="`banco-${cuenta.id}`" class="block text-xs font-semibold text-gray-700 mb-1">Banco</label>
                    <select
                      :id="`banco-${cuenta.id}`"
                      v-model="cuenta.banco"
                      class="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa"
                      :class="falta(cuenta, 'banco') ? 'border-red-400' : 'border-gray-300'"
                    >
                      <option value="" disabled>Elige un banco</option>
                      <option v-for="banco in bancosDe(cuenta)" :key="banco" :value="banco">{{ banco }}</option>
                    </select>
                  </div>

                  <!-- Tipo -->
                  <div class="sm:col-span-3">
                    <label :for="`tipo-${cuenta.id}`" class="block text-xs font-semibold text-gray-700 mb-1">Tipo de cuenta</label>
                    <select
                      :id="`tipo-${cuenta.id}`"
                      v-model="cuenta.tipo_cuenta"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa"
                    >
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                    </select>
                  </div>

                  <!-- Número -->
                  <div class="sm:col-span-3">
                    <label :for="`numero-${cuenta.id}`" class="block text-xs font-semibold text-gray-700 mb-1">Número de cuenta</label>
                    <input
                      :id="`numero-${cuenta.id}`"
                      v-model="cuenta.numero_cuenta"
                      type="text"
                      inputmode="numeric"
                      maxlength="30"
                      placeholder="Ej. 245-891024-11"
                      class="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa font-mono"
                      :class="falta(cuenta, 'numero') ? 'border-red-400' : 'border-gray-300'"
                      @input="filtrarCuenta(cuenta, 'numero_cuenta', 'cuenta', 30, $event)"
                    />
                  </div>

                  <!-- Porcentaje -->
                  <div class="sm:col-span-3">
                    <label :for="`pct-${cuenta.id}`" class="block text-xs font-semibold text-gray-700 mb-1">
                      ¿Qué porcentaje recibe?
                    </label>
                    <div class="flex items-center gap-2">
                      <div class="relative flex-1">
                        <input
                          :id="`pct-${cuenta.id}`"
                          v-model.number="cuenta.porcentaje"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          :disabled="!cuenta.activa"
                          class="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa font-bold text-gray-900 disabled:bg-gray-100"
                          @change="normalizarPorcentaje(cuenta)"
                        />
                        <span class="absolute right-3 top-2 text-sm text-gray-500 font-bold">%</span>
                      </div>
                      <button
                        v-if="cuenta.activa && diferencia !== 0"
                        type="button"
                        class="shrink-0 px-2.5 py-2 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                        @click="ajustarConDiferencia(cuenta)"
                      >
                        {{ diferencia > 0 ? `Sumar ${diferencia}%` : `Quitar ${Math.abs(diferencia)}%` }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Titular -->
                <div>
                  <label :for="`titular-${cuenta.id}`" class="block text-xs font-semibold text-gray-700 mb-1">
                    Titular de la cuenta
                  </label>
                  <input
                    :id="`titular-${cuenta.id}`"
                    v-model="cuenta.titular"
                    type="text"
                    maxlength="150"
                    placeholder="Nombre de la persona o empresa dueña de la cuenta"
                    class="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa"
                    :class="falta(cuenta, 'titular') ? 'border-red-400' : 'border-gray-300'"
                    @input="filtrarCuenta(cuenta, 'titular', 'comercial', 150, $event)"
                  />
                </div>
              </article>
            </div>
          </section>
        </div>

        <!-- Columna lateral: simulador -->
        <aside class="space-y-5 lg:sticky lg:top-4">
          <section class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
              <div class="w-10 h-10 rounded-xl bg-pink-50 text-corporativo-rosa flex items-center justify-center">
                <Calculator class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-gray-900">Prueba el reparto</h2>
                <p class="text-xs text-gray-600">Escribe el valor de una venta y mira cuánto recibe cada cuenta.</p>
              </div>
            </div>

            <label for="monto-simulado" class="block text-xs font-semibold text-gray-700 mb-1">Valor de la venta (COP)</label>
            <input
              id="monto-simulado"
              :value="montoSimulado"
              type="text"
              inputmode="numeric"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa font-bold"
              @input="filtrarMonto"
            />

            <ul class="mt-4 space-y-3">
              <li v-for="s in simulacion" :key="s.id" class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-2 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" :style="{ backgroundColor: s.color }"></span>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ s.nombre }}</p>
                    <p class="text-xs text-gray-600">{{ s.porcentaje }}% · {{ s.banco || 'Sin banco' }}</p>
                  </div>
                </div>
                <p class="text-sm font-extrabold text-gray-900 whitespace-nowrap">{{ formatearCOP(s.monto_asignado) }}</p>
              </li>
              <li v-if="!simulacion.length" class="text-xs text-gray-600">
                Activa una cuenta para ver el reparto.
              </li>
            </ul>

            <div class="mt-4 flex gap-2 rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
              <Info class="w-4 h-4 shrink-0 text-gray-500 mt-0.5" />
              <p>
                Es solo un cálculo de ejemplo y no mueve dinero. No descuenta la comisión de Wompi ni otros costos.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>

    <DetallePagoDispersion
      :abierto="detalleAbierto"
      :pago="pagoDetalle"
      :dispersion="dispersionDetalle"
      :cuentas="cuentasGuardadas"
      @cerrar="detalleAbierto = false"
      @ver-factura="verFacturaDesdeDetalle"
      @repartir="repartirPago(pagoDetalle)"
      @ir-reparto="irAReparto"
    />

    <VisorFacturaFashion
      :abierto="visorAbierto"
      :factura="facturaVisor"
      @cerrar="visorAbierto = false"
    />
  </div>
</template>