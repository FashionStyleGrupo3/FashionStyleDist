<script setup>
import { computed, ref } from 'vue';
import { Camera, Trash2, Check, AlertCircle } from 'lucide-vue-next';
import AvatarUsuario from '@/components/perfil/AvatarUsuario.vue';
import BotonGoogle from '@/components/autenticacion/BotonGoogle.vue';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { subirFotoPerfil, usarFotoDeGoogle, quitarFotoPerfil } from '@/services/usuarioServicio';

const authStore = useAutenticacionStore();
const usuario = computed(() => authStore.usuario);

const procesando = ref(false);
const mostrandoGoogle = ref(false);
const exito = ref('');
const error = ref('');

const MAX_BYTES = 2 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

function primerError(e, porDefecto) {
  return Object.values(e.response?.data?.errors || {}).flat()[0]
    || e.response?.data?.message
    || porDefecto;
}

async function ejecutar(accion, mensajeExito) {
  exito.value = '';
  error.value = '';
  procesando.value = true;
  try {
    authStore.actualizarUsuario(await accion());
    exito.value = mensajeExito;
    mostrandoGoogle.value = false;
  } catch (e) {
    error.value = primerError(e, 'No se pudo actualizar tu foto.');
  } finally {
    procesando.value = false;
  }
}

function elegirArchivo(evento) {
  const archivo = evento.target.files?.[0];
  evento.target.value = '';
  if (!archivo) return;

  exito.value = '';
  if (!TIPOS.includes(archivo.type)) {
    error.value = 'Usa una imagen JPG, PNG o WEBP.';
    return;
  }
  if (archivo.size > MAX_BYTES) {
    error.value = 'La imagen no puede pesar más de 2 MB.';
    return;
  }
  ejecutar(() => subirFotoPerfil(archivo), 'Tu foto se actualizó.');
}

function alRecibirCredencialGoogle(credential) {
  ejecutar(() => usarFotoDeGoogle(credential), 'Importamos tu foto de Google.');
}

function alFallarGoogle(e) {
  error.value = e?.message || 'No se pudo conectar con Google.';
}
</script>

<template>
  <div class="text-center">
    <AvatarUsuario
      :nombre="usuario?.nombre"
      :foto="usuario?.foto_perfil || ''"
      clases="mx-auto h-24 w-24 text-3xl shadow-inner"
    />

    <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
      <label
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        :class="{ 'pointer-events-none opacity-50': procesando }"
      >
        <Camera class="h-3.5 w-3.5" />
        Subir foto
        <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="elegirArchivo" />
      </label>

      <button
        type="button"
        :disabled="procesando"
        class="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        @click="mostrandoGoogle = !mostrandoGoogle"
      >
        Usar mi foto de Google
      </button>

      <button
        v-if="usuario?.foto_perfil"
        type="button"
        :disabled="procesando"
        class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        @click="ejecutar(quitarFotoPerfil, 'Quitamos tu foto de perfil.')"
      >
        <Trash2 class="h-3.5 w-3.5" />
        Quitar
      </button>
    </div>

    <p class="mt-2 text-[11px] text-gray-400">JPG, PNG o WEBP, máximo 2 MB.</p>

    <div v-if="mostrandoGoogle" class="mt-4 space-y-2 rounded-xl bg-gray-50 p-3">
      <p class="text-xs text-gray-600">
        Inicia con la cuenta de Google que usa el correo
        <strong class="break-all">{{ usuario?.correo || usuario?.email }}</strong>.
      </p>
      <BotonGoogle :deshabilitado="procesando" @credential="alRecibirCredencialGoogle" @error="alFallarGoogle" />
    </div>

    <p v-if="procesando" class="mt-3 text-xs text-gray-500">Guardando...</p>

    <div v-if="exito" class="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-emerald-700">
      <Check class="h-4 w-4" /> {{ exito }}
    </div>
    <div v-if="error" class="mt-3 flex items-start justify-center gap-2 text-xs font-medium text-red-700">
      <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" /> <span>{{ error }}</span>
    </div>
  </div>
</template>