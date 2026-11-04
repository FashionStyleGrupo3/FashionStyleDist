<script setup>
import { ref, computed } from 'vue';
import { Calculator, Package, ClipboardList, Truck, ListChecks } from 'lucide-vue-next';
import GestorOrdenesProduccion from '@/components/produccion/GestorOrdenesProduccion.vue';
import CalculadoraProduccion from '@/components/produccion/CalculadoraProduccion.vue';
import GestorMateriasPrimas from '@/components/produccion/Gestormateriasprimas.vue';
import GestorFormulasProduccion from '@/components/produccion/Gestorformulasproduccion.vue';
import GestorProveedores from '@/components/produccion/Gestorproveedores.vue';
 
const tabs = [
  { id: 'simulador', etiqueta: 'Simulador y Órdenes', icono: Calculator, componente: CalculadoraProduccion },
  { id: 'materias', etiqueta: 'Materias Primas', icono: Package, componente: GestorMateriasPrimas },
  { id: 'formulas', etiqueta: 'Fórmulas por Prenda', icono: ClipboardList, componente: GestorFormulasProduccion },
  { id: 'proveedores', etiqueta: 'Proveedores', icono: Truck, componente: GestorProveedores },
  { id: 'ordenes', etiqueta: 'Órdenes de Producción', icono: ListChecks, componente: GestorOrdenesProduccion },
];
 
const tabActiva = ref('simulador');
const tabActual = computed(() => tabs.find((t) => t.id === tabActiva.value));
</script>
 
<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold text-gray-900">Producción textil</h1>
      <p class="text-sm text-gray-500">
        Gestiona insumos, recetas por prenda, proveedores y simula el costo de cada lote.
      </p>
    </header>
 
    <nav class="flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        role="tab"
        :aria-selected="tabActiva === t.id"
        class="inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
        :class="
          tabActiva === t.id
            ? 'border-corporativo-rosa text-corporativo-rosa'
            : 'border-transparent text-gray-500 hover:text-gray-800'
        "
        @click="tabActiva = t.id"
      >
        <component :is="t.icono" class="h-4 w-4" />
        {{ t.etiqueta }}
      </button>
    </nav>
 
    <!-- KeepAlive conserva filtros y datos al cambiar de pestaña -->
  <KeepAlive>
    <component :is="tabActual && tabActual.componente" :key="tabActual && tabActual.id" v-if="tabActual" />
  </KeepAlive>
  </div>
</template>