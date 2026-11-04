<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  titulo: { type: String, default: 'Ventana emergente' },
  anchoMax: { type: String, default: 'max-w-3xl' }
});

const emit = defineEmits(['cerrar']);

function cerrarConEscape(event) {
  if (event.key === 'Escape' && props.abierto) emit('cerrar');
}

watch(
  () => props.abierto,
  (abierto) => {
    document.body.style.overflow = abierto ? 'hidden' : '';
  }
);

onMounted(() => window.addEventListener('keydown', cerrarConEscape));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', cerrarConEscape);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      class="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      @click.self="emit('cerrar')"
    >
      <section
        class="relative my-auto max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl"
        :class="anchoMax"
        role="dialog"
        aria-modal="true"
        :aria-label="titulo"
      >
        <slot />
      </section>
    </div>
  </Teleport>
</template>
