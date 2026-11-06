<script setup>
import { RouterView, RouterLink } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { useImagenStorage } from '@/composables/useImagenStorage';
import '@/assets/estilos/auth.css';

const { resolverUrlImagen } = useImagenStorage();
const foto = `${import.meta.env.BASE_URL}img/login-modelo.jpg`;
</script>

<template>
  <div class="fs-auth">
    <aside class="fs-auth__foto">
      <img :src="foto" alt="Modelo FashionStyle" />
      <RouterLink to="/" class="fs-auth__marca">FashionStyle</RouterLink>
      <h1 class="fs-auth__frase">Moda que se ajusta a ti</h1>
    </aside>

    <main class="fs-auth__lado">
      <RouterLink to="/" class="fs-auth__volver">
        <ArrowLeft class="w-4 h-4" />
        Volver a la tienda
      </RouterLink>

      <div class="fs-auth__caja">
        <RouterView />
      </div>
    </main>
  </div>
</template>
