<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { Users, UserRound, BadgeCheck, UserPlus, RefreshCw } from 'lucide-vue-next';
import { useAutenticacionStore } from '@/stores/autenticacion';
import TablaUsuariosRoles from '@/components/admin/TablaUsuariosRoles.vue';
import TablaClientes from '@/components/admin/TablaClientes.vue';
import FormularioEmpleado from '@/components/admin/FormularioEmpleado.vue';

import {
  obtenerClientes,
  obtenerUsuarios,
  crearUsuario,
  asignarRolUsuario,
  actualizarUsuario
} from '@/services/seguridadServicio';

const authStore = useAutenticacionStore();

const clientes = ref([]);
const usuarios = ref([]);
const pestana = ref('clientes');

const cargandoClientes = ref(false);
const cargandoUsuarios = ref(false);

const error = ref('');
const mensaje = ref('');

const mostrarFormulario = ref(false);
const creando = ref(false);
const errorFormulario = ref('');

const esAdmin = computed(() => authStore.esAdmin);

function mostrarError(e, fallback) {
  return (
    Object.values(e.response?.data?.errors || {}).flat()[0] ||
    e.response?.data?.message ||
    fallback
  );
}

// Normaliza los roles recibidos del backend.
function obtenerNombresRoles(usuario) {
  const roles = usuario.roles ?? usuario.role ?? [];

  const lista = Array.isArray(roles) ? roles : [roles];

  return lista
    .map(rol => {
      if (typeof rol === 'string') return rol;
      return rol?.name ?? rol?.nombre ?? '';
    })
    .filter(Boolean);
}

function tieneRol(usuario, rolBuscado) {
  return obtenerNombresRoles(usuario).some(
    rol => rol.toLowerCase() === rolBuscado.toLowerCase()
  );
}

const empleados = computed(() =>
  usuarios.value.filter(usuario => tieneRol(usuario, 'empleado'))
);

async function cargarClientes() {
  cargandoClientes.value = true;

  try {
    clientes.value = await obtenerClientes();
  } catch (e) {
    error.value = mostrarError(
      e,
      'No se pudo cargar el directorio de clientes.'
    );
  } finally {
    cargandoClientes.value = false;
  }
}

async function cargarUsuarios() {
  if (!esAdmin.value) return;

  cargandoUsuarios.value = true;

  try {
    usuarios.value = await obtenerUsuarios();
  } catch (e) {
    error.value = mostrarError(
      e,
      'No se pudo cargar la gestión de usuarios.'
    );
  } finally {
    cargandoUsuarios.value = false;
  }
}

async function cargarTodo() {
  error.value = '';
  mensaje.value = '';

  await Promise.all([
    cargarClientes(),
    cargarUsuarios()
  ]);
}

// Solo permite modificar rol desde esta funcion.
async function cambiarRol(usuario, rol) {
  error.value = '';
  mensaje.value = '';

  try {
    const respuesta = await asignarRolUsuario(
      usuario.id_usuario,
      rol
    );

    const datos = respuesta?.data ?? respuesta;

    const rolesActualizados = datos.roles ?? [rol];

    usuarios.value = usuarios.value.map(item =>
      item.id_usuario === usuario.id_usuario
        ? {
          ...item,
          ...datos,
          roles: rolesActualizados
        }
        : item
    );

    mensaje.value = 'Rol actualizado correctamente.';
  } catch (e) {
    error.value = mostrarError(
      e,
      'No se pudo actualizar el rol.'
    );
  }
}

// Solo permite modificar el estado desde esta funcion.
async function cambiarEstado(usuario, activo) {
  error.value = '';
  mensaje.value = '';

  try {
    const respuesta = await actualizarUsuario(
      usuario.id_usuario,
      { activo }
    );

    const datos = respuesta?.data ?? respuesta;

    usuarios.value = usuarios.value.map(item =>
      item.id_usuario === usuario.id_usuario
        ? { ...item, ...datos }
        : item
    );

    mensaje.value = 'Estado actualizado correctamente.';
  } catch (e) {
    error.value = mostrarError(
      e,
      'No se pudo actualizar el estado.'
    );
  }
}

function abrirFormulario() {
  errorFormulario.value = '';
  mostrarFormulario.value = true;
}

