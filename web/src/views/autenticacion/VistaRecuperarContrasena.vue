<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { obtenerMensajeError } from '@/services/clienteApi';

const router = useRouter();

const authStore = useAutenticacionStore();
const email = ref('');
const mensaje = ref('');
const mensajeError = ref('');
const cargando = ref(false);

const solicitarRecuperacion = async () => {
    cargando.value = true;
    mensaje.value = '';
    mensajeError.value = '';

    try {
        const respuesta = await authStore.solicitarRecuperacion(email.value);

        mensaje.value = respuesta?.data?.message || 'Se ha enviado un código a tu correo.';

        router.push({
            name: 'restablecer-contrasena',
            query: {
                correo: email.value
            }
        });
    } catch (error) {
        mensajeError.value = obtenerMensajeError(error, 'Ocurrió un error al procesar la solicitud.');
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
            Recuperar contraseña
        </h1>

        <p class="text-slate-500 text-sm mb-6 leading-relaxed">
            Ingresa tu correo electrónico registrado para enviarte las instrucciones.
        </p>

        <form @submit.prevent="solicitarRecuperacion" class="space-y-5 text-left">
            <div>
                <label for="email" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    CORREO ELECTRÓNICO
                </label>
                <input id="email" v-model="email" type="email" required placeholder="Tu correo electrónico"
                    class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#e22866] focus:ring-2 focus:ring-[#e22866]/20 transition-all" />
            </div>

            <button type="submit" :disabled="cargando"
                class="w-full py-3.5 px-4 bg-[#e22866] hover:bg-[#c91a52] text-white font-semibold rounded-xl text-sm transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">
                {{ cargando ? 'Enviando...' : 'Enviar enlace' }}
            </button>
        </form>

        <p v-if="mensaje"
            class="mt-4 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
            {{ mensaje }}
        </p>
        <p v-if="mensajeError"
            class="mt-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl text-center">
            {{ mensajeError }}
        </p>

        <div class="mt-6">
            <router-link :to="{ name: 'login' }" class="text-sm text-slate-600 hover:text-[#e22866] transition-colors">
                ¿Volver al inicio de sesión?
            </router-link>
        </div>
    </div>
</template>
