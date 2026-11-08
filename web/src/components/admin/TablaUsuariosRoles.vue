<script setup>
import {
  Shield,
  ShieldOff,
  ShieldCheck,
  Mail,
  Phone,
  Clock,
  UserX
} from 'lucide-vue-next';

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

const emit = defineEmits(['rol', 'estado']);

const ETIQUETA_ROL = {
  admin: 'Administrador',
  empleado: 'Empleado',
  cliente: 'Cliente',
};

function obtenerIniciales(nombre) {
  if (!nombre) return 'U';
  const partes = String(nombre).trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function ultimoAcceso(usuario) {
  if (!usuario.ultimo_acceso) return 'Nunca ha ingresado';
  try {
    return new Date(usuario.ultimo_acceso).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (e) {
    return String(usuario.ultimo_acceso);
  }
}

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

function cambiarRol(usuario, evento) {
  const rolNuevo = evento.target.value;
  const rolAnterior = nombreRol(usuario);

  if (rolNuevo === rolAnterior) return;

  emit('rol', usuario, rolNuevo, rolAnterior);
}

// Estilos de avatar e insignias según rol
function claseAvatar(rol) {
  if (rol === 'admin') return 'bg-pink-100 text-corporativo-rosa ring-2 ring-pink-400/30';
  if (rol === 'empleado') return 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400/30';
  return 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400/30';
}

function claseSelectRol(rol) {
  if (rol === 'admin') return 'border-pink-200 bg-pink-50/60 text-pink-700 hover:border-pink-300';
  if (rol === 'empleado') return 'border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:border-indigo-300';
  return 'border-gray-200 bg-gray-50/60 text-gray-700 hover:border-gray-300';
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
    <!-- Estado de Carga -->
    <div v-if="cargando" class="flex flex-col items-center justify-center p-12 text-center">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-corporativo-rosa border-t-transparent"></div>
      <p class="mt-3 text-sm font-semibold text-gray-700">Cargando directorio de usuarios...</p>
      <p class="text-xs text-gray-400">Consultando privilegios y estado en el servidor</p>
    </div>

    <!-- Estado Vacío -->
    <div
      v-else-if="!usuarios.length"
      class="flex flex-col items-center justify-center p-12 text-center"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        <UserX class="h-7 w-7" />
      </div>
      <p class="mt-3 text-base font-bold text-gray-800">No se encontraron usuarios</p>
      <p class="mt-1 max-w-sm text-xs text-gray-500">
        No hay registros que coincidan con los criterios de búsqueda o el filtro seleccionado.
      </p>
    </div>

    <!-- Tabla de Usuarios -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
          <tr>
            <th scope="col" class="px-5 py-3.5">Usuario</th>
            <th scope="col" class="px-5 py-3.5">Contacto</th>
            <th scope="col" class="px-5 py-3.5">Rol de Acceso</th>
            <th scope="col" class="px-5 py-3.5">Estado</th>
            <th scope="col" class="px-5 py-3.5">Último Acceso</th>
            <th v-if="puedeAdministrar" scope="col" class="px-5 py-3.5 text-right">
              Estado de Acceso
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white">
          <tr
            v-for="usuario in usuarios"
            :key="usuario.id_usuario"
            class="group transition-colors hover:bg-gray-50/60"
          >
            <!-- Columna Usuario: Avatar, Nombre e ID -->
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black transition-transform group-hover:scale-105"
                  :class="claseAvatar(nombreRol(usuario))"
                >
                  {{ obtenerIniciales(usuario.nombre) }}
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-gray-900 group-hover:text-corporativo-rosa transition truncate">
                    {{ usuario.nombre }}
                  </p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
                      ID #{{ usuario.id_usuario }}
                    </span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Columna Contacto: Email y Teléfono -->
            <td class="px-5 py-4">
              <div class="space-y-1">
                <a
                  :href="`mailto:${usuario.correo}`"
                  class="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-corporativo-rosa transition"
                >
                  <Mail class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span class="truncate max-w-[200px]">{{ usuario.correo }}</span>
                </a>
                <p class="flex items-center gap-1.5 text-xs text-gray-500">
                  <Phone class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>{{ usuario.telefono || 'Sin teléfono' }}</span>
                </p>
              </div>
            </td>

            <!-- Columna Rol (Modificable solo por administrador) -->
            <td class="px-5 py-4">
              <div v-if="puedeAdministrar" class="inline-block">
                <select
                  :value="nombreRol(usuario)"
                  class="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/20"
                  :class="claseSelectRol(nombreRol(usuario))"
                  @change="cambiarRol(usuario, $event)"
                >
                  <option value="admin">Administrador</option>
                  <option value="empleado">Empleado</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>

              <span
                v-else
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                :class="claseSelectRol(nombreRol(usuario))"
              >
                {{ ETIQUETA_ROL[nombreRol(usuario)] || nombreRol(usuario) }}
              </span>
            </td>

            <!-- Columna Estado Visual -->
            <td class="px-5 py-4">
              <span
                v-if="estaActivo(usuario)"
                class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Activo
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                Inactivo
              </span>
            </td>

            <!-- Columna Último Acceso -->
            <td class="px-5 py-4">
              <div class="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span class="whitespace-nowrap">{{ ultimoAcceso(usuario) }}</span>
              </div>
            </td>

            <!-- Columna Acción: Activar / Desactivar (Modificable por administrador) -->
            <td v-if="puedeAdministrar" class="px-5 py-4 text-right">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95"
                :class="estaActivo(usuario)
                  ? 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'"
                @click="emit('estado', usuario, !estaActivo(usuario))"
              >
                <ShieldOff
                  v-if="estaActivo(usuario)"
                  class="h-3.5 w-3.5"
                />
                <ShieldCheck
                  v-else
                  class="h-3.5 w-3.5"
                />
                <span>{{ estaActivo(usuario) ? 'Desactivar' : 'Activar' }}</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
