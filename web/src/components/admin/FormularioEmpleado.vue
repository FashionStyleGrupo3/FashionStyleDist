
<script setup>
import { reactive, ref } from 'vue';
import { X, UserPlus, Eye, EyeOff } from 'lucide-vue-next';
import { filtrarCampo } from '@/utils/validacionCampos';
import RequisitosPassword from '@/components/autenticacion/RequisitosPassword.vue';
import { passwordEsSegura } from '@/utils/validarPassword';

defineProps({
  guardando: { type: Boolean, default: false },
  errorServidor: { type: String, default: '' }
});
const emit = defineEmits(['cerrar', 'crear']);

const formulario = reactive({
  nombre: '',
  correo: '',
  telefono: '',
  password: '',
  password_confirmation: '',
  activo: true,
  // El administrador tiene todos los permisos del sistema.
  rol: 'empleado'
});
const errores = reactive({});
const verPassword = ref(false);

function filtrarFormulario(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  formulario[campo] = valor;
  evento.target.value = valor;
}

function validar() {
  Object.keys(errores).forEach(k => delete errores[k]);
  if (!formulario.nombre.trim()) errores.nombre = 'El nombre es obligatorio.';
  if (!/^\S+@\S+\.\S+$/.test(formulario.correo)) errores.correo = 'Ingresa un correo válido.';
  if (formulario.telefono && formulario.telefono.length > 20) errores.telefono = 'Máximo 20 caracteres.';
  if (!passwordEsSegura(formulario.password)) errores.password = 'Mñimo 10 caracteres, con mayúscula, minúscula, número y símbolo.';
  if (formulario.password !== formulario.password_confirmation) errores.password_confirmation = 'Las contraseñaas no coinciden.';
  return Object.keys(errores).length === 0;
}

function enviar() {
  if (!validar()) return;
  emit('crear', {
    nombre: formulario.nombre.trim(),
    correo: formulario.correo.trim(),
    telefono: formulario.telefono.trim() || null,
    password: formulario.password,
    password_confirmation: formulario.password_confirmation,
    activo: formulario.activo,
    rol: formulario.rol === 'admin' ? 'admin' : 'empleado'
  });
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('cerrar')">
    <form class="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl" @submit.prevent="enviar">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-corporativo-rosa">Equipo</p>
          <h2 class="mt-1 flex items-center gap-2 text-xl font-extrabold font-titulos text-gray-900">
            <UserPlus class="h-5 w-5" />Nuevo empleado
          </h2>
        </div>
        <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" @click="emit('cerrar')">
          <X class="h-5 w-5" />
        </button>
      </div>

      <p v-if="errorServidor" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ errorServidor }}</p>

      <div>
        <label class="mb-1 block text-sm font-semibold text-gray-700">Nombre completo</label>
        <input v-model="formulario.nombre" maxlength="100" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ej: María Pérez" @input="filtrarFormulario('nombre', 'persona', 100, $event)" />
        <p v-if="errores.nombre" class="mt-1 text-xs text-red-600">{{ errores.nombre }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-semibold text-gray-700">Correo</label>
            <input v-model="formulario.correo" type="email" maxlength="254" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="empleado@correo.com" @input="(e)=>{ formulario.correo = String(e.target.value).replace(/\s+/g,'').slice(0,254); e.target.value = formulario.correo; }" />
          <p v-if="errores.correo" class="mt-1 text-xs text-red-600">{{ errores.correo }}</p>
        </div>
        <div>
          <label class="mb-1 block text-sm font-semibold text-gray-700">teléfono <span class="font-normal text-gray-400">(opcional)</span></label>
          <input v-model="formulario.telefono" type="tel" inputmode="tel" maxlength="20" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="3001234567" @input="filtrarFormulario('telefono', 'telefono', 20, $event)" />
          <p v-if="errores.telefono" class="mt-1 text-xs text-red-600">{{ errores.telefono }}</p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-semibold text-gray-700">contraseña</label>
          <div class="relative">
            <input v-model="formulario.password" :type="verPassword ? 'text' : 'password'" maxlength="128" minlength="8" class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm" placeholder="Mñimo 8 caracteres" />
            <button type="button" class="absolute inset-y-0 right-2 text-gray-400" @click="verPassword = !verPassword">
              <EyeOff v-if="verPassword" class="h-4 w-4" /><Eye v-else class="h-4 w-4" />
            </button>
          </div>
          <p v-if="errores.password" class="mt-1 text-xs text-red-600">{{ errores.password }}</p>
          <RequisitosPassword :password="formulario.password" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-semibold text-gray-700">Confirmar contraseña</label>
          <input v-model="formulario.password_confirmation" :type="verPassword ? 'text' : 'password'" maxlength="128" minlength="8" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <p v-if="errores.password_confirmation" class="mt-1 text-xs text-red-600">{{ errores.password_confirmation }}</p>
        </div>
      </div>

      <div>
        <label class="mb-1 block text-sm font-semibold text-gray-700">Rol</label>
        <select v-model="formulario.rol" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="empleado">Empleado</option>
          <option value="admin">Administrador (todos los permisos)</option>
        </select>
      </div>

      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="formulario.activo" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
        Cuenta activa
      </label>

      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50" @click="emit('cerrar')">Cancelar</button>
        <button type="submit" :disabled="guardando" class="rounded-xl bg-corporativo-rosa px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {{ guardando ? 'Creando...' : (formulario.rol === 'admin' ? 'Crear administrador' : 'Crear empleado') }}
        </button>
      </div>
    </form>
  </div>
</template>
