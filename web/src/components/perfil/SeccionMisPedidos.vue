<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { RouterLink } from 'vue-router';
import {
  ChevronDown,
  Truck,
  RotateCcw,
  ShoppingBag,
  AlertCircle,
  Check,
  CreditCard,
  XCircle,
  Clock,
  Package,
  CheckCircle2,
  Copy,
  FileText,
  Timer
} from 'lucide-vue-next';
import { listarPedidos, ESTADOS_PEDIDO, ESTADOS_SIN_FLUJO, infoEstadoPedido } from '@/services/pedidoServicio';
import { reanudarCheckout, cancelarCheckout, iniciarPagoWompi } from '@/services/wompiServicio';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { obtenerProducto } from '@/services/productoServicio';
import { useCarritoStore } from '@/stores/carrito';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { fechaDelServidor } from '@/utils/fechaServidor';
import VisorFacturaFashion from '@/components/facturas/VisorFacturaFashion.vue';

const { formatearCOP } = useFormatoMoneda();
const carritoStore = useCarritoStore();
const authStore = useAutenticacionStore();

// Debe coincidir con ReservaPedidoService::MINUTOS_RESERVA del backend.
const MINUTOS_RESERVA = 20;

const FLUJO = [
  { valor: 'Pendiente_Pago', etiqueta: 'Pendiente de pago', icono: Clock },
  { valor: 'Pagado', etiqueta: 'Pagado', icono: CreditCard },
  { valor: 'En_Preparacion', etiqueta: 'En preparación', icono: Package },
  { valor: 'Enviado', etiqueta: 'Enviado', icono: Truck },
  { valor: 'Entregado', etiqueta: 'Entregado', icono: CheckCircle2 }
];

const filtros = [{ valor: '', etiqueta: 'Todos' }, ...ESTADOS_PEDIDO];

const pedidos = ref([]);
const cargando = ref(true);
const cargandoMas = ref(false);
const error = ref('');
const filtroEstado = ref('');
const pagina = ref(1);
const totalPaginas = ref(1);
const abierto = ref(null);
const recomprando = ref(null);
const aviso = ref(null);
const procesando = ref(null);
const guiaCopiadaId = ref(null);

// Visor y Descarga de Factura en PDF
const visorFacturaAbierto = ref(false);
const facturaParaVisor = ref(null);

// Countdown de reservas: tick reactivo cada segundo
const ahora = ref(Date.now());
let _tickInterval = null;

function iniciarTick() {
  if (_tickInterval) return;
  _tickInterval = setInterval(() => {
    ahora.value = Date.now();
    revisarReservasVencidas();
  }, 1000);
}
function detenerTick() {
  if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
}
const pedidoParaVisor = ref(null);

const hayMas = computed(() => pagina.value < totalPaginas.value);

// Recarga en segundo plano: vuelve a pedir las páginas ya visibles (1..pagina) sin spinner
// y sin perder los pedidos anteriores que el cliente ya había desplegado.
async function recargarSilencioso() {
  if (cargando.value || cargandoMas.value) return;
  try {
    const hasta = Math.max(1, pagina.value);
    let lista = [];
    let totalPag = totalPaginas.value;
    for (let p = 1; p <= hasta; p += 1) {
      const r = await listarPedidos({ pagina: p, estado: filtroEstado.value, porPagina: 8 });
      lista = lista.concat(r.lista);
      totalPag = r.totalPaginas;
    }
    if (JSON.stringify(lista) !== JSON.stringify(pedidos.value)) pedidos.value = lista;
    totalPaginas.value = totalPag;
  } catch {
    /* en segundo plano no se molesta al usuario */
  }
}

async function cargar({ reiniciar = true } = {}) {
  if (reiniciar) {
    cargando.value = true;
    pagina.value = 1;
  } else {
    cargandoMas.value = true;
  }
  error.value = '';

  try {
    const r = await listarPedidos({ pagina: pagina.value, estado: filtroEstado.value, porPagina: 8 });
    pedidos.value = reiniciar ? r.lista : [...pedidos.value, ...r.lista];
    totalPaginas.value = r.totalPaginas;
  } catch (e) {
    if (!reiniciar) pagina.value -= 1;
    error.value = e.response?.data?.message || 'No se pudo cargar tu historial de pedidos.';
  } finally {
    cargando.value = false;
    cargandoMas.value = false;
  }
}

