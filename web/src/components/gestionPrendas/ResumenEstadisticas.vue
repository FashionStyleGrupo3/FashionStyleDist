<script setup>
import { computed } from 'vue';

const props = defineProps({
  productos: {
    type: Array,
    default: () => []
  },
  busqueda: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:busqueda']);

const activos = computed(() => props.productos.filter(producto =>
  producto?.activo === true || producto?.activo === 1 || producto?.activo === '1'
).length);
const inactivos = computed(() => props.productos.length - activos.value);
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div class="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Productos</div>
        <div class="mt-3 text-3xl font-bold text-slate-900">{{ productos.length }}</div>
      </div>
      <div class="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Activos</div>
        <div class="mt-3 text-3xl font-bold text-slate-900">{{ activos }}</div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inactivos</div>
        <div class="mt-3 text-3xl font-bold text-slate-900">{{ inactivos }}</div>
      </div>
    </div>

    <div>
      <input
        :value="busqueda"
        type="text"
        maxlength="100"
        placeholder="Buscar producto..."
        aria-label="Buscar producto"
        class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
        @input="emit('update:busqueda', $event.target.value)"
      >
    </div>
  </div>
</template>
