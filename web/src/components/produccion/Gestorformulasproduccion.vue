<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { Plus, Pencil, Trash2 } from 'lucide-vue-next';
import {
  formulasProduccionApi, materiasPrimasApi, proveedoresApi,
  unidadesMedidaApi, listarProductos, unidadDe, mensajeError,
} from '@/services/Produccionservicio';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import ModalFormulaProduccion from '@/components/produccion/Modalformulaproduccion.vue';

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError } = useNotificacion();

const productos = ref([]);
const materias = ref([]);
const proveedores = ref([]);
const unidades = ref([]);
const formulas = ref([]);

const productoId = ref('');
const cargando = ref(false);
const modal = ref({ abierto: false, formula: null });

const materiaPorId = computed(() => {
  const mapa = {};
  materias.value.forEach((m) => (mapa[String(m.id_material)] = m));
  return mapa;
});

const proveedorPorId = computed(() => {
  const mapa = {};
  proveedores.value.forEach((p) => (mapa[String(p.id)] = p));
  return mapa;
});

const lineas = computed(() => {
  if (!productoId.value) return [];
  const grupo = formulas.value.find((g) => String(g.producto_id) === String(productoId.value));
  return (grupo?.consumos ?? []).map((c) => {
    const materia = materiaPorId.value[String(c.materia_prima_id)];
    const cantidad = Number(c.cantidad ?? 0);
    const desperdicio = Number(c.desperdicio_porcentaje ?? 0);
    const consumo = cantidad * (1 + desperdicio / 100);
    const costoUnitario = Number(c.costo_unitario_estimado) || Number(materia?.costo_unitario ?? 0);
    return {
      ...c, materia, proveedor: proveedorPorId.value[String(c.proveedor_id)],
      unidad: c.unidad || unidadDe(materia, unidades.value),
      cantidad, desperdicio, consumo, costo: consumo * costoUnitario,
    };
  });
});

const costoMaterialesPrenda = computed(() => lineas.value.reduce((acc, l) => acc + l.costo, 0));

async function cargarBase({ silencioso = false } = {}) {
  if (!silencioso) cargando.value = true;
  try {
    [productos.value, materias.value, proveedores.value, unidades.value] = await Promise.all([
      listarProductos(), materiasPrimasApi.listar(), proveedoresApi.listar(), unidadesMedidaApi.listar(),
    ]);
    await cargarFormulas();
  } catch (error) {
    if (!silencioso) notificarError(mensajeError(error, 'No se pudieron cargar los datos de producción.'));
  } finally {
    if (!silencioso) cargando.value = false;
  }
}

async function cargarFormulas() {
  formulas.value = await formulasProduccionApi.listar();
}

function abrirModal(formula = null) {
  modal.value = { abierto: true, formula };
}

async function alGuardar() {
  modal.value.abierto = false;
  try { await cargarFormulas(); } catch (error) { notificarError(mensajeError(error, 'Error al refrescar.')); }
}

async function quitar(linea) {
  const nombre = linea.materia?.nombre ?? 'este insumo';
  if (!window.confirm(`¿Quitar ${nombre} de la fórmula?`)) return;
  try {
    await formulasProduccionApi.eliminar(linea.id_formula);
    notificarExito('Insumo quitado.');
    await cargarFormulas();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo quitar.'));
  }
}

onMounted(() => cargarBase());
useRecargaAutomatica(() => cargarBase({ silencioso: true }), { intervaloSondeo: 60000 });
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="w-full sm:max-w-md">
        <label class="block text-sm font-medium text-gray-700 mb-1">Prenda</label>
        <select v-model="productoId" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40">
          <option value="" disabled>Selecciona una prenda</option>
          <option v-for="p in productos" :key="p.id_producto" :value="p.id_producto">
            {{ p.nombre }}<template v-if="p.codigo"> — {{ p.codigo }}</template>
          </option>
        </select>
      </div>
      <button :disabled="!productoId" class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50" @click="abrirModal()">
        <Plus class="h-4 w-4" /> Agregar insumo
      </button>
    </div>

    <div v-if="!productoId" class="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
      Elige una prenda para ver o armar su receta.
    </div>

    <div v-else class="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-3">Insumo</th>
              <th class="px-4 py-3 text-right">Cant. por prenda</th>
              <th class="px-4 py-3 text-right">Desperdicio</th>
              <th class="px-4 py-3 text-right">Consumo real</th>
              <th class="px-4 py-3">Proveedor</th>
              <th class="px-4 py-3 text-right">Costo</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="cargando"><td colspan="7" class="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            <tr v-else-if="!lineas.length"><td colspan="7" class="px-4 py-8 text-center text-gray-500">Esta prenda no tiene insumos.</td></tr>
            <tr v-for="l in lineas" :key="l.id_formula">
              <td class="px-4 py-3 font-medium text-gray-900">{{ l.materia?.nombre ?? `Insumo #${l.materia_prima_id}` }}</td>
              <td class="px-4 py-3 text-right text-gray-700">{{ l.cantidad.toLocaleString('es-CO', { maximumFractionDigits: 4 }) }} <span class="text-gray-400">{{ l.unidad }}</span></td>
              <td class="px-4 py-3 text-right text-gray-700">{{ l.desperdicio }}%</td>
              <td class="px-4 py-3 text-right text-gray-900">{{ l.consumo.toLocaleString('es-CO', { maximumFractionDigits: 4 }) }}</td>
              <td class="px-4 py-3 text-gray-600">{{ l.proveedor?.nombre ?? '—' }}</td>
              <td class="px-4 py-3 text-right text-gray-900">{{ formatearCOP(l.costo) }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button class="p-2 text-gray-500 hover:text-corporativo-rosa" @click="abrirModal(l)"><Pencil class="h-4 w-4" /></button>
                  <button class="p-2 text-gray-500 hover:text-red-600" @click="quitar(l)"><Trash2 class="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="lineas.length" class="bg-gray-50">
            <tr>
              <td colspan="5" class="px-4 py-3 text-right text-sm font-medium text-gray-700">Costo de materiales por prenda</td>
              <td class="px-4 py-3 text-right font-semibold text-corporativo-rosa">{{ formatearCOP(costoMaterialesPrenda) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    
    <ModalFormulaProduccion
      v-if="modal.abierto"
      :formula="modal.formula"
      :producto-id="productoId"
      :materias="materias"
      :proveedores="proveedores"
      :unidades="unidades"
      :insumos-en-receta="lineas"
      @cerrar="modal.abierto = false"
      @guardado="alGuardar"
    />
  </div>
</template>
