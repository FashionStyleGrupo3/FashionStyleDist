<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { Search, RefreshCw, Play, Pause, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Pencil, Trash2, Loader2 } from 'lucide-vue-next';
import ModalBase from '@/components/comunes/ModalBase.vue';
import clienteApi from '@/services/clienteApi';
import { ordenesProduccionApi, mensajeError } from '@/services/Produccionservicio';
import { useNotificacion } from '@/composables/useNotificacion';

const { notificarExito, notificarError, confirmarAccion } = useNotificacion();

const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'planificada', etiqueta: 'Planificada' },
  { valor: 'en_proceso', etiqueta: 'En proceso' },
  { valor: 'pausada', etiqueta: 'Pausada' },
  { valor: 'completada', etiqueta: 'Completada' },
  { valor: 'cancelada', etiqueta: 'Cancelada' },
];

const ESTILO_ESTADO = {
  planificada: 'bg-amber-50 text-amber-700 border-amber-200',
  en_proceso: 'bg-blue-50 text-blue-700 border-blue-200',
  pausada: 'bg-orange-50 text-orange-700 border-orange-200',
  completada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200',
};

const ordenes = ref([]);
const cargando = ref(false);
const procesandoId = ref(null);
const busqueda = ref('');
const filtroEstado = ref('');
const pagina = ref(1);
const ultimaPagina = ref(1);
const total = ref(0);

const ordenesFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return ordenes.value;
  return ordenes.value.filter((o) =>
    [o.numero, nombrePrenda(o), o.notas].some((campo) => String(campo ?? '').toLowerCase().includes(q)),
  );
});

function nombrePrenda(orden) {
  return orden.formula?.producto?.nombre ?? 'Sin prenda asociada';
}

function etiquetaEstado(estado) {
  return ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado;
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    Number(valor || 0),
  );
}

function formatoFecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

async function cargar() {
  cargando.value = true;
  try {
    const respuesta = await clienteApi.get('/ordenes-produccion', {
      params: { page: pagina.value, ...(filtroEstado.value ? { estado: filtroEstado.value } : {}) },
    });
    const paginador = respuesta.data?.data ?? respuesta.data;
    ordenes.value = Array.isArray(paginador) ? paginador : (paginador?.data ?? []);
    ultimaPagina.value = paginador?.last_page ?? 1;
    total.value = paginador?.total ?? ordenes.value.length;
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudieron cargar las rdenes de produccion.'));
  } finally {
    cargando.value = false;
  }
}

function cambiarFiltro(valor) {
  filtroEstado.value = valor;
  pagina.value = 1;
  cargar();
}

function irAPagina(n) {
  if (n < 1 || n > ultimaPagina.value) return;
  pagina.value = n;
  cargar();
}

async function cambiarEstado(orden, nuevoEstado) {
  if (nuevoEstado === 'completada') {
    const ok = await confirmarAccion({
      titulo: `Completar ${orden.numero}?`,
      texto: 'Se descontaron del inventario las materias primas que consume esta orden.',
      textoBotonConfirmar: 'S, completar',
    });
    if (!ok) return;
  }
  if (nuevoEstado === 'cancelada') {
    const ok = await confirmarAccion({
      titulo: `Cancelar ${orden.numero}?`,
      texto: 'La orden quedar como cancelada.',
      textoBotonConfirmar: 'S, cancelar',
    });
    if (!ok) return;
  }
  if (nuevoEstado === 'pausada') {
    const ok = await confirmarAccion({
      titulo: `Pausar ${orden.numero}?`,
      texto: 'La orden quedar pausada y podrís reanudarla despuís. No se descontaron materias primas.',
      textoBotonConfirmar: 'S, pausar orden',
    });
    if (!ok) return;
  }

  procesandoId.value = orden.id;
  try {
    await ordenesProduccionApi.actualizar(orden.id, { estado: nuevoEstado });
    notificarExito(`${orden.numero} ahora está ${etiquetaEstado(nuevoEstado).toLowerCase()}.`);
    await cargar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo actualizar la orden.'));
  } finally {
    procesandoId.value = null;
  }
}

// ---------- Edicion ----------
const editando = ref(null); // orden en edicion
const formEdicion = ref({ cantidad: 1, notas: '' });
const guardandoEdicion = ref(false);

function abrirEdicion(orden) {
  editando.value = orden;
  formEdicion.value = { cantidad: Number(orden.cantidad) || 1, notas: orden.notas ?? '' };
}

function cerrarEdicion() {
  if (guardandoEdicion.value) return;
  editando.value = null;
}

async function guardarEdicion() {
  const orden = editando.value;
  if (!orden) return;

  const cantidad = Math.floor(Number(formEdicion.value.cantidad));
  if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 100000) {
    notificarError('La cantidad debe estar entre 1 y 100.000.');
    return;
  }

  const payload = { notas: formEdicion.value.notas?.trim() || null };

  if (cantidad !== Number(orden.cantidad)) {
    payload.cantidad = cantidad;
    const costoPorUnidad = Number(orden.costo_total || 0) / (Number(orden.cantidad) || 1);
    payload.costo_total = Math.round(costoPorUnidad * cantidad * 100) / 100;
  }

  guardandoEdicion.value = true;
  try {
    await ordenesProduccionApi.actualizar(orden.id, payload);
    notificarExito(`${orden.numero} actualizada.`);
    editando.value = null;
    await cargar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo actualizar la orden.'));
  } finally {
    guardandoEdicion.value = false;
  }
}

