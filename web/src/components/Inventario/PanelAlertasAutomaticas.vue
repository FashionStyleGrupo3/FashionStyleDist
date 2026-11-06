<script setup>
// RF-070: alertas que el backend genera solo tras cada movimiento (venta,
// confección, ajuste) y umbrales configurables por tipo de ítem.
import { computed, onMounted, ref } from 'vue';
import { BellRing, CheckCircle2, Loader2, RefreshCw, Settings2 } from 'lucide-vue-next';
import clienteApi from '@/services/clienteApi';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { useNotificacion } from '@/composables/useNotificacion';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { bloquearNoEnteros, entero, sinEspacios } from '@/utils/restriccionesCampos';

const emit = defineEmits(['conteo']);
const authStore = useAutenticacionStore();
const { notificarExito, notificarError } = useNotificacion();

const alertas = ref([]);
const resumen = ref({});
const estado = ref('PENDIENTE');
const nivel = ref('');
const cargando = ref(false);
const procesandoId = ref(null);
const evaluando = ref(false);

const configuraciones = ref([]);
const mostrarConfig = ref(false);
const guardandoConfigId = ref(null);

const ESTILO_NIVEL = {
  AGOTADO: 'bg-red-50 text-red-700 border-red-200',
  CRITICO: 'bg-amber-50 text-amber-800 border-amber-200',
  BAJO: 'bg-tienda-arena-suave text-tienda-pizarra border-tienda-borde',
};

const ETIQUETA_TIPO = { PRODUCTO: 'Prendas', MATERIA_PRIMA: 'Materias primas', GLOBAL: 'General' };

const totalPendientes = computed(() => Object.values(resumen.value).reduce((a, b) => a + Number(b || 0), 0));

function nombreItem(alerta) {
  if (alerta.tipo_item === 'MATERIA_PRIMA') return alerta.materia_prima?.nombre || 'Materia prima';
  const producto = alerta.producto?.nombre || alerta.variante?.producto?.nombre || 'Prenda';
  return `${producto}${alerta.variante?.talla ? ` · talla ${alerta.variante.talla}` : ''}`;
}

function fecha(valor) {
  return valor ? new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

async function cargar({ silencioso = false } = {}) {
  if (!silencioso) cargando.value = true;
  try {
    const { data } = await clienteApi.get('/alertas-stock', {
      params: { estado: estado.value || 'todas', nivel: nivel.value || undefined, per_page: 50 },
    });
    alertas.value = data?.data?.data ?? [];
    resumen.value = data?.meta?.resumen ?? {};
    emit('conteo', totalPendientes.value);
  } catch (error) {
    if (!silencioso) notificarError(error.response?.data?.message || 'No se pudieron cargar las alertas automáticas.');
  } finally {
    if (!silencioso) cargando.value = false;
  }
}

async function resolver(alerta) {
  procesandoId.value = alerta.id;
  try {
    await clienteApi.patch(`/alertas-stock/${alerta.id}/resolver`, { observaciones: 'Gestionada desde el panel de inventario.' });
    notificarExito('Alerta marcada como gestionada.');
    await cargar();
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudo actualizar la alerta.');
  } finally {
    procesandoId.value = null;
  }
}

async function evaluar() {
  evaluando.value = true;
  try {
    await clienteApi.post('/alertas-stock/evaluar');
    await cargar();
    notificarExito('Inventario revisado; alertas actualizadas.');
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudo revisar el inventario.');
  } finally {
    evaluando.value = false;
  }
}

async function cargarConfiguraciones() {
  try {
    const { data } = await clienteApi.get('/configuracion-alertas-stock');
    configuraciones.value = (data?.data ?? []).map((c) => ({ ...c }));
  } catch {
    configuraciones.value = [];
  }
}

async function guardarConfiguracion(config) {
  const minimo = Math.floor(Number(config.umbral_minimo_defecto));
  const critico = Math.floor(Number(config.umbral_critico_defecto));
  if (!(minimo >= 0) || !(critico >= 0) || critico > minimo) {
    notificarError('El umbral crítico debe ser menor o igual al mínimo.');
    return;
  }
  if (config.email_destinatario && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email_destinatario)) {
    notificarError('Ingresa un correo válido para el responsable.');
    return;
  }
  guardandoConfigId.value = config.id;
  try {
    await clienteApi.put(`/configuracion-alertas-stock/${config.id}`, {
      umbral_minimo_defecto: minimo,
      umbral_critico_defecto: critico,
      notificar_email: Boolean(config.notificar_email),
      email_destinatario: config.email_destinatario || null,
      frecuencia_notificacion: config.frecuencia_notificacion,
      activa: Boolean(config.activa),
    });
    notificarExito('Umbrales guardados; las alertas se recalcularon.');
    await Promise.all([cargarConfiguraciones(), cargar()]);
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudo guardar la configuración.');
  } finally {
    guardandoConfigId.value = null;
  }
}

onMounted(() => {
  cargar();
  cargarConfiguraciones();
});
useRecargaAutomatica(() => cargar({ silencioso: true }), { recursos: ['inventarios', 'ventas', 'pedidos', 'ordenes-produccion', 'materias-primas', 'alertas-stock'], intervaloSondeo: 60000 });
</script>

