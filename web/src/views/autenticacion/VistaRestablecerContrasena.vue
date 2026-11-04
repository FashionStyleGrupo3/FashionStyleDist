<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { obtenerMensajeError } from '@/services/clienteApi';
import RequisitosPassword from '@/components/autenticacion/RequisitosPassword.vue';
import { passwordEsSegura } from '@/utils/validarPassword';

const route = useRoute();
const router = useRouter();
const authStore = useAutenticacionStore();

const formulario = ref({
  correo: '',
  codigo: '',
  nueva_password: '',
  nueva_password_confirmation: ''
});

const mensaje = ref('');
const mensajeError = ref('');
const cargando = ref(false);

onMounted(() => {
  formulario.value.correo = route.query.correo || '';
});

const restablecer = async () => {
  mensaje.value = '';
  mensajeError.value = '';

  if (!passwordEsSegura(formulario.value.nueva_password)) {
    mensajeError.value = 'La contraseña no cumple los requisitos de seguridad.';
    return;
  }

  if (
    formulario.value.nueva_password !==
    formulario.value.nueva_password_confirmation
  ) {
    mensajeError.value = 'Las contraseñaas no coinciden.';
    return;
  }

  cargando.value = true;

  try {
    const respuesta = await authStore.restablecerContrasena(formulario.value);

    mensaje.value =
      respuesta?.data?.message || 'contraseña restablecida con éxito.';

    setTimeout(() => {
      router.push({ name: 'login' });
    }, 2000);

  } catch (error) {
    mensajeError.value = obtenerMensajeError(
      error,
      'Error al restablecer la contraseña.'
    );
  } finally {
    cargando.value = false;
  }
};
</script>

<template>
  <div>
    <span class="text-[#e22866] font-bold text-xs tracking-widest uppercase block mb-1">
      FASHION STYLE
    </span>
    
    <h1 class="text-2xl font-extrabold text-slate-900 mb-2">
      Restablecer contraseña
    </h1>
    
    <p class="text-slate-500 text-sm mb-6 leading-relaxed">
      Ingresa tu NUEVA contraseña para acceder a tu cuenta.
    </p>

    <form @submit.prevent="restablecer" class="space-y-4 text-left">
      <div>
        <label for="email" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          CORREO Electronico
        </label>
        <input 
          id="email" 
          v-model="formulario.correo" 
          type="email" 
          required 
          placeholder="Tu correo registrado" 
          class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#e22866] focus:ring-2 focus:ring-[#e22866]/20 transition-all"
        />
      </div>
<div>
  <label
    for="codigo"
    class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
  >
    código DE verificacion
  </label>

    <input
      id="codigo"
      v-model="formulario.codigo"
      type="text"
      inputmode="numeric"
      maxlength="6"
      required
      placeholder="código de 6 dígitos"
      class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#e22866] focus:ring-2 focus:ring-[#e22866]/20 transition-all"
      @input="(e)=>{ formulario.codigo = String(e.target.value).replace(/[^0-9]/g,'').slice(0,6); e.target.value = formulario.codigo; }"
    />
</div>
      <div>
        <label for="nueva_password" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          NUEVA CONTRASEÁ
        </label>
          <input 
            id="nueva_password" 
            v-model="formulario.nueva_password" 
            type="password" 
            required 
            minlength="8"
            maxlength="128"
            placeholder="Minimoimo 8 caracteres" 
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#e22866] focus:ring-2 focus:ring-[#e22866]/20 transition-all"
          />
      </div>

      <div>
        <label for="nueva_password_confirmation" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          CONFIRMAR CONTRASEÁ
        </label>
          <input 
            id="nueva_password_confirmation" 
            v-model="formulario.nueva_password_confirmation" 
            type="password" 
            required 
            minlength="8"
            maxlength="128"
            placeholder="Repite la contraseña" 
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#e22866] focus:ring-2 focus:ring-[#e22866]/20 transition-all"
          />
      </div>

      <button 
        type="submit" 
        :disabled="cargando"
        class="w-full py-3.5 px-4 bg-[#e22866] hover:bg-[#c91a52] text-white font-semibold rounded-xl text-sm transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mt-2"
      >
        {{ cargando ? 'Guardando...' : 'Restablecer contraseña' }}
      </button>
    </form>

    <p v-if="mensaje" class="mt-4 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
      {{ mensaje }}
    </p>
    <p v-if="mensajeError" class="mt-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl text-center">
      {{ mensajeError }}
    </p>
  </div>
</template>
