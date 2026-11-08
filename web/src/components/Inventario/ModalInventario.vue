<script setup>
import { computed, watch } from 'vue';
import { filtrarNumero } from '@/utils/validacionCampos';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Package,
  Layers,
  Sparkles,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-vue-next';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  editando: { type: Object, default: null },
  variantes: { type: Array, default: () => [] },
  form: { type: Object, required: true },
  guardando: { type: Boolean, default: false }
});

const emit = defineEmits(['guardar', 'cerrar']);

function bloquearNotacionCientifica(evento) {
  if (['e', 'E', '+', '-', '.', ','].includes(evento.key)) {
    evento.preventDefault();
  }
}

function actualizarCantidad(evento) {
  const valor = filtrarNumero(evento.target.value, 7);
  props.form.cantidad = valor;
  evento.target.value = valor;
}

function sumarCantidad(extra) {
  const actual = Number(props.form.cantidad) || 0;
  props.form.cantidad = Math.min(1000000, actual + extra);
}

function establecerCantidad(total) {
  props.form.cantidad = total;
}

// Conceptos sugeridos por tipo
const conceptosSugeridos = {
  entrada: [
    'Recepción de confección / compra',
    'Reposición de stock agotado',
    'Devolución de cliente',
    'Corrección de conteo'
  ],
  salida: [
    'Uso o merma interna de taller',
    'Prenda dañada / defecto de tela',
    'Muestra comercial / exhibición',
    'Ajuste por faltante'
  ],
  ajuste: [
    'Ajuste de conteo físico periódico',
    'Auditoría de bodega de fin de mes',
    'Corrección de inventario inicial'
  ]
};

function aplicarConcepto(texto) {
  props.form.concepto = texto;
}

const varianteSeleccionada = computed(() => {
  if (!props.form.variante_id) return null;
  return props.variantes.find((v) => String(v.id_variante) === String(props.form.variante_id));
});

// Cálculo proyectado del stock
const stockActual = computed(() => {
  return Math.max(0, Number(varianteSeleccionada.value?.stock || 0));
});

const stockProyectado = computed(() => {
  if (!varianteSeleccionada.value) return null;
  const cant = Number(props.form.cantidad) || 0;
  if (props.form.tipo_movimiento === 'entrada') {
    return stockActual.value + cant;
  }
  if (props.form.tipo_movimiento === 'salida') {
    return stockActual.value - cant;
  }
  if (props.form.tipo_movimiento === 'ajuste') {
    return cant;
  }
  return stockActual.value;
});

