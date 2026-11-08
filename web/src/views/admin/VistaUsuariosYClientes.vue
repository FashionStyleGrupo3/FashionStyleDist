<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import {
  Users,
  UserRound,
  BadgeCheck,
  UserPlus,
  RefreshCw,
  Search,
  X,
  Filter,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal
} from 'lucide-vue-next';
import { useAutenticacionStore } from '@/stores/autenticacion';
import ResumenUsuarios from '@/components/admin/ResumenUsuarios.vue';
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
const pestana = ref('clientes'); // 'clientes' | 'empleados' | 'usuarios'

const cargandoClientes = ref(false);
const cargandoUsuarios = ref(false);
const actualizandoTodo = ref(false);

const error = ref('');
const mensaje = ref('');

const mostrarFormulario = ref(false);
const creando = ref(false);
const errorFormulario = ref('');

// Filtros y Búsqueda Interactiva
const busqueda = ref('');
const filtroRol = ref(''); // '' | 'admin' | 'empleado' | 'cliente'
const filtroEstado = ref(''); // '' | 'activos' | 'inactivos'

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
    .map((rol) => {
      if (typeof rol === 'string') return rol;
      return rol?.name ?? rol?.nombre ?? '';
    })
    .filter(Boolean);
}

function tieneRol(usuario, rolBuscado) {
  return obtenerNombresRoles(usuario).some(
    (rol) => rol.toLowerCase() === rolBuscado.toLowerCase()
  );
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

const empleados = computed(() =>
  usuarios.value.filter((usuario) => tieneRol(usuario, 'empleado'))
);

const administradores = computed(() =>
  usuarios.value.filter((usuario) => tieneRol(usuario, 'admin'))
);

// Métricas de KPIs
const totalClientes = computed(() => clientes.value.length);
const totalEmpleados = computed(() => empleados.value.length);
const totalAdmins = computed(() => administradores.value.length);
const totalActivos = computed(() => usuarios.value.filter((u) => estaActivo(u)).length);
const totalInactivos = computed(() => usuarios.value.filter((u) => !estaActivo(u)).length);

// Listas filtradas según búsqueda y controles de filtro
const clientesFiltrados = computed(() => {
  const query = busqueda.value.trim().toLowerCase();
  if (!query) return clientes.value;

  return clientes.value.filter((cliente) => {
    const nombre = (cliente.nombre_completo || '').toLowerCase();
    const correo = (cliente.correo || '').toLowerCase();
    const tel = (cliente.telefono || '').toLowerCase();
    const doc = (cliente.numero_documento || '').toLowerCase();
    const ciudad = (cliente.ciudad || '').toLowerCase();
    const direccion = (cliente.direccion || '').toLowerCase();
    return (
      nombre.includes(query) ||
      correo.includes(query) ||
      tel.includes(query) ||
      doc.includes(query) ||
      ciudad.includes(query) ||
      direccion.includes(query)
    );
  });
});

const empleadosFiltrados = computed(() => {
  const query = busqueda.value.trim().toLowerCase();
  return empleados.value.filter((usuario) => {
    // Filtro de Estado
    if (filtroEstado.value === 'activos' && !estaActivo(usuario)) return false;
    if (filtroEstado.value === 'inactivos' && estaActivo(usuario)) return false;

    // Filtro de Texto
    if (!query) return true;
    const nombre = (usuario.nombre || '').toLowerCase();
    const correo = (usuario.correo || '').toLowerCase();
    const tel = (usuario.telefono || '').toLowerCase();
    const id = String(usuario.id_usuario || '');
    return (
      nombre.includes(query) ||
      correo.includes(query) ||
      tel.includes(query) ||
      id.includes(query)
    );
  });
});

const usuariosFiltrados = computed(() => {
  const query = busqueda.value.trim().toLowerCase();
  return usuarios.value.filter((usuario) => {
    // Filtro de Rol
    if (filtroRol.value && !tieneRol(usuario, filtroRol.value)) return false;

    // Filtro de Estado
    if (filtroEstado.value === 'activos' && !estaActivo(usuario)) return false;
    if (filtroEstado.value === 'inactivos' && estaActivo(usuario)) return false;

    // Filtro de Texto
    if (!query) return true;
    const nombre = (usuario.nombre || '').toLowerCase();
    const correo = (usuario.correo || '').toLowerCase();
    const tel = (usuario.telefono || '').toLowerCase();
    const id = String(usuario.id_usuario || '');
    return (
      nombre.includes(query) ||
      correo.includes(query) ||
      tel.includes(query) ||
      id.includes(query)
    );
  });
});

const hayFiltrosActivos = computed(() => {
  return !!busqueda.value || !!filtroRol.value || !!filtroEstado.value;
});

function limpiarFiltros() {
  busqueda.value = '';
  filtroRol.value = '';
  filtroEstado.value = '';
}

function aplicarFiltroResumen({ pestana: p, rol: r, estado: e }) {
  if (p) pestana.value = p;
  filtroRol.value = r;
  filtroEstado.value = e;
}

// Cargas y operaciones API
async function cargarClientes({ silencioso = false } = {}) {
  if (!silencioso) cargandoClientes.value = true;

  try {
    clientes.value = await obtenerClientes();
  } catch (e) {
    if (!silencioso) {
      error.value = mostrarError(
        e,
        'No se pudo cargar el directorio de clientes.'
      );
    }
  } finally {
    if (!silencioso) cargandoClientes.value = false;
  }
}

async function cargarUsuarios({ silencioso = false } = {}) {
  if (!esAdmin.value) return;

  if (!silencioso) cargandoUsuarios.value = true;

  try {
    usuarios.value = await obtenerUsuarios();
  } catch (e) {
    if (!silencioso) {
      error.value = mostrarError(
        e,
        'No se pudo cargar la gestión de usuarios.'
      );
    }
  } finally {
    if (!silencioso) cargandoUsuarios.value = false;
  }
}

async function cargarTodo({ silencioso = false } = {}) {
  if (!silencioso) {
    actualizandoTodo.value = true;
    error.value = '';
    mensaje.value = '';
  }

  try {
    await Promise.all([
      cargarClientes({ silencioso }),
      cargarUsuarios({ silencioso })
    ]);
  } finally {
    if (!silencioso) actualizandoTodo.value = false;
  }
}

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

    usuarios.value = usuarios.value.map((item) =>
      item.id_usuario === usuario.id_usuario
        ? {
            ...item,
            ...datos,
            roles: rolesActualizados
          }
        : item
    );

    mensaje.value = `Rol de ${usuario.nombre} actualizado a ${rol} correctamente.`;
  } catch (e) {
    error.value = mostrarError(
      e,
      'No se pudo actualizar el rol.'
    );
  }
}