<template>
  <section class="rounded-2xl border border-tienda-borde bg-white shadow-sm">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
      <div class="flex items-center gap-2">
        <BellRing class="h-5 w-5 text-tienda-pizarra" />
        <div>
          <h2 class="text-base font-bold text-gray-900">Alertas automáticas de stock</h2>
          <p class="text-xs text-gray-500">Se generan solas tras cada venta, confección o ajuste y avisan por correo al responsable.</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span v-for="n in ['AGOTADO', 'CRITICO', 'BAJO']" :key="n" class="rounded-full border px-2.5 py-0.5 text-xs font-bold" :class="ESTILO_NIVEL[n]">
          {{ n }} {{ resumen[n] || 0 }}
        </span>
        <select v-model="estado" class="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" @change="cargar">
          <option value="PENDIENTE">Pendientes</option>
          <option value="RESUELTA">Resueltas</option>
          <option value="">Todas</option>
        </select>
        <select v-model="nivel" class="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" @change="cargar">
          <option value="">Todos los niveles</option>
          <option value="AGOTADO">Agotado</option>
          <option value="CRITICO">Crítico</option>
          <option value="BAJO">Bajo</option>
        </select>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50" :disabled="evaluando" @click="evaluar">
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': evaluando }" /> Revisar todo
        </button>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50" @click="mostrarConfig = !mostrarConfig">
          <Settings2 class="h-3.5 w-3.5" /> Umbrales
        </button>
      </div>
    </header>

    <div v-if="mostrarConfig" class="border-b border-gray-100 bg-tienda-crema p-4">
      <p class="mb-3 text-xs text-gray-600">
        Prioridad: configuración de un producto o material específico → categoría → tipo de ítem → general.
        El stock mínimo propio de cada materia prima siempre tiene prioridad.
      </p>
      <div class="grid gap-3 lg:grid-cols-3">
        <div v-for="config in configuraciones" :key="config.id" class="rounded-xl border border-tienda-borde bg-white p-3 text-xs">
          <p class="mb-2 font-bold text-gray-900">
            {{ config.producto?.nombre || config.materia_prima?.nombre || config.categoria?.nombre || ETIQUETA_TIPO[config.tipo_item] }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <label>Mínimo
              <input v-model.number="config.umbral_minimo_defecto" type="number" min="0" max="100000" step="1" inputmode="numeric" :disabled="!authStore.esAdmin" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5" @keydown="bloquearNoEnteros" @input="config.umbral_minimo_defecto = entero(config.umbral_minimo_defecto)" />
            </label>
            <label>Crítico
              <input v-model.number="config.umbral_critico_defecto" type="number" min="0" :max="config.umbral_minimo_defecto" step="1" inputmode="numeric" :disabled="!authStore.esAdmin" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5" @keydown="bloquearNoEnteros" @input="config.umbral_critico_defecto = entero(config.umbral_critico_defecto)" />
            </label>
          </div>
          <label class="mt-2 block">Correo del responsable
            <input v-model="config.email_destinatario" type="email" maxlength="255" :disabled="!authStore.esAdmin" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5" @input="config.email_destinatario = sinEspacios(config.email_destinatario)" />
          </label>
          <div class="mt-2 flex items-center justify-between gap-2">
            <select v-model="config.frecuencia_notificacion" :disabled="!authStore.esAdmin" class="rounded-lg border border-gray-300 px-2 py-1.5">
              <option value="INMEDIATA">Aviso inmediato</option>
              <option value="RESUMEN_DIARIO">Resumen diario</option>
            </select>
            <label class="inline-flex items-center gap-1">
              <input v-model="config.notificar_email" type="checkbox" :disabled="!authStore.esAdmin" /> Correo
            </label>
          </div>
          <button
            v-if="authStore.esAdmin"
            type="button"
            class="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-corporativo-rosa px-3 py-2 font-semibold text-white hover:bg-corporativo-rosa-hover disabled:opacity-50"
            :disabled="guardandoConfigId === config.id"
            @click="guardarConfiguracion(config)"
          >
            <Loader2 v-if="guardandoConfigId === config.id" class="h-3.5 w-3.5 animate-spin" /> Guardar
          </button>
        </div>
      </div>
      <p v-if="!authStore.esAdmin" class="mt-3 text-xs text-gray-500">Solo administración puede cambiar los umbrales.</p>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-4 py-3">Nivel</th>
            <th class="px-4 py-3">Ítem</th>
            <th class="px-4 py-3 text-right">Stock / mínimo</th>
            <th class="px-4 py-3">Detectada</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3 text-right">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="cargando && !alertas.length"><td colspan="6" class="px-4 py-6 text-center text-gray-500">Cargando...</td></tr>
          <tr v-else-if="!alertas.length"><td colspan="6" class="px-4 py-6 text-center text-gray-500">No hay alertas para mostrar.</td></tr>
          <tr v-for="alerta in alertas" :key="alerta.id">
            <td class="px-4 py-3"><span class="rounded-full border px-2.5 py-0.5 text-xs font-bold" :class="ESTILO_NIVEL[alerta.nivel_alerta]">{{ alerta.nivel_alerta }}</span></td>
            <td class="px-4 py-3">
              <p class="font-semibold text-gray-900">{{ nombreItem(alerta) }}</p>
              <p class="text-xs text-gray-500">{{ alerta.tipo_item === 'MATERIA_PRIMA' ? 'Materia prima' : 'Prenda' }}</p>
            </td>
            <td class="px-4 py-3 text-right font-semibold">{{ alerta.stock_actual }} / {{ alerta.stock_minimo }}</td>
            <td class="px-4 py-3 text-gray-500">{{ fecha(alerta.fecha_alerta) }}</td>
            <td class="px-4 py-3 text-xs">
              {{ alerta.estado === 'PENDIENTE' ? 'Pendiente' : 'Resuelta' }}
              <p v-if="alerta.observaciones_resolucion" class="max-w-xs truncate text-gray-400" :title="alerta.observaciones_resolucion">{{ alerta.observaciones_resolucion }}</p>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="alerta.estado === 'PENDIENTE'"
                type="button"
                class="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                :disabled="procesandoId === alerta.id"
                @click="resolver(alerta)"
              >
                <CheckCircle2 class="h-3.5 w-3.5" /> Gestionada
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
