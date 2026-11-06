<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { Search, RefreshCw, Play, Pause, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-vue-next';
import ModalBase from '@/components/comunes/ModalBase.vue';
import clienteApi from '@/services/clienteApi';

import { ordenesProduccionApi, materiasPrimasApi, mensajeError } from '@/services/Produccionservicio';
import { useNotificacion } from '@/composables/useNotificacion';
import { bloquearNoEnteros, entero } from '@/utils/restriccionesCampos';

const { notificarExito, notificarError, confirmarAccion } = useNotificacion();

const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'planificada', etiqueta: 'Planificada' },
  { valor: 'en_proceso', etiqueta: 'En proceso' },
  { valor: 'pausada', etiqueta: 'Pausada' },
  { valor: 'completada', etiqueta: 'Completada' },
  { valor: 'cancelada', etiqueta: 'Cancelada' },
];

const ESTILO_ESTADO = {
  planificada: 'bg-amber-50 text-amber-700 border-amber-200',
  en_proceso: 'bg-blue-50 text-blue-700 border-blue-200',
  pausada: 'bg-orange-50 text-orange-700 border-orange-200',
  completada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200',
};

const ordenes = ref([]);
const cargando = ref(false);
const procesandoId = ref(null);
const busqueda = ref('');
const filtroEstado = ref('');
const pagina = ref(1);
const ultimaPagina = ref(1);
const total = ref(0);


const materiasPrimas = ref([]);

const modalCancelacionAbierto = ref(false);
const ordenACancelar = ref(null);
const pasoCancelacion = ref(1); 
const usaronMateriales = ref(false);
const materialesUsados = ref({}); 
const cargandoMateriales = ref(false);

const ordenesFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return ordenes.value;
  return ordenes.value.filter((o) =>
    [o.numero, nombrePrenda(o), o.notas].some((campo) => String(campo ?? '').toLowerCase().includes(q)),
  );
});


const materiasPorId = computed(() => {
  const mapa = {};
  materiasPrimas.value.forEach(m => {
    mapa[m.id_material || m.id] = m.nombre;
  });
  return mapa;
});

const materialesParaCancelar = computed(() => {
  if (!ordenACancelar.value?.formula) return [];
  
  let insumos = ordenACancelar.value.formula.consumos || ordenACancelar.value.formula.materia_prima;
  if (!insumos) return [];
  if (!Array.isArray(insumos)) insumos = Object.values(insumos);
  
  return insumos.filter(c => c !== null && c.materia_prima_id);
});

function nombrePrenda(orden) {
  return orden.formula?.producto?.nombre ?? 'Sin prenda asociada';
}

function etiquetaEstado(estado) {
  return ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado;
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(valor || 0));
}

function formatoFecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}


function obtenerNombreMaterial(consumo) {
  if (consumo.materia_prima?.nombre) return consumo.materia_prima.nombre;
  if (consumo.insumo_nombre) return consumo.insumo_nombre;
  if (consumo.nombre) return consumo.nombre;
  return materiasPorId.value[consumo.materia_prima_id] || 'Material';
}

async function cargar({ silencioso = false } = {}) {
  if (!silencioso) cargando.value = true;
  try {
    const respuesta = await clienteApi.get('/ordenes-produccion', {
      params: { page: pagina.value, ...(filtroEstado.value ? { estado: filtroEstado.value } : {}) },
    });
    const paginador = respuesta.data?.data ?? respuesta.data;
    ordenes.value = Array.isArray(paginador) ? paginador : (paginador?.data ?? []);
    ultimaPagina.value = paginador?.last_page ?? 1;
    total.value = paginador?.total ?? ordenes.value.length;
  } catch (error) {
    if (!silencioso) notificarError(mensajeError(error, 'No se pudieron cargar las órdenes de producción.'));
  } finally {
    if (!silencioso) cargando.value = false;
  }
}

// 5. NUEVO: Cargar materias primas al montar
async function cargarMaterias() {
  try {
    materiasPrimas.value = await materiasPrimasApi.listar();
  } catch (error) {
    console.warn('No se pudieron cargar las materias primas', error);
  }
}

function cambiarFiltro(valor) {
  filtroEstado.value = valor;
  pagina.value = 1;
  cargar();
}

function irAPagina(n) {
  if (n < 1 || n > ultimaPagina.value) return;
  pagina.value = n;
  cargar();
}

function abrirModalCancelacion(orden) {
  ordenACancelar.value = orden;
  pasoCancelacion.value = 1; 
  usaronMateriales.value = false;
  materialesUsados.value = {};
  
  materialesParaCancelar.value.forEach(c => {
    materialesUsados.value[c.materia_prima_id] = 0;
  });
  
  modalCancelacionAbierto.value = true;
}

async function cargarMaterialesDeOrden() {
  if (!ordenACancelar.value?.formula?.producto_id) {
    pasoCancelacion.value = 2;
    return;
  }

  cargandoMateriales.value = true;
  pasoCancelacion.value = 2;

  try {
    const respuesta = await clienteApi.get('/formulas-produccion', {
      params: { producto_id: ordenACancelar.value.formula.producto_id }
    });
    
    const datos = respuesta.data?.data ?? respuesta.data;
    
    let grupo = null;
    if (Array.isArray(datos)) {
      grupo = datos.find(g => String(g.producto_id) === String(ordenACancelar.value.formula.producto_id));
    } else if (datos?.producto_id) {
      grupo = datos;
    }

    if (grupo && grupo.consumos && Array.isArray(grupo.consumos)) {
      ordenACancelar.value.formula.consumos = grupo.consumos;
      
      grupo.consumos.forEach(c => {
        if (c && c.materia_prima_id) {
          materialesUsados.value[c.materia_prima_id] = 0;
        }
      });
    }
  } catch (error) {
    console.error('Error al cargar los materiales:', error);
  } finally {
    cargandoMateriales.value = false;
  }
}

async function confirmarCancelacion() {
  if (!ordenACancelar.value) return;
  
  procesandoId.value = ordenACancelar.value.id;
  modalCancelacionAbierto.value = false;

  try {
    const payloadMateriales = usaronMateriales.value 
      ? Object.keys(materialesUsados.value).map(id => ({
          materia_prima_id: Number(id),
          cantidad_usada: Number(materialesUsados.value[id]) || 0
        }))
      : [];

    await ordenesProduccionApi.actualizar(ordenACancelar.value.id, { 
      estado: 'cancelada',
      materiales_usados: payloadMateriales
    });
    
    notificarExito(`${ordenACancelar.value.numero} cancelada y stock ajustado.`);
    await cargar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo cancelar la orden.'));
  } finally {
    procesandoId.value = null;
    ordenACancelar.value = null;
  }
}

async function cambiarEstado(orden, nuevoEstado) {
  if (nuevoEstado === 'completada') {
    abrirCierre(orden);
    return;
  }
  if (nuevoEstado === 'cancelada') {
    const ok = await confirmarAccion({
      titulo: `¿Cancelar ${orden.numero}?`,
      texto: orden.stock_descontado
        ? 'La orden quedará cancelada y las materias primas que ya consumió volverán a bodega.'
        : 'La orden quedará cancelada. Aún no había consumido materias primas.',
      textoBotonConfirmar: 'Sí, cancelar',
    });
    if (!ok) return;
  }
  
  if (nuevoEstado === 'pausada') {
    const ok = await confirmarAccion({
      titulo: `¿Pausar ${orden.numero}?`,
      texto: 'La orden quedará pausada y podrás reanudarla después.',
      textoBotonConfirmar: 'Sí, pausar orden',
    });
    if (!ok) return;
  }

  procesandoId.value = orden.id;
  try {
    await ordenesProduccionApi.actualizar(orden.id, { estado: nuevoEstado });
    notificarExito(`${orden.numero} ahora está ${etiquetaEstado(nuevoEstado).toLowerCase()}.`);
    await cargar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo actualizar la orden.'));
  } finally {
    procesandoId.value = null;
  }
}

