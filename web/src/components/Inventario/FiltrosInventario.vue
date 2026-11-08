<script setup>
import { computed, ref } from 'vue';
import { Search, X, Filter, RotateCcw, Calendar, User, Tag, Layers, CheckCircle2 } from 'lucide-vue-next';

// RF-031: consulta consolidada del kárdex por producto, material, usuario y fechas.
const props = defineProps({
  busqueda: { type: String, default: '' },
  tipo: { type: String, default: '' },
  estado: { type: String, default: '' },
  ambito: { type: String, default: '' },
  productoId: { type: [String, Number], default: '' },
  materiaId: { type: [String, Number], default: '' },
  usuarioId: { type: [String, Number], default: '' },
  fechaInicio: { type: String, default: '' },
  fechaFin: { type: String, default: '' },
  productos: { type: Array, default: () => [] },
  materias: { type: Array, default: () => [] },
  usuarios: { type: Array, default: () => [] }
});

const emit = defineEmits([
  'update:busqueda', 'update:tipo', 'update:estado', 'update:ambito',
  'update:productoId', 'update:materiaId', 'update:usuarioId',
  'update:fechaInicio', 'update:fechaFin', 'filtrar', 'limpiar'
]);

const mostrarAvanzados = ref(false);

function cambiar(campo, valor) {
  emit(`update:${campo}`, valor);
  // Producto y material son excluyentes: el kárdex de prendas y el de insumos.
  if (campo === 'productoId' && valor) emit('update:materiaId', '');
  if (campo === 'materiaId' && valor) emit('update:productoId', '');
  emit('filtrar');
}

function limpiarCampo(campo) {
  emit(`update:${campo}`, '');
  emit('filtrar');
}

function limpiarBusqueda() {
  emit('update:busqueda', '');
  emit('filtrar');
}

const hayFiltrosActivos = computed(() => {
  return [
    props.tipo, props.estado, props.ambito, props.productoId,
    props.materiaId, props.usuarioId, props.fechaInicio, props.fechaFin, props.busqueda
  ].some((v) => v !== '' && v !== null && v !== undefined);
});

const filtrosActivosTags = computed(() => {
  const tags = [];
  if (props.busqueda) tags.push({ id: 'busqueda', label: `Búsqueda: "${props.busqueda}"`, limpiar: () => limpiarCampo('busqueda') });
  if (props.ambito) {
    const txt = props.ambito === 'producto' ? 'Prendas' : 'Materias primas';
    tags.push({ id: 'ambito', label: `Ámbito: ${txt}`, limpiar: () => cambiar('ambito', '') });
  }
  if (props.productoId) {
    const prod = props.productos.find((p) => String(p.id) === String(props.productoId));
    tags.push({ id: 'productoId', label: `Prenda: ${prod?.nombre || props.productoId}`, limpiar: () => cambiar('productoId', '') });
  }
  if (props.materiaId) {
    const mat = props.materias.find((m) => String(m.id) === String(props.materiaId));
    tags.push({ id: 'materiaId', label: `Insumo: ${mat?.nombre || props.materiaId}`, limpiar: () => cambiar('materiaId', '') });
  }
  if (props.usuarioId) {
    const usr = props.usuarios.find((u) => String(u.id) === String(props.usuarioId));
    tags.push({ id: 'usuarioId', label: `Usuario: ${usr?.nombre || props.usuarioId}`, limpiar: () => cambiar('usuarioId', '') });
  }
  if (props.tipo) {
    const tipos = { entrada: 'Entrada (+)', salida: 'Salida (-)', ajuste: 'Ajuste (~)' };
    tags.push({ id: 'tipo', label: `Tipo: ${tipos[props.tipo] || props.tipo}`, limpiar: () => cambiar('tipo', '') });
  }
  if (props.estado) {
    tags.push({ id: 'estado', label: `Estado: ${props.estado}`, limpiar: () => cambiar('estado', '') });
  }
  if (props.fechaInicio || props.fechaFin) {
    tags.push({
      id: 'fechas',
      label: `Fechas: ${props.fechaInicio || 'Inicio'} → ${props.fechaFin || 'Hoy'}`,
      limpiar: () => { emit('update:fechaInicio', ''); emit('update:fechaFin', ''); emit('filtrar'); }
    });
  }
  return tags;
});
</script>

<template>
  <div class="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
    <!-- Fila Principal: Buscador + Filtros Rápidos + Toggle -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3">
      <!-- Buscador con icono y botón de limpiar -->
      <div class="relative flex-1">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          :value="busqueda"
          maxlength="100"
          type="text"
          placeholder="Buscar concepto, prenda, código SKU o material..."
          class="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-10 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/20 transition-all"
          @input="$emit('update:busqueda', $event.target.value.slice(0, 100))"
          @keyup.enter="$emit('filtrar')"
        />
        <button
          v-if="busqueda"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          @click="limpiarBusqueda"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Filtro Tipo de Movimiento (Rápido) -->
      <div class="flex items-center gap-2">
        <select
          :value="tipo"
          class="h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/20 transition"
          @change="cambiar('tipo', $event.target.value)"
        >
          <option value="">Todos los tipos</option>
          <option value="entrada">🟢 Entrada (+)</option>
          <option value="salida">🔴 Salida (-)</option>
          <option value="ajuste">🟣 Ajuste (~)</option>
        </select>

        <select
          :value="ambito"
          class="h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/20 transition"
          @change="cambiar('ambito', $event.target.value)"
        >
          <option value="">Prendas e insumos</option>
          <option value="producto">Solo prendas</option>
          <option value="materia_prima">Solo materias primas</option>
        </select>

        <!-- Botón para alternar más filtros -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-10 rounded-xl border px-3 py-2 text-xs sm:text-sm font-semibold transition"
          :class="mostrarAvanzados ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
          @click="mostrarAvanzados = !mostrarAvanzados"
        >
          <Filter class="h-3.5 w-3.5" />
          <span>Filtros</span>
          <span v-if="filtrosActivosTags.length > 0" class="flex h-5 w-5 items-center justify-center rounded-full bg-corporativo-rosa text-[10px] font-bold text-white ml-0.5">
            {{ filtrosActivosTags.length }}
          </span>
        </button>

        <button
          v-if="hayFiltrosActivos"
          type="button"
          class="inline-flex items-center gap-1 h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition"
          title="Restablecer todos los filtros"
          @click="$emit('limpiar')"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Limpiar</span>
        </button>
      </div>
    </div>

    <!-- Panel Extendido de Filtros (cuando mostrarAvanzados está activo) -->
    <div v-show="mostrarAvanzados" class="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
      <!-- Selector de Prenda -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Prenda específica</label>
        <select
          :value="productoId"
          class="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-corporativo-rosa focus:outline-none"
          @change="cambiar('productoId', $event.target.value)"
        >
          <option value="">Todas las prendas</option>
          <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
        </select>
      </div>

      <!-- Selector de Insumo / Materia Prima -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Materia prima / Insumo</label>
        <select
          :value="materiaId"
          class="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-corporativo-rosa focus:outline-none"
          @change="cambiar('materiaId', $event.target.value)"
        >
          <option value="">Todos los insumos</option>
          <option v-for="m in materias" :key="m.id" :value="m.id">{{ m.nombre }}</option>
        </select>
      </div>

      <!-- Selector de Usuario / Responsable -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Usuario responsable</label>
        <select
          :value="usuarioId"
          class="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-corporativo-rosa focus:outline-none"
          @change="cambiar('usuarioId', $event.target.value)"
        >
          <option value="">Todos los usuarios</option>
          <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
        </select>
      </div>

      <!-- Selector de Estado -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Estado de movimiento</label>
        <select
          :value="estado"
          class="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-corporativo-rosa focus:outline-none"
          @change="cambiar('estado', $event.target.value)"
        >
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Anulado">Anulado</option>
        </select>
      </div>

      <!-- Rango de Fechas: Desde -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Fecha desde</label>
        <input
          type="date"
          :value="fechaInicio"
          :max="fechaFin || undefined"
          class="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-corporativo-rosa focus:outline-none"
          @change="cambiar('fechaInicio', $event.target.value)"
        />
      </div>

      <!-- Rango de Fechas: Hasta -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Fecha hasta</label>
        <input
          type="date"
          :value="fechaFin"
          :min="fechaInicio || undefined"
          class="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-corporativo-rosa focus:outline-none"
          @change="cambiar('fechaFin', $event.target.value)"
        />
      </div>
    </div>

    <!-- Tags de Filtros Activos (chips interactivos) -->
    <div v-if="filtrosActivosTags.length > 0" class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
      <span class="text-xs font-semibold text-gray-400 mr-1">Filtros aplicados:</span>
      <span
        v-for="tag in filtrosActivosTags"
        :key="tag.id"
        class="inline-flex items-center gap-1 rounded-lg bg-pink-50 border border-pink-200/80 px-2.5 py-1 text-xs font-medium text-pink-700 hover:bg-pink-100 transition"
      >
        <span>{{ tag.label }}</span>
        <button
          type="button"
          class="hover:text-pink-900 rounded-full p-0.5"
          :title="`Eliminar filtro ${tag.label}`"
          @click="tag.limpiar"
        >
          <X class="h-3 w-3" />
        </button>
      </span>
      <button
        type="button"
        class="text-xs font-semibold text-gray-500 hover:text-corporativo-rosa underline ml-1"
        @click="$emit('limpiar')"
      >
        Borrar todos
      </button>
    </div>
  </div>
</template>
