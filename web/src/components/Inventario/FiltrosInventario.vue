<script setup>
defineProps({
  busqueda: { type: String, default: '' },
  tipo: { type: String, default: '' },
  estado: { type: String, default: '' }
})

defineEmits(['update:busqueda', 'update:tipo', 'update:estado', 'filtrar'])
</script>

<template>
  <div class="toolbar">
    <input :value="busqueda" maxlength="100" placeholder="Buscar concepto, producto o variante..." @input="$emit('update:busqueda', $event.target.value.slice(0, 100))" />
    <select :value="tipo" @change="$emit('update:tipo', $event.target.value); $emit('filtrar')">
      <option value="">Todos los tipos</option>
      <option value="entrada">Entrada</option>
      <option value="salida">Salida</option>
      <option value="ajuste">Ajuste</option>
    </select>
    <select :value="estado" @change="$emit('update:estado', $event.target.value); $emit('filtrar')">
      <option value="">Todos los estados</option>
      <option value="Activo">Activo</option>
      <option value="Anulado">Anulado</option>
    </select>
  </div>
</template>