async function cambiarEstado(usuario, activo) {
  error.value = '';
  mensaje.value = '';

  try {
    const respuesta = await actualizarUsuario(
      usuario.id_usuario,
      { activo }
    );

    const datos = respuesta?.data ?? respuesta;

    usuarios.value = usuarios.value.map((item) =>
      item.id_usuario === usuario.id_usuario
        ? { ...item, ...datos, activo }
        : item
    );

    mensaje.value = `Usuario ${usuario.nombre} ha sido ${activo ? 'activado' : 'desactivado'} con éxito.`;
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
    pestana.value = datos.rol === 'admin' ? 'usuarios' : 'empleados';

    await cargarUsuarios();

    mensaje.value =
      datos.rol === 'admin'
        ? 'Administrador creado correctamente: cuenta con todos los privilegios del sistema.'
        : 'Empleado creado correctamente y listo para operar.';
  } catch (e) {
    errorFormulario.value = mostrarError(
      e,
      'No se pudo crear el usuario.'
    );
  } finally {
    creando.value = false;
  }
}

onMounted(cargarTodo);
useRecargaAutomatica(() => cargarTodo({ silencioso: true }), { intervaloSondeo: 60000 });
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado Principal de Seguridad y Directorio -->
    <div class="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-corporativo-rosa border border-pink-100">
            Seguridad & Directorio
          </span>
        </div>
        <h1 class="mt-2 text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
          Gestión de Usuarios y Clientes
        </h1>
        <p class="mt-1 text-sm text-gray-500 max-w-2xl">
          Administra roles, accesos del equipo comercial y catálogo de clientes registrados en la plataforma.
        </p>
      </div>

      <!-- Botones de Acción Superiores -->
      <div class="flex items-center gap-2.5">
        <button
          v-if="esAdmin"
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-pink-500/20 hover:opacity-95 active:scale-95 transition"
          @click="abrirFormulario"
        >
          <UserPlus class="h-4 w-4" />
          <span>Nuevo miembro</span>
        </button>

        <button
          type="button"
          :disabled="actualizandoTodo"
          class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition"
          @click="cargarTodo({ silencioso: false })"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="{ 'animate-spin': actualizandoTodo }"
          />
          <span>Actualizar</span>
        </button>
      </div>
    </div>

    <!-- Tarjetas de Resumen Ejecutivo (KPIs) -->
    <ResumenUsuarios
      :total-clientes="totalClientes"
      :total-empleados="totalEmpleados"
      :total-admins="totalAdmins"
      :total-activos="totalActivos"
      :total-inactivos="totalInactivos"
      :pestana-activa="pestana"
      :filtro-rol="filtroRol"
      :filtro-estado="filtroEstado"
      @filtrar="aplicarFiltroResumen"
    />

    <!-- Alertas de Éxito o Error -->
    <div
      v-if="mensaje"
      class="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-semibold text-emerald-800 shadow-sm animate-fadeIn"
    >
      <div class="flex items-center gap-2.5">
        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
        <span>{{ mensaje }}</span>
      </div>
      <button
        type="button"
        class="text-emerald-700 hover:text-emerald-900 rounded-lg p-1 transition"
        @click="mensaje = ''"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <div
      v-if="error"
      class="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm font-semibold text-red-800 shadow-sm animate-fadeIn"
    >
      <div class="flex items-center gap-2.5">
        <AlertCircle class="h-5 w-5 text-red-600 shrink-0" />
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        class="text-red-700 hover:text-red-900 rounded-lg p-1 transition"
        @click="error = ''"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Navegación por Pestañas Principales -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-2 sm:gap-6 overflow-x-auto" aria-label="Pestañas de Directorio">
        <!-- Pestaña 1: Clientes -->
        <button
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-bold transition whitespace-nowrap"
          :class="
            pestana === 'clientes'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestana = 'clientes'"
        >
          <Users class="w-4 h-4" />
          <span>Directorio de Clientes</span>
          <span
            class="ml-1 rounded-full px-2 py-0.5 text-xs font-bold"
            :class="pestana === 'clientes' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'"
          >
            {{ totalClientes }}
          </span>
        </button>

        <!-- Pestaña 2: Empleados -->
        <button
          v-if="esAdmin"
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-bold transition whitespace-nowrap"
          :class="
            pestana === 'empleados'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestana = 'empleados'"
        >
          <BadgeCheck class="w-4 h-4" />
          <span>Equipo Comercial</span>
          <span
            class="ml-1 rounded-full px-2 py-0.5 text-xs font-bold"
            :class="pestana === 'empleados' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'"
          >
            {{ totalEmpleados }}
          </span>
        </button>

        <!-- Pestaña 3: Todos los Usuarios y Roles -->
        <button
          v-if="esAdmin"
          type="button"
          class="flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-bold transition whitespace-nowrap"
          :class="
            pestana === 'usuarios'
              ? 'border-corporativo-rosa text-corporativo-rosa'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          "
          @click="pestana = 'usuarios'"
        >
          <ShieldCheck class="w-4 h-4" />
          <span>Todos los Usuarios y Roles</span>
          <span
            class="ml-1 rounded-full px-2 py-0.5 text-xs font-bold"
            :class="pestana === 'usuarios' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'"
          >
            {{ usuarios.length }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Toolbar de Búsqueda y Filtros Rápidos -->
    <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm">
      <!-- Buscador con icono y botón de limpiar -->
      <div class="relative flex-1">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          v-model="busqueda"
          type="text"
          maxlength="100"
          :placeholder="
            pestana === 'clientes'
              ? 'Buscar clientes por nombre, correo, teléfono, documento o ciudad...'
              : 'Buscar por nombre, correo, teléfono o ID de usuario...'
          "
          class="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-gray-200 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
        />
        <button
          v-if="busqueda"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          @click="busqueda = ''"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Filtros desplegables según la pestaña -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Filtro por Rol (solo en pestaña 'usuarios') -->
        <select
          v-if="pestana === 'usuarios'"
          v-model="filtroRol"
          class="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 focus:border-corporativo-rosa focus:outline-none transition"
        >
          <option value="">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="empleado">Empleados</option>
          <option value="cliente">Clientes</option>
        </select>

        <!-- Filtro por Estado (en empleados y usuarios) -->
        <select
          v-if="pestana !== 'clientes'"
          v-model="filtroEstado"
          class="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 focus:border-corporativo-rosa focus:outline-none transition"
        >
          <option value="">Todos los estados</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>

        <!-- Botón para limpiar filtros -->
        <button
          v-if="hayFiltrosActivos"
          type="button"
          class="h-9 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 text-xs font-semibold text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition"
          @click="limpiarFiltros"
        >
          <X class="h-3.5 w-3.5" />
          <span>Limpiar filtros</span>
        </button>

        <!-- Contador de registros filtrados -->
        <div class="ml-auto lg:ml-2 text-xs font-semibold text-gray-500 whitespace-nowrap">
          <span v-if="pestana === 'clientes'">
            {{ clientesFiltrados.length }} de {{ clientes.length }} clientes
          </span>
          <span v-else-if="pestana === 'empleados'">
            {{ empleadosFiltrados.length }} de {{ empleados.length }} empleados
          </span>
          <span v-else>
            {{ usuariosFiltrados.length }} de {{ usuarios.length }} usuarios
          </span>
        </div>
      </div>
    </div>

    <!-- Contenido de las Pestañas -->
    <div class="space-y-4">
      <!-- Pestaña 1: Directorio de Clientes (Solo Lectura) -->
      <TablaClientes
        v-if="pestana === 'clientes'"
        :clientes="clientesFiltrados"
        :cargando="cargandoClientes"
      />

      <!-- Pestaña 2: Empleados (Modificación solo de Rol y Estado) -->
      <TablaUsuariosRoles
        v-else-if="pestana === 'empleados'"
        :usuarios="empleadosFiltrados"
        :cargando="cargandoUsuarios"
        :puede-administrar="esAdmin"
        @rol="cambiarRol"
        @estado="cambiarEstado"
      />

      <!-- Pestaña 3: Todos los Usuarios y Roles (Modificación solo de Rol y Estado) -->
      <TablaUsuariosRoles
        v-else
        :usuarios="usuariosFiltrados"
        :cargando="cargandoUsuarios"
        :puede-administrar="esAdmin"
        @rol="cambiarRol"
        @estado="cambiarEstado"
      />
    </div>

    <!-- Modal de Creación de Empleado / Administrador -->
    <FormularioEmpleado
      v-if="mostrarFormulario"
      :guardando="creando"
      :error-servidor="errorFormulario"
      @cerrar="mostrarFormulario = false"
      @crear="crearEmpleado"
    />
  </div>
</template>
