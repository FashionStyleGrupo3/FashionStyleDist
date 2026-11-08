<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { AlertTriangle, PackageX, PackagePlus, RefreshCw, Loader2, Sparkles, CheckCircle2 } from 'lucide-vue-next';
import clienteApi from '@/services/clienteApi';

const props = defineProps({
  // null: se usa el umbral mínimo configurado en las alertas de stock.
  umbralInicial: { type: Number, default: null },
  recargarToken: { type: Number, default: 0 }
});

const emit = defineEmits(['reponer', 'conteo']);

const pestana = ref('agotados');
const umbral = ref(props.umbralInicial);
const umbralManual = ref(props.umbralInicial !== null);
const agotados = ref([]);
const bajoStock = ref([]);
const cargando = ref(false);
const error = ref('');

function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.variantes_producto)) return data.data.variantes_producto;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
}

function bloquearNotacion(evento) {
  if (['e', 'E', '+', '-', '.'].includes(evento.key)) evento.preventDefault();
}

function normalizar(v = {}) {
  const producto = v.producto ?? v.variante?.producto ?? {};
  return {
    idVariante: v.id_variante ?? v.variante_id ?? v.variante?.id_variante ?? v.id ?? null,
    idProducto: v.producto_id ?? v.id_producto ?? producto.id_producto ?? null,
    nombreProducto: v.nombre_producto ?? producto.nombre ?? 'Prenda sin nombre',
    color: v.color ?? producto.color ?? null,
    talla: v.talla ?? v.variante?.talla ?? '—',
    sku: v.sku ?? v.variante?.sku ?? null,
    stock: Math.max(0, Number(v.stock ?? v.stock_actual ?? v.variante?.stock) || 0)
  };
}

async function cargarAlertas({ silencioso = false } = {}) {
  if (!silencioso) {
    cargando.value = true;
    error.value = '';
  }
  try {
    if (umbralManual.value) {
      umbral.value = Math.min(1000, Math.max(1, Math.floor(Number(umbral.value) || 5)));
    }

    const [resAgotados, resBajo] = await Promise.all([
      clienteApi.get('/inventarios/agotados'),
      clienteApi.get('/inventarios/bajo-stock', { params: umbralManual.value ? { umbral: umbral.value } : {} })
    ]);

    agotados.value = extraerLista(resAgotados.data).map(normalizar);
    bajoStock.value = extraerLista(resBajo.data).map(normalizar).filter((v) => v.stock > 0);
    if (!umbralManual.value) umbral.value = Number(resBajo.data?.data?.umbral_variantes) || umbral.value || 5;

    emit('conteo', { agotados: agotados.value.length, bajoStock: bajoStock.value.length });
  } catch (e) {
    if (!silencioso) error.value = e?.response?.data?.message || 'No se pudieron cargar las alertas de inventario.';
  } finally {
    if (!silencioso) cargando.value = false;
  }
}

const listaActual = computed(() => (pestana.value === 'agotados' ? agotados.value : bajoStock.value));

watch(() => props.recargarToken, () => cargarAlertas());
onMounted(() => cargarAlertas());
useRecargaAutomatica(() => cargarAlertas({ silencioso: true }), { intervaloSondeo: 60000 });
</script>

<template>
  <section class="rounded-2xl border border-gray-200/90 bg-white shadow-sm overflow-hidden">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5 bg-gradient-to-r from-white via-gray-50/50 to-white">
      <div class="flex items-center gap-2.5">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
          <AlertTriangle class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-base font-bold text-gray-900 leading-tight">Módulo de Reposición Urgente</h2>
          <p class="text-xs text-gray-500">Detecta y gestiona de inmediato las prendas que requieren compra o confección.</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <label class="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
          <span>Umbral bajo stock:</span>
          <input
            v-model.number="umbral"
            type="number"
            min="1"
            max="1000"
            step="1"
            inputmode="numeric"
            class="w-14 rounded-lg border border-gray-300 px-2 py-0.5 text-xs font-bold text-gray-900 focus:border-corporativo-rosa focus:outline-none"
            @keydown="bloquearNotacion"
            @input="umbralManual = true"
            @keyup.enter="cargarAlertas"
          />
        </label>

        <button
          type="button"
          :disabled="cargando"
          class="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          @click="cargarAlertas"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': cargando }" />
          <span>Actualizar</span>
        </button>
      </div>
    </header>

    <!-- Pestañas de Agotadas vs Bajo Stock -->
    <nav class="flex gap-2 p-4 pb-2" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="pestana === 'agotados'"
        class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm"
        :class="pestana === 'agotados' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'"
        @click="pestana = 'agotados'"
      >
        <PackageX class="h-3.5 w-3.5" />
        <span>Prendas Agotadas ({{ agotados.length }})</span>
      </button>

      <button
        type="button"
        role="tab"
        :aria-selected="pestana === 'bajo'"
        class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm"
        :class="pestana === 'bajo' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'"
        @click="pestana = 'bajo'"
      >
        <AlertTriangle class="h-3.5 w-3.5" />
        <span>Bajo Stock ≤ {{ umbral }} ({{ bajoStock.length }})</span>
      </button>
    </nav>

    <!-- Contenido de Alertas -->
    <div class="p-4 pt-1">
      <p v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-3">
        {{ error }}
      </p>

      <div v-else-if="cargando && !listaActual.length" class="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-500">
        <Loader2 class="h-6 w-6 animate-spin text-corporativo-rosa" />
        <span>Verificando disponibilidad de stock...</span>
      </div>

      <div v-else-if="!listaActual.length" class="py-12 text-center text-gray-500">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mx-auto mb-2 border border-emerald-100">
          <CheckCircle2 class="h-6 w-6" />
        </div>
        <p class="font-bold text-gray-800 text-sm">
          {{ pestana === 'agotados' ? '¡Excelente! No hay variantes agotadas en este momento.' : '¡Todo en orden! No hay prendas por debajo del umbral de stock.' }}
        </p>
        <p class="text-xs text-gray-400 mt-0.5">El inventario físico cumple con los niveles mínimos establecidos.</p>
      </div>

      <div v-else class="overflow-hidden rounded-xl border border-gray-200/80">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-left text-sm text-gray-600">
            <thead class="bg-gray-50/80 text-xs font-semibold uppercase text-gray-500 border-b border-gray-100">
              <tr>
                <th class="py-3 px-4">Prenda y Color</th>
                <th class="py-3 px-3 text-center">Talla</th>
                <th class="py-3 px-3 font-mono">SKU</th>
                <th class="py-3 px-3 text-center">Stock Actual</th>
                <th class="py-3 px-4 text-right">Acción Inmediata</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr v-for="v in listaActual" :key="v.idVariante" class="hover:bg-pink-50/20 transition-colors">
                <td class="py-3 px-4 font-bold text-gray-900">
                  {{ v.nombreProducto }}
                  <span v-if="v.color" class="text-xs text-gray-500 font-normal"> · {{ v.color }}</span>
                </td>
                <td class="py-3 px-3 text-center">
                  <span class="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-800 border border-slate-200">
                    {{ v.talla }}
                  </span>
                </td>
                <td class="py-3 px-3 font-mono text-xs text-gray-500">{{ v.sku || '—' }}</td>
                <td class="py-3 px-3 text-center">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold"
                    :class="v.stock === 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'"
                  >
                    {{ v.stock }} uds
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-xl bg-corporativo-rosa px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-pink-700"
                    @click="emit('reponer', v)"
                  >
                    <PackagePlus class="h-3.5 w-3.5" />
                    <span>Registrar Reposición</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
