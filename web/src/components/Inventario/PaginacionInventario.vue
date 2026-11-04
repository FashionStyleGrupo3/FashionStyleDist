<script setup>
defineProps({
  pagina: { type: Number, required: true },
  ultimaPagina: { type: Number, required: true },
  total: { type: Number, default: 0 }
})

defineEmits(['cambiar'])
</script>

<template>
  <footer><span>Página {{ pagina }} de {{ ultimaPagina }} · {{ total }} movimientos</span><div><button :disabled="pagina === 1" @click="$emit('cambiar', pagina - 1)">‹</button><button class="current">{{ pagina }}</button><button :disabled="pagina === ultimaPagina" @click="$emit('cambiar', pagina + 1)">›</button></div></footer>
</template>
