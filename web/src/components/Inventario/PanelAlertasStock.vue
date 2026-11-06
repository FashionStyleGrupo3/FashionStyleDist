<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { AlertTriangle, PackageX, PackagePlus, RefreshCw, Loader2 } from 'lucide-vue-next';
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

async function cargarAlertas() {
  cargando.value = true;
  error.value = '';
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
    error.value = e?.response?.data?.message || 'No se pudieron cargar las alertas de inventario.';
  } finally {
    cargando.value = false;
  }
}

const listaActual = computed(() => (pestana.value === 'agotados' ? agotados.value : bajoStock.value));

watch(() => props.recargarToken, cargarAlertas);
onMounted(cargarAlertas);
useRecargaAutomatica(cargarAlertas);
</script>

<template>
  <section class="rounded-2xl border border-gray-200 bg-white shadow-sm">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
      <div class="flex items-center gap-2">
        <AlertTriangle class="h-5 w-5 text-amber-500" />
        <h2 class="text-base font-bold text-gray-900">Alertas de inventario</h2>
      </div>

      <div class="flex items-center gap-2">
        <label class="flex items-center gap-2 text-xs text-gray-600">
          Umbral bajo stock
          <input v-model.number="umbral" type="number" min="1" max="1000" step="1" inputmode="numeric"
            class="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-corporativo-rosa focus:outline-none"
            @keydown="bloquearNotacion"
            @input="umbralManual = true"
            @keyup.enter="cargarAlertas" />
        </label>
        <button type="button" :disabled="cargando"
          class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          @click="cargarAlertas">
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': cargando }" />
          Actualizar
        </button>
      </div>
    </header>

    <nav class="flex gap-2 px-4 pt-3" role="tablist">
      <button type="button" role="tab" :aria-selected="pestana === 'agotados'"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
        :class="pestana === 'agotados' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'"
        @click="pestana = 'agotados'">
        <PackageX class="h-3.5 w-3.5" /> Agotadas ({{ agotados.length }})
      </button>
      <button type="button" role="tab" :aria-selected="pestana === 'bajo'"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
        :class="pestana === 'bajo' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'"
        @click="pestana = 'bajo'">
        <AlertTriangle class="h-3.5 w-3.5" /> Bajo stock ≤ {{ umbral }} ({{ bajoStock.length }})
      </button>
    </nav>

    <div class="p-4">
      <p v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

      <div v-else-if="cargando && !listaActual.length" class="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
        <Loader2 class="h-4 w-4 animate-spin" /> Cargando alertas...
      </div>

      <p v-else-if="!listaActual.length" class="py-8 text-center text-sm text-gray-500">
        {{ pestana === 'agotados' ? 'No hay variantes agotadas.' : 'No hay variantes con bajo stock.' }}
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[520px] text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="py-2 pr-3">Prenda</th>
              <th class="py-2 pr-3">Talla</th>
              <th class="py-2 pr-3">SKU</th>
              <th class="py-2 pr-3 text-center">Stock</th>
              <th class="py-2 text-right">acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="v in listaActual" :key="v.idVariante">
              <td class="py-2.5 pr-3 font-medium text-gray-900">
                {{ v.nombreProducto }}
                <span v-if="v.color" class="text-xs text-gray-500">· {{ v.color }}</span>
              </td>
              <td class="py-2.5 pr-3">{{ v.talla }}</td>
              <td class="py-2.5 pr-3 font-mono text-xs text-gray-500">{{ v.sku || '—' }}</td>
              <td class="py-2.5 pr-3 text-center">
                <span class="inline-block min-w-8 rounded-full px-2 py-0.5 text-xs font-bold"
                  :class="v.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'">
                  {{ v.stock }}
                </span>
              </td>
              <td class="py-2.5 text-right">
                <button type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-corporativo-rosa px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-pink-700"
                  @click="emit('reponer', v)">
                  <PackagePlus class="h-3.5 w-3.5" /> Registrar entrada de reposición
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>