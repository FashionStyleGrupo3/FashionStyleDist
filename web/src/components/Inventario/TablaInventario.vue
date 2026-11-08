<script setup>
import {
  descripcionItemKardex as descripcionItem,
  esMovimientoDeProduccion as esDeProduccion
} from '@/utils/kardex';
import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Edit2,
  Ban,
  Package,
  User,
  Clock,
  Loader2
} from 'lucide-vue-next';

defineProps({
  movimientos: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false }
});

defineEmits(['editar', 'anular']);

function fechaFormateada(valor) {
  if (!valor) return '—';
  const fechaObj = new Date(valor);
  return {
    dia: fechaObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
    hora: fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  };
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm text-gray-600">
        <thead class="bg-gray-50/80 text-xs font-semibold uppercase text-gray-500 border-b border-gray-100">
          <tr>
            <th class="py-3.5 px-4">Fecha y Hora</th>
            <th class="py-3.5 px-4">Prenda / Insumo</th>
            <th class="py-3.5 px-3 text-center">Tipo</th>
            <th class="py-3.5 px-4">Concepto y Detalle</th>
            <th class="py-3.5 px-4 text-center">Cantidad</th>
            <th class="py-3.5 px-3 text-center">Estado</th>
            <th class="py-3.5 px-4">Responsable</th>
            <th class="py-3.5 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="movimiento in movimientos"
            :key="movimiento.id"
            class="hover:bg-pink-50/20 transition-colors"
            :class="{ 'opacity-60 bg-gray-50/50': movimiento.estado === 'Anulado' }"
          >
            <!-- Fecha y Hora -->
            <td class="py-3 px-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <Clock class="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p class="font-medium text-gray-900 text-xs sm:text-sm leading-tight">
                    {{ fechaFormateada(movimiento.fecha_registro).dia }}
                  </p>
                  <p class="text-[11px] text-gray-400">
                    {{ fechaFormateada(movimiento.fecha_registro).hora }}
                  </p>
                </div>
              </div>
            </td>

            <!-- Prenda / Insumo -->
            <td class="py-3 px-4">
              <div class="flex items-center gap-2.5">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                  :class="movimiento.materia_prima_id ? 'bg-amber-100 text-amber-800' : 'bg-pink-100 text-pink-700'"
                >
                  <Package class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-gray-900 text-sm leading-tight truncate">
                    {{ descripcionItem(movimiento) }}
                  </p>
                  <p class="text-[11px] text-gray-400 font-mono">
                    ID #{{ movimiento.id }}
                    <span v-if="movimiento.orden_produccion_id" class="text-indigo-600 font-semibold ml-1">
                      · OP #{{ movimiento.orden_produccion_id }}
                    </span>
                  </p>
                </div>
              </div>
            </td>

            <!-- Tipo de Movimiento -->
            <td class="py-3 px-3 text-center whitespace-nowrap">
              <span
                v-if="movimiento.tipo_movimiento === 'entrada'"
                class="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-700"
              >
                <ArrowDownLeft class="h-3.5 w-3.5 text-emerald-600" />
                Entrada
              </span>
              <span
                v-else-if="movimiento.tipo_movimiento === 'salida'"
                class="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-xs font-bold text-rose-700"
              >
                <ArrowUpRight class="h-3.5 w-3.5 text-rose-600" />
                Salida
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200/80 px-2.5 py-1 text-xs font-bold text-purple-700"
              >
                <SlidersHorizontal class="h-3 w-3 text-purple-600" />
                Ajuste
              </span>
            </td>

            <!-- Concepto y Observaciones -->
            <td class="py-3 px-4 max-w-xs">
              <p class="font-medium text-gray-800 text-sm leading-snug">
                {{ movimiento.concepto }}
              </p>
              <p
                v-if="movimiento.observaciones"
                class="text-xs text-gray-400 truncate mt-0.5"
                :title="movimiento.observaciones"
              >
                {{ movimiento.observaciones }}
              </p>
            </td>

            <!-- Cantidad y Efecto en Stock -->
            <td class="py-3 px-4 text-center whitespace-nowrap">
              <span
                class="text-sm font-extrabold"
                :class="{
                  'text-emerald-600': movimiento.tipo_movimiento === 'entrada',
                  'text-rose-600': movimiento.tipo_movimiento === 'salida',
                  'text-purple-700': movimiento.tipo_movimiento === 'ajuste'
                }"
              >
                {{ movimiento.tipo_movimiento === 'entrada' ? '+' : movimiento.tipo_movimiento === 'salida' ? '-' : '' }}{{ movimiento.cantidad }}
              </span>
              <span
                v-if="movimiento.diferencia !== undefined && movimiento.tipo_movimiento === 'ajuste'"
                class="block text-[11px] font-semibold text-gray-400"
              >
                ({{ movimiento.diferencia > 0 ? '+' : '' }}{{ movimiento.diferencia }})
              </span>
            </td>

            <!-- Estado -->
            <td class="py-3 px-3 text-center whitespace-nowrap">
              <span
                v-if="movimiento.estado === 'Activo'"
                class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60"
              >
                Activo
              </span>
              <span
                v-else
                class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 border border-gray-200"
              >
                Anulado
              </span>
            </td>

            <!-- Usuario Responsable -->
            <td class="py-3 px-4 whitespace-nowrap">
              <div class="flex items-center gap-1.5 text-xs text-gray-700">
                <div class="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 font-bold text-[10px]">
                  {{ (movimiento.usuario?.nombre || 'S')[0]?.toUpperCase() }}
                </div>
                <span>{{ movimiento.usuario?.nombre || movimiento.usuario?.name || 'Sistema' }}</span>
              </div>
            </td>

            <!-- Acciones -->
            <td class="py-3 px-4 text-right whitespace-nowrap">
              <div class="inline-flex items-center gap-1">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 transition"
                  :disabled="movimiento.estado === 'Anulado'"
                  title="Editar concepto y observaciones"
                  @click="$emit('editar', movimiento)"
                >
                  <Edit2 class="h-3 w-3 text-gray-500" />
                  <span class="hidden sm:inline">Editar</span>
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 hover:border-rose-300 disabled:opacity-40 transition"
                  :disabled="movimiento.estado === 'Anulado' || esDeProduccion(movimiento)"
                  :title="esDeProduccion(movimiento) ? 'Generado por orden de producción: revertir cancelando la orden' : 'Anular movimiento y revertir stock'"
                  @click="$emit('anular', movimiento)"
                >
                  <Ban class="h-3 w-3 text-rose-600" />
                  <span class="hidden sm:inline">Anular</span>
                </button>
              </div>
            </td>
          </tr>

          <!-- Estado Cargando -->
          <tr v-if="cargando">
            <td colspan="8" class="text-center py-16 text-gray-500">
              <div class="flex flex-col items-center justify-center gap-2">
                <Loader2 class="h-8 w-8 animate-spin text-corporativo-rosa" />
                <p class="font-medium text-sm">Consultando movimientos del kárdex...</p>
              </div>
            </td>
          </tr>

          <!-- Estado Vacío -->
          <tr v-else-if="!movimientos.length">
            <td colspan="8" class="text-center py-16 text-gray-500">
              <div class="flex flex-col items-center justify-center gap-2">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  <Package class="h-6 w-6" />
                </div>
                <p class="font-bold text-gray-800 text-base">No hay movimientos registrados</p>
                <p class="text-xs text-gray-400 max-w-sm">
                  No se encontraron movimientos con los filtros seleccionados o aún no se han registrado entradas ni salidas.
                </p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
