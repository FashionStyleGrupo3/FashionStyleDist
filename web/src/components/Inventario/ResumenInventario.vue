<script setup>
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  PackageX,
  AlertTriangle
} from 'lucide-vue-next';

defineProps({
  resumen: { type: Object, required: true },
  alertas: { type: Object, default: () => ({ agotados: 0, bajoStock: 0 }) }
});
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
    <!-- Total Movimientos -->
    <div class="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kárdex Total</span>
        <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          <History class="h-3.5 w-3.5" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-gray-900 tracking-tight">{{ resumen.total_movimientos || 0 }}</p>
      <p class="mt-0.5 text-xs text-gray-400">Movimientos históricos</p>
    </div>

    <!-- Entradas -->
    <div class="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Entradas</span>
        <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <ArrowDownLeft class="h-4 w-4" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-emerald-600 tracking-tight">+{{ resumen.entradas || 0 }}</p>
      <p class="mt-0.5 text-xs text-emerald-600/70">Compras y confección</p>
    </div>

    <!-- Salidas -->
    <div class="relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-rose-700 uppercase tracking-wider">Salidas</span>
        <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <ArrowUpRight class="h-4 w-4" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-rose-600 tracking-tight">-{{ resumen.salidas || 0 }}</p>
      <p class="mt-0.5 text-xs text-rose-600/70">Ventas y mermas</p>
    </div>

    <!-- Ajustes / Anulados -->
    <div class="relative overflow-hidden rounded-2xl border border-purple-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-purple-700 uppercase tracking-wider">Ajustes</span>
        <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <SlidersHorizontal class="h-3.5 w-3.5" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-purple-700 tracking-tight">{{ (resumen.ajustes || 0) + (resumen.anulados || 0) }}</p>
      <p class="mt-0.5 text-xs text-purple-600/70">{{ resumen.anulados || 0 }} anulaciones</p>
    </div>

    <!-- Agotadas -->
    <div class="relative overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-rose-800 uppercase tracking-wider">Agotadas</span>
        <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
          <PackageX class="h-3.5 w-3.5" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-rose-700 tracking-tight">{{ alertas.agotados || 0 }}</p>
      <p class="mt-0.5 text-xs text-rose-700/80 font-medium">Requieren reposición</p>
    </div>

    <!-- Bajo Stock -->
    <div class="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-amber-800 uppercase tracking-wider">Bajo Stock</span>
        <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <AlertTriangle class="h-3.5 w-3.5" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-amber-700 tracking-tight">{{ alertas.bajoStock || 0 }}</p>
      <p class="mt-0.5 text-xs text-amber-700/80 font-medium">Bajo el umbral</p>
    </div>
  </div>
</template>
