
<script setup>
import { computed, ref } from 'vue';
import { Check, Shield, ShieldOff } from 'lucide-vue-next';
import { filtrarCampo, validarCorreo } from '@/utils/validacionCampos';

const props = defineProps({
  usuarios: {
    type: Array,
    default: () => [],
  },
  cargando: {
    type: Boolean,
    default: false,
  },
  puedeAdministrar: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(['guardar', 'rol', 'estado']);
const editando = ref(null);
const formulario = ref({});
const errorEdicion = ref('');

function nombreRol(usuario) {
  const roles = usuario.roles || [];
  const rol = Array.isArray(roles) ? roles[0] : roles;
  return typeof rol === 'string' ? rol : (rol?.name || rol?.nombre || usuario.rol || 'cliente');
}

function estaActivo(usuario) {
  const estado = usuario?.activo ?? usuario?.estado ?? true;

  return (
    estado === true ||
    estado === 1 ||
    estado === '1' ||
    estado === 'activo'
  );
}

function iniciarEdicion(usuario) {
  editando.value = usuario.id_usuario;
  errorEdicion.value = '';
  formulario.value = { nombre: usuario.nombre || '', correo: usuario.correo || '', telefono: usuario.telefono || '' };
}
function guardar(usuario) {
  if (!/[\p{L}\p{M}]/u.test(formulario.value.nombre.trim())) {
    errorEdicion.value = 'Escribe un nombre válido.';
    return;
  }
  if (!validarCorreo(formulario.value.correo)) {
    errorEdicion.value = 'Ingresa un correo válido.';
    return;
  }
  emit('guardar', usuario, { ...formulario.value });
  editando.value = null;
  errorEdicion.value = '';
}
function filtrarEdicion(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  formulario.value[campo] = valor;
  evento.target.value = valor;
}

const usuariosOrdenados = computed(() => props.usuarios);

function cambiarRol(usuario, evento) {
  const rolNuevo = evento.target.value;
  const rolAnterior = nombreRol(usuario);

  if (rolNuevo === rolAnterior) return;

  emit('rol', usuario, rolNuevo, rolAnterior);
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div v-if="cargando" class="p-8 text-center text-sm text-gray-500">
      Cargando usuarios...
    </div>

    <div
      v-else-if="!usuariosOrdenados.length"
      class="p-8 text-center text-sm text-gray-500"
    >
      No hay usuarios para mostrar.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-5 py-3">Usuario</th>
            <th class="px-5 py-3">Contacto</th>
            <th class="px-5 py-3">Rol</th>
            <th class="px-5 py-3">Estado</th>
            <th v-if="puedeAdministrar" class="px-5 py-3 text-right">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="usuario in usuariosOrdenados"
            :key="usuario.id_usuario"
            class="align-top"
          >
            <td class="px-5 py-4">
              <div v-if="editando === usuario.id_usuario" class="space-y-2">
                <input v-model="formulario.nombre" maxlength="100" class="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm" @input="filtrarEdicion('nombre', 'persona', 100, $event)" />
                <input v-model="formulario.correo" type="email" maxlength="254" class="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm" @input="(e)=>{ formulario.correo = String(e.target.value).replace(/\s+/g,'').slice(0,254); e.target.value = formulario.correo; }" />
                <p v-if="errorEdicion" class="text-xs text-red-600" role="alert">{{ errorEdicion }}</p>
              </div>
              <template v-else><p class="font-semibold text-gray-900">{{ usuario.nombre }}</p><p class="text-xs text-gray-500">ID {{ usuario.id_usuario }}</p></template>
            </td>

            <td class="px-5 py-4">
              <input v-if="editando === usuario.id_usuario" v-model="formulario.telefono" type="tel" inputmode="tel" maxlength="20" class="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm" placeholder="teléfono" @input="filtrarEdicion('telefono', 'telefono', 20, $event)" />
              <template v-else><p class="text-gray-700">{{ usuario.correo }}</p><p class="text-xs text-gray-500">{{ usuario.telefono || 'Sin teléfono' }}</p></template>
            </td>

            <td class="px-5 py-4">
              <select
                v-if="puedeAdministrar"
                :value="nombreRol(usuario)"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                @change="cambiarRol(usuario, $event)"
              >
                <option value="admin">Administrador</option>
                <option value="empleado">Empleado</option>
                <option value="cliente">Cliente</option>
              </select>

              <span
                v-else
                class="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600"
              >
                {{ nombreRol(usuario) }}
              </span>
            </td>

            <td class="px-5 py-4">
              <span
                :class="estaActivo(usuario)
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'"
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
              >
                {{ estaActivo(usuario) ? 'Activo' : 'Inactivo' }}
              </span>
            </td>

            <td v-if="puedeAdministrar" class="px-5 py-4 text-right">
              <button
                type="button"
                class="rounded-lg border px-3 py-2 text-xs font-semibold"
                :class="estaActivo(usuario)
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'"
                @click="emit('estado', usuario, !estaActivo(usuario))"
              >
                <ShieldOff
                  v-if="estaActivo(usuario)"
                  class="mr-1 inline h-3.5 w-3.5"
                />
                <Shield
                  v-else
                  class="mr-1 inline h-3.5 w-3.5"
                />
                {{ estaActivo(usuario) ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