async function crearEmpleado(datos) {
  errorFormulario.value = '';
  creando.value = true;

  try {
    await crearUsuario(datos);

    mostrarFormulario.value = false;
    // Los administradores no aparecen en la pestaña de empleados.
    pestana.value = datos.rol === 'admin' ? 'usuarios' : 'empleados';

    await cargarUsuarios();

    mensaje.value = datos.rol === 'admin'
      ? 'Administrador creado correctamente: tiene todos los permisos.'
      : 'Empleado creado correctamente.';
  } catch (e) {
    errorFormulario.value = mostrarError(
      e,
      'No se pudo crear el empleado.'
    );
  } finally {
    creando.value = false;
  }
}

async function guardarUsuario(usuario, datosFormulario) {
  error.value = '';
  mensaje.value = '';

  try {
    const respuesta = await actualizarUsuario(
      usuario.id_usuario,
      datosFormulario
    );

    const respuestaDatos = respuesta?.data ?? respuesta;
    const datos = respuestaDatos?.data ?? respuestaDatos;

    usuarios.value = usuarios.value.map(item =>
      item.id_usuario === usuario.id_usuario
        ? { ...item, ...datos, ...datosFormulario }
        : item
    );

    clientes.value = clientes.value.map(item =>
      item.id_usuario === usuario.id_usuario
        ? { ...item, ...datos, ...datosFormulario }
        : item
    );

    mensaje.value = 'Usuario actualizado correctamente.';
  } catch (e) {
    error.value = mostrarError(
      e,
      'No se pudo actualizar el usuario.'
    );
  }
}

onMounted(cargarTodo);
useRecargaAutomatica(cargarTodo);
</script>


<template>
  <div class="space-y-6">
    <div class="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-end">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-corporativo-rosa">SEGURIDAD Y DIRECTORIO</p>
        <h1 class="mt-1 text-2xl font-extrabold font-titulos text-gray-900">Clientes, empleados y usuarios</h1>
        <p class="mt-1 text-sm text-gray-500">Consulta y actualiza los registros permitidos por tu rol.</p>
      </div>
      <div class="flex gap-2">
        <button v-if="esAdmin"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-sm font-bold text-white shadow-sm"
          @click="abrirFormulario">
          <UserPlus class="h-4 w-4" />Nuevo empleado
        </button>
        <button
          class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
          @click="cargarTodo">
          <RefreshCw class="h-4 w-4" />Actualizar
        </button>
      </div>
    </div>

    <div class="flex gap-2 border-b border-gray-200">
      <button class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold"
        :class="pestana === 'clientes' ? 'border-corporativo-rosa text-corporativo-rosa' : 'border-transparent text-gray-500'"
        @click="pestana = 'clientes'">
        <Users class="h-4 w-4" />Clientes
      </button>
      <button v-if="esAdmin" class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold"
        :class="pestana === 'empleados' ? 'border-corporativo-rosa text-corporativo-rosa' : 'border-transparent text-gray-500'"
        @click="pestana = 'empleados'">
        <BadgeCheck class="h-4 w-4" />Empleados
      </button>
      <button v-if="esAdmin" class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold"
        :class="pestana === 'usuarios' ? 'border-corporativo-rosa text-corporativo-rosa' : 'border-transparent text-gray-500'"
        @click="pestana = 'usuarios'">
        <UserRound class="h-4 w-4" />Usuarios y roles
      </button>
    </div>

    <p v-if="mensaje" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{{ mensaje }}</p>
    <p v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>



    <TablaClientes v-if="pestana === 'clientes'" :clientes="clientes" :cargando="cargandoClientes" />

    <TablaUsuariosRoles v-else-if="pestana === 'empleados'" :usuarios="empleados" :cargando="cargandoUsuarios"
      :puede-administrar="esAdmin" @guardar="guardarUsuario" @rol="cambiarRol" @estado="cambiarEstado" />

    <TablaUsuariosRoles v-else :usuarios="usuarios" :cargando="cargandoUsuarios" :puede-administrar="esAdmin"
      @guardar="guardarUsuario" @rol="cambiarRol" @estado="cambiarEstado" />

    <FormularioEmpleado v-if="mostrarFormulario" :guardando="creando" :error-servidor="errorFormulario"
      @cerrar="mostrarFormulario = false" @crear="crearEmpleado" />
  </div>
</template>