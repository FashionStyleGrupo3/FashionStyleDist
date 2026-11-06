<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { Plus, Search, Pencil, Trash2 } from 'lucide-vue-next';
import { proveedoresApi, mensajeError } from '@/services/Produccionservicio';
import { useNotificacion } from '@/composables/useNotificacion';
import ModalProveedor from '@/components/produccion/Modalproveedor.vue';
 
const { notificarExito, notificarError } = useNotificacion();
 
const proveedores = ref([]);
const cargando = ref(false);
const busqueda = ref('');
const modal = ref({ abierto: false, proveedor: null });
 
const proveedoresFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return proveedores.value;
  return proveedores.value.filter((p) =>
    [p.nombre, p.nit, p.contacto, p.email].some((campo) => (campo ?? '').toLowerCase().includes(q)),
  );
});
 
async function cargar() {
  cargando.value = true;
  try {
    proveedores.value = await proveedoresApi.listar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudieron cargar los proveedores.'));
  } finally {
    cargando.value = false;
  }
}
 
function abrirModal(proveedor = null) {
  modal.value = { abierto: true, proveedor };
}
 
async function alGuardar() {
  modal.value.abierto = false;
  await cargar();
  // AVISO GLOBAL
  window.dispatchEvent(new CustomEvent('datos-actualizados'));
}
 
async function eliminar(p) {
  if (!window.confirm(`¿Eliminar al proveedor "${p.nombre}"?`)) return;
  try {
    await proveedoresApi.eliminar(p.id);
    notificarExito('Proveedor eliminado.');
    await cargar();
    // AVISO GLOBAL
    window.dispatchEvent(new CustomEvent('datos-actualizados'));
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo eliminar (puede estar asociado a una fórmula).'));
  }
}
 
onMounted(cargar);
useRecargaAutomatica(cargar);
</script>

<template>
  <!-- ... TU TEMPLATE SE QUEDA EXACTAMENTE IGUAL ... -->
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:max-w-xs">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="busqueda"
          type="text"
          maxlength="100"
          placeholder="Buscar por nombre, NIT o contacto..."
          class="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40 focus:border-corporativo-rosa"
        />
      </div>
      <button
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        @click="abrirModal()"
      >
        <Plus class="h-4 w-4" /> Nuevo proveedor
      </button>
    </div>
 
    <div class="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-3">Proveedor</th>
              <th class="px-4 py-3">NIT</th>
              <th class="px-4 py-3">Contacto</th>
              <th class="px-4 py-3">teléfono</th>
              <th class="px-4 py-3">Correo</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="cargando">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">Cargando...</td>
            </tr>
            <tr v-else-if="!proveedoresFiltrados.length">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">No hay proveedores para mostrar.</td>
            </tr>
            <tr v-for="p in proveedoresFiltrados" :key="p.id">
              <td class="px-4 py-3 font-medium text-gray-900">{{ p.nombre }}</td>
              <td class="px-4 py-3 text-gray-600">{{ p.nit || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ p.contacto || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ p.telefono || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ p.email || '—' }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button class="p-2 text-gray-500 hover:text-corporativo-rosa" title="Editar" @click="abrirModal(p)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button class="p-2 text-gray-500 hover:text-red-600" title="Eliminar" @click="eliminar(p)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
 
    <ModalProveedor
      v-if="modal.abierto"
      :proveedor="modal.proveedor"
      @cerrar="modal.abierto = false"
      @guardado="alGuardar"
    />
  </div>
</template>
