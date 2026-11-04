<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacionStore } from '@/stores/autenticacion';

const router = useRouter();
const authStore = useAutenticacionStore();

const abierto = ref(false);
const menuRef = ref(null);

const alternarMenu = () => {
  abierto.value = !abierto.value;
};

const cerrarMenu = () => {
  abierto.value = false;
};

const irA = (nombreRuta) => {
  cerrarMenu();
  router.push({ name: nombreRuta });
};

const cerrarSesion = async () => {
  cerrarMenu();
  await authStore.cerrarSesion();
};

const cerrarAlHacerClickAfuera = (evento) => {
  if (
    menuRef.value &&
    !menuRef.value.contains(evento.target)
  ) {
    cerrarMenu();
  }
};

const cerrarConEscape = (evento) => {
  if (evento.key === 'Escape') {
    cerrarMenu();
  }
};

onMounted(() => {
  document.addEventListener(
    'click',
    cerrarAlHacerClickAfuera
  );

  document.addEventListener(
    'keydown',
    cerrarConEscape
  );
});

onBeforeUnmount(() => {
  document.removeEventListener(
    'click',
    cerrarAlHacerClickAfuera
  );

  document.removeEventListener(
    'keydown',
    cerrarConEscape
  );
});
</script>

<template>
  <div
    ref="menuRef"
    class="relative"
  >
    <!-- boton del Ícono de usuario -->
    <button
      type="button"
      @click.stop="alternarMenu"
      class="flex h-10 w-10 items-center justify-center
             rounded-full text-gray-700 transition
             hover:bg-pink-50 hover:text-pink-600
             focus:outline-none focus:ring-2
             focus:ring-pink-300"
      aria-label="Abrir menú de usuario"
      :aria-expanded="abierto"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0
             3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25
             8.25 0 0 1 15 0"
        />
      </svg>
    </button>

    <!-- Menú desplegable -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="abierto"
        class="absolute right-0 z-50 mt-3 w-64
               origin-top-right overflow-hidden
               rounded-xl border border-gray-100
               bg-white shadow-xl"
      >
        <!-- informacion del usuario -->
        <div
          class="border-b border-gray-100
                 bg-gray-50 px-4 py-3"
        >
          <p
            class="truncate text-sm font-semibold
                   text-gray-900"
          >
            {{ authStore.usuario?.nombre || 'Mi cuenta' }}
          </p>

          <p
            class="truncate text-xs text-gray-500"
          >
            {{ authStore.usuario?.correo || authStore.usuario?.email || '' }}
          </p>

          <span
            v-if="authStore.rolUsuario"
            class="mt-2 inline-block rounded-full
                   bg-pink-100 px-2 py-1
                   text-[10px] font-semibold
                   uppercase tracking-wide
                   text-pink-700"
          >
            {{ authStore.rolUsuario }}
          </span>
        </div>

        <!-- Opciones de usuario -->
        <div class="py-2">
          <button
            type="button"
            @click="irA('perfil')"
            class="flex w-full items-center gap-3
                   px-4 py-2.5 text-left text-sm
                   text-gray-700 transition
                   hover:bg-pink-50
                   hover:text-pink-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0
                   3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25
                   8.25 0 0 1 15 0"
              />
            </svg>

            <span>Mi perfil</span>
          </button>

        </div>

        <!-- Cerrar sesión -->
        <div class="border-t border-gray-100 py-2">
          <button
            type="button"
            @click="cerrarSesion"
            class="flex w-full items-center gap-3
                   px-4 py-2.5 text-left text-sm
                   font-semibold text-red-600 transition
                   hover:bg-red-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0
                   0013.5 3h-6a2.25 2.25 0
                   00-2.25 2.25v13.5A2.25 2.25 0
                   007.5 21h6a2.25 2.25 0
                   002.25-2.25V15m3-6 3 3m0 0-3
                   3m3-3H9"
              />
            </svg>

            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>