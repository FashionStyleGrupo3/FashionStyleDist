<script setup>
import { computed } from 'vue';
import { Minus, Plus } from 'lucide-vue-next';

const props = defineProps({
  modelValue: { type: Number, default: 1 },
  stockMaximo: { type: Number, default: 0 }
});

const emit = defineEmits(['update:modelValue']);
const maximo = computed(() => Math.max(0, Math.floor(Number(props.stockMaximo) || 0)));

function limitar(valor) {
  if (maximo.value < 1) return 1;
  const numero = Math.floor(Number(valor));
  if (!Number.isFinite(numero)) return 1;
  return Math.min(maximo.value, Math.max(1, numero));
}

function cambiar(delta) {
  emit('update:modelValue', limitar(Number(props.modelValue) + delta));
}

  function alEscribir(event) {
    let valor = String(event.target.value ?? '').replace(/\D/g, '');
    if (valor === '') {
      event.target.value = '';
      emit('update:modelValue', '');
      return;
    }
    const cantidad = limitar(valor);
    event.target.value = String(cantidad);
    emit('update:modelValue', cantidad);
  }

function bloquearNotacion(event) {
  if (['e', 'E', '+', '-', '.', ','].includes(event.key)) event.preventDefault();
}
</script>

<template>
  <div>
    <label for="cantidad-prenda" class="mb-2 block text-sm font-semibold text-gray-800">Cantidad</label>
    <div class="inline-flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
        :disabled="modelValue <= 1 || maximo < 1"
        aria-label="Disminuir cantidad"
        @click="cambiar(-1)"
      >
        <Minus class="h-4 w-4" />
      </button>
      <input
        id="cantidad-prenda"
        :value="modelValue"
        type="text"
        inputmode="numeric"
        min="1"
        :max="maximo"
        :disabled="maximo < 1"
        class="h-11 w-14 border-x border-gray-200 text-center text-sm font-semibold text-gray-900 focus:outline-none disabled:bg-gray-50"
        aria-label="Cantidad de prendas"
        @keydown="bloquearNotacion"
        @input="alEscribir"
      />
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
        :disabled="modelValue >= maximo || maximo < 1"
        aria-label="Aumentar cantidad"
        @click="cambiar(1)"
      >
        <Plus class="h-4 w-4" />
      </button>
    </div>
    <p class="mt-1 text-xs text-gray-500">Máximo {{ maximo }} unidades disponibles</p>
  </div>
</template>
