<script setup>
import { onMounted, ref } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import VisorCambiosAuditoria from '@/components/admin/VisorCambiosAuditoria.vue';
import { obtenerAuditorias, obtenerUsuarios } from '@/services/seguridadServicio';

const MODELOS_FILTRO = [
  { etiqueta: 'Todo', valor: '' },
  { etiqueta: 'Productos', valor: 'Producto' },
  { etiqueta: 'Ventas', valor: 'Venta' },
  { etiqueta: 'Inventario', valor: 'Inventario' },
  { etiqueta: 'Usuarios', valor: 'User' }
];

const auditorias = ref([]);
const usuarios = ref([]);
const cargando = ref(false);
const error = ref('');
const filtros = ref({ modelo: '', usuario_id: '' });
const pagina = ref(1);
const ultimaPagina = ref(1);
const total = ref(0);

function mostrarError(e) { return Object.values(e.response?.data?.errors || {}).flat()[0] || e.response?.data?.message || 'No se pudo consultar la Bitácora.'; }
async function cargar({ silencioso = false } = {}) { if (!silencioso) { cargando.value = true; error.value = ''; } try { const resultado = await obtenerAuditorias({ ...filtros.value, page: pagina.value }); auditorias.value = resultado.items; pagina.value = resultado.currentPage; ultimaPagina.value = resultado.lastPage; total.value = resultado.total; } catch (e) { if (!silencioso) error.value = mostrarError(e); } finally { if (!silencioso) cargando.value = false; } }
function buscar() { pagina.value = 1; cargar(); }
function mover(delta) { const nueva = pagina.value + delta; if (nueva >= 1 && nueva <= ultimaPagina.value) { pagina.value = nueva; cargar(); } }
onMounted(cargar);
useRecargaAutomatica(() => cargar({ silencioso: true }), { intervaloSondeo: 60000 });
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-end">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-corporativo-rosa">CONTROL Y TRAZABILIDAD</p>
        <h1 class="mt-1 text-2xl font-extrabold font-titulos text-gray-900">Bitácora de actividad</h1>
        <p class="mt-1 text-sm text-gray-500">
          Consulta quien hizo cada cambio en la tienda, cuandodo lo hizo y qué datos se modificaron.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
        @click="cargar"
      >
        <RefreshCw class="h-4 w-4" :class="cargando ? 'animate-spin' : ''" />
        Actualizar
      </button>
    </div>

    <div class="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opcion in MODELOS_FILTRO"
          :key="opcion.valor"
          type="button"
          class="rounded-full px-4 py-1.5 text-xs font-bold transition"
          :class="
            filtros.modelo === opcion.valor
              ? 'bg-corporativo-rosa text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          "
          @click="elegirModelo(opcion.valor)"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>

      <label class="flex items-center gap-2 text-xs font-semibold text-gray-600">
        Responsable
        <select
          v-model="filtros.usuario_id"
          class="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-800"
          @change="buscar"
        >
          <option value="">Todas las personas</option>
          <option v-for="u in usuarios" :key="u.id_usuario" :value="u.id_usuario">
            {{ u.nombre }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <div v-if="cargando && !auditorias.length" class="space-y-3">
      <div v-for="n in 4" :key="n" class="h-24 animate-pulse rounded-2xl bg-gray-100"></div>
    </div>

    <VisorCambiosAuditoria v-else :auditorias="auditorias" />

    <div class="flex items-center justify-between text-sm text-gray-500">
      <span>{{ total }} {{ total === 1 ? 'movimiento registrado' : 'movimientos registrados' }}</span>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-gray-200 bg-white p-2 disabled:opacity-40"
          :disabled="pagina <= 1"
          @click="mover(-1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span>página {{ pagina }} de {{ ultimaPagina }}</span>
        <button
          type="button"
          class="rounded-lg border border-gray-200 bg-white p-2 disabled:opacity-40"
          :disabled="pagina >= ultimaPagina"
          @click="mover(1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>