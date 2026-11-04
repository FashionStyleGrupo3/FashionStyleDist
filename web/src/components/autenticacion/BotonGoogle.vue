<script setup>
import { nextTick, onMounted, ref } from 'vue';

defineProps({
  deshabilitado: { type: Boolean, default: false }
});

const emit = defineEmits(['credential', 'error']);
const contenedor = ref(null);
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SRC = 'https://accounts.google.com/gsi/client';

function renderizarBoton() {
  if (!clientId || !contenedor.value || !window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: ({ credential }) => {
      if (credential) emit('credential', credential);
      else emit('error', new Error('Google no devolvió una credencial válida.'));
    }
  });

  const ancho = Math.min(400, Math.max(200, Math.floor(contenedor.value.clientWidth || 320)));

  window.google.accounts.id.renderButton(contenedor.value, {
    theme: 'outline',
    size: 'large',
    width: ancho,
    text: 'continue_with',
    shape: 'rectangular'
  });
}

function cargarGoogle() {
  if (!clientId) return;
  if (window.google?.accounts?.id) {
    renderizarBoton();
    return;
  }

  let script = document.querySelector(`script[src="${SRC}"]`);
  if (!script) {
    script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  script.addEventListener('load', () => nextTick(renderizarBoton), { once: true });
  script.addEventListener(
    'error',
    () => emit('error', new Error('No se pudo cargar el inicio de sesion con Google.')),
    { once: true }
  );
}

onMounted(() => nextTick(cargarGoogle));
</script>

<template>
  <div v-if="clientId" :class="{ 'pointer-events-none opacity-50': deshabilitado }">
    <div ref="contenedor" class="flex min-h-10 w-full justify-center" aria-label="Continuar con Google"></div>
  </div>
  <p v-else class="text-center text-xs text-gray-400">
    Inicio con Google no configurado en este entorno.
  </p>
</template>