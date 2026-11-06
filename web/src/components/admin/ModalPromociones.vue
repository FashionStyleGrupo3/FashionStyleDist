<script setup>
import { computed, ref, watch } from 'vue';
import {
  X, Tag, Trash2, Pencil, Loader2, Globe, Shirt, CalendarDays, AlertTriangle, Plus,
  Percent, DollarSign, Check, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-vue-next';
import {
  listarPromociones,
  crearPromocion,
  actualizarPromocion,
  eliminarPromocion
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
const confirmandoId = ref(null);
const filtro = ref('todas');
const vista = ref('lista'); // 'lista' | 'formulario'
const paso = ref(1);
const errores = ref({});
const errorEnvio = ref('');

const PASOS = [
  { id: 1, titulo: 'Detalles' },
  { id: 2, titulo: 'Aplicar a' },
  { id: 3, titulo: 'Descuento' },
  { id: 4, titulo: 'Vigencia' }
];
const PORCENTAJES_RAPIDOS = [10, 15, 20, 30, 50];

const claseCampo =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100';

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formularioVacio() {
  return {
    nombre: '',
    descripcion: '',
    alcance: props.productoInicial ? 'prenda' : 'global',
    idProducto: props.productoInicial?.id_producto ?? props.productoInicial?.id ?? '',
    tipo: 'porcentaje',
    valor: 10,
    fechaInicio: hoyISO(),
    fechaFin: '',
    activa: true,
    usuario_id: authStore.usuario?.id_usuario || authStore.usuario?.id || 1
  };
}

const form = ref(formularioVacio());

/* ---------- Estado de cada promoción ---------- */

const dia = (valor) => (valor ? String(valor).slice(0, 10) : '');

function estadoPromo(p) {
  if (!p.activa) return 'inactiva';
  const hoy = hoyISO();
  if (dia(p.fechaFin) && dia(p.fechaFin) < hoy) return 'vencida';
  if (dia(p.fechaInicio) && dia(p.fechaInicio) > hoy) return 'programada';
  return 'vigente';
}

const ETIQUETAS = {
  vigente: { texto: 'Vigente', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  programada: { texto: 'Programada', clase: 'bg-sky-50 text-sky-700 ring-sky-200' },
  vencida: { texto: 'Vencida', clase: 'bg-gray-100 text-gray-500 ring-gray-200' },
  inactiva: { texto: 'Inactiva', clase: 'bg-amber-50 text-amber-700 ring-amber-200' }
};

/* ---------- Regla: una prenda no puede tener dos promociones activas que se crucen ---------- */

function solapan(inicioA, finA, inicioB, finB) {
  const aIni = inicioA || '0000-01-01';
  const aFin = finA || '9999-12-31';
  const bIni = inicioB || '0000-01-01';
  const bFin = finB || '9999-12-31';
  return aIni <= bFin && bIni <= aFin;
}

/** Promoción que choca con el formulario para esa prenda (null = "todas"), o undefined. */
function conflictoPara(idProducto) {
  if (!form.value.activa) return undefined;
  const objetivo = idProducto ? Number(idProducto) : null;
  return promociones.value.find((p) => {
    if (p.id === editandoId.value) return false;
    if (['vencida', 'inactiva'].includes(estadoPromo(p))) return false;
    if ((p.idProducto ? Number(p.idProducto) : null) !== objetivo) return false;
    return solapan(dia(p.fechaInicio), dia(p.fechaFin), form.value.fechaInicio, form.value.fechaFin);
  });
}

const idObjetivo = computed(() => (form.value.alcance === 'prenda' ? form.value.idProducto || null : null));
const hayObjetivo = computed(() => form.value.alcance === 'global' || Boolean(form.value.idProducto));
const conflicto = computed(() => (hayObjetivo.value ? conflictoPara(idObjetivo.value) : undefined));

const productosConEstado = computed(() =>
  props.productos.map((p) => {
    const id = p.id_producto ?? p.id;
    const choque = conflictoPara(id);
    return { id, nombre: p.nombre, bloqueado: Boolean(choque), promo: choque?.nombre };
  })
);

/* ---------- Lista ---------- */

const contadores = computed(() => {
  const c = { todas: promociones.value.length, vigente: 0, programada: 0, finalizadas: 0 };
  for (const p of promociones.value) {
    const e = estadoPromo(p);
    if (e === 'vigente') c.vigente++;
    else if (e === 'programada') c.programada++;
    else c.finalizadas++;
  }
  return c;
});

const promocionesFiltradas = computed(() => {
  const id = props.productoInicial?.id_producto ?? props.productoInicial?.id;
  let lista = promociones.value;
  if (id) lista = lista.filter((p) => p.idProducto === null || Number(p.idProducto) === Number(id));

  if (filtro.value === 'vigente') return lista.filter((p) => estadoPromo(p) === 'vigente');
  if (filtro.value === 'programada') return lista.filter((p) => estadoPromo(p) === 'programada');
  if (filtro.value === 'finalizadas') return lista.filter((p) => ['vencida', 'inactiva'].includes(estadoPromo(p)));
  return lista;
});

const pestanas = computed(() => [
  { id: 'todas', texto: 'Todas', total: contadores.value.todas },
  { id: 'vigente', texto: 'Vigentes', total: contadores.value.vigente },
  { id: 'programada', texto: 'Programadas', total: contadores.value.programada },
  { id: 'finalizadas', texto: 'Finalizadas', total: contadores.value.finalizadas }
]);

/* ---------- Textos del formulario ---------- */

const vistaPrevia = computed(() => {
  const valor = Number(form.value.valor);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const base = 100000;
  const ahorro = form.value.tipo === 'porcentaje' ? Math.round((base * Math.min(valor, 90)) / 100) : Math.min(base, valor);
  return { base: formatearCOP(base), final: formatearCOP(base - ahorro) };
});

const nombreObjetivo = computed(() => {
  if (form.value.alcance === 'global') return 'Todas las prendas';
  const p = props.productos.find((x) => Number(x.id_producto ?? x.id) === Number(form.value.idProducto));
  return p?.nombre || 'Sin seleccionar';
});

const textoValorForm = computed(() =>
  form.value.tipo === 'porcentaje' ? `${form.value.valor || 0}%` : formatearCOP(Number(form.value.valor) || 0)
);

const textoVigencia = computed(() => {
  const ini = form.value.fechaInicio || 'sin inicio';
  const fin = form.value.fechaFin || 'sin fecha de fin';
  return `${ini} → ${fin}`;
});

/* ---------- Validación por pasos ---------- */

function erroresDelPaso(numero) {
  const e = {};
  const f = form.value;

  if (numero === 1 && !String(f.nombre).trim()) e.nombre = 'El nombre es obligatorio.';

  if (numero === 2 && f.alcance === 'prenda' && !f.idProducto) e.producto_id = 'Selecciona una prenda.';

  if (numero === 3) {
    const textoValor = String(f.valor ?? '').trim();
    const valor = Number(textoValor);
    if (!/^\d+$/.test(textoValor) || !Number.isSafeInteger(valor) || valor <= 0) e.valor = 'El descuento debe ser un entero mayor a 0.';
    else if (f.tipo === 'porcentaje' && valor > 90) e.valor = 'El porcentaje máximo permitido es 90%.';
    else if (f.tipo === 'monto' && valor > 100000000) e.valor = 'El monto máximo permitido es $100.000.000.';
  }

  if (numero === 4) {
    if (f.fechaFin && f.fechaInicio && f.fechaFin < f.fechaInicio) e.fechaFin = 'La fecha fin no puede ser anterior a la de inicio.';
    if (conflicto.value) e.conflicto = true;
  }

  return e;
}

function avanzar() {
  const e = erroresDelPaso(paso.value);
  errores.value = e;
  if (Object.keys(e).length === 0 && paso.value < PASOS.length) paso.value += 1;
}

function retroceder() {
  errores.value = {};
  if (paso.value > 1) paso.value -= 1;
}

function irAPaso(numero) {
  // Solo se puede volver a pasos ya recorridos
  if (numero < paso.value) {
    errores.value = {};
    paso.value = numero;
  }
}

/* ---------- Acciones ---------- */

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

function nueva() {
  editandoId.value = null;
  confirmandoId.value = null;
  errores.value = {};
  errorEnvio.value = '';
  form.value = formularioVacio();
  paso.value = 1;
  vista.value = 'formulario';
}

function editar(promo) {
  editandoId.value = promo.id;
  confirmandoId.value = null;
  errores.value = {};
  errorEnvio.value = '';
  form.value = {
    nombre: promo.nombre,
    descripcion: promo.descripcion,
    alcance: promo.idProducto ? 'prenda' : 'global',
    idProducto: promo.idProducto ?? '',
    tipo: promo.tipo,
    valor: promo.valor,
    fechaInicio: dia(promo.fechaInicio),
    fechaFin: dia(promo.fechaFin),
    activa: promo.activa,
    usuario_id: authStore.usuario?.id_usuario || authStore.usuario?.id || 1
  };
  paso.value = 1;
  vista.value = 'formulario';
}

function volverALista() {
  editandoId.value = null;
  errores.value = {};
  errorEnvio.value = '';
  vista.value = 'lista';
}

async function guardar() {
  // Se revisan todos los pasos; si alguno falla, se lleva al usuario a ese paso.
  for (const numero of [1, 2, 3, 4]) {
    const e = erroresDelPaso(numero);
    if (Object.keys(e).length) {
      errores.value = e;
      paso.value = numero;
      return;
    }
  }

  guardando.value = true;
  errorEnvio.value = '';
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
    volverALista();
    await cargar();
    emit('actualizado');
  } catch (e) {
    const back = e?.response?.data?.errors;
    const primer = back ? [].concat(Object.values(back)[0])[0] : null;
    errorEnvio.value = primer || e?.response?.data?.message || 'No se pudo guardar la promoción.';
    notificarError(errorEnvio.value);
  } finally {
    guardando.value = false;
  }
}

function actualizarValor(evento) {
  const valor = String(evento.target.value ?? '').replace(/[^0-9]/g, '').slice(0, 9);
  form.value.valor = valor;
  evento.target.value = valor;
  if (errores.value.valor) errores.value = { ...errores.value, valor: '' };
}

async function borrar(promo) {
  try {
    await eliminarPromocion(promo.id);
    notificarExito('Promoción eliminada.');
    confirmandoId.value = null;
    await cargar();
    emit('actualizado');
  } catch (e) {
    notificarError(e?.response?.data?.message || 'No se pudo eliminar la promoción.');
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

function rangoFechas(p) {
  return `${dia(p.fechaInicio) || 'Sin inicio'} → ${dia(p.fechaFin) || 'Sin fin'}`;
}

watch(
  () => props.abierto,
  (abierto) => {
    if (abierto) {
      volverALista();
      confirmandoId.value = null;
      filtro.value = 'todas';
      cargar();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="abierto" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="emit('cerrar')"></div>

    <div class="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl">
      <!-- Encabezado -->
      <header class="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-pink-50 via-white to-white px-5 py-4 sm:px-6">
        <div class="flex items-center gap-3">
          <button v-if="vista === 'formulario'" type="button" aria-label="Volver a la lista"
            class="rounded-xl p-2 text-gray-500 transition hover:bg-white hover:text-corporativo-rosa" @click="volverALista">
            <ArrowLeft class="h-5 w-5" />
          </button>
          <span v-else class="flex h-10 w-10 items-center justify-center rounded-2xl bg-corporativo-rosa text-white shadow-sm">
            <Tag class="h-5 w-5" />
          </span>
          <div>
            <h2 class="text-lg font-bold leading-tight text-gray-900">
              {{ vista === 'lista' ? 'Promociones' : (editandoId ? 'Editar promoción' : 'Nueva promoción') }}
            </h2>
            <p class="text-xs text-gray-500">
              <template v-if="vista === 'lista'">
                {{ contadores.vigente }} vigente{{ contadores.vigente === 1 ? '' : 's' }} ·
                {{ contadores.programada }} programada{{ contadores.programada === 1 ? '' : 's' }}
              </template>
              <template v-else>Paso {{ paso }} de {{ PASOS.length }} · {{ PASOS[paso - 1].titulo }}</template>
            </p>
          </div>
        </div>
        <button type="button" aria-label="Cerrar"
          class="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" @click="emit('cerrar')">
          <X class="h-5 w-5" />
        </button>
      </header>

      <!-- ================= LISTA ================= -->
      <template v-if="vista === 'lista'">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 sm:px-6">
          <div class="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
            <button v-for="t in pestanas" :key="t.id" type="button"
              class="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition"
              :class="filtro === t.id ? 'bg-white text-corporativo-rosa shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              @click="filtro = t.id">
              {{ t.texto }} <span class="opacity-60">{{ t.total }}</span>
            </button>
          </div>
          <button type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-corporativo-rosa px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-corporativo-rosa-hover"
            @click="nueva">
            <Plus class="h-4 w-4" /> Nueva promoción
          </button>
        </div>

        <div class="flex-1 space-y-2.5 overflow-y-auto bg-gray-50/60 p-4 sm:p-6">
          <div v-if="cargando" class="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-sm text-gray-500">
            <Loader2 class="h-4 w-4 animate-spin" /> Cargando...
          </div>

          <div v-else-if="!promocionesFiltradas.length"
            class="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
            <Tag class="mx-auto mb-2 h-7 w-7 text-gray-300" />
            No hay promociones en esta vista.
            <button type="button" class="mt-3 block w-full text-sm font-semibold text-corporativo-rosa hover:underline" @click="nueva">
              Crear la primera
            </button>
          </div>

          <ul v-else class="space-y-2.5">
            <li v-for="p in promocionesFiltradas" :key="p.id" class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-gray-900">{{ p.nombre }}</p>
                  <p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <component :is="p.idProducto ? Shirt : Globe" class="h-3.5 w-3.5 shrink-0" />
                    <span class="truncate">{{ nombreProducto(p) }}</span>
                  </p>
                  <p class="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                    <CalendarDays class="h-3.5 w-3.5" /> {{ rangoFechas(p) }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1.5">
                  <span class="rounded-full bg-corporativo-rosa px-2.5 py-1 text-xs font-bold text-white">{{ textoDescuento(p) }}</span>
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1" :class="ETIQUETAS[estadoPromo(p)].clase">
                    {{ ETIQUETAS[estadoPromo(p)].texto }}
                  </span>
                </div>
              </div>

              <div class="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <template v-if="confirmandoId === p.id">
                  <span class="mr-auto text-xs font-medium text-red-600">¿Eliminar esta promoción?</span>
                  <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    @click="confirmandoId = null">No</button>
                  <button type="button" class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    @click="borrar(p)">Sí, eliminar</button>
                </template>
                <template v-else>
                  <button type="button"
                    class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-pink-50 hover:text-corporativo-rosa"
                    @click="editar(p)">
                    <Pencil class="h-3.5 w-3.5" /> Editar
                  </button>
                  <button type="button"
                    class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600"
                    @click="confirmandoId = p.id">
                    <Trash2 class="h-3.5 w-3.5" /> Eliminar
                  </button>
                </template>
              </div>
            </li>
          </ul>
        </div>
      </template>

      <!-- ================= FORMULARIO POR PASOS ================= -->
      <template v-else>
        <!-- Indicador de pasos -->
        <ol class="flex items-center gap-2 border-b border-gray-100 px-5 py-4 sm:px-6">
          <li v-for="(p, i) in PASOS" :key="p.id" class="flex flex-1 items-center gap-2">
            <button type="button" class="flex items-center gap-2" :class="p.id < paso ? 'cursor-pointer' : 'cursor-default'"
              @click="irAPaso(p.id)">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition"
                :class="p.id < paso ? 'bg-emerald-500 text-white' : p.id === paso ? 'bg-corporativo-rosa text-white ring-4 ring-pink-100' : 'bg-gray-100 text-gray-400'">
                <Check v-if="p.id < paso" class="h-4 w-4" />
                <template v-else>{{ p.id }}</template>
              </span>
              <span class="hidden text-xs font-semibold sm:inline" :class="p.id === paso ? 'text-gray-900' : 'text-gray-400'">{{ p.titulo }}</span>
            </button>
            <span v-if="i < PASOS.length - 1" class="h-px flex-1" :class="p.id < paso ? 'bg-emerald-300' : 'bg-gray-200'"></span>
          </li>
        </ol>

        <div class="flex-1 overflow-y-auto bg-gray-50/60 p-5 sm:p-6">
          <!-- Paso 1: detalles -->
          <section v-if="paso === 1" class="space-y-4">
            <div>
              <h3 class="text-base font-bold text-gray-900">¿Cómo se llama la promoción?</h3>
              <p class="text-xs text-gray-500">Es el nombre que verás en el panel.</p>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-600">Nombre *</label>
              <input v-model="form.nombre" type="text" maxlength="100" placeholder="Ej. Black Friday" :class="claseCampo"
                @keyup.enter="avanzar" />
              <p v-if="errores.nombre" class="mt-1 text-xs text-red-600">{{ errores.nombre }}</p>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-600">Descripción (opcional)</label>
              <textarea v-model="form.descripcion" rows="3" maxlength="500" placeholder="Notas internas sobre esta promoción"
                :class="claseCampo"></textarea>
            </div>
          </section>

          <!-- Paso 2: alcance -->
          <section v-else-if="paso === 2" class="space-y-4">
            <div>
              <h3 class="text-base font-bold text-gray-900">¿A qué se aplica?</h3>
              <p class="text-xs text-gray-500">Una prenda no puede tener dos promociones activas en las mismas fechas.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button type="button" class="rounded-2xl border-2 bg-white p-4 text-left transition"
                :class="form.alcance === 'global' ? 'border-corporativo-rosa ring-4 ring-pink-50' : 'border-gray-200 hover:border-gray-300'"
                @click="form.alcance = 'global'">
                <Globe class="mb-2 h-6 w-6" :class="form.alcance === 'global' ? 'text-corporativo-rosa' : 'text-gray-400'" />
                <p class="text-sm font-bold text-gray-900">Todas las prendas</p>
                <p class="text-xs text-gray-500">Descuento general en la tienda</p>
              </button>
              <button type="button" class="rounded-2xl border-2 bg-white p-4 text-left transition"
                :class="form.alcance === 'prenda' ? 'border-corporativo-rosa ring-4 ring-pink-50' : 'border-gray-200 hover:border-gray-300'"
                @click="form.alcance = 'prenda'">
                <Shirt class="mb-2 h-6 w-6" :class="form.alcance === 'prenda' ? 'text-corporativo-rosa' : 'text-gray-400'" />
                <p class="text-sm font-bold text-gray-900">Una prenda</p>
                <p class="text-xs text-gray-500">Solo el producto que elijas</p>
              </button>
            </div>

            <div v-if="form.alcance === 'prenda'">
              <label class="mb-1 block text-xs font-semibold text-gray-600">Prenda *</label>
              <select v-model="form.idProducto" :class="claseCampo">
                <option value="" disabled>Selecciona la prenda</option>
                <option v-for="p in productosConEstado" :key="p.id" :value="p.id" :disabled="p.bloqueado">
                  {{ p.nombre }}{{ p.bloqueado ? ` — ya tiene promoción (${p.promo})` : '' }}
                </option>
              </select>
              <p v-if="errores.producto_id" class="mt-1 text-xs text-red-600">{{ errores.producto_id }}</p>
              <p v-else class="mt-1 text-[11px] text-gray-400">Las prendas que ya tienen promoción aparecen bloqueadas.</p>
            </div>
          </section>

          <!-- Paso 3: descuento -->
          <section v-else-if="paso === 3" class="space-y-4">
            <div>
              <h3 class="text-base font-bold text-gray-900">¿Cuánto descuento?</h3>
              <p class="text-xs text-gray-500">Porcentaje (máximo 90%) o un monto fijo en pesos.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button type="button"
                class="flex items-center justify-center gap-2 rounded-xl border-2 bg-white py-3 text-sm font-semibold transition"
                :class="form.tipo === 'porcentaje' ? 'border-corporativo-rosa text-corporativo-rosa ring-4 ring-pink-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
                @click="form.tipo = 'porcentaje'">
                <Percent class="h-4 w-4" /> Porcentaje
              </button>
              <button type="button"
                class="flex items-center justify-center gap-2 rounded-xl border-2 bg-white py-3 text-sm font-semibold transition"
                :class="form.tipo === 'monto' ? 'border-corporativo-rosa text-corporativo-rosa ring-4 ring-pink-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
                @click="form.tipo = 'monto'">
                <DollarSign class="h-4 w-4" /> Monto fijo
              </button>
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-600">
                {{ form.tipo === 'porcentaje' ? 'Porcentaje de descuento' : 'Monto a descontar (COP)' }}
              </label>
              <input :value="form.valor" type="text" inputmode="numeric" maxlength="9" :class="[claseCampo, 'text-lg font-bold']"
                @input="actualizarValor" @keyup.enter="avanzar" />
              <p v-if="errores.valor" class="mt-1 text-xs text-red-600">{{ errores.valor }}</p>
            </div>

            <div v-if="form.tipo === 'porcentaje'" class="flex flex-wrap gap-2">
              <button v-for="n in PORCENTAJES_RAPIDOS" :key="n" type="button"
                class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                :class="Number(form.valor) === n ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'"
                @click="form.valor = String(n)">
                {{ n }}%
              </button>
            </div>

            <p v-if="vistaPrevia && !errores.valor" class="rounded-xl bg-pink-50 px-4 py-3 text-sm text-gray-600">
              Ejemplo: una prenda de <strong>{{ vistaPrevia.base }}</strong> quedaría en
              <strong class="text-corporativo-rosa">{{ vistaPrevia.final }}</strong>
            </p>
          </section>

          <!-- Paso 4: vigencia y resumen -->
          <section v-else class="space-y-4">
            <div>
              <h3 class="text-base font-bold text-gray-900">¿Cuándo estará vigente?</h3>
              <p class="text-xs text-gray-500">Inicio y fin incluyen el día completo.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="text-xs font-semibold text-gray-600">Inicio
                <input v-model="form.fechaInicio" type="date" :class="[claseCampo, 'mt-1']" />
              </label>
              <label class="text-xs font-semibold text-gray-600">Fin (opcional)
                <input v-model="form.fechaFin" type="date" :min="form.fechaInicio || undefined" :class="[claseCampo, 'mt-1']" />
              </label>
            </div>
            <p v-if="errores.fechaFin" class="text-xs text-red-600">{{ errores.fechaFin }}</p>

            <label class="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
              <span class="font-medium">Promoción activa</span>
              <input v-model="form.activa" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-corporativo-rosa focus:ring-corporativo-rosa" />
            </label>

            <!-- Resumen -->
            <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <p class="border-b border-gray-100 bg-gray-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Resumen</p>
              <dl class="divide-y divide-gray-100 text-sm">
                <div class="flex justify-between gap-3 px-4 py-2.5"><dt class="text-gray-500">Nombre</dt><dd class="truncate font-semibold text-gray-900">{{ form.nombre }}</dd></div>
                <div class="flex justify-between gap-3 px-4 py-2.5"><dt class="text-gray-500">Aplica a</dt><dd class="truncate font-semibold text-gray-900">{{ nombreObjetivo }}</dd></div>
                <div class="flex justify-between gap-3 px-4 py-2.5"><dt class="text-gray-500">Descuento</dt><dd class="font-semibold text-corporativo-rosa">-{{ textoValorForm }}</dd></div>
                <div class="flex justify-between gap-3 px-4 py-2.5"><dt class="text-gray-500">Vigencia</dt><dd class="font-semibold text-gray-900">{{ textoVigencia }}</dd></div>
              </dl>
            </div>

            <div v-if="conflicto" class="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <template v-if="form.alcance === 'prenda'">Esta prenda ya tiene</template>
                <template v-else>Ya existe una promoción general:</template>
                <strong> «{{ conflicto.nombre }}» </strong>({{ rangoFechas(conflicto) }}).
                Cambia las fechas, o edita o desactiva esa promoción.
              </p>
            </div>

            <p v-if="errorEnvio" class="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{{ errorEnvio }}</p>
          </section>
        </div>

        <!-- Navegación -->
        <footer class="flex items-center gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
          <button v-if="paso > 1" type="button"
            class="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            @click="retroceder">
            <ChevronLeft class="h-4 w-4" /> Atrás
          </button>
          <button v-else type="button"
            class="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-50" @click="volverALista">
            Cancelar
          </button>

          <button v-if="paso < PASOS.length" type="button"
            class="ml-auto inline-flex items-center gap-1 rounded-xl bg-corporativo-rosa px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-corporativo-rosa-hover"
            @click="avanzar">
            Siguiente <ChevronRight class="h-4 w-4" />
          </button>
          <button v-else type="button" :disabled="guardando || Boolean(conflicto)"
            class="ml-auto inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-corporativo-rosa-hover disabled:cursor-not-allowed disabled:opacity-50"
            @click="guardar">
            <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
            {{ editandoId ? 'Guardar cambios' : 'Crear promoción' }}
          </button>
        </footer>
      </template>
    </div>
  </div>
</template>
