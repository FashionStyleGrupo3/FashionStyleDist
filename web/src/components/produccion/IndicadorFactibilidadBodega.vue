<script setup>
import { CheckCircle2, AlertTriangle } from 'lucide-vue-next';

const props = defineProps({
  factibilidad: {
    type: Object,
    required: true,
    // Estructura: { puedeProducir, limitante, todosSuficientes, faltante }
  },
  cantidadAProducir: { type: Number, required: true },
});

const emit = defineEmits(['ajustar-cantidad']);

function ajustar() {
  emit('ajustar-cantidad', props.factibilidad.puedeProducir);
}
</script>

<template>
  <div
    class="rounded-2xl border p-5 shadow-sm"
    :class="factibilidad.todosSuficientes
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-red-200 bg-red-50'"
  >
    <div class="flex items-start gap-3">
      <component
        :is="factibilidad.todosSuficientes ? CheckCircle2 : AlertTriangle"
        class="h-5 w-5 shrink-0 mt-0.5"
        :class="factibilidad.todosSuficientes ? 'text-emerald-600' : 'text-red-600'"
      />

      <div class="flex-1">
        <p
          class="font-bold text-sm"
          :class="factibilidad.todosSuficientes ? 'text-emerald-800' : 'text-red-800'"
        >
          <template v-if="factibilidad.todosSuficientes">
            Insumos suficientes para el lote
          </template>
          <template v-else>
            Stock insuficiente
          </template>
        </p>

        <p
          class="mt-1 text-xs"
          :class="factibilidad.todosSuficientes ? 'text-emerald-700' : 'text-red-700'"
        >
          <template v-if="factibilidad.todosSuficientes">
            Puedes confeccionar hasta <strong>{{ factibilidad.puedeProducir }}</strong> unidades con el stock actual.
          </template>
          <template v-else>
            Con el stock actual puedes producir <strong>{{ factibilidad.puedeProducir }}</strong> unidades.
            <template v-if="factibilidad.limitante">
              Faltan <strong>{{ factibilidad.faltante.toFixed(2) }} {{ factibilidad.limitante.unidad }}</strong> de
              <strong>{{ factibilidad.limitante.nombre }}</strong>.
            </template>
          </template>
        </p>

        <button
          v-if="!factibilidad.todosSuficientes && factibilidad.puedeProducir > 0"
          type="button"
          class="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          @click="ajustar"
        >
          Ajustar a {{ factibilidad.puedeProducir }} unidades
        </button>
      </div>
    </div>
  </div>
</template>
