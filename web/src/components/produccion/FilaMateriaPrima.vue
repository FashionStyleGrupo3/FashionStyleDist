<script setup>
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { filtrarNumero } from '@/utils/validacionCampos';

const { formatearCOP } = useFormatoMoneda();

const props = defineProps({
  consumo: { type: Object, required: true },
  cantidadAProducir: { type: Number, required: true },
});

const emit = defineEmits(['update:cantidad']);

function actualizarCantidad(evento) {
  const valor = Math.min(10000, Math.max(0, Number(filtrarNumero(evento.target.value, 5, 1)) || 0));
  evento.target.value = valor;
  emit('update:cantidad', valor);
}
</script>

<template>
  <tr class="hover:bg-gray-50 transition">
    <td class="px-5 py-3">
      <p class="font-medium text-gray-900">{{ consumo.insumo_nombre }}</p>
      <p class="text-xs text-gray-500">
        Stock: {{ consumo.insumo_stock }} {{ consumo.insumo_unidad }}
      </p>
    </td>

    <td class="px-5 py-3 text-center">
      <input
        :value="consumo.cantidad"
        @input="actualizarCantidad"
        type="number"
        min="0"
        max="10000"
        step="0.1"
        class="w-24 rounded-md border border-gray-300 px-2 py-1 text-center text-sm font-semibold focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
      />
      <span class="ml-2 text-xs text-gray-500">{{ consumo.insumo_unidad }}</span>
    </td>

    <td class="px-5 py-3 text-right text-gray-700">
      {{ formatearCOP(consumo.insumo_costo) }}
    </td>

    <td class="px-5 py-3 text-right font-semibold text-gray-900">
      {{ formatearCOP(consumo.cantidad * consumo.insumo_costo) }}
    </td>

    <td class="px-5 py-3 text-right font-bold text-corporativo-rosa">
      {{ formatearCOP(consumo.cantidad * consumo.insumo_costo * cantidadAProducir) }}
    </td>
  </tr>
</template>
