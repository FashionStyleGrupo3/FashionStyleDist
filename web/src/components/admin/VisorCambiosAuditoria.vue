<script setup>
import { computed, ref } from 'vue';
import { ChevronDown, ArrowRight, Plus, Pencil, Trash2, Globe, ShieldCheck } from 'lucide-vue-next';
import { describirAuditoria, etiquetaDia, tiempoRelativo, formatearFecha } from '@/utils/auditoriaTexto';

const props = defineProps({
  auditorias: { type: Array, default: () => [] }
});

const VISIBLES = 3;
const abiertos = ref(new Set());
const iconoAccion = { created: Plus, updated: Pencil, deleted: Trash2 };

function alternar(id) {
  const copia = new Set(abiertos.value);
  if (copia.has(id)) copia.delete(id);
  else copia.add(id);
  abiertos.value = copia;
}

function sujetoTexto(info) {
  if (!info.sujeto) return '';
  return info.sujeto.startsWith('#') ? info.sujeto : `«${info.sujeto}»`;
}

// Agrupa los movimientos por dá (Hoy, Ayer, lunes 26 de octubre...)
const grupos = computed(() => {
  const mapa = new Map();

  for (const item of props.auditorias) {
    const dia = etiquetaDia(item.created_at);
    if (!mapa.has(dia)) mapa.set(dia, []);
    mapa.get(dia).push({ item, info: describirAuditoria(item) });
  }

  return [...mapa].map(([dia, registros]) => ({ dia, registros }));
});
</script>

<template>
  <div>
    <div
      v-if="!grupos.length"
      class="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"
    >
      <ShieldCheck class="mx-auto h-8 w-8 text-gray-300" />
      <p class="mt-3 text-sm font-semibold text-gray-700">No hay movimientos para mostrar</p>
      <p class="mt-1 text-xs text-gray-500">Prueba con otro filtro o vuelve a actualizar la bitcora.</p>
    </div>

    <section v-for="grupo in grupos" :key="grupo.dia" class="mb-8 last:mb-0">
      <div class="mb-3 flex items-center gap-3">
        <h2 class="text-sm font-extrabold text-gray-900">{{ grupo.dia }}</h2>
        <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
          {{ grupo.registros.length }} {{ grupo.registros.length === 1 ? 'movimiento' : 'movimientos' }}
        </span>
        <div class="h-px flex-1 bg-gray-200"></div>
      </div>

      <div class="space-y-3">
        <article
          v-for="{ item, info } in grupo.registros"
          :key="item.id"
          class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300"
          :class="info.soloInterno ? 'opacity-70' : ''"
        >
          <div class="flex items-start gap-3">
            <!-- Icono del tipo de registro con marca de la accion -->
            <div class="relative shrink-0">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <component :is="info.modelo.icono" class="h-5 w-5" />
              </div>
              <span
                class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-white"
                :class="info.accion.punto"
              >
                <component :is="iconoAccion[item.accion] || Pencil" class="h-3 w-3" />
              </span>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm leading-relaxed text-gray-700">
                  <strong class="text-gray-900">{{ info.actor }}</strong>
                  {{ info.verbo }}
                  {{ info.modelo.articulo }} {{ info.modelo.nombre }}
                  <strong v-if="info.sujeto" class="text-gray-900">{{ sujetoTexto(info) }}</strong>
                </p>

                <div class="shrink-0 text-right">
                  <span
                    class="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ring-1"
                    :class="info.accion.clases"
                  >
                    {{ info.accion.etiqueta }}
                  </span>
                  <p class="mt-1 text-[11px] text-gray-400" :title="formatearFecha(item.created_at)">
                    {{ tiempoRelativo(item.created_at) }}
                  </p>
                </div>
              </div>

              <!-- Cambio interno sin datos visibles -->
              <p v-if="info.soloInterno" class="mt-2 text-xs text-gray-500">
                Ajuste interno de la cuenta (por ejemplo, un código de seguridad). No cambi datos visibles.
              </p>

              <!-- Modificacion: antes → ahora -->
              <ul v-else-if="info.cambios.length" class="mt-3 space-y-1.5">
                <li
                  v-for="cambio in abiertos.has(item.id) ? info.cambios : info.cambios.slice(0, VISIBLES)"
                  :key="cambio.campo"
                  class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs"
                >
                  <span class="w-36 shrink-0 font-semibold text-gray-500">{{ cambio.etiqueta }}</span>
                  <span class="text-gray-400 line-through decoration-gray-300">{{ cambio.antes }}</span>
                  <ArrowRight class="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span class="font-bold text-gray-900">{{ cambio.nuevo }}</span>
                </li>
              </ul>

              <!-- Creacion / eliminacion: datos principales -->
              <div v-else-if="info.datos.length" class="mt-3">
                <dl
                  v-if="abiertos.has(item.id)"
                  class="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  <div
                    v-for="dato in info.datos"
                    :key="dato.campo"
                    class="rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{{ dato.etiqueta }}</dt>
                    <dd class="mt-0.5 break-words text-xs font-semibold text-gray-900">{{ dato.valor }}</dd>
                  </div>
                </dl>

                <div v-else class="flex flex-wrap gap-2">
                  <span
                    v-for="dato in info.datos.slice(0, VISIBLES)"
                    :key="dato.campo"
                    class="rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600"
                  >
                    {{ dato.etiqueta }}: <strong class="text-gray-900">{{ dato.valor }}</strong>
                  </span>
                </div>
              </div>

              <!-- Pie: más detalles -->
              <div v-if="!info.soloInterno" class="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  v-if="info.cambios.length > VISIBLES || info.datos.length > VISIBLES || abiertos.has(item.id)"
                  type="button"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
                  @click="alternar(item.id)"
                >
                  <ChevronDown
                    class="h-4 w-4 transition-transform"
                    :class="abiertos.has(item.id) ? 'rotate-180' : ''"
                  />
                  {{
                    abiertos.has(item.id)
                      ? 'Mostrar menos'
                      : `Ver ${Math.max(info.cambios.length, info.datos.length) - VISIBLES} más`
                  }}
                </button>
                <span v-else></span>

                <span class="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Globe class="h-3 w-3" />
                  {{ formatearFecha(item.created_at) }} · IP {{ item.ip || 'no registrada' }}
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>