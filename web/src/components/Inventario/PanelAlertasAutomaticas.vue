<script setup>
// RF-070: alertas que el backend genera solo tras cada movimiento (venta,
// confección, ajuste) y umbrales configurables por tipo de ítem.
import { computed, onMounted, ref } from 'vue';
import { BellRing, CheckCircle2, Loader2, RefreshCw, Settings2, ShieldAlert, Sparkles, AlertCircle } from 'lucide-vue-next';
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
  AGOTADO: 'bg-rose-100 text-rose-800 border-rose-200',
  CRITICO: 'bg-amber-100 text-amber-800 border-amber-200',
  BAJO: 'bg-slate-100 text-slate-800 border-slate-200',
};

const ETIQUETA_TIPO = { PRODUCTO: 'Prendas', MATERIA_PRIMA: 'Materias primas', GLOBAL: 'General' };

const totalPendientes = computed(() => Object.values(resumen.value).reduce((a, b) => a + Number(b || 0), 0));

function nombreItem(alerta) {
  if (alerta.tipo_item === 'MATERIA_PRIMA') return alerta.materia_prima?.nombre || 'Materia prima';
  const producto = alerta.producto?.nombre || alerta.variante?.producto?.nombre || 'Prenda';
  return `${producto}${alerta.variante?.talla ? ` · Talla ${alerta.variante.talla}` : ''}`;
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
    notificarExito('Inventario revisado; alertas recalculadas con éxito.');
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
  <section class="rounded-2xl border border-gray-200/90 bg-white shadow-sm overflow-hidden">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5 bg-gradient-to-r from-white via-pink-50/20 to-white">
      <div class="flex items-center gap-2.5">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-corporativo-rosa border border-pink-200/60">
          <BellRing class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-base font-bold text-gray-900 leading-tight">Auditoría Automática de Stock (RF-070)</h2>
          <p class="text-xs text-gray-500">Alertas reactivas generadas tras ventas, confección o mermas con notificación al responsable.</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span v-for="n in ['AGOTADO', 'CRITICO', 'BAJO']" :key="n" class="rounded-full border px-2.5 py-0.5 text-xs font-black shadow-sm" :class="ESTILO_NIVEL[n]">
          {{ n }} {{ resumen[n] || 0 }}
        </span>

        <select v-model="estado" class="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:border-corporativo-rosa focus:outline-none" @change="cargar">
          <option value="PENDIENTE">Pendientes</option>
          <option value="RESUELTA">Resueltas</option>
          <option value="">Todas</option>
        </select>

        <select v-model="nivel" class="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:border-corporativo-rosa focus:outline-none" @change="cargar">
          <option value="">Todos los niveles</option>
          <option value="AGOTADO">Agotado</option>
          <option value="CRITICO">Crítico</option>
          <option value="BAJO">Bajo</option>
        </select>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
          :disabled="evaluando"
          @click="evaluar"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': evaluando }" />
          <span>Evaluar Todo</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-sm"
          :class="mostrarConfig ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
          @click="mostrarConfig = !mostrarConfig"
        >
          <Settings2 class="h-3.5 w-3.5" />
          <span>Configurar Umbrales</span>
        </button>
      </div>
    </header>

    <!-- Panel de Configuración de Umbrales (Desplegable) -->
    <div v-if="mostrarConfig" class="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4 sm:p-5 animate-fadeIn">
      <div class="mb-3 flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-corporativo-rosa" />
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-700">Reglas de Detección de Umbrales</h3>
      </div>
      <p class="mb-4 text-xs text-gray-500">
        Jerarquía de evaluación: Configuración específica de producto o material → Categoría → Tipo general.
        El stock mínimo propio de cada materia prima en taller tiene prioridad absoluta.
      </p>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="config in configuraciones" :key="config.id" class="rounded-2xl border border-gray-200 bg-white p-4 text-xs shadow-sm space-y-2">
          <p class="font-extrabold text-gray-900 text-sm">
            {{ config.producto?.nombre || config.materia_prima?.nombre || config.categoria?.nombre || ETIQUETA_TIPO[config.tipo_item] }}
          </p>

          <div class="grid grid-cols-2 gap-2 pt-1">
            <label class="font-semibold text-gray-600">
              Mínimo
              <input
                v-model.number="config.umbral_minimo_defecto"
                type="number"
                min="0"
                max="100000"
                step="1"
                inputmode="numeric"
                :disabled="!authStore.esAdmin"
                class="mt-1 w-full rounded-xl border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-800 focus:border-corporativo-rosa focus:outline-none"
                @keydown="bloquearNoEnteros"
                @input="config.umbral_minimo_defecto = entero(config.umbral_minimo_defecto)"
              />
            </label>
            <label class="font-semibold text-gray-600">
              Crítico
              <input
                v-model.number="config.umbral_critico_defecto"
                type="number"
                min="0"
                :max="config.umbral_minimo_defecto"
                step="1"
                inputmode="numeric"
                :disabled="!authStore.esAdmin"
                class="mt-1 w-full rounded-xl border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-800 focus:border-corporativo-rosa focus:outline-none"
                @keydown="bloquearNoEnteros"
                @input="config.umbral_critico_defecto = entero(config.umbral_critico_defecto)"
              />
            </label>
          </div>

          <label class="block font-semibold text-gray-600">
            Correo de Notificación
            <input
              v-model="config.email_destinatario"
              type="email"
              maxlength="255"
              placeholder="responsable@fashionstyle.com"
              :disabled="!authStore.esAdmin"
              class="mt-1 w-full rounded-xl border border-gray-200 px-2 py-1.5 text-xs text-gray-800 focus:border-corporativo-rosa focus:outline-none"
              @input="config.email_destinatario = sinEspacios(config.email_destinatario)"
            />
          </label>

          <div class="flex items-center justify-between gap-2 pt-1">
            <select
              v-model="config.frecuencia_notificacion"
              :disabled="!authStore.esAdmin"
              class="rounded-xl border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-corporativo-rosa focus:outline-none"
            >
              <option value="INMEDIATA">Aviso Inmediato</option>
              <option value="RESUMEN_DIARIO">Resumen Diario</option>
            </select>
            <label class="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 cursor-pointer">
              <input v-model="config.notificar_email" type="checkbox" :disabled="!authStore.esAdmin" class="rounded text-corporativo-rosa focus:ring-0" />
              <span>Email</span>
            </label>
          </div>

          <button
            v-if="authStore.esAdmin"
            type="button"
            class="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-corporativo-rosa px-3 py-2 font-bold text-white hover:bg-pink-700 disabled:opacity-50 transition shadow-sm"
            :disabled="guardandoConfigId === config.id"
            @click="guardarConfiguracion(config)"
          >
            <Loader2 v-if="guardandoConfigId === config.id" class="h-3.5 w-3.5 animate-spin" />
            <span>Guardar Regla</span>
          </button>
        </div>
      </div>
      <p v-if="!authStore.esAdmin" class="mt-3 text-xs text-gray-400">Solo el usuario Administrador tiene permisos para modificar umbrales.</p>
    </div>

    <!-- Tabla de Alertas Automáticas -->
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm text-gray-600">
        <thead class="bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
          <tr>
            <th class="px-4 py-3.5">Nivel</th>
            <th class="px-4 py-3.5">Ítem y Detalle</th>
            <th class="px-4 py-3.5 text-center">Stock / Mínimo</th>
            <th class="px-4 py-3.5">Fecha Detección</th>
            <th class="px-4 py-3.5 text-center">Estado</th>
            <th class="px-4 py-3.5 text-right">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-if="cargando && !alertas.length">
            <td colspan="6" class="px-4 py-12 text-center text-gray-500">
              <Loader2 class="h-6 w-6 animate-spin mx-auto mb-2 text-corporativo-rosa" />
              <span>Verificando alertas de inventario...</span>
            </td>
          </tr>
          <tr v-else-if="!alertas.length">
            <td colspan="6" class="px-4 py-12 text-center text-gray-500">
              <CheckCircle2 class="h-8 w-8 text-emerald-500 mx-auto mb-1.5" />
              <p class="font-bold text-gray-800 text-sm">No hay alertas automáticas registradas</p>
              <p class="text-xs text-gray-400">Todos los ítems están por encima de los límites críticos configurados.</p>
            </td>
          </tr>
          <tr v-for="alerta in alertas" :key="alerta.id" class="hover:bg-pink-50/20 transition-colors">
            <!-- Nivel -->
            <td class="px-4 py-3">
              <span class="rounded-full border px-2.5 py-0.5 text-xs font-black shadow-sm" :class="ESTILO_NIVEL[alerta.nivel_alerta]">
                {{ alerta.nivel_alerta }}
              </span>
            </td>

            <!-- Ítem -->
            <td class="px-4 py-3">
              <p class="font-bold text-gray-900 leading-tight">{{ nombreItem(alerta) }}</p>
              <p class="text-[11px] text-gray-400 font-medium">
                {{ alerta.tipo_item === 'MATERIA_PRIMA' ? 'Insumo de producción' : 'Prenda terminada' }}
              </p>
            </td>

            <!-- Stock / Mínimo -->
            <td class="px-4 py-3 text-center">
              <span class="font-extrabold text-sm" :class="alerta.stock_actual <= 0 ? 'text-rose-600' : 'text-amber-600'">
                {{ alerta.stock_actual }}
              </span>
              <span class="text-xs text-gray-400"> / {{ alerta.stock_minimo }} mín</span>
            </td>

            <!-- Fecha -->
            <td class="px-4 py-3 text-xs text-gray-500">
              {{ fecha(alerta.fecha_alerta) }}
            </td>

            <!-- Estado -->
            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold"
                :class="alerta.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'"
              >
                {{ alerta.estado === 'PENDIENTE' ? 'Pendiente' : 'Resuelta' }}
              </span>
              <p v-if="alerta.observaciones_resolucion" class="max-w-xs truncate text-[10px] text-gray-400 mt-0.5 mx-auto" :title="alerta.observaciones_resolucion">
                {{ alerta.observaciones_resolucion }}
              </p>
            </td>

            <!-- Acción -->
            <td class="px-4 py-3 text-right">
              <button
                v-if="alerta.estado === 'PENDIENTE'"
                type="button"
                class="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition shadow-sm"
                :disabled="procesandoId === alerta.id"
                @click="resolver(alerta)"
              >
                <CheckCircle2 class="h-3.5 w-3.5" />
                <span>Gestionada</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
