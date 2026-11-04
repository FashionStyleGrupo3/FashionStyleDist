<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ChevronDown, Truck, RotateCcw, ShoppingBag, AlertCircle, Check, CreditCard, XCircle } from 'lucide-vue-next';
import { listarPedidos, ESTADOS_PEDIDO, ESTADOS_SIN_FLUJO, infoEstadoPedido } from '@/services/pedidoServicio';
import { reanudarCheckout, cancelarCheckout, iniciarPagoWompi } from '@/services/wompiServicio';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { obtenerProducto } from '@/services/productoServicio';
import { useCarritoStore } from '@/stores/carrito';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';

const { formatearCOP } = useFormatoMoneda();
const carritoStore = useCarritoStore();
const authStore = useAutenticacionStore();

// Debe coincidir con ReservaPedidoService::MINUTOS_RESERVA del backend.
const MINUTOS_RESERVA = 20;

const FLUJO = ['Pendiente_Pago', 'Pagado', 'En_Preparacion', 'Enviado', 'Entregado'];
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

const hayMas = computed(() => pagina.value < totalPaginas.value);

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
  return FLUJO.indexOf(estado);
}

function cantidadPrendas(pedido) {
  return pedido.detalles.reduce((acc, d) => acc + d.cantidad, 0);
}

function formatearFecha(valor) {
  if (!valor) return '';
  const fecha = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(fecha.getTime())
    ? ''
    : fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Pedidos del checkout online que todavía se pueden pagar o cancelar. */
function puedeGestionarPago(pedido) {
  return pedido.estado === 'Pendiente_Pago' && /^FS-(?!PED-)/.test(pedido.referencia || '');
}

function venceA(pedido) {
  const base = new Date(String(pedido.fechaPedido || '').replace(' ', 'T'));
  if (Number.isNaN(base.getTime())) return '';
  const limite = new Date(base.getTime() + MINUTOS_RESERVA * 60 * 1000);
  return limite.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function mensajeError(e, porDefecto) {
  return e?.response?.data?.message || porDefecto;
}

async function pagarAhora(pedido) {
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
    cliente: {
      nombre: usuario.nombre || pedido.cliente?.nombre || '',
      correo: usuario.correo || usuario.email || '',
      telefono: pedido.telefono,
      ciudad: pedido.ciudad,
      departamento: pedido.departamento,
      direccion: pedido.direccion
    },
    onAprobado: () => {
      aviso.value = { tipo: 'exito', texto: '¡Pago confirmado! Tu pedido ya está en proceso.' };
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

onMounted(() => cargar());
</script>

<template>
  <section class="space-y-5">
    <div>
      <h2 class="text-lg font-bold text-gray-900">Mis pedidos</h2>
      <p class="text-xs text-gray-500">Consulta el estado y el detalle de tus compras.</p>
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
      <article v-for="p in pedidos" :key="p.id" class="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <button type="button" class="flex w-full flex-wrap items-center gap-4 p-5 text-left" @click="alternarPedido(p.id)">
          <div class="flex -space-x-3">
            <img v-for="d in p.detalles.slice(0, 3)" :key="d.id" :src="d.imagen" :alt="d.nombre"
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

        <div v-if="abierto === p.id" class="space-y-5 border-t border-gray-100 p-5">
          <!-- Progreso del pedido -->
          <ol v-if="!ESTADOS_SIN_FLUJO.includes(p.estado)" class="grid grid-cols-5 gap-2">
            <li v-for="(paso, i) in FLUJO" :key="paso" class="text-center">
              <div class="h-1.5 rounded-full"
                :class="i <= pasoActual(p.estado) ? 'bg-corporativo-rosa' : 'bg-gray-200'"></div>
              <span class="mt-1.5 block text-[11px] font-semibold"
                :class="i <= pasoActual(p.estado) ? 'text-gray-900' : 'text-gray-400'">
                {{ infoEstadoPedido(paso).etiqueta }}
              </span>
            </li>
          </ol>

          <!-- Prendas -->
          <ul class="divide-y divide-gray-100">
            <li v-for="d in p.detalles" :key="d.id" class="flex items-center gap-3 py-3">
              <img :src="d.imagen" :alt="d.nombre" class="h-14 w-14 rounded-lg bg-gray-100 object-cover" />
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
            <div class="space-y-1 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
              <p class="mb-1 text-sm font-bold text-gray-900">Entrega</p>
              <p>
                {{ p.direccion }}<span v-if="p.ciudad">, {{ p.ciudad }}</span><span v-if="p.departamento"> ({{ p.departamento }})</span>
              </p>
              <p v-if="p.telefono">Tel. {{ p.telefono }}</p>
              <p v-if="p.empresaTransportadora" class="flex items-center gap-1.5 pt-1 font-semibold text-gray-800">
                <Truck class="h-3.5 w-3.5" />
                {{ p.empresaTransportadora }}<span v-if="p.numeroGuia"> · Guía {{ p.numeroGuia }}</span>
              </p>
            </div>

            <div class="space-y-1 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
              <p class="mb-1 text-sm font-bold text-gray-900">Resumen</p>
              <div class="flex justify-between"><span>Subtotal</span><span>{{ formatearCOP(p.subtotal) }}</span></div>
              <div class="flex justify-between"><span>Envío</span><span>{{ formatearCOP(p.envio) }}</span></div>
              <div class="flex justify-between border-t border-gray-200 pt-1 text-sm font-bold text-gray-900">
                <span>Total</span><span>{{ formatearCOP(p.total) }}</span>
              </div>
              <p v-if="p.metodoPago">Pago: {{ p.metodoPago }}</p>
            </div>
          </div>

          <div v-if="puedeGestionarPago(p)"
            class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p class="text-xs font-medium text-amber-800">
              Tus prendas están reservadas<span v-if="venceA(p)"> hasta las {{ venceA(p) }}</span>
              Si no pagas a tiempo, la reserva se libera automáticamente.
            </p>
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

          <div class="flex justify-end">
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
  </section>
</template>