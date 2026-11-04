<script setup>
import { onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { useNotificacion } from '@/composables/useNotificacion';
import { obtenerMensajeError } from '@/services/clienteApi';

const route = useRoute();
const router = useRouter();
const authStore = useAutenticacionStore();
const { notificarError, notificarExito } = useNotificacion();

const correo = ref(typeof route.query.correo === 'string' ? route.query.correo : '');
const codigo = ref('');
const cargando = ref(false);
const errorMessage = ref('');
const espera = ref(0);
let temporizador = null;

function iniciarEspera(segundos = 60) {
  espera.value = segundos;
  clearInterval(temporizador);
  temporizador = setInterval(() => {
    espera.value -= 1;
    if (espera.value <= 0) clearInterval(temporizador);
  }, 1000);
}
iniciarEspera(30);
onBeforeUnmount(() => clearInterval(temporizador));

function redirSeguro() {
  const redir = route.query.redir;
  const valido =
    typeof redir === 'string' &&
    redir.startsWith('/') &&
    !redir.startsWith('//') &&
    !['login', 'registro', 'verificar-correo'].some((p) => redir.includes(p));
  return valido ? redir : null;
}

const verificar = async () => {
  errorMessage.value = '';
  cargando.value = true;
  try {
    await authStore.verificarCorreo({ correo: correo.value.trim(), codigo: codigo.value.trim() });
    notificarExito('Correo verificado. ¡Bienvenido a FashionStyle!');
    await router.replace(redirSeguro() ?? authStore.rutaInicial());
  } catch (err) {
    errorMessage.value = obtenerMensajeError(err, 'No se pudo verificar el código.');
  } finally {
    cargando.value = false;
  }
};

const reenviar = async () => {
  try {
    await authStore.reenviarCodigo(correo.value.trim());
    notificarExito('Si el correo existe, enviamos un nuevo código.');
    iniciarEspera(60);
  } catch (err) {
    notificarError(obtenerMensajeError(err, 'No se pudo reenviar el código.'));
  }
};
</script>

<template>
  <div class="w-full">
    <header class="text-center mb-6">
      <p class="text-xs font-bold uppercase tracking-widest text-corporativo-rosa mb-1">Fashion Style</p>
      <h2 class="text-2xl font-bold font-titulos text-gray-900">Verifica tu correo</h2>
      <p class="text-sm text-gray-500 mt-1">
        Escribe el código de 6 dígitos que enviamos a
        <strong class="text-gray-700">{{ correo || 'tu correo' }}</strong>.
      </p>
    </header>

    <form @submit.prevent="verificar" class="space-y-4" novalidate>
      <div v-if="!route.query.correo">
        <label for="correo" class="auth-etiqueta">Correo Electronico</label>
        <input id="correo" v-model="correo" type="email" required autocomplete="email" class="auth-campo" maxlength="254" @input="(e)=>{ correo = String(e.target.value).replace(/\s+/g,'').slice(0,254); e.target.value = correo; }" />
      </div>

      <div>
        <label for="codigo" class="auth-etiqueta">código de verificacion</label>
          <input
            id="codigo"
            v-model="codigo"
            type="text"
            inputmode="numeric"
            maxlength="6"
            autocomplete="one-time-code"
            class="auth-campo"
            @input="(e)=>{ codigo = String(e.target.value).replace(/[^0-9]/g,'').slice(0,6); e.target.value = codigo; }"
          />
      </div>

      <p v-if="errorMessage" role="alert" class="text-xs font-medium text-red-600 bg-red-50 rounded-lg px-3 py-2">
        {{ errorMessage }}
      </p>

      <button type="submit" :disabled="cargando || codigo.length !== 6 || !correo" class="auth-boton">
        {{ cargando ? 'Verificando...' : 'Verificar y continuar' }}
      </button>
    </form>

    <div class="text-center text-xs text-gray-500 mt-5 space-y-2">
      <p>
        Ño te llegó?
        <button
          type="button"
          class="font-semibold text-corporativo-rosa hover:underline disabled:text-gray-400 disabled:no-underline"
          :disabled="espera > 0 || !correo"
          @click="reenviar"
        >
          {{ espera > 0 ? `Reenviar código (${espera}s)` : 'Reenviar código' }}
        </button>
      </p>
      <p>Revisa también la carpeta de spam. El código vence en 15 minutos.</p>
      <RouterLink :to="{ name: 'login' }" class="inline-block text-gray-500 hover:text-corporativo-rosa">
        Volver a iniciar sesión
      </RouterLink>
    </div>
  </div>
</template>
