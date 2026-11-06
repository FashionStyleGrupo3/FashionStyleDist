<script setup>
import { computed, ref, watch } from 'vue';
import { X, Tag, Trash2, Pencil, Loader2, Globe, Shirt } from 'lucide-vue-next';
import {
  listarPromociones,
  crearPromocion,
  actualizarPromocion,
  eliminarPromocion,
  estaVigente
} from '@/services/promocionServicio';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { useNotificacion } from '@/composables/useNotificacion';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  productos: { type: Array, default: () => [] },
  productoInicial: { type: Object, default: null }
});

const emit = defineEmits(['cerrar', 'actualizado']);

const authStore = useAutenticacionStore();
const { notificarExito, notificarError } = useNotificacion();
const { formatearCOP } = useFormatoMoneda();

const promociones = ref([]);
const cargando = ref(false);
const guardando = ref(false);
const editandoId = ref(null);
const errores = ref({});

function formularioVacio() {
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    nombre: '',
    descripcion: '',
    alcance: props.productoInicial ? 'prenda' : 'global',
    idProducto: props.productoInicial?.id_producto ?? props.productoInicial?.id ?? '',
    tipo: 'porcentaje',
    valor: 10,
    fechaInicio: hoy,
    fechaFin: '',
    activa: true,
    usuario_id: authStore.usuario?.id_usuario || authStore.usuario?.id || 1
  };
}

const form = ref(formularioVacio());

const promocionesFiltradas = computed(() => {
  const id = props.productoInicial?.id_producto ?? props.productoInicial?.id;
  if (!id) return promociones.value;
  return promociones.value.filter((p) => p.idProducto === null || Number(p.idProducto) === Number(id));
});

async function cargar() {
  cargando.value = true;
  try {
    promociones.value = await listarPromociones();
  } catch (e) {
    notificarError(e?.response?.data?.message || 'No se pudieron cargar las promociones.');
  } finally {
    cargando.value = false;
  }
}

function validar() {
  const e = {};
  const f = form.value;
  const textoValor = String(f.valor ?? '').trim();
  const valor = Number(textoValor);

  if (!String(f.nombre).trim()) e.nombre = 'El nombre es obligatorio.';
  if (f.alcance === 'prenda' && !f.idProducto) e.idProducto = 'Selecciona una prenda.';
  if (!/^\d+$/.test(textoValor) || !Number.isSafeInteger(valor) || valor <= 0) e.valor = 'El descuento debe ser un entero mayor a 0.';
  if (f.tipo === 'porcentaje' && valor > 90) e.valor = 'El porcentaje máximo permitido es 90%.';
  if (f.tipo === 'monto' && valor > 100000000) e.valor = 'El monto máximo permitido es $100.000.000.';
  if (f.fechaFin && f.fechaInicio && f.fechaFin < f.fechaInicio) {
    e.fechaFin = 'La fecha fin no puede ser anterior a la de inicio.';
  }

  errores.value = e;
  return Object.keys(e).length === 0;
}

async function guardar() {
  if (!validar()) return;
  guardando.value = true;
  try {
    const payload = {
      ...form.value,
      valor: Number(form.value.valor),
      usuario_id: authStore.usuario?.id_usuario || authStore.usuario?.id || 1
    };
    if (editandoId.value) {
      await actualizarPromocion(editandoId.value, payload);
      notificarExito('Promoción actualizada.');
    } else {
      await crearPromocion(payload);
      notificarExito('Promoción creada.');
    }
    cancelarEdicion();
    await cargar();
    emit('actualizado');
  } catch (e) {
    const backErrores = e?.response?.data?.errors;
    if (backErrores) {
      errores.value = Object.fromEntries(Object.entries(backErrores).map(([k, v]) => [k, [].concat(v)[0]]));
    }
    notificarError(e?.response?.data?.message || 'No se pudo guardar la Promoción.');
  } finally {
    guardando.value = false;
  }
}