function verMas() {
  pagina.value += 1;
  cargar({ reiniciar: false });
}

function cambiarFiltro(valor) {
  filtroEstado.value = valor;
  abierto.value = null;
  cargar();
}

function alternarPedido(id) {
  abierto.value = abierto.value === id ? null : id;
}

function pasoActual(estado) {
  return FLUJO.findIndex((p) => p.valor === estado);
}

function cantidadPrendas(pedido) {
  return (pedido.detalles || []).reduce((acc, d) => acc + d.cantidad, 0);
}

/**
 * Convierte un valor de fecha del backend a un objeto Date.
 * El backend devuelve ISO-8601 con 'Z' si el campo tiene $cast = 'datetime'.
 * Si por algún motivo viene sin zona (ej. "2024-01-01 12:00:00"), lo tratamos
 * como UTC añadiendo 'Z' para evitar que el navegador lo interprete como local.
 */
function parsearFechaUTC(valor) {
  if (!valor) return null;
  let s = String(valor).trim();
  // Reemplazar espacio por 'T' (formato MySQL) y agregar 'Z' si no tiene zona
  s = s.replace(' ', 'T');
  if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) s += 'Z';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatearFecha(valor) {
  if (!valor) return '';
  const fecha = fechaDelServidor(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function msRestantes(pedido) {
  const base = fechaDelServidor(pedido.fechaPedido);
  if (Number.isNaN(base.getTime())) return 0;
  return base.getTime() + MINUTOS_RESERVA * 60 * 1000 - ahora.value;
}

function reservaExpirada(pedido) {
  return msRestantes(pedido) <= 0;
}

function textoContador(pedido) {
  const ms = msRestantes(pedido);
  if (ms <= 0) return 'Expirado';
  const totalSeg = Math.ceil(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

async function copiarGuia(pedido) {
  if (!pedido.numeroGuia) return;
  try {
    await navigator.clipboard.writeText(pedido.numeroGuia);
    guiaCopiadaId.value = pedido.id;
    setTimeout(() => {
      if (guiaCopiadaId.value === pedido.id) guiaCopiadaId.value = null;
    }, 2500);
  } catch {
    // Silencioso
  }
}

function abrirVisorFactura(pedido) {
  facturaParaVisor.value = { id: pedido.facturaId };
  pedidoParaVisor.value = pedido;
  visorFacturaAbierto.value = true;
}

// Pedidos del checkout online (los que se pueden pagar o cancelar).
// El contador (reservaExpirada / textoContador) decide si se ve activa o expirada.
function puedeGestionarPago(pedido) {
  return pedido.estado === 'Pendiente_Pago' && /^FS-(?!PED-)/.test(pedido.referencia || '');
}

// Al vencer una reserva se recarga una vez para traer el estado real (Expirado) del servidor.
const referenciasRefrescadas = new Set();
function revisarReservasVencidas() {
  const vencidas = pedidos.value.filter(
    (p) => puedeGestionarPago(p) && reservaExpirada(p) && !referenciasRefrescadas.has(p.referencia)
  );
  if (vencidas.length) {
    vencidas.forEach((p) => referenciasRefrescadas.add(p.referencia));
    cargar();
  }
}

function mensajeError(e, porDefecto) {
  return e?.response?.data?.message || porDefecto;
}

async function pagarAhora(pedido) {
  // Verificar que la reserva no haya expirado en el cliente antes de llamar al backend
  if (reservaExpirada(pedido)) {
    aviso.value = { tipo: 'error', texto: 'La reserva de 20 minutos de este pedido ya expiró. Las prendas volvieron a estar disponibles.' };
    await cargar();
    return;
  }

  procesando.value = pedido.id;
  aviso.value = null;

  let datosPago;
  try {
    datosPago = await reanudarCheckout(pedido.referencia);
  } catch (e) {
    aviso.value = { tipo: 'error', texto: mensajeError(e, 'No se pudo retomar el pago de este pedido.') };
    procesando.value = null;
    await cargar();
    return;
  }

  const usuario = authStore.usuario || {};
  await iniciarPagoWompi({
    pedido: datosPago,
    cancelarAlCerrar: false,
    // Con el widget abierto el botón no debe quedarse en "Procesando..."
    onAbierto: () => {
      procesando.value = null;
    },
    cliente: {
      nombre: usuario.nombre || pedido.cliente?.nombre || '',
      correo: usuario.correo || usuario.email || '',
      telefono: pedido.telefono,
      ciudad: pedido.ciudad,
      departamento: pedido.departamento,
      direccion: pedido.direccion
    },
    onAprobado: (detalles) => {
      const correo = detalles?.correoEnviadoA || usuario.correo || usuario.email || 'tu correo registrado';
      aviso.value = {
        tipo: 'exito',
        texto: `¡Pago confirmado con éxito! Tu factura electrónica ha sido generada y enviada a ${correo}.`
      };

      if (detalles?.facturaId || pedido.facturaId) {
        facturaParaVisor.value = detalles?.factura || { id: detalles?.facturaId || pedido.facturaId };
        pedidoParaVisor.value = pedido;
        visorFacturaAbierto.value = true;
      }
    },
    onPendiente: () => {
      aviso.value = { tipo: 'error', texto: 'Tu pago está pendiente de confirmación. Te avisaremos cuando se apruebe.' };
    },
    onRevision: () => {
      aviso.value = { tipo: 'error', texto: 'Recibimos tu pago, pero una prenda se agotó. Nuestro equipo te contactará para resolverlo o reembolsarte.' };
    },
    onCancelado: () => {},
    onError: (msg) => {
      aviso.value = { tipo: 'error', texto: msg };
    }
  });

  procesando.value = null;
  await cargar();
}

async function cancelarPedido(pedido) {
  if (!confirm('¿Cancelar este pedido? Liberaremos las prendas reservadas.')) return;

  procesando.value = pedido.id;
  aviso.value = null;
  try {
    await cancelarCheckout(pedido.referencia);
    aviso.value = { tipo: 'exito', texto: 'Pedido cancelado. Las prendas volvieron a estar disponibles.' };
  } catch (e) {
    aviso.value = { tipo: 'error', texto: mensajeError(e, 'No se pudo cancelar el pedido.') };
  } finally {
    procesando.value = null;
  }
  await cargar();
}

async function volverAComprar(pedido) {
  recomprando.value = pedido.id;
  aviso.value = null;
  let agregadas = 0;
  let omitidas = 0;

  for (const d of pedido.detalles) {
    if (!d.productoId || !d.varianteId) {
      omitidas++;
      continue;
    }
    try {
      const producto = await obtenerProducto(d.productoId);
      const variante = (producto?.variantes ?? []).find(
        (v) => Number(v.id_variante) === Number(d.varianteId)
      );
      const stock = Number(variante?.stock ?? 0);

      if (!producto || !variante || stock <= 0 || producto.activo === false) {
        omitidas++;
        continue;
      }
      carritoStore.agregarPrenda(producto, variante, Math.min(d.cantidad, stock));
      agregadas++;
    } catch {
      omitidas++;
    }
  }

  recomprando.value = null;
  aviso.value = omitidas > 0
    ? { tipo: 'error', texto: `Agregamos ${agregadas} prenda(s) al carrito. ${omitidas} ya no está(n) disponible(s) o no tiene(n) stock.` }
    : { tipo: 'exito', texto: 'Agregamos las prendas de este pedido a tu carrito.' };
}

onMounted(() => {
  cargar();
  iniciarTick();
});
onBeforeUnmount(detenerTick);
useRecargaAutomatica(() => recargarSilencioso(), { recursos: ['pedidos', 'facturas', 'pagos', 'ventas'], intervaloSondeo: 60000 });
</script>

<template>
  <section class="space-y-5">
    <div>
      <h2 class="text-lg font-bold text-gray-900">Mis pedidos</h2>
      <p class="text-xs text-gray-500">Consulta el estado, seguimiento, comprobantes y detalle de tus compras.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="f in filtros"
        :key="f.valor"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="filtroEstado === f.valor
          ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa'
          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'"
        @click="cambiarFiltro(f.valor)"
      >
        {{ f.etiqueta }}
      </button>
    </div>

    <div v-if="aviso"
      class="flex items-start gap-3 rounded-xl border p-4 text-sm"
      :class="aviso.tipo === 'exito'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-amber-200 bg-amber-50 text-amber-800'">
      <component :is="aviso.tipo === 'exito' ? Check : AlertCircle" class="mt-0.5 h-5 w-5 shrink-0" />
      <div class="flex-1 font-medium">{{ aviso.texto }}</div>
    </div>

    <div v-if="cargando" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
      Cargando tus pedidos...
    </div>

    <div v-else-if="error" class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div class="flex-1">
        <p class="font-medium">{{ error }}</p>
        <button type="button" class="mt-2 text-xs font-bold underline" @click="cargar()">Reintentar</button>
      </div>
    </div>

    <div v-else-if="pedidos.length === 0"
      class="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <ShoppingBag class="mx-auto h-10 w-10 text-gray-300" />
      <h3 class="mt-3 text-base font-bold text-gray-900">
        {{ filtroEstado ? 'No tienes pedidos con este estado' : 'Aún no tienes pedidos' }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">Cuando hagas una compra, la verás aquí.</p>
      <RouterLink to="/catalogo"
        class="mt-5 inline-flex rounded-xl bg-corporativo-rosa px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-pink-700">
        Ir al catálogo
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <article v-for="p in pedidos" :key="p.id" class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <button type="button" class="flex w-full flex-wrap items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition" @click="alternarPedido(p.id)">
          <div class="flex -space-x-3">
            <img v-for="d in (p.detalles || []).slice(0, 3)" :key="d.id" :src="d.imagen" :alt="d.nombre"
              class="h-12 w-12 rounded-lg border-2 border-white bg-gray-100 object-cover" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-gray-900">Pedido {{ p.referencia }}</p>
            <p class="text-xs text-gray-500">{{ formatearFecha(p.fecha) }} · {{ cantidadPrendas(p) }} prenda(s)</p>
          </div>

          <span class="rounded-full border px-3 py-1 text-xs font-semibold" :class="infoEstadoPedido(p.estado).clases">
            {{ infoEstadoPedido(p.estado).etiqueta }}
          </span>
          <span class="text-sm font-bold text-gray-900">{{ formatearCOP(p.total) }}</span>
          <ChevronDown class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': abierto === p.id }" />
        </button>

        <div v-if="abierto === p.id" class="space-y-5 border-t border-gray-100 p-5 bg-gray-50/40">
          <!-- BARRA DE SEGUIMIENTO EN MIS PEDIDOS -->
          <div v-if="!ESTADOS_SIN_FLUJO.includes(p.estado)" class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Seguimiento de tu compra</p>

            <div class="relative">
              <!-- Línea de fondo -->
              <div class="absolute left-6 right-6 top-4 hidden -translate-y-1/2 sm:block h-1 bg-gray-200">
                <div
                  class="h-full bg-corporativo-rosa transition-all duration-500"
                  :style="{ width: `${Math.max(0, Math.min(100, (pasoActual(p.estado) / (FLUJO.length - 1)) * 100))}%` }"
                ></div>
              </div>

              <!-- Pasos -->
              <ol class="grid grid-cols-2 gap-y-3 sm:grid-cols-5 sm:gap-2 relative z-10">
                <li v-for="(paso, i) in FLUJO" :key="paso.valor" class="flex sm:flex-col items-center sm:text-center gap-2">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs transition"
                    :class="[
                      i < pasoActual(p.estado)
                        ? 'border-corporativo-rosa bg-corporativo-rosa text-white'
                        : i === pasoActual(p.estado)
                          ? 'border-corporativo-rosa bg-white text-corporativo-rosa ring-3 ring-pink-100 font-bold scale-105'
                          : 'border-gray-300 bg-white text-gray-400'
                    ]"
                  >
                    <Check v-if="i < pasoActual(p.estado)" class="h-4 w-4 stroke-[2.5]" />
                    <component :is="paso.icono" v-else class="h-3.5 w-3.5" />
                  </div>
                  <span
                    class="block text-[11px] font-semibold"
                    :class="i <= pasoActual(p.estado) ? 'text-gray-900' : 'text-gray-400'"
                  >
                    {{ paso.etiqueta }}
                  </span>
                </li>
              </ol>
            </div>

            <!-- Información destacada de transporte si ya fue enviado -->
            <div v-if="p.estado === 'Enviado' && (p.empresaTransportadora || p.numeroGuia)" class="mt-4 rounded-lg bg-indigo-50 border border-indigo-100 p-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Truck class="h-4 w-4 text-indigo-600" />
                <span class="text-xs font-semibold text-indigo-900">
                  ¡Tu pedido está en camino con <strong>{{ p.empresaTransportadora }}</strong>!
                </span>
                <span v-if="p.numeroGuia" class="font-mono text-xs text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Guía: {{ p.numeroGuia }}
                </span>
              </div>
              <button
                v-if="p.numeroGuia"
                type="button"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900"
                @click="copiarGuia(p)"
              >
                <Copy class="h-3 w-3" />
                {{ guiaCopiadaId === p.id ? '¡Copiado!' : 'Copiar guía' }}
              </button>
            </div>
          </div>

          <!-- Mensaje especial si está cancelado / expirado -->
          <div v-else class="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle class="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p class="font-bold">Estado del pedido: {{ infoEstadoPedido(p.estado).etiqueta }}</p>
              <p class="mt-0.5 text-red-700">Este pedido fue finalizado o cancelado. Las prendas asociadas se reintegraron a la tienda.</p>
            </div>
          </div>

          <!-- Prendas -->
          <ul class="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200 p-3">
            <li v-for="d in p.detalles" :key="d.id" class="flex items-center gap-3 py-2.5">
              <img :src="d.imagen" :alt="d.nombre" class="h-12 w-12 rounded-lg bg-gray-100 object-cover" />
              <div class="min-w-0 flex-1">
                <RouterLink v-if="d.productoId" :to="`/producto/${d.productoId}`"
                  class="block truncate text-sm font-semibold text-gray-900 hover:text-corporativo-rosa">
                  {{ d.nombre }}
                </RouterLink>
                <p v-else class="truncate text-sm font-semibold text-gray-900">{{ d.nombre }}</p>
                <p class="text-xs text-gray-500">Talla {{ d.talla || '—' }} · x{{ d.cantidad }}</p>
              </div>
              <span class="text-sm font-semibold text-gray-900">{{ formatearCOP(d.subtotal) }}</span>
            </li>
          </ul>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1 rounded-xl bg-white border border-gray-200 p-4 text-xs text-gray-600">
              <p class="mb-1 text-sm font-bold text-gray-900">Entrega</p>
              <p>
                {{ p.direccion }}<span v-if="p.ciudad">, {{ p.ciudad }}</span><span v-if="p.departamento"> ({{ p.departamento }})</span>
              </p>
              <p v-if="p.telefono">Tel. {{ p.telefono }}</p>
              <p v-if="p.empresaTransportadora" class="flex items-center gap-1.5 pt-1 font-semibold text-gray-800">
                <Truck class="h-3.5 w-3.5 text-corporativo-rosa" />
                {{ p.empresaTransportadora }}<span v-if="p.numeroGuia"> · Guía {{ p.numeroGuia }}</span>
              </p>
            </div>

            <div class="space-y-1 rounded-xl bg-white border border-gray-200 p-4 text-xs text-gray-600">
              <p class="mb-1 text-sm font-bold text-gray-900">Resumen</p>
              <div class="flex justify-between"><span>Subtotal</span><span>{{ formatearCOP(p.subtotal) }}</span></div>
              <div class="flex justify-between"><span>Envío</span><span>{{ formatearCOP(p.envio) }}</span></div>
              <div class="flex justify-between border-t border-gray-200 pt-1 text-sm font-bold text-gray-900">
                <span>Total</span><span>{{ formatearCOP(p.total) }}</span>
              </div>
              <p v-if="p.metodoPago">Pago: {{ p.metodoPago }}</p>
            </div>
          </div>

          <!-- Bloque de gestión de pago: countdown en tiempo real -->
          <div v-if="puedeGestionarPago(p)">
            <!-- Reserva ACTIVA -->
            <div v-if="!reservaExpirada(p)"
              class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <p class="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Clock class="h-3.5 w-3.5" />
                  Reserva activa — tiempo restante:
                  <span class="font-mono text-sm text-amber-900 tabular-nums">{{ textoContador(p) }}</span>
                </p>
                <p class="text-xs text-amber-700 mt-0.5">
                  Tus prendas están apartadas. Si no pagas antes de que el contador llegue a 00:00, la reserva se libera automáticamente.
                </p>
              </div>
              <div class="flex gap-2">
                <button type="button" :disabled="procesando === p.id"
                  class="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="cancelarPedido(p)">
                  <XCircle class="h-4 w-4" />
                  Cancelar pedido
                </button>
                <button type="button" :disabled="procesando === p.id"
                  class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="pagarAhora(p)">
                  <CreditCard class="h-4 w-4" />
                  {{ procesando === p.id ? 'Procesando...' : 'Pagar ahora' }}
                </button>
              </div>
            </div>

            <!-- Reserva EXPIRADA (cliente lo detecta antes de que el backend lo refresque) -->
            <div v-else
              class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <div>
                <p class="text-xs font-bold text-red-800 flex items-center gap-1.5">
                  <AlertCircle class="h-3.5 w-3.5 text-red-600" />
                  Reserva expirada — 00:00
                </p>
                <p class="text-xs text-red-700 mt-0.5">
                  Los 20 minutos de reserva han terminado. Las prendas volvieron a estar disponibles en la tienda.
                </p>
              </div>
              <button type="button"
                :disabled="recomprando === p.id"
                class="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
                @click="volverAComprar(p)">
                <RotateCcw class="h-4 w-4" />
                {{ recomprando === p.id ? 'Agregando...' : 'Volver a comprar' }}
              </button>
            </div>
          </div>

          <!-- Acciones del pedido: Ver/Descargar Factura y Volver a comprar -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              <button
                v-if="p.facturaId || ['Pagado', 'En_Preparacion', 'Enviado', 'Entregado'].includes(p.estado)"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-xs font-bold text-corporativo-rosa shadow-xs hover:bg-pink-100 transition"
                title="Ver factura electrónica y descargar en PDF"
                @click="abrirVisorFactura(p)"
              >
                <FileText class="h-4 w-4" />
                Ver / Descargar Factura (PDF)
              </button>
            </div>

            <button type="button" :disabled="recomprando === p.id"
              class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              @click="volverAComprar(p)">
              <RotateCcw class="h-4 w-4" />
              {{ recomprando === p.id ? 'Agregando...' : 'Volver a comprar' }}
            </button>
          </div>
        </div>
      </article>

      <div v-if="hayMas" class="text-center">
        <button type="button" :disabled="cargandoMas"
          class="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          @click="verMas">
          {{ cargandoMas ? 'Cargando...' : 'Ver pedidos anteriores' }}
        </button>
      </div>
    </div>

    <!-- Modal Visor y Descarga de Factura en PDF -->
    <VisorFacturaFashion
      :abierto="visorFacturaAbierto"
      :factura="facturaParaVisor"
      :pedido="pedidoParaVisor"
      @cerrar="visorFacturaAbierto = false"
    />
  </section>
</template>