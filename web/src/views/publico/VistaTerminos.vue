<script setup>
import { onMounted, ref } from 'vue';
import clienteApi from '@/services/clienteApi';

const termino = ref(null);
const cargando = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const respuesta = await clienteApi.get('/terminos-condiciones');
    termino.value = respuesta.data?.data ?? respuesta.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'No se pudieron cargar los términos y condiciones.';
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <section class="max-w-3xl mx-auto px-4 py-10">
    <p v-if="cargando" class="text-sm text-gray-500">Cargando...</p>
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

    <article v-else class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <h1 class="text-2xl font-bold font-titulos text-gray-900">{{ termino.titulo }}</h1>
      <p class="text-xs text-gray-400 mt-1 mb-6">version {{ termino.version }}</p>
      <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ termino.contenido }}</div>
    </article>
  </section>
</template>