function editar(promo) {
  editandoId.value = promo.id;
  errores.value = {};
  form.value = {
    nombre: promo.nombre,
    descripcion: promo.descripcion,
    alcance: promo.idProducto ? 'prenda' : 'global',
    idProducto: promo.idProducto ?? '',
    tipo: promo.tipo,
    valor: promo.valor,
    fechaInicio: promo.fechaInicio ? String(promo.fechaInicio).slice(0, 10) : '',
    fechaFin: promo.fechaFin ? String(promo.fechaFin).slice(0, 10) : '',
    activa: promo.activa,
    usuario_id: authStore.usuario?.id_usuario || authStore.usuario?.id || 1
  };
}

function cancelarEdicion() {
  editandoId.value = null;
  errores.value = {};
  form.value = formularioVacio();
}

function actualizarValor(evento) {
  let valor = String(evento.target.value ?? '').replace(/[^0-9]/g, '').slice(0, 9);
  form.value.valor = valor;
  evento.target.value = valor;
  errores.value = { ...errores.value, valor: /^\d+$/.test(valor) && Number(valor) > 0 ? '' : 'Usa solo números enteros mayores a 0.' };
}

async function borrar(promo) {
  if (!window.confirm(`¿Eliminar la Promoción "${promo.nombre}"?`)) return;
  try {
    await eliminarPromocion(promo.id);
    notificarExito('Promoción eliminada.');
    await cargar();
    emit('actualizado');
  } catch (e) {
    notificarError(e?.response?.data?.message || 'No se pudo eliminar la Promoción.');
  }
}

function textoDescuento(p) {
  return p.tipo === 'porcentaje' ? `-${p.valor}%` : `-${formatearCOP(p.valor)}`;
}

function nombreProducto(p) {
  if (!p.idProducto) return 'Todas las prendas';
  return p.nombreProducto
    || props.productos.find((x) => Number(x.id_producto ?? x.id) === Number(p.idProducto))?.nombre
    || `Prenda #${p.idProducto}`;
}

