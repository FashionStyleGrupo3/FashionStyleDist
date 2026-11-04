<script setup>
// -> Componente ModalCargaMasivaFacturas
import { ref, watch } from 'vue';
import { X, Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-vue-next';
import ModalBase from '@/components/comunes/ModalBase.vue';
import { useNotificacion } from '@/composables/useNotificacion';
import { obtenerMensajeError } from '@/services/clienteApi';
import {
  cargarFacturasMasivo,
  validarArchivoCargaMasiva,
  descargarPlantillaCsv
} from '@/services/facturaServicio';

const props = defineProps({
  abierto: { type: Boolean, default: false }
});

const emit = defineEmits(['cerrar', 'importado']);

const { notificarExito, notificarError } = useNotificacion();

const archivoSeleccionado = ref(null);
const subiendo = ref(false);
const progreso = ref(0);
const errorArchivo = ref('');
const resultado = ref(null);

watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return;
    archivoSeleccionado.value = null;
    subiendo.value = false;
    progreso.value = 0;
    errorArchivo.value = '';
    resultado.value = null;
  }
);

function seleccionarArchivo(evento) {
  const archivo = evento.target.files?.[0] || null;
  procesarArchivo(archivo);
}

function soltarArchivo(evento) {
  const archivo = evento.dataTransfer?.files?.[0] || null;
  procesarArchivo(archivo);
}

function procesarArchivo(archivo) {
  resultado.value = null;
  const error = validarArchivoCargaMasiva(archivo);
  if (error) {
    errorArchivo.value = error;
    archivoSeleccionado.value = null;
    return;
  }
  errorArchivo.value = '';
  archivoSeleccionado.value = archivo;
}

async function subirArchivo() {
  if (!archivoSeleccionado.value) {
    errorArchivo.value = 'Selecciona un archivo .xlsx o .csv.';
    return;
  }

  subiendo.value = true;
  progreso.value = 0;
  errorArchivo.value = '';

  try {
    const res = await cargarFacturasMasivo(archivoSeleccionado.value, {
      alProgresar: (porcentaje) => {
        progreso.value = porcentaje;
      }
    });
    resultado.value = res;
    notificarExito(res.mensaje || `Carga masiva completada (${res.importadas} facturas).`);
    emit('importado', res);
  } catch (error) {
    const mensaje = obtenerMensajeError(error, 'Error al procesar el archivo de facturas.');
    errorArchivo.value = mensaje;
    notificarError(mensaje);
  } finally {
    subiendo.value = false;
  }
}
</script>

<template>
  <ModalBase :abierto="abierto" titulo="Carga masiva de facturas" @cerrar="emit('cerrar')">
    <div>
      <header class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-corporativo-rosa text-white">
            <FileSpreadsheet class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Carga Masiva de Facturas</h2>
            <p class="text-xs text-gray-500">Importa múltiples facturas desde un archivo Excel (.xlsx) o CSV (.csv)</p>
          </div>
        </div>
        <button type="button" class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" @click="emit('cerrar')">
          <X class="h-5 w-5" />
        </button>
      </header>

      <div class="space-y-4 px-6 py-5">
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <span>Columnas esperadas: <strong class="font-mono text-gray-800">pedido_id, venta_id, fecha_emision, cliente_documento, notas</strong></span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 font-bold text-corporativo-rosa hover:underline"
            @click="descargarPlantillaCsv"
          >
            <Download class="h-3.5 w-3.5" /> Descargar plantilla CSV
          </button>
        </div>

        <!-- Zona de arrastrar y soltar -->
        <label
          class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center transition hover:border-corporativo-rosa hover:bg-pink-50/30"
          @dragover.prevent
          @drop.prevent="soltarArchivo"
        >
          <Upload class="h-9 w-9 text-corporativo-rosa" />
          <p class="mt-2 text-sm font-semibold text-gray-800">
            <span v-if="archivoSeleccionado">{{ archivoSeleccionado.name }}</span>
            <span v-else>Haz clic o arrastra aquí tu archivo .xlsx o .csv</span>
          </p>
          <p class="mt-1 text-xs text-gray-500">Tamaó máximo 5 MB</p>
          <input type="file" accept=".xlsx,.csv" class="hidden" @change="seleccionarArchivo" />
        </label>

        <!-- Barra de progreso -->
        <div v-if="subiendo" class="space-y-1">
          <div class="flex justify-between text-xs text-gray-600">
            <span>Subiendo y procesando archivo...</span>
            <span class="font-bold">{{ progreso }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div class="h-full bg-corporativo-rosa transition-all" :style="{ width: `${progreso}%` }" />
          </div>
        </div>

        <!-- Resultado de importacion -->
        <div
          v-if="resultado"
          class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 space-y-2"
        >
          <div class="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 class="h-4 w-4 text-emerald-600" />
            <span>importacion finalizada: {{ resultado.importadas }} factura(s) procesada(s)</span>
          </div>
          <ul v-if="resultado.errores.length" class="list-disc pl-5 text-amber-800 space-y-0.5">
            <li v-for="(err, idx) in resultado.errores" :key="idx">
              {{ typeof err === 'string' ? err : JSON.stringify(err) }}
            </li>
          </ul>
        </div>

        <p
          v-if="errorArchivo"
          class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          <AlertCircle class="h-4 w-4 shrink-0" /> {{ errorArchivo }}
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            @click="emit('cerrar')"
          >
            Cerrar
          </button>
          <button
            type="button"
            :disabled="!archivoSeleccionado || subiendo"
            class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-pink-700 disabled:opacity-40"
            @click="subirArchivo"
          >
            <Loader2 v-if="subiendo" class="h-4 w-4 animate-spin" />
            <Upload v-else class="h-4 w-4" />
            Importar archivo
          </button>
        </div>
      </div>
    </div>
  </ModalBase>
</template>

