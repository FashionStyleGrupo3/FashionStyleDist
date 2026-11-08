<script setup>
// -> Componente TablaPedidosAdmin con seguimiento interactivo y despacho manual
import { ref, reactive } from 'vue';
import {
  Truck,
  PackageSearch,
  Loader2,
  MapPin,
  Eye,
  ChevronDown,
  Check,
  Clock,
  CreditCard,
  Package,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Send,
  Edit2,
  ExternalLink,
  X
} from 'lucide-vue-next';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import { obtenerMensajeError } from '@/services/clienteApi';
import {
  ESTADOS_PEDIDO,
  ESTADOS_SIN_FLUJO,
  TRANSPORTADORAS_SUGERIDAS,
  infoEstadoPedido,
  actualizarDespacho
} from '@/services/pedidoServicio';
import { fechaDelServidor } from '@/utils/fechaServidor';

const props = defineProps({
  pedidos: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  filtroEstado: { type: String, default: '' }
});

const emit = defineEmits([
  'cambiar-filtro',
  'gestionar',
  'ver-factura',
  'pedido-actualizado'
]);

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError, confirmarAccion } = useNotificacion();

const FLUJO_PEDIDO = [
  { valor: 'Pendiente_Pago', etiqueta: 'Pendiente de pago', icono: Clock, descripcion: 'Esperando confirmación del pago' },
  { valor: 'Pagado', etiqueta: 'Pagado', icono: CreditCard, descripcion: 'Pago recibido, listo para preparar' },
  { valor: 'En_Preparacion', etiqueta: 'En preparación', icono: Package, descripcion: 'Empacando prendas en bodega' },
  { valor: 'Enviado', etiqueta: 'Enviado', icono: Truck, descripcion: 'En camino con la transportadora' },
  { valor: 'Entregado', etiqueta: 'Entregado', icono: CheckCircle2, descripcion: 'Entregado al cliente' }
];

const pedidoAbierto = ref(null);
const procesandoId = ref(null);
const guiaCopiadaId = ref(null);

// Formularios de despacho en línea por pedido
const formulariosDespacho = reactive({});

function obtenerFormularioDespacho(pedido) {
  if (!formulariosDespacho[pedido.id]) {
    formulariosDespacho[pedido.id] = {
      abierto: false,
      empresaTransportadora: pedido.empresaTransportadora || 'Servientrega',
      numeroGuia: pedido.numeroGuia || '',
      error: ''
    };
  }
  return formulariosDespacho[pedido.id];
}

function alternarFormularioDespacho(pedido, forzar = null) {
  const form = obtenerFormularioDespacho(pedido);
  form.abierto = forzar !== null ? forzar : !form.abierto;
  form.empresaTransportadora = pedido.empresaTransportadora || form.empresaTransportadora || 'Servientrega';
  form.numeroGuia = pedido.numeroGuia || form.numeroGuia || '';
  form.error = '';
}

