<script setup>
import { TrendingUp, Lightbulb, Receipt } from 'lucide-vue-next';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';

const { formatearCOP } = useFormatoMoneda();

// ============================================================================
// PROPS: todos los valores que el padre ya calculó.
// ============================================================================
const props = defineProps({
  formulaSeleccionada: { type: Object, default: null },
  costoMateriales: { type: Number, required: true },
  costoMaterialesConDesperdicio: { type: Number, required: true },
  costoManoObra: { type: Number, required: true },
  margenDesperdicio: { type: Number, required: true },
  costoUnitarioTotal: { type: Number, required: true },
  costoTotalLote: { type: Number, required: true },
  ingresoTotal: { type: Number, required: true },
  gananciaTotal: { type: Number, required: true },
  margenGanancia: { type: Number, required: true },
  margenUnitario: { type: Number, required: true },
  margenObjetivo: { type: Number, required: true },
  aplicarIva: { type: Boolean, required: true },
  precioSugeridoSinIva: { type: Number, required: true },
  precioSugeridoFinal: { type: Number, required: true },
  ivaCalculado: { type: Number, required: true },
});

// ============================================================================
// EMITS: el usuario puede cambiar el margen objetivo o el toggle del IVA.
// ============================================================================
const emit = defineEmits(['update:margenObjetivo', 'update:aplicarIva']);
</script>

<template>
  <section class="space-y-4">

    <!-- ========== TARJETA 1: RESUMEN DEL LOTE ========== -->
    <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 class="text-sm font-bold uppercase tracking-wide text-gray-700 mb-4">
        Resumen del lote
      </h3>

      <dl class="space-y-3 text-sm">
        <div class="flex justify-between">
          <dt class="text-gray-500">Materiales / unidad</dt>
          <dd class="font-semibold text-gray-900">{{ formatearCOP(costoMateriales) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">+ Desperdicio ({{ margenDesperdicio }}%)</dt>
          <dd class="font-semibold text-gray-900">
            {{ formatearCOP(costoMaterialesConDesperdicio - costoMateriales) }}
          </dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">+ Mano de obra</dt>
          <dd class="font-semibold text-gray-900">{{ formatearCOP(costoManoObra) }}</dd>
        </div>

        <div class="border-t border-gray-100 pt-3 flex justify-between items-baseline">
          <dt class="font-bold text-gray-700">Costo unitario</dt>
          <dd class="text-lg font-extrabold text-gray-900">{{ formatearCOP(costoUnitarioTotal) }}</dd>
        </div>

        <div class="border-t border-gray-100 pt-3 flex justify-between items-baseline">
          <dt class="font-bold text-gray-700">Costo total del lote</dt>
          <dd class="text-xl font-extrabold text-corporativo-rosa">{{ formatearCOP(costoTotalLote) }}</dd>
        </div>
      </dl>
    </div>

    <!-- ========== TARJETA 2: RENTABILIDAD ========== -->
    <div class="rounded-2xl border border-gray-200 bg-gradient-to-br from-pink-50 to-rose-50 p-5 shadow-sm">
      <div class="flex items-center gap-2 mb-3">
        <TrendingUp class="h-4 w-4 text-corporativo-rosa" />
        <h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">
          Rentabilidad proyectada
        </h3>
      </div>

      <dl class="space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-gray-600">Precio venta / unidad</dt>
          <dd class="font-semibold text-gray-900">{{ formatearCOP(formulaSeleccionada?.precio_venta || 0) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-600">Margen / unidad</dt>
          <dd class="font-semibold" :class="margenUnitario >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ formatearCOP(margenUnitario) }}
          </dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-600">Ingreso total</dt>
          <dd class="font-semibold text-gray-900">{{ formatearCOP(ingresoTotal) }}</dd>
        </div>
        <div class="border-t border-pink-100 pt-2 flex justify-between items-baseline">
          <dt class="font-bold text-gray-700">Ganancia neta</dt>
          <dd class="text-lg font-extrabold" :class="gananciaTotal >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ formatearCOP(gananciaTotal) }}
          </dd>
        </div>
        <div class="flex justify-between items-center pt-1">
          <dt class="text-xs text-gray-500">Margen de ganancia</dt>
          <dd class="text-base font-bold" :class="margenGanancia >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ margenGanancia.toFixed(1) }}%
          </dd>
        </div>
      </dl>
    </div>

    <!-- ========== TARJETA 3: PRECIO SUGERIDO ========== -->
    <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm">
      <div class="flex items-center gap-2 mb-3">
        <Lightbulb class="h-4 w-4 text-amber-600" />
        <h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">
          Precio sugerido
        </h3>
      </div>

      <!-- Slider del margen objetivo -->
      <div class="mb-3">
        <label class="mb-1 flex items-center justify-between text-xs font-semibold text-gray-600">
          <span>Margen objetivo</span>
          <span class="text-sm font-bold text-amber-700">{{ margenObjetivo }}%</span>
        </label>
        <input
          :value="margenObjetivo"
          @input="(e) => emit('update:margenObjetivo', Number(e.target.value))"
          type="range"
          min="0"
          max="100"
          step="5"
          class="w-full accent-amber-500"
        />
      </div>

      <dl class="space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-gray-600">Costo unitario</dt>
          <dd class="font-semibold text-gray-900">{{ formatearCOP(costoUnitarioTotal) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-600">+ Margen {{ margenObjetivo }}%</dt>
          <dd class="font-semibold text-gray-900">
            {{ formatearCOP(precioSugeridoSinIva - costoUnitarioTotal) }}
          </dd>
        </div>

        <!-- Toggle IVA -->
        <div class="flex items-center justify-between border-t border-amber-100 pt-2">
          <dt class="flex items-center gap-1.5 text-xs text-gray-600">
            <Receipt class="h-3.5 w-3.5" /> Aplicar IVA (19%)
          </dt>
          <dd>
            <button
              type="button"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              :class="aplicarIva ? 'bg-amber-500' : 'bg-gray-300'"
              @click="emit('update:aplicarIva', !aplicarIva)"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                :class="aplicarIva ? 'translate-x-5' : 'translate-x-1'"
              ></span>
            </button>
          </dd>
        </div>

        <div v-if="aplicarIva" class="flex justify-between">
          <dt class="text-gray-600">+ IVA</dt>
          <dd class="font-semibold text-gray-900">{{ formatearCOP(ivaCalculado) }}</dd>
        </div>

        <div class="border-t border-amber-100 pt-2 flex justify-between items-baseline">
          <dt class="font-bold text-gray-700">Precio sugerido</dt>
          <dd class="text-lg font-extrabold text-amber-700">
            {{ formatearCOP(precioSugeridoFinal) }}
          </dd>
        </div>
      </dl>
    </div>

  </section>
</template>
