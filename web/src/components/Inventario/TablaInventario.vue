<script setup>
defineProps({
  movimientos: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false }
})

defineEmits(['editar', 'anular'])

function nombreVariante(movimiento) {
  if (!movimiento.variante) return 'Variante no disponible'
  return `${movimiento.producto?.nombre || movimiento.variante.producto?.nombre || 'Producto'} · ${movimiento.producto?.color || 'Sin color'} · ${movimiento.variante.talla || 'Sin talla'}`
}
function estadoClase(estado) { return estado === 'Activo' ? 'en-stock' : 'sin-stock' }
function tipoClase(tipo) { return tipo === 'entrada' ? 'en-stock' : tipo === 'salida' ? 'sin-stock' : 'stock-bajo' }
function fecha(valor) { return valor ? new Date(valor).toLocaleDateString('es-CO') : '—' }

</script>

<template>
  <div class="table-scroll">
    <table>
      <thead><tr><th>Fecha</th><th>Producto / variante</th><th>Tipo</th><th>Concepto</th><th>Cantidad</th><th>Estado</th><th>Usuario</th><th>Acciones</th></tr></thead>
      <tbody>
        <tr v-for="movimiento in movimientos" :key="movimiento.id">
          <td>{{ fecha(movimiento.fecha_registro) }}</td>
          <td><strong>{{ nombreVariante(movimiento) }}</strong><small>ID movimiento: {{ movimiento.id }}</small></td>
          <td><span class="badge" :class="tipoClase(movimiento.tipo_movimiento)">{{ movimiento.tipo_movimiento }}</span></td>
          <td>{{ movimiento.concepto }}</td>
          <td :class="tipoClase(movimiento.tipo_movimiento)">{{ movimiento.cantidad }}</td>
          <td><span class="badge" :class="estadoClase(movimiento.estado)">{{ movimiento.estado }}</span></td>
          <td>{{ movimiento.usuario?.nombre || movimiento.usuario?.name || '—' }}</td>
          <td><button class="icon-button" :disabled="movimiento.estado === 'Anulado'" @click="$emit('editar', movimiento)">Editar</button><button class="icon-button danger" :disabled="movimiento.estado === 'Anulado'" @click="$emit('anular', movimiento)">Anular</button></td>
        </tr>
      </tbody>
    </table>
    <div v-if="cargando" class="empty">Cargando movimientos...</div>
    <div v-else-if="!movimientos.length" class="empty">No hay movimientos para mostrar.</div>
  </div>
</template>