function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = fechaDelServidor(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function totalPrendas(pedido) {
  return (pedido.detalles || []).reduce((acc, d) => acc + (d.cantidad || 0), 0);
}

function alternarSeguimiento(id) {
  pedidoAbierto.value = pedidoAbierto.value === id ? null : id;
}

function pasoActual(estado) {
  return FLUJO_PEDIDO.findIndex((p) => p.valor === estado);
}

async function copiarNumeroGuia(pedido) {
  if (!pedido.numeroGuia) return;
  try {
    await navigator.clipboard.writeText(pedido.numeroGuia);
    guiaCopiadaId.value = pedido.id;
    notificarExito(`Número de guía ${pedido.numeroGuia} copiado al portapapeles.`);
    setTimeout(() => {
      if (guiaCopiadaId.value === pedido.id) {
        guiaCopiadaId.value = null;
      }
    }, 2500);
  } catch {
    notificarError('No se pudo copiar automáticamente la guía.');
  }
}

/**
 * Avanza o cambia de estado rápidamente un pedido (ej. Pagado -> En_Preparacion -> Entregado)
 */
async function cambiarEstadoRapido(pedido, nuevoEstado) {
  const idxActual = pasoActual(pedido.estado);
  const idxNuevo = FLUJO_PEDIDO.findIndex((p) => p.valor === nuevoEstado);

  // Regla: no se puede retroceder una vez que ha pasado a una fase
  if (idxActual !== -1 && idxNuevo !== -1 && idxNuevo < idxActual) {
    notificarError(`No es posible retroceder el pedido a "${infoEstadoPedido(nuevoEstado).etiqueta}". El flujo ya avanzó a "${infoEstadoPedido(pedido.estado).etiqueta}".`);
    return;
  }

  // Si quiere mandarlo como enviado, abrimos el formulario de despacho para pedir la guía
  if (nuevoEstado === 'Enviado') {
    alternarFormularioDespacho(pedido, true);
    return;
  }

  if (nuevoEstado === 'Pagado' && pedido.estado === 'Pendiente_Pago') {
    const confirmar = await confirmarAccion({
      titulo: 'Marcar como Pagado',
      texto: `¿Confirmar que el pedido #${pedido.id} ya fue pagado? Se verificará el inventario y se emitirá la factura automáticamente.`,
      textoBotonConfirmar: 'Sí, marcar como Pagado'
    });
    if (!confirmar) return;
  } else if (nuevoEstado === 'Entregado') {
    const confirmar = await confirmarAccion({
      titulo: 'Confirmar Entrega',
      texto: `¿Confirmar que el pedido #${pedido.id} fue recibido exitosamente por el cliente?`,
      textoBotonConfirmar: 'Sí, marcar Entregado'
    });
    if (!confirmar) return;
  } else if (nuevoEstado === 'Cancelado') {
    const confirmar = await confirmarAccion({
      titulo: pedido.estado === 'Expirado' ? 'Declinar Pedido Expirado' : 'Cancelar / Declinar Pedido',
      texto: `¿Seguro que deseas ${pedido.estado === 'Expirado' ? 'declinar' : 'cancelar'} el pedido #${pedido.id}? Se liberará el stock reservado.`,
      textoBotonConfirmar: pedido.estado === 'Expirado' ? 'Sí, declinar pedido' : 'Sí, cancelar pedido'
    });
    if (!confirmar) return;
  }

  procesandoId.value = pedido.id;
  try {
    const actualizado = await actualizarDespacho(pedido.id, { estado: nuevoEstado });
    Object.assign(pedido, actualizado);
    notificarExito(`Pedido #${pedido.id} actualizado a "${infoEstadoPedido(nuevoEstado).etiqueta}".`);
    emit('pedido-actualizado', pedido);
  } catch (error) {
    notificarError(obtenerMensajeError(error, 'No se pudo actualizar el estado del pedido.'));
  } finally {
    procesandoId.value = null;
  }
}

/**
 * Guarda los datos de despacho (transportadora y guía) y marca el pedido como Enviado
 */
async function despacharYEnviar(pedido) {
  const form = obtenerFormularioDespacho(pedido);
  form.error = '';

  const empresa = String(form.empresaTransportadora || '').trim();
  const guia = String(form.numeroGuia || '').trim();

  if (!empresa) {
    form.error = 'Debes indicar la empresa transportadora para enviar el pedido.';
    return;
  }
  if (!guia) {
    form.error = 'Debes indicar el número de guía de rastreo.';
    return;
  }
  if (!/^[A-Za-z0-9-]{4,40}$/.test(guia)) {
    form.error = 'El número de guía solo admite letras, números y guiones (4 a 40 caracteres).';
    return;
  }

  procesandoId.value = pedido.id;
  try {
    const actualizado = await actualizarDespacho(pedido.id, {
      estado: 'Enviado',
      empresaTransportadora: empresa,
      numeroGuia: guia
    });

    Object.assign(pedido, actualizado);
    form.abierto = false;
    notificarExito(`¡Pedido #${pedido.id} despachado con éxito! Guía: ${guia} (${empresa}).`);
    emit('pedido-actualizado', pedido);
  } catch (error) {
    const msg = obtenerMensajeError(error, 'No se pudo despachar el pedido.');
    form.error = msg;
    notificarError(msg);
  } finally {
    procesandoId.value = null;
  }
}

/**
 * Click en un paso del stepper de la barra de seguimiento
 */
function alHacerClicPaso(pedido, paso) {
  if (procesandoId.value === pedido.id) return;
  if (paso.valor === pedido.estado) return;

  const idxActual = pasoActual(pedido.estado);
  const idxNuevo = FLUJO_PEDIDO.findIndex((p) => p.valor === paso.valor);

  // Regla: no se puede retroceder a una fase anterior
  if (idxActual !== -1 && idxNuevo !== -1 && idxNuevo < idxActual) {
    notificarError(`No puedes retroceder a "${paso.etiqueta}". El pedido ya avanzó a "${infoEstadoPedido(pedido.estado).etiqueta}".`);
    return;
  }

  if (paso.valor === 'Enviado') {
    alternarFormularioDespacho(pedido, true);
  } else {
    cambiarEstadoRapido(pedido, paso.valor);
  }
}
</script>

<template>
  <section class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
    <!-- Filtro rápido por estado -->
    <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
      <button
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition"
        :class="filtroEstado === '' ? 'border-corporativo-rosa bg-corporativo-rosa text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-corporativo-rosa hover:text-corporativo-rosa'"
        @click="emit('cambiar-filtro', '')"
      >
        Todos
      </button>
      <button
        v-for="estado in ESTADOS_PEDIDO"
        :key="estado.valor"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition"
        :class="filtroEstado === estado.valor ? 'border-corporativo-rosa bg-corporativo-rosa text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-corporativo-rosa hover:text-corporativo-rosa'"
        @click="emit('cambiar-filtro', estado.valor)"
      >
        {{ estado.etiqueta }}
      </button>
    </div>

    <div v-if="cargando" class="flex flex-col items-center justify-center py-16 text-gray-500">
      <Loader2 class="h-8 w-8 animate-spin text-corporativo-rosa" />
      <p class="mt-3 text-sm">Cargando pedidos...</p>
    </div>

    <div v-else-if="!pedidos.length" class="flex flex-col items-center justify-center py-16 text-center">
      <PackageSearch class="h-12 w-12 text-gray-300" />
      <p class="mt-3 font-semibold text-gray-700">No hay pedidos para mostrar.</p>
      <p class="mt-1 text-xs text-gray-500">Prueba con otro estado o término de búsqueda.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
            <th class="px-5 py-3 font-semibold">Pedido</th>
            <th class="px-5 py-3 font-semibold">Cliente / Destino</th>
            <th class="px-5 py-3 font-semibold text-right">Total</th>
            <th class="px-5 py-3 font-semibold">Estado</th>
            <th class="px-5 py-3 font-semibold">Despacho</th>
            <th class="px-5 py-3 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <template v-for="pedido in pedidos" :key="pedido.id">
            <tr class="transition hover:bg-gray-50/80">
              <td class="px-5 py-3.5">
                <p class="font-bold text-gray-900">#{{ pedido.id }}</p>
                <p class="font-mono text-[11px] text-gray-500">{{ pedido.referencia }}</p>
                <p class="mt-0.5 text-[11px] text-gray-400">{{ formatearFecha(pedido.fecha) }}</p>
              </td>

              <td class="px-5 py-3.5">
                <p class="font-medium text-gray-900">{{ pedido.cliente.nombre }}</p>
                <p v-if="pedido.cliente.correo" class="text-xs text-gray-500">{{ pedido.cliente.correo }}</p>
                <p v-if="pedido.ciudad" class="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin class="h-3 w-3 shrink-0 text-gray-400" /> {{ pedido.ciudad }}<span v-if="pedido.departamento">, {{ pedido.departamento }}</span>
                </p>
              </td>

              <td class="px-5 py-3.5 text-right">
                <p class="font-bold text-gray-900">{{ formatearCOP(pedido.total) }}</p>
                <p v-if="pedido.detalles?.length" class="text-[11px] text-gray-500">{{ totalPrendas(pedido) }} prenda(s)</p>
              </td>

              <td class="px-5 py-3.5">
                <span
                  class="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-xs"
                  :class="infoEstadoPedido(pedido.estado).clases"
                >
                  {{ infoEstadoPedido(pedido.estado).etiqueta }}
                </span>
              </td>

              <td class="px-5 py-3.5">
                <template v-if="pedido.numeroGuia">
                  <div class="flex items-center gap-1.5">
                    <Truck class="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <div>
                      <p class="text-xs font-semibold text-gray-800">{{ pedido.empresaTransportadora || 'Transportadora' }}</p>
                      <p class="font-mono text-[11px] text-gray-500">{{ pedido.numeroGuia }}</p>
                    </div>
                  </div>
                </template>
                <span v-else class="text-xs text-gray-400 italic">Sin guía asignada</span>
              </td>

              <td class="px-5 py-3.5">
                <div class="flex justify-end items-center gap-2">
                  <!-- Gestionar Despacho Modal -->
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800"
                    title="Configurar despacho completo"
                    @click="emit('gestionar', pedido)"
                  >
                    <Truck class="h-3.5 w-3.5" /> Despacho
                  </button>

                  <!-- Toggle Barra de Seguimiento Interactivo -->
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition"
                    :class="pedidoAbierto === pedido.id
                      ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-corporativo-rosa hover:text-corporativo-rosa'"
                    :aria-expanded="pedidoAbierto === pedido.id"
                    :aria-label="pedidoAbierto === pedido.id ? 'Ocultar seguimiento' : 'Ver seguimiento interactivo del pedido'"
                    @click="alternarSeguimiento(pedido.id)"
                  >
                    <Eye class="h-3.5 w-3.5" /> Seguimiento
                    <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': pedidoAbierto === pedido.id }" />
                  </button>

                  <!-- Ver Factura automática -->
                  <button
                    v-if="pedido.facturaId"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-bold text-corporativo-rosa shadow-sm transition hover:bg-pink-100"
                    title="Ver factura automática y comprobante PDF"
                    @click="emit('ver-factura', pedido)"
                  >
                    <Eye class="h-3.5 w-3.5" /> Factura
                  </button>

                  <!-- Declinar rápido desde la fila (Pendiente_Pago o Expirado) -->
                  <button
                    v-if="['Pendiente_Pago', 'Expirado'].includes(pedido.estado)"
                    type="button"
                    :disabled="procesandoId === pedido.id"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
                    title="Declinar y cancelar el pedido; libera el stock"
                    @click="cambiarEstadoRapido(pedido, 'Cancelado')"
                  >
                    <X class="h-3.5 w-3.5" /> Declinar
                  </button>
                </div>
              </td>
            </tr>

            <!-- FILA EXPANDIBLE: SEGUIMIENTO INTERACTIVO Y DESPACHO MANUAL -->
            <tr v-if="pedidoAbierto === pedido.id" :key="`${pedido.id}-seguimiento`" class="bg-gray-50/90 border-t border-b border-pink-100">
              <td colspan="6" class="px-5 py-6">
                <div class="mx-auto max-w-5xl space-y-5">
                  <!-- Cabecera de la sección de seguimiento -->
                  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <div class="flex items-center gap-2.5">
                      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-corporativo-rosa">
                        <Truck class="h-5 w-5" />
                      </div>
                      <div>
                        <h3 class="text-sm font-extrabold text-gray-900">
                          Seguimiento en Vivo del Pedido #{{ pedido.id }}
                        </h3>
                        <p class="text-xs text-gray-500">
                          Puedes hacer clic en los pasos de la barra o usar los botones para despachar y mandar el pedido manualmente.
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="rounded-full border px-3 py-1 text-xs font-bold" :class="infoEstadoPedido(pedido.estado).clases">
                        Estado actual: {{ infoEstadoPedido(pedido.estado).etiqueta }}
                      </span>
                    </div>
                  </div>

                  <!-- Caso Especial: Pedido Cancelado, Expirado o Rechazado -->
                  <div
                    v-if="ESTADOS_SIN_FLUJO.includes(pedido.estado)"
                    class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
                  >
                    <AlertTriangle class="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p class="font-bold">
                        Este pedido se encuentra en estado: {{ infoEstadoPedido(pedido.estado).etiqueta }}
                      </p>
                      <p class="text-xs text-red-700 mt-0.5">
                        No se encuentra en la ruta activa de despacho. Si fue cancelado o expirado, las prendas reservadas volvieron a estar disponibles en el inventario.
                      </p>
                    </div>
                  </div>

                  <!-- BARRA DE SEGUIMIENTO INTERACTIVA (STEPPER TIMELINE) -->
                  <div v-else class="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                    <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                      Ruta de Despacho y Entrega
                    </p>

                    <div class="relative">
                      <!-- Línea de conexión de fondo -->
                      <div class="absolute left-6 right-6 top-5 hidden -translate-y-1/2 sm:block h-1 bg-gray-200">
                        <!-- Progreso coloreado -->
                        <div
                          class="h-full bg-corporativo-rosa transition-all duration-500"
                          :style="{ width: `${Math.max(0, Math.min(100, (pasoActual(pedido.estado) / (FLUJO_PEDIDO.length - 1)) * 100))}%` }"
                        ></div>
                      </div>

                      <!-- Pasos interactivos -->
                      <ol class="grid grid-cols-1 gap-y-4 sm:grid-cols-5 sm:gap-x-2 relative z-10">
                        <li
                          v-for="(paso, index) in FLUJO_PEDIDO"
                          :key="paso.valor"
                          class="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 group cursor-pointer"
                          @click="alHacerClicPaso(pedido, paso)"
                        >
                          <!-- Nodo / Botón del paso -->
                          <button
                            type="button"
                            :disabled="procesandoId === pedido.id || index < pasoActual(pedido.estado)"
                            class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 focus:outline-none"
                            :class="[
                              index < pasoActual(pedido.estado)
                                ? 'border-corporativo-rosa bg-corporativo-rosa text-white shadow-sm cursor-default'
                                : index === pasoActual(pedido.estado)
                                  ? 'border-corporativo-rosa bg-white text-corporativo-rosa ring-4 ring-pink-100 font-bold scale-110 shadow-md cursor-default'
                                  : 'border-gray-300 bg-white text-gray-400 hover:border-corporativo-rosa hover:text-corporativo-rosa cursor-pointer'
                            ]"
                            :title="index < pasoActual(pedido.estado)
                              ? `Fase superada (${paso.etiqueta}). No se puede retroceder.`
                              : index === pasoActual(pedido.estado)
                                ? `Fase actual: ${paso.etiqueta}`
                                : `Avanzar a: ${paso.etiqueta}`"
                          >
                            <Loader2 v-if="procesandoId === pedido.id && paso.valor === pedido.estado" class="h-4 w-4 animate-spin text-corporativo-rosa" />
                            <Check v-else-if="index < pasoActual(pedido.estado)" class="h-5 w-5 stroke-[2.5]" />
                            <component :is="paso.icono" v-else class="h-4 w-4" />
                          </button>

                          <!-- Texto y descripción del paso -->
                          <div class="sm:max-w-[130px]">
                            <p
                              class="text-xs font-bold leading-tight transition"
                              :class="[
                                index <= pasoActual(pedido.estado) ? 'text-gray-900' : 'text-gray-400',
                                index === pasoActual(pedido.estado) ? 'text-corporativo-rosa' : ''
                              ]"
                            >
                              {{ paso.etiqueta }}
                            </p>
                            <span class="text-[10px] hidden md:block text-gray-400 mt-0.5">
                              {{ paso.descripcion }}
                            </span>
                          </div>
                        </li>
                      </ol>
                    </div>

                    <!-- Panel contextual de acciones rápidas para "mandar el pedido manualmente" -->
                    <div class="mt-6 border-t border-gray-100 pt-4 flex flex-wrap items-center justify-between gap-3">
                      <!-- Estado contextual / Sugerencia -->
                      <div class="text-xs text-gray-600">
                        <template v-if="pedido.estado === 'Pendiente_Pago'">
                          <span class="font-bold text-amber-700">Esperando pago:</span> El cliente aún no confirma la transacción en línea.
                        </template>
                        <template v-else-if="pedido.estado === 'Pagado'">
                          <span class="font-bold text-emerald-700">Pago confirmado:</span> Empaca las prendas y pasa el pedido a preparación.
                        </template>
                        <template v-else-if="pedido.estado === 'En_Preparacion'">
                          <span class="font-bold text-blue-700">Listo en bodega:</span> Procede a mandar el pedido ingresando los datos de la transportadora.
                        </template>
                        <template v-else-if="pedido.estado === 'Enviado'">
                          <span class="font-bold text-indigo-700">En tránsito:</span> El paquete está en ruta. Marca como entregado cuando llegue al destino.
                        </template>
                        <template v-else-if="pedido.estado === 'Entregado'">
                          <span class="font-bold text-emerald-700">Completado:</span> El pedido fue entregado satisfactoriamente al cliente.
                        </template>
                      </div>

                      <!-- Botones de acción rápida -->
                      <div class="flex flex-wrap items-center gap-2">
                        <!-- Marcar como Pagado manualmente si estaba en Pendiente -->
                        <button
                          v-if="pedido.estado === 'Pendiente_Pago'"
                          type="button"
                          :disabled="procesandoId === pedido.id"
                          class="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          @click="cambiarEstadoRapido(pedido, 'Pagado')"
                        >
                          <CreditCard class="h-3.5 w-3.5" /> Marcar como Pagado
                        </button>

                        <!-- Iniciar Preparación si estaba en Pagado -->
                        <button
                          v-if="pedido.estado === 'Pagado'"
                          type="button"
                          :disabled="procesandoId === pedido.id"
                          class="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                          @click="cambiarEstadoRapido(pedido, 'En_Preparacion')"
                        >
                          <Package class="h-3.5 w-3.5" /> Iniciar Preparación
                        </button>

                        <!-- BOTÓN CLAVE: Mandar / Despachar Pedido Manualmente -->
                        <button
                          v-if="['Pagado', 'En_Preparacion'].includes(pedido.estado)"
                          type="button"
                          :disabled="procesandoId === pedido.id"
                          class="inline-flex items-center gap-1.5 rounded-xl bg-corporativo-rosa px-4 py-1.5 text-xs font-extrabold text-white shadow-md transition hover:bg-pink-700 disabled:opacity-50"
                          @click="alternarFormularioDespacho(pedido)"
                        >
                          <Send class="h-3.5 w-3.5" />
                          {{ obtenerFormularioDespacho(pedido).abierto ? 'Cerrar formulario de envío' : '🚚 Mandar Pedido (Despachar)' }}
                        </button>

                        <!-- Marcar como Entregado si ya está enviado -->
                        <button
                          v-if="pedido.estado === 'Enviado'"
                          type="button"
                          :disabled="procesandoId === pedido.id"
                          class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                          @click="cambiarEstadoRapido(pedido, 'Entregado')"
                        >
                          <CheckCircle2 class="h-3.5 w-3.5" /> Marcar como Entregado
                        </button>

                        <!-- Modificar Guía si ya fue enviado o entregado -->
                        <button
                          v-if="['Enviado', 'Entregado'].includes(pedido.estado)"
                          type="button"
                          class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-corporativo-rosa hover:text-corporativo-rosa"
                          @click="alternarFormularioDespacho(pedido)"
                        >
                          <Edit2 class="h-3.5 w-3.5" /> Modificar Guía / Empresa
                        </button>

                        <!-- DECLINAR / CANCELAR — disponible para Pendiente_Pago y Expirado -->
                        <button
                          v-if="['Pendiente_Pago', 'Expirado'].includes(pedido.estado)"
                          type="button"
                          :disabled="procesandoId === pedido.id"
                          class="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          title="Declinar y cancelar el pedido; libera el stock reservado"
                          @click="cambiarEstadoRapido(pedido, 'Cancelado')"
                        >
                          <X class="h-3.5 w-3.5" /> Declinar pedido
                        </button>
                      </div>
                    </div>

                    <!-- FORMULARIO EN LÍNEA: MANDAR PEDIDO MANUALMENTE (Transportadora y Guía) -->
                    <div
                      v-if="obtenerFormularioDespacho(pedido).abierto"
                      class="mt-4 rounded-xl border border-pink-200 bg-pink-50/50 p-4 transition-all"
                    >
                      <div class="flex items-center justify-between border-b border-pink-100 pb-2.5 mb-3">
                        <div class="flex items-center gap-2">
                          <Truck class="h-4 w-4 text-corporativo-rosa" />
                          <h4 class="text-xs font-bold uppercase tracking-wider text-gray-800">
                            Despachar y Mandar Pedido #{{ pedido.id }}
                          </h4>
                        </div>
                        <button
                          type="button"
                          class="rounded-lg p-1 text-gray-400 hover:bg-pink-100 hover:text-gray-700"
                          @click="alternarFormularioDespacho(pedido, false)"
                        >
                          <X class="h-4 w-4" />
                        </button>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label class="block text-xs font-bold text-gray-700 mb-1">
                            Empresa Transportadora <span class="text-corporativo-rosa">*</span>
                          </label>
                          <input
                            v-model="obtenerFormularioDespacho(pedido).empresaTransportadora"
                            type="text"
                            list="transportadoras-admin-datalist"
                            placeholder="Ej. Servientrega, Coordinadora..."
                            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
                          />
                          <datalist id="transportadoras-admin-datalist">
                            <option v-for="t in TRANSPORTADORAS_SUGERIDAS" :key="t" :value="t" />
                          </datalist>
                        </div>

                        <div>
                          <label class="block text-xs font-bold text-gray-700 mb-1">
                            Número de Guía de Rastreo <span class="text-corporativo-rosa">*</span>
                          </label>
                          <input
                            v-model="obtenerFormularioDespacho(pedido).numeroGuia"
                            type="text"
                            placeholder="Ej. 2049182390"
                            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs font-medium focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
                            @keyup.enter="despacharYEnviar(pedido)"
                          />
                        </div>
                      </div>

                      <p v-if="obtenerFormularioDespacho(pedido).error" class="mt-2 text-xs font-semibold text-red-600">
                        {{ obtenerFormularioDespacho(pedido).error }}
                      </p>

                      <div class="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                          @click="alternarFormularioDespacho(pedido, false)"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          :disabled="procesandoId === pedido.id"
                          class="inline-flex items-center gap-1.5 rounded-lg bg-corporativo-rosa px-4 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-pink-700 disabled:opacity-50"
                          @click="despacharYEnviar(pedido)"
                        >
                          <Loader2 v-if="procesandoId === pedido.id" class="h-3.5 w-3.5 animate-spin" />
                          <Send v-else class="h-3.5 w-3.5" />
                          Confirmar y Mandar Pedido
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- DETALLES ADICIONALES: DIRECCIÓN Y PRENDAS DEL PEDIDO -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Destino y datos de contacto -->
                    <div class="rounded-xl border border-gray-200 bg-white p-4 text-xs space-y-2">
                      <p class="font-bold uppercase tracking-wider text-gray-400">Datos de Entrega y Envío</p>
                      <div class="text-gray-700 space-y-1">
                        <p class="font-semibold text-gray-900 text-sm">{{ pedido.cliente.nombre }}</p>
                        <p class="flex items-center gap-1.5">
                          <MapPin class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>{{ pedido.direccion || 'Sin dirección registrada' }}<span v-if="pedido.ciudad">, {{ pedido.ciudad }}</span><span v-if="pedido.departamento"> ({{ pedido.departamento }})</span></span>
                        </p>
                        <p v-if="pedido.telefono" class="text-gray-500">Tel: {{ pedido.telefono }}</p>
                        <p v-if="pedido.notas" class="italic text-gray-500 bg-gray-50 p-2 rounded-lg mt-1">"{{ pedido.notas }}"</p>
                      </div>

                      <!-- Información de transportadora si existe -->
                      <div v-if="pedido.empresaTransportadora || pedido.numeroGuia" class="mt-3 border-t border-gray-100 pt-2 flex items-center justify-between bg-gray-50 p-2.5 rounded-lg">
                        <div class="flex items-center gap-2">
                          <Truck class="h-4 w-4 text-corporativo-rosa" />
                          <div>
                            <p class="font-bold text-gray-800">{{ pedido.empresaTransportadora || 'Transportadora asignada' }}</p>
                            <p class="font-mono text-[11px] text-gray-500">Guía: {{ pedido.numeroGuia }}</p>
                          </div>
                        </div>
                        <button
                          v-if="pedido.numeroGuia"
                          type="button"
                          class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-corporativo-rosa"
                          title="Copiar número de guía"
                          @click="copiarNumeroGuia(pedido)"
                        >
                          <Copy class="h-3 w-3" />
                          {{ guiaCopiadaId === pedido.id ? '¡Copiado!' : 'Copiar' }}
                        </button>
                      </div>
                    </div>

                    <!-- Resumen de prendas y total -->
                    <div class="rounded-xl border border-gray-200 bg-white p-4 text-xs space-y-2">
                      <div class="flex justify-between items-center">
                        <p class="font-bold uppercase tracking-wider text-gray-400">Prendas en el Pedido</p>
                        <span class="text-[11px] text-gray-500">{{ totalPrendas(pedido) }} prenda(s)</span>
                      </div>

                      <ul v-if="pedido.detalles?.length" class="max-h-36 overflow-y-auto divide-y divide-gray-100 pr-1">
                        <li v-for="d in pedido.detalles" :key="d.id" class="py-1.5 flex items-center justify-between gap-2">
                          <div class="flex items-center gap-2 min-w-0">
                            <img
                              v-if="d.imagen"
                              :src="d.imagen"
                              :alt="d.nombre"
                              class="h-8 w-8 rounded-md bg-gray-100 object-cover shrink-0"
                            />
                            <div class="min-w-0 truncate">
                              <p class="font-medium text-gray-800 truncate">{{ d.nombre }}</p>
                              <p class="text-[10px] text-gray-400">Talla {{ d.talla || 'Única' }} · Cantidad: {{ d.cantidad }}</p>
                            </div>
                          </div>
                          <span class="font-bold text-gray-900 shrink-0">{{ formatearCOP(d.subtotal) }}</span>
                        </li>
                      </ul>
                      <p v-else class="text-gray-400 italic py-2">Sin detalles de prendas cargados.</p>

                      <div class="border-t border-gray-100 pt-2 flex justify-between items-center text-sm">
                        <span class="font-bold text-gray-700">Total a Pagar</span>
                        <span class="font-extrabold text-corporativo-rosa text-base">{{ formatearCOP(pedido.total) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <slot name="pie" />
  </section>
</template>