const stockInsuficiente = computed(() => {
  return props.form.tipo_movimiento === 'salida' && (stockProyectado.value ?? 0) < 0;
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      class="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm transition-all"
      @click.self="!guardando && $emit('cerrar')"
    >
      <div
        class="relative w-full max-w-xl my-auto overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 transition-all transform animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <!-- Encabezado con degradado sutil -->
        <div class="relative bg-gradient-to-r from-gray-50 via-pink-50/30 to-white px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporativo-rosa/10 text-corporativo-rosa">
              <Package class="h-5 w-5" />
            </div>
            <div>
              <span class="text-[11px] font-bold tracking-widest uppercase text-corporativo-rosa">
                GESTIÓN DE INVENTARIO
              </span>
              <h2 class="text-lg font-black text-gray-900 tracking-tight leading-tight">
                {{ editando ? 'Editar Movimiento' : 'Registrar Movimiento' }}
              </h2>
            </div>
          </div>

          <button
            type="button"
            class="rounded-xl p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            :disabled="guardando"
            aria-label="Cerrar ventana"
            @click="$emit('cerrar')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="$emit('guardar')" class="p-6 space-y-5">
          <!-- Si es edición simple -->
          <div v-if="editando" class="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800">
            <p class="font-bold">Modo de edición limitado</p>
            <p class="mt-0.5">Por trazabilidad y cuadre contable, solo puedes modificar el concepto y las observaciones del movimiento.</p>
          </div>

          <template v-if="!editando">
            <!-- 1. Selector Visual de Tipo de Movimiento -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                1. Tipo de Movimiento *
              </label>
              <div class="grid grid-cols-3 gap-2.5">
                <!-- Entrada -->
                <button
                  type="button"
                  class="flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center"
                  :class="
                    form.tipo_movimiento === 'entrada'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  "
                  @click="form.tipo_movimiento = 'entrada'"
                >
                  <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-1.5">
                    <ArrowDownLeft class="h-4 w-4" />
                  </div>
                  <span class="text-xs font-bold">Entrada (+)</span>
                  <span class="text-[10px] text-gray-400">Ingreso a bodega</span>
                </button>

                <!-- Salida -->
                <button
                  type="button"
                  class="flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center"
                  :class="
                    form.tipo_movimiento === 'salida'
                      ? 'border-rose-500 bg-rose-50/60 text-rose-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  "
                  @click="form.tipo_movimiento = 'salida'"
                >
                  <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 mb-1.5">
                    <ArrowUpRight class="h-4 w-4" />
                  </div>
                  <span class="text-xs font-bold">Salida (-)</span>
                  <span class="text-[10px] text-gray-400">Merma o egreso</span>
                </button>

                <!-- Ajuste -->
                <button
                  type="button"
                  class="flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center"
                  :class="
                    form.tipo_movimiento === 'ajuste'
                      ? 'border-purple-500 bg-purple-50/60 text-purple-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  "
                  @click="form.tipo_movimiento = 'ajuste'"
                >
                  <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 mb-1.5">
                    <SlidersHorizontal class="h-4 w-4" />
                  </div>
                  <span class="text-xs font-bold">Ajuste (~)</span>
                  <span class="text-[10px] text-gray-400">Conteo físico</span>
                </button>
              </div>
            </div>

            <!-- 2. Prenda / Variante -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                2. Prenda y Talla *
              </label>
              <select
                v-model="form.variante_id"
                required
                class="w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-800 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
              >
                <option value="">Selecciona una prenda / talla...</option>
                <option
                  v-for="variante in variantes"
                  :key="variante.id_variante"
                  :value="variante.id_variante"
                >
                  {{ variante.label }} (Stock actual: {{ variante.stock ?? 0 }})
                </option>
              </select>
            </div>

            <!-- Tarjeta de vista previa de stock proyectado -->
            <div
              v-if="varianteSeleccionada"
              class="rounded-2xl border p-3.5 transition-all"
              :class="stockInsuficiente ? 'border-rose-300 bg-rose-50/60' : 'border-gray-200 bg-gray-50/70'"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-gray-600">Stock Actual en Bodega:</span>
                <span class="font-black text-gray-900 text-sm">{{ stockActual }} unidades</span>
              </div>

              <div class="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs">
                <span class="font-semibold text-gray-600">Stock Resultante Estimado:</span>
                <div class="flex items-center gap-1.5">
                  <span
                    class="font-black text-base"
                    :class="stockInsuficiente ? 'text-rose-600' : 'text-emerald-600'"
                  >
                    {{ stockProyectado ?? stockActual }} unidades
                  </span>
                  <span
                    v-if="stockProyectado !== null && stockProyectado !== stockActual"
                    class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                    :class="stockProyectado > stockActual ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                  >
                    {{ stockProyectado > stockActual ? `+${stockProyectado - stockActual}` : stockProyectado - stockActual }}
                  </span>
                </div>
              </div>

              <p v-if="stockInsuficiente" class="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1">
                <AlertCircle class="h-3.5 w-3.5" />
                No hay suficiente stock disponible para registrar esta salida.
              </p>
            </div>

            <!-- 3. Cantidad y chips rápidos -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {{ form.tipo_movimiento === 'ajuste' ? '3. Stock Físico Final Contado *' : '3. Cantidad de Unidades *' }}
                </label>
                <!-- Atajos rápidos -->
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="rounded-lg bg-gray-100 hover:bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600 transition"
                    @click="sumarCantidad(1)"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-gray-100 hover:bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600 transition"
                    @click="sumarCantidad(5)"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-gray-100 hover:bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600 transition"
                    @click="sumarCantidad(10)"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-gray-100 hover:bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600 transition"
                    @click="sumarCantidad(50)"
                  >
                    +50
                  </button>
                </div>
              </div>

              <input
                :value="form.cantidad"
                type="number"
                inputmode="numeric"
                min="0"
                max="1000000"
                step="1"
                required
                placeholder="Ejemplo: 12"
                class="w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-base font-bold text-gray-900 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
                @keydown="bloquearNotacionCientifica"
                @input="actualizarCantidad"
              />
              <p class="mt-1 text-[11px] text-gray-400">
                {{ form.tipo_movimiento === 'ajuste' ? 'Ingresa la cantidad exacta que hay en la estantería física.' : 'Solo números enteros mayores a cero.' }}
              </p>
            </div>
          </template>

          <!-- 4. Concepto -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Concepto del Movimiento *
            </label>
            <input
              v-model="form.concepto"
              type="text"
              maxlength="100"
              required
              placeholder="Ejemplo: Compra a proveedor, conteo físico mensual..."
              class="w-full h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-800 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
            />

            <!-- Chips de conceptos rápidos -->
            <div
              v-if="!editando && conceptosSugeridos[form.tipo_movimiento]"
              class="flex flex-wrap gap-1.5 mt-2"
            >
              <button
                v-for="sug in conceptosSugeridos[form.tipo_movimiento]"
                :key="sug"
                type="button"
                class="rounded-lg border border-gray-200 bg-gray-50/70 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-700 transition"
                @click="aplicarConcepto(sug)"
              >
                {{ sug }}
              </button>
            </div>
          </div>

          <!-- 5. Observaciones -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Observaciones (Opcional)
            </label>
            <textarea
              v-model="form.observaciones"
              rows="2"
              maxlength="500"
              placeholder="Detalles adicionales, número de factura del proveedor, causa de la merma..."
              class="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition resize-none"
            ></textarea>
          </div>

          <!-- Acciones del Modal -->
          <div class="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              class="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              :disabled="guardando"
              @click="$emit('cerrar')"
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-pink-700 transition disabled:opacity-50"
              :disabled="guardando || stockInsuficiente"
            >
              <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
              <span>{{ guardando ? 'Guardando...' : editando ? 'Actualizar Movimiento' : 'Confirmar Movimiento' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
