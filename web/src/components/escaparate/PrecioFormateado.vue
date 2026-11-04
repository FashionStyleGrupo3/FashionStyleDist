
<script setup>
import { computed } from 'vue'

const props = defineProps({
  valor: { type: [Number, String], default: 0 },
  desde: { type: Boolean, default: false },
  tamanoCifra: { type: String, default: 'text-base' },
  tamanoMoneda: { type: String, default: 'text-xs' },
})

const formateador = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const numero = computed(() => {
  const n = Number(props.valor)
  return Number.isFinite(n) ? n : 0
})

const partes = computed(() => {
  const texto = formateador.format(numero.value).replace(/\u00a0/g, ' ')
  const [simbolo, ...resto] = texto.split(' ')
  return { simbolo, cifra: resto.join(' ') }
})
</script>

<template>
  <p class="flex items-baseline gap-1 text-stone-900">
    <span v-if="desde" class="text-xs text-stone-500">Desde</span>
    <span :class="tamanoMoneda" class="text-stone-600">{{ partes.simbolo }}</span>
    <span :class="tamanoCifra" class="font-semibold tabular-nums">{{ partes.cifra }}</span>
    <span :class="tamanoMoneda" class="text-stone-500">COP</span>
  </p>
</template>
