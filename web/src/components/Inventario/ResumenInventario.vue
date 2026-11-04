<script setup>
defineProps({
  resumen: { type: Object, required: true },
  alertas: { type: Object, default: () => ({ agotados: 0, bajoStock: 0 }) }
})
</script>

<template>
  <div class="metrics">
    <article><span>Total movimientos</span><strong>{{ resumen.total_movimientos || 0 }}</strong><small>Registrados</small></article>
    <article><span>Entradas</span><strong class="green">{{ resumen.entradas || 0 }}</strong><small>Movimientos activos</small></article>
    <article><span>Salidas</span><strong class="red">{{ resumen.salidas || 0 }}</strong><small>Movimientos activos</small></article>
    <article><span>Ajustes / anulados</span><strong class="amber">{{ (resumen.ajustes || 0) + (resumen.anulados || 0) }}</strong><small>{{ resumen.anulados || 0 }} anulados</small></article>
    <article><span>Variantes agotadas</span><strong class="red">{{ alertas.agotados || 0 }}</strong><small>Requieren reposicion</small></article>
    <article><span>Bajo stock</span><strong class="amber">{{ alertas.bajoStock || 0 }}</strong><small>Por debajo del umbral</small></article>
  </div>
</template>