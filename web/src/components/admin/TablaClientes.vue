<script setup>
import {
  Mail,
  Phone,
  MapPin,
  CreditCard,
  UserX
} from 'lucide-vue-next';

const props = defineProps({
  clientes: {
    type: Array,
    default: () => [],
  },
  cargando: {
    type: Boolean,
    default: false,
  },
});

function obtenerIniciales(nombre) {
  if (!nombre) return 'CL';
  const partes = String(nombre).trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
    <!-- Estado de Carga -->
    <div v-if="cargando" class="flex flex-col items-center justify-center p-12 text-center">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-corporativo-rosa border-t-transparent"></div>
      <p class="mt-3 text-sm font-semibold text-gray-700">Cargando directorio de clientes...</p>
      <p class="text-xs text-gray-400">Recuperando registros del sistema</p>
    </div>

    <!-- Estado Vacío -->
    <div
      v-else-if="!clientes.length"
      class="flex flex-col items-center justify-center p-12 text-center"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        <UserX class="h-7 w-7" />
      </div>
      <p class="mt-3 text-base font-bold text-gray-800">No se encontraron clientes</p>
      <p class="mt-1 max-w-sm text-xs text-gray-500">
        No hay registros que coincidan con la búsqueda o todavía no hay clientes registrados.
      </p>
    </div>

    <!-- Tabla de Clientes (Modo Solo Lectura) -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
          <tr>
            <th scope="col" class="px-5 py-3.5">Cliente</th>
            <th scope="col" class="px-5 py-3.5">Identificación</th>
            <th scope="col" class="px-5 py-3.5">Contacto</th>
            <th scope="col" class="px-5 py-3.5">Ubicación</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white">
          <tr
            v-for="cliente in clientes"
            :key="cliente.id"
            class="group transition-colors hover:bg-gray-50/60"
          >
            <!-- Columna Cliente: Avatar y Nombre -->
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400/30 text-xs font-black transition-transform group-hover:scale-105">
                  {{ obtenerIniciales(cliente.nombre_completo) }}
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-gray-900 group-hover:text-corporativo-rosa transition truncate">
                    {{ cliente.nombre_completo }}
                  </p>
                  <span class="inline-block mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
                    ID #{{ cliente.id }}
                  </span>
                </div>
              </div>
            </td>

            <!-- Columna Documento -->
            <td class="px-5 py-4">
              <div v-if="cliente.numero_documento" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/70 px-2.5 py-1 text-xs font-medium text-gray-700">
                <CreditCard class="h-3.5 w-3.5 text-gray-400" />
                <span class="font-bold text-gray-900">{{ cliente.tipo_documento || 'CC' }}</span>
                <span>{{ cliente.numero_documento }}</span>
              </div>
              <span v-else class="text-xs italic text-gray-400">Sin documento</span>
            </td>

            <!-- Columna Contacto -->
            <td class="px-5 py-4">
              <div class="space-y-1">
                <a
                  v-if="cliente.correo"
                  :href="`mailto:${cliente.correo}`"
                  class="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-corporativo-rosa transition"
                >
                  <Mail class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span class="truncate max-w-[200px]">{{ cliente.correo }}</span>
                </a>
                <span v-else class="text-xs text-gray-400">Sin correo</span>

                <p class="flex items-center gap-1.5 text-xs text-gray-500">
                  <Phone class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>{{ cliente.telefono || 'Sin teléfono' }}</span>
                </p>
              </div>
            </td>

            <!-- Columna Ubicación -->
            <td class="px-5 py-4">
              <div class="space-y-1">
                <p class="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                  <MapPin class="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span>{{ cliente.ciudad || 'Sin ciudad especificada' }}</span>
                </p>
                <p class="text-xs text-gray-500 truncate max-w-[220px]">
                  {{ cliente.direccion || 'Sin dirección de entrega' }}
                </p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