// ---------- Cierre de la orden (RF-059) ----------
// Al completar se descuentan los insumos y las prendas entran al kárdex,
// repartidas entre las tallas del producto.
const cerrando = ref(null);
const tallasCierre = ref([]);
const cargandoTallas = ref(false);
const guardandoCierre = ref(false);

const unidadesRepartidas = computed(() =>
  tallasCierre.value.reduce((suma, t) => suma + (Math.floor(Number(t.cantidad)) || 0), 0),
);
const repartoValido = computed(
  () => cerrando.value && unidadesRepartidas.value === Number(cerrando.value.cantidad),
);

async function abrirCierre(orden) {
  cerrando.value = orden;
  tallasCierre.value = [];
  const productoId = orden.formula?.producto?.id_producto ?? orden.formula?.producto_id;
  if (!productoId) return;

  cargandoTallas.value = true;
  try {
    const respuesta = await clienteApi.get(`/productos/${productoId}`);
    const variantes = (respuesta.data?.data ?? respuesta.data)?.variantes ?? [];
    tallasCierre.value = variantes.map((v) => ({
      variante_id: v.id_variante,
      talla: v.talla,
      stock: Number(v.stock) || 0,
      cantidad: variantes.length === 1 ? Number(orden.cantidad) : 0,
    }));
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudieron cargar las tallas de la prenda.'));
  } finally {
    cargandoTallas.value = false;
  }
}

function cerrarCierre() {
  if (guardandoCierre.value) return;
  cerrando.value = null;
}

async function confirmarCierre() {
  const orden = cerrando.value;
  if (!orden || !repartoValido.value) return;

  guardandoCierre.value = true;
  try {
    await ordenesProduccionApi.completar(orden.id, {
      distribucion: tallasCierre.value
        .filter((t) => Number(t.cantidad) > 0)
        .map((t) => ({ variante_id: t.variante_id, cantidad: Math.floor(Number(t.cantidad)) })),
    });
    notificarExito(`${orden.numero} completada: insumos descontados y prendas ingresadas al kárdex.`);
    cerrando.value = null;
    await cargar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo completar la orden.'));
  } finally {
    guardandoCierre.value = false;
  }
}

// ---------- Edicion ----------
const editando = ref(null); // orden en edicion
const formEdicion = ref({ cantidad: 1, notas: '' });
const guardandoEdicion = ref(false);

function abrirEdicion(orden) {
  editando.value = orden;
  formEdicion.value = { cantidad: Number(orden.cantidad) || 1, notas: orden.notas ?? '' };
}

function cerrarEdicion() {
  if (guardandoEdicion.value) return;
  editando.value = null;
}

async function guardarEdicion() {
  const orden = editando.value;
  if (!orden) return;

  const cantidad = Math.floor(Number(formEdicion.value.cantidad));
  if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 100000) {
    notificarError('La cantidad debe estar entre 1 y 100.000.');
    return;
  }

  const payload = { notas: formEdicion.value.notas?.trim() || null };
  if (cantidad !== Number(orden.cantidad)) {
    payload.cantidad = cantidad;
    const costoPorUnidad = Number(orden.costo_total || 0) / (Number(orden.cantidad) || 1);
    payload.costo_total = Math.round(costoPorUnidad * cantidad * 100) / 100;
  }

  guardandoEdicion.value = true;
  try {
    await ordenesProduccionApi.actualizar(orden.id, payload);
    notificarExito(`${orden.numero} actualizada.`);
    editando.value = null;
    await cargar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo actualizar la orden.'));
  } finally {
    guardandoEdicion.value = false;
  }
}


async function eliminar(orden) {
  const ok = await confirmarAccion({
    titulo: `¿Eliminar ${orden.numero}?`,
    texto: 'Esta acción no se puede deshacer.',
    textoBotonConfirmar: 'Sí, eliminar',
  });
  if (!ok) return;

  procesandoId.value = orden.id;
  try {
    await clienteApi.delete(`/ordenes-produccion/${orden.id}`);
    notificarExito(`${orden.numero} eliminada.`);
    if (ordenes.value.length === 1 && pagina.value > 1) pagina.value -= 1;
    await cargar();
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo eliminar la orden.'));
  } finally {
    procesandoId.value = null;
  }
}


onMounted(() => {
  cargar();
  cargarMaterias();
});
useRecargaAutomatica(() => cargar({ silencioso: true }), { intervaloSondeo: 60000 });
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative w-full lg:max-w-xs">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input v-model="busqueda" type="text" maxlength="100" placeholder="Buscar por número o prenda..." class="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40 focus:border-corporativo-rosa" />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button v-for="e in ESTADOS" :key="e.valor" class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors" :class="filtroEstado === e.valor ? 'border-corporativo-rosa bg-corporativo-rosa text-white' : 'border-gray-300 text-gray-600 hover:border-gray-400'" @click="cambiarFiltro(e.valor)">
          {{ e.etiqueta }}
        </button>
        <button class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50" :disabled="cargando" @click="cargar">
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': cargando }" /> Actualizar
        </button>
      </div>
    </div>

    <div class="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-3">Orden</th>
              <th class="px-4 py-3">Prenda</th>
              <th class="px-4 py-3 text-right">Unidades</th>
              <th class="px-4 py-3 text-right">Costo total</th>
              <th class="px-4 py-3">Creada</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="cargando && !ordenes.length">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">Cargando...</td>
            </tr>
            <tr v-else-if="!ordenesFiltradas.length">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                No hay órdenes de producción para mostrar.
              </td>
            </tr>
            <tr v-for="o in ordenesFiltradas" :key="o.id">
              <td class="px-4 py-3 font-semibold text-gray-900">{{ o.numero }}</td>
              <td class="px-4 py-3 text-gray-700">{{ nombrePrenda(o) }}<p v-if="o.notas" class="max-w-xs truncate text-xs text-gray-400">{{ o.notas }}</p></td>
              <td class="px-4 py-3 text-right text-gray-700">{{ o.cantidad }}</td>
              <td class="px-4 py-3 text-right text-gray-700">{{ formatoMoneda(o.costo_total) }}</td>
              <td class="px-4 py-3 text-gray-500">{{ formatoFecha(o.created_at) }}</td>
              <td class="px-4 py-3"><span class="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium" :class="ESTILO_ESTADO[o.estado]">{{ etiquetaEstado(o.estado) }}</span></td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    v-if="o.estado === 'planificada'"
                    class="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-40"
                    title="Iniciar produccion"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'en_proceso')"
                  >
                    <Play class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado === 'en_proceso'"
                    class="p-2 text-gray-500 hover:text-orange-600 disabled:opacity-40"
                    title="Pausar produccion"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'pausada')"
                  >
                    <Pause class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado === 'pausada'"
                    class="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-40"
                    title="Reanudar produccion"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'en_proceso')"
                  >
                    <Play class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado === 'planificada' || o.estado === 'en_proceso'"
                    class="p-2 text-gray-500 hover:text-emerald-600 disabled:opacity-40"
                    title="Marcar como completada"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'completada')"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                  </button>
                  <button
                    v-if="!['cancelada', 'completada'].includes(o.estado)"
                    class="p-2 text-gray-500 hover:text-red-600 disabled:opacity-40"
                    title="Cancelar orden"
                    :disabled="procesandoId === o.id"
                    @click="cambiarEstado(o, 'cancelada')"
                  >
                    <XCircle class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado !== 'completada'"
                    class="p-2 text-gray-500 hover:text-corporativo-rosa disabled:opacity-40"
                    title="Editar orden"
                    :disabled="procesandoId === o.id"
                    @click="abrirEdicion(o)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    v-if="o.estado !== 'completada'"
                    class="p-2 text-gray-500 hover:text-red-600 disabled:opacity-40"
                    title="Eliminar orden"
                    :disabled="procesandoId === o.id"
                    @click="eliminar(o)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="ultimaPagina > 1"
        class="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500"
      >
        <span>{{ total }} órdenes · página {{ pagina }} de {{ ultimaPagina }}</span>
        <div class="flex gap-1">
          <button class="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 disabled:opacity-40" :disabled="pagina <= 1 || cargando" @click="irAPagina(pagina - 1)"><ChevronLeft class="h-4 w-4" /></button>
          <button class="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 disabled:opacity-40" :disabled="pagina >= ultimaPagina || cargando" @click="irAPagina(pagina + 1)"><ChevronRight class="h-4 w-4" /></button>
        </div>
      </div>
    </div>

    <ModalBase :abierto="!!editando" :titulo="`Editar ${editando?.numero ?? ''}`" @cerrar="cerrarEdicion">
      <div v-if="editando" class="p-6">
        <h2 class="text-xl font-extrabold text-gray-900">Editar {{ editando.numero }}</h2>
        <p class="mt-1 text-sm text-gray-500">{{ nombrePrenda(editando) }}</p>
        <div class="mt-5 space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Unidades a producir</label>
            <input
              v-model.number="formEdicion.cantidad"
              type="number"
              min="1"
              max="100000"
              step="1"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
            <p class="mt-1 text-xs text-gray-400">El costo total se reajusta segun las unidades.</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Notas</label>
            <textarea v-model="formEdicion.notas" rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none"></textarea>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" :disabled="guardandoEdicion" @click="cerrarEdicion">Cancelar</button>
          <button type="button" class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50" :disabled="guardandoEdicion" @click="guardarEdicion">
            <Loader2 v-if="guardandoEdicion" class="h-4 w-4 animate-spin" /> {{ guardandoEdicion ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </ModalBase>

    <ModalBase :abierto="!!cerrando" :titulo="`Completar ${cerrando?.numero ?? ''}`" @cerrar="cerrarCierre">
      <div v-if="cerrando" class="p-6">
        <h2 class="text-xl font-extrabold text-gray-900">Completar {{ cerrando.numero }}</h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ nombrePrenda(cerrando) }} · {{ cerrando.cantidad }} unidades
        </p>
        <p class="mt-3 rounded-xl border border-tienda-borde bg-tienda-arena-suave px-3 py-2 text-xs text-tienda-texto">
          Al confirmar se descuentan las materias primas de la fórmula y las prendas terminadas
          entran al kárdex. Después la orden ya no se puede modificar.
        </p>

        <div class="mt-5">
          <p class="mb-2 text-sm font-semibold text-gray-700">Reparto del lote por talla</p>
          <p v-if="cargandoTallas" class="text-sm text-gray-500">Cargando tallas...</p>
          <p v-else-if="!tallasCierre.length" class="text-sm text-red-600">
            La prenda no tiene tallas registradas. Créalas en Gestión de Prendas antes de completar.
          </p>
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label
              v-for="t in tallasCierre"
              :key="t.variante_id"
              class="rounded-xl border border-gray-200 p-3 text-sm"
            >
              <span class="flex items-center justify-between font-semibold text-gray-800">
                Talla {{ t.talla }}
                <span class="text-[11px] font-normal text-gray-400">stock {{ t.stock }}</span>
              </span>
              <input
                v-model.number="t.cantidad"
                type="number"
                min="0"
                :max="cerrando.cantidad"
                step="1"
                inputmode="numeric"
                class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
                @keydown="bloquearNoEnteros"
                @input="t.cantidad = entero(t.cantidad, 0, Number(cerrando.cantidad))"
              />
            </label>
          </div>
          <p
            v-if="tallasCierre.length"
            class="mt-3 text-xs font-semibold"
            :class="repartoValido ? 'text-emerald-700' : 'text-amber-700'"
          >
            Repartidas {{ unidadesRepartidas }} de {{ cerrando.cantidad }} unidades
          </p>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            :disabled="guardandoCierre"
            @click="cerrarCierre"
          >
            Volver
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-2.5 text-sm font-bold text-white hover:bg-corporativo-rosa-hover disabled:opacity-50"
            :disabled="guardandoCierre || !repartoValido"
            @click="confirmarCierre"
          >
            <Loader2 v-if="guardandoCierre" class="h-4 w-4 animate-spin" />
            {{ guardandoCierre ? 'Completando...' : 'Completar e ingresar al kárdex' }}
          </button>
        </div>
      </div>
    </ModalBase>
  </div>
</template>