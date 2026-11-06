<script setup>
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
})

const emit = defineEmits([
  'update:busqueda', 'update:tipo', 'update:estado', 'update:ambito',
  'update:productoId', 'update:materiaId', 'update:usuarioId',
  'update:fechaInicio', 'update:fechaFin', 'filtrar', 'limpiar'
])

function cambiar(campo, valor) {
  emit(`update:${campo}`, valor)
  // Producto y material son excluyentes: el kárdex de prendas y el de insumos.
  if (campo === 'productoId' && valor) emit('update:materiaId', '')
  if (campo === 'materiaId' && valor) emit('update:productoId', '')
  emit('filtrar')
}

const hayFiltros = () => [props.tipo, props.estado, props.ambito, props.productoId, props.materiaId, props.usuarioId, props.fechaInicio, props.fechaFin, props.busqueda]
  .some((v) => v !== '' && v !== null && v !== undefined)
</script>

<template>
  <div class="toolbar toolbar--filtros">
    <input
      :value="busqueda"
      maxlength="100"
      placeholder="Buscar concepto, producto o material..."
      @input="$emit('update:busqueda', $event.target.value.slice(0, 100))"
      @keyup.enter="$emit('filtrar')"
    />
    <select :value="ambito" aria-label="Ámbito" @change="cambiar('ambito', $event.target.value)">
      <option value="">Prendas e insumos</option>
      <option value="producto">Solo prendas</option>
      <option value="materia_prima">Solo materias primas</option>
    </select>
    <select :value="productoId" aria-label="Producto" @change="cambiar('productoId', $event.target.value)">
      <option value="">Todos los productos</option>
      <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
    </select>
    <select :value="materiaId" aria-label="Material" @change="cambiar('materiaId', $event.target.value)">
      <option value="">Todos los materiales</option>
      <option v-for="m in materias" :key="m.id" :value="m.id">{{ m.nombre }}</option>
    </select>
    <select :value="usuarioId" aria-label="Usuario" @change="cambiar('usuarioId', $event.target.value)">
      <option value="">Todos los usuarios</option>
      <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
    </select>
    <select :value="tipo" aria-label="Tipo" @change="cambiar('tipo', $event.target.value)">
      <option value="">Todos los tipos</option>
      <option value="entrada">Entrada</option>
      <option value="salida">Salida</option>
      <option value="ajuste">Ajuste</option>
    </select>
    <select :value="estado" aria-label="Estado" @change="cambiar('estado', $event.target.value)">
      <option value="">Todos los estados</option>
      <option value="Activo">Activo</option>
      <option value="Anulado">Anulado</option>
    </select>
    <label class="toolbar__fecha">
      <span>Desde</span>
      <input type="date" :value="fechaInicio" :max="fechaFin || undefined" @change="cambiar('fechaInicio', $event.target.value)" />
    </label>
    <label class="toolbar__fecha">
      <span>Hasta</span>
      <input type="date" :value="fechaFin" :min="fechaInicio || undefined" @change="cambiar('fechaFin', $event.target.value)" />
    </label>
    <button v-if="hayFiltros()" type="button" class="toolbar__limpiar" @click="$emit('limpiar')">Limpiar filtros</button>
  </div>
</template>

<style scoped>
.toolbar--filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
}

.vista-inventario .toolbar--filtros > input {
  flex: 1 1 100%;
}

.vista-inventario .toolbar--filtros select {
  flex: 1 1 170px;
  min-width: 0;
}

.toolbar__fecha {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 0 1 150px;
  font-size: 11px;
  font-weight: 600;
  color: var(--fs-gris);
}

.toolbar__limpiar {
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--fs-borde);
  border-radius: 10px;
  background: var(--fs-blanco);
  color: var(--fs-texto);
  font-size: 13px;
  font-weight: 600;
}

.toolbar__limpiar:hover {
  background: var(--fs-arena-suave);
}
</style>