watch(
  () => props.abierto,
  (abierto) => {
    if (abierto) {
      cancelarEdicion();
      cargar();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="abierto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('cerrar')"></div>

    <div class="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header class="flex items-center justify-between border-b border-gray-100 p-5">
        <div class="flex items-center gap-2">
          <Tag class="h-5 w-5 text-corporativo-rosa" />
          <h2 class="text-lg font-bold text-gray-900">
            Promociones
            <span v-if="productoInicial" class="text-sm font-medium text-gray-500">· {{ productoInicial.nombre }}</span>
          </h2>
        </div>
        <button type="button" class="rounded-lg p-1 text-gray-400 hover:text-gray-700" @click="emit('cerrar')">
          <X class="h-5 w-5" />
        </button>
      </header>

      <div class="grid flex-1 gap-6 overflow-y-auto p-5 md:grid-cols-2">
        <form class="space-y-3" @submit.prevent="guardar">
          <h3 class="text-sm font-bold text-gray-800">{{ editandoId ? 'Editar Promocion' : 'Nueva Promocion' }}</h3>

          <div>
            <input v-model="form.nombre" type="text" maxlength="100" placeholder="Nombre (ej. Black Friday) *"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none" @input="(e)=>{ form.nombre = String(e.target.value).slice(0,100); e.target.value = form.nombre; }" />
            <p v-if="errores.nombre" class="mt-1 text-xs text-red-600">{{ errores.nombre }}</p>
          </div>

          <textarea v-model="form.descripcion" rows="2" maxlength="500" placeholder="Descripción (opcional)"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none" @input="(e)=>{ form.descripcion = String(e.target.value).slice(0,500); e.target.value = form.descripcion; }"></textarea>

          <div class="grid grid-cols-2 gap-2">
            <button type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
              :class="form.alcance === 'global' ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa' : 'border-gray-300 text-gray-600'"
              @click="form.alcance = 'global'">
              <Globe class="h-4 w-4" /> Global
            </button>
            <button type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
              :class="form.alcance === 'prenda' ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa' : 'border-gray-300 text-gray-600'"
              @click="form.alcance = 'prenda'">
              <Shirt class="h-4 w-4" /> Por prenda
            </button>
          </div>

          <div v-if="form.alcance === 'prenda'">
            <select v-model="form.idProducto"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none">
              <option value="" disabled>Selecciona la prenda</option>
              <option v-for="p in productos" :key="p.id_producto ?? p.id" :value="p.id_producto ?? p.id">{{ p.nombre }}</option>
            </select>
            <p v-if="errores.idProducto || errores.producto_id" class="mt-1 text-xs text-red-600">
              {{ errores.idProducto || errores.producto_id }}
            </p>
          </div>

          <div class="grid grid-cols-[auto_1fr] gap-2">
            <select v-model="form.tipo"
              class="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none">
              <option value="porcentaje">%</option>
              <option value="monto">$ COP</option>
            </select>
            <input :value="form.valor" type="text" inputmode="numeric" maxlength="9" @input="actualizarValor"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none" />
          </div>
          <p v-if="errores.valor" class="text-xs text-red-600">{{ errores.valor }}</p>

          <div class="grid grid-cols-2 gap-2">
            <label class="text-xs text-gray-600">Inicio
              <input v-model="form.fechaInicio" type="date"
                class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none" />
            </label>
            <label class="text-xs text-gray-600">Fin (opcional)
              <input v-model="form.fechaFin" type="date"
                class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none" />
            </label>
          </div>
          <p v-if="errores.fechaFin || errores.fecha_fin" class="text-xs text-red-600">{{ errores.fechaFin || errores.fecha_fin }}</p>

          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input v-model="form.activa" type="checkbox" class="rounded text-corporativo-rosa" /> Activa
          </label>

          <div class="flex gap-2 pt-1">
            <button type="submit" :disabled="guardando"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-corporativo-rosa py-2.5 text-sm font-bold text-white hover:bg-corporativo-rosa-hover disabled:opacity-50">
              <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
              {{ editandoId ? 'Guardar cambios' : 'Crear Promocion' }}
            </button>
            <button v-if="editandoId" type="button" class="rounded-xl border border-gray-300 px-3 text-sm text-gray-600"
              @click="cancelarEdicion">Cancelar</button>
          </div>
        </form>

        <div>
          <h3 class="mb-3 text-sm font-bold text-gray-800">Promociones registradas</h3>
          <div v-if="cargando" class="flex items-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 class="h-4 w-4 animate-spin" /> Cargando...
          </div>
          <p v-else-if="!promocionesFiltradas.length" class="py-6 text-sm text-gray-500">Año no hay promociones.</p>
          <ul v-else class="space-y-2">
            <li v-for="p in promocionesFiltradas" :key="p.id" class="rounded-xl border border-gray-200 p-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-gray-900">{{ p.nombre }}</p>
                  <p class="text-xs text-gray-500">{{ nombreProducto(p) }}</p>
                  <p class="mt-1 text-xs text-gray-500">
                    {{ p.fechaInicio ? String(p.fechaInicio).slice(0, 10) : 'Sin inicio' }} →
                    {{ p.fechaFin ? String(p.fechaFin).slice(0, 10) : 'Sin fin' }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1">
                  <span class="rounded-full bg-corporativo-rosa px-2 py-0.5 text-xs font-bold text-white">{{ textoDescuento(p) }}</span>
                  <span class="text-[10px] font-semibold"
                    :class="estaVigente(p) ? 'text-emerald-600' : 'text-gray-400'">
                    {{ estaVigente(p) ? 'Vigente' : 'No vigente' }}
                  </span>
                </div>
              </div>
              <div class="mt-2 flex justify-end gap-3">
                <button type="button" class="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-corporativo-rosa" @click="editar(p)">
                  <Pencil class="h-3.5 w-3.5" /> Editar
                </button>
                <button type="button" class="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-red-600" @click="borrar(p)">
                  <Trash2 class="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