// ---------- eliminacion ----------
async function eliminar(orden) {
  const ok = await confirmarAccion({
    titulo: `Éliminar ${orden.numero}?`,
    texto: 'Esta accion no se puede deshacer.',
    textoBotonConfirmar: 'S, eliminar',
  });
  if (!ok) return;

  procesandoId.value = orden.id;
  try {
    await clienteApi.delete(`/ordenes-produccion/${orden.id}`);
    notificarExito(`${orden.numero} eliminada.`);
    
    if (ordenes.value.length === 1 && pagina.value > 1) pagina.value -= 1;
    await cargar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo eliminar la orden.'));
  } finally {
    procesandoId.value = null;
  }
}


onMounted(cargar);
useRecargaAutomatica(cargar);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative w-full lg:max-w-xs">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="busqueda"
          type="text"
          maxlength="100"
          placeholder="Buscar por número o prenda..."
          class="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40 focus:border-corporativo-rosa"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="e in ESTADOS"
          :key="e.valor"
          class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
          :class="
            filtroEstado === e.valor
              ? 'border-corporativo-rosa bg-corporativo-rosa text-white'
              : 'border-gray-300 text-gray-600 hover:border-gray-400'
          "
          @click="cambiarFiltro(e.valor)"
        >
          {{ e.etiqueta }}
        </button>
        <button
          class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          :disabled="cargando"
          @click="cargar"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': cargando }" /> Actualizar
        </button>
      </div>
    </div>

    <div class="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-3">Orden</th>
              <th class="px-4 py-3">Prenda</th>
              <th class="px-4 py-3 text-right">Unidades</th>
              <th class="px-4 py-3 text-right">Costo total</th>
              <th class="px-4 py-3">Creada</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="cargando && !ordenes.length">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">Cargando...</td>
            </tr>
            <tr v-else-if="!ordenesFiltradas.length">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                No hay rdenes de produccion para mostrar.
              </td>
            </tr>
            <tr v-for="o in ordenesFiltradas" :key="o.id">
              <td class="px-4 py-3 font-semibold text-gray-900">{{ o.numero }}</td>
              <td class="px-4 py-3 text-gray-700">
                {{ nombrePrenda(o) }}
                <p v-if="o.notas" class="max-w-xs truncate text-xs text-gray-400" :title="o.notas">{{ o.notas }}</p>
              </td>
              <td class="px-4 py-3 text-right text-gray-700">{{ o.cantidad }}</td>
              <td class="px-4 py-3 text-right text-gray-700">{{ formatoMoneda(o.costo_total) }}</td>
              <td class="px-4 py-3 text-gray-500">{{ formatoFecha(o.created_at) }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  :class="ESTILO_ESTADO[o.estado]"
                >
                  {{ etiquetaEstado(o.estado) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    v-if="o.estado === 'planificada'"
                    class="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-40"
                    title="Iniciar produccion"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'en_proceso')"
                  >
                    <Play class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado === 'en_proceso'"
                    class="p-2 text-gray-500 hover:text-orange-600 disabled:opacity-40"
                    title="Pausar produccion"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'pausada')"
                  >
                    <Pause class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado === 'pausada'"
                    class="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-40"
                    title="Reanudar produccion"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'en_proceso')"
                  >
                    <Play class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado === 'planificada' || o.estado === 'en_proceso'"
                    class="p-2 text-gray-500 hover:text-emerald-600 disabled:opacity-40"
                    title="Marcar como completada"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'completada')"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado !== 'cancelada'"
                    class="p-2 text-gray-500 hover:text-red-600 disabled:opacity-40"
                    title="Cancelar orden"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'cancelada')"
                  >
                    <XCircle class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado !== 'completada'"
                    class="p-2 text-gray-500 hover:text-corporativo-rosa disabled:opacity-40"
                    title="Editar orden"
                    :disabled="procesandoId === o.id"
                    @click="abrirEdicion(o)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado !== 'completada'"
                    class="p-2 text-gray-500 hover:text-red-600 disabled:opacity-40"
                    title="Eliminar orden"
                    :disabled="procesandoId === o.id"
                    @click="eliminar(o)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="ultimaPagina > 1"
        class="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500"
      >
        <span>{{ total }} rdenes · página {{ pagina }} de {{ ultimaPagina }}</span>
        <div class="flex gap-1">
          <button
            class="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 disabled:opacity-40"
            :disabled="pagina <= 1 || cargando"
            @click="irAPagina(pagina - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            class="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 disabled:opacity-40"
            :disabled="pagina >= ultimaPagina || cargando"
            @click="irAPagina(pagina + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    <ModalBase :abierto="!!editando" :titulo="`Editar ${editando?.numero ?? ''}`" @cerrar="cerrarEdicion">
      <div v-if="editando" class="p-6">
        <h2 class="text-xl font-extrabold text-gray-900">Editar {{ editando.numero }}</h2>
        <p class="mt-1 text-sm text-gray-500">{{ nombrePrenda(editando) }}</p>

        <div class="mt-5 space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Unidades a producir</label>
            <input
              v-model.number="formEdicion.cantidad"
              type="number"
              min="1"
              max="100000"
              step="1"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
            <p class="mt-1 text-xs text-gray-400">El costo total se reajusta segun las unidades.</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Notas</label>
            <textarea
              v-model="formEdicion.notas"
              rows="3"
              maxlength="1000"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            ></textarea>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            :disabled="guardandoEdicion"
            @click="cerrarEdicion"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50"
            :disabled="guardandoEdicion"
            @click="guardarEdicion"
          >
            <Loader2 v-if="guardandoEdicion" class="h-4 w-4 animate-spin" />
            {{ guardandoEdicion ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </ModalBase>
  </div>
</template>