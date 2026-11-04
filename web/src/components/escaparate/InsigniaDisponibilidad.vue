<script setup>
import { computed } from 'vue'

const props = defineProps({
  variantes: { type: Array, default: () => [] },
  fechaCreacion: { type: String, default: null },
  diasNuevo: { type: Number, default: 14 },
  umbralBajoStock: { type: Number, default: 5 },
})

const stockTotal = computed(() =>
  props.variantes.reduce((acc, v) => acc + Number(v.stock || 0), 0)
)

const esNuevo = computed(() => {
  if (!props.fechaCreacion) return false
  const creado = new Date(props.fechaCreacion)
  if (Number.isNaN(creado.getTime())) return false
  const dias = (Date.now() - creado.getTime()) / 86400000
  return dias <= props.diasNuevo
})

const TEXTO_POCAS = 'Últimas piezas'

const insignia = computed(() => {
  if (stockTotal.value <= 0) {
    return { texto: 'Agotado', clase: 'fs-insignia--agotado' }
  }
  if (stockTotal.value <= props.umbralBajoStock) {
    return { texto: TEXTO_POCAS, clase: 'fs-insignia--poco' }
  }
  if (esNuevo.value) {
    return { texto: 'Nuevo', clase: 'fs-insignia--nuevo' }
  }
  return null
})
</script>

<template>
  <span
    v-if="insignia"
    class="fs-insignia"
    :class="insignia.clase"
  >
    {{ insignia.texto }}
  </span>
</template>