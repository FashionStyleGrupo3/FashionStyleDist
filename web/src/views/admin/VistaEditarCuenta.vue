<script setup>
// -> Componente VistaEditarCuenta
import { ref, onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Lock,
  Check,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Save,
  KeyRound
} from 'lucide-vue-next';
import SelectorFotoPerfil from '@/components/perfil/SelectorFotoPerfil.vue';
import { useAutenticacionStore } from '@/stores/autenticacion';
import {
  obtenerPerfilActual,
  actualizarPerfil,
  actualizarContrasena
} from '@/services/usuarioServicio';
import { filtrarCampo } from '@/utils/validacionCampos';
import RequisitosPassword from '@/components/autenticacion/RequisitosPassword.vue';
import { passwordEsSegura } from '@/utils/validarPassword';

const authStore = useAutenticacionStore();

const cargando = ref(false);
const guardandoPerfil = ref(false);
const guardandoPassword = ref(false);

const mensajePerfilExito = ref('');
const mensajePerfilError = ref('');
const mensajePasswordExito = ref('');
const mensajePasswordError = ref('');

const formularioPerfil = ref({
  nombre: '',
  correo: '',
  telefono: '',
  ciudad: '',
  direccion: ''
});

const formularioPassword = ref({
  password_actual: '',
  password: '',
  password_confirmation: ''
});

function filtrarPerfil(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  formularioPerfil.value[campo] = valor;
  evento.target.value = valor;
}

const rolLegible = computed(() => {
  if (authStore.esAdmin) return 'Administrador';
  if (authStore.rolUsuario === 'empleado') return 'Personal Operativo';
  return 'Cliente';
});

async function cargarDatosUsuario() {
  cargando.value = true;
  mensajePerfilError.value = '';

  const usuarioLocal = authStore.usuario;
  if (usuarioLocal) {
    formularioPerfil.value = {
      nombre: usuarioLocal.nombre || usuarioLocal.name || '',
      correo: usuarioLocal.correo || usuarioLocal.email || '',
      telefono: usuarioLocal.telefono || usuarioLocal.phone || '',
      ciudad: usuarioLocal.ciudad || usuarioLocal.city || '',
      direccion: usuarioLocal.direccion || usuarioLocal.address || ''
    };
  }

  try {
    const datosRemotos = await obtenerPerfilActual();
    if (datosRemotos) {
      formularioPerfil.value = {
        nombre: datosRemotos.nombre || datosRemotos.name || formularioPerfil.value.nombre,
        correo: datosRemotos.correo || datosRemotos.email || formularioPerfil.value.correo,
        telefono: datosRemotos.telefono || datosRemotos.phone || formularioPerfil.value.telefono,
        ciudad: datosRemotos.ciudad || datosRemotos.city || formularioPerfil.value.ciudad,
        direccion: datosRemotos.direccion || datosRemotos.address || formularioPerfil.value.direccion
      };

      const usuarioActualizado = { ...authStore.usuario, ...datosRemotos };
      authStore.usuario = usuarioActualizado;
      localStorage.setItem('fs_user', JSON.stringify(usuarioActualizado));
    }
  } catch (error) {
    mensajePerfilError.value = error.response?.data?.message
      || 'No se pudo consultar el perfil en el servidor.';
  } finally {
    cargando.value = false;
  }
}

async function guardarCambiosPerfil() {
  mensajePerfilExito.value = '';
  mensajePerfilError.value = '';

  if (!formularioPerfil.value.nombre.trim()) {
    mensajePerfilError.value = 'El nombre completo es obligatorio.';
    return;
  }

  if (!formularioPerfil.value.correo.trim()) {
    mensajePerfilError.value = 'El correo Electronico es obligatorio.';
    return;
  }

  guardandoPerfil.value = true;
  try {
    const datosParaEnviar = {
      nombre: formularioPerfil.value.nombre.trim(),
      correo: formularioPerfil.value.correo.trim(),
      telefono: formularioPerfil.value.telefono.trim(),
      ciudad: formularioPerfil.value.ciudad.trim(),
      direccion: formularioPerfil.value.direccion.trim()
    };

    const respuesta = await actualizarPerfil(datosParaEnviar);
    const usuarioActualizado = {
      ...authStore.usuario,
      ...datosParaEnviar,
      ...(typeof respuesta === 'object' && respuesta !== null ? respuesta : {})
    };

    authStore.usuario = usuarioActualizado;
    localStorage.setItem('fs_user', JSON.stringify(usuarioActualizado));

    mensajePerfilExito.value = 'Los datos del perfil se actualizaron correctamente.';
  } catch (error) {
    const backendMsg = error.response?.data?.message;
    const erroresValidacion = error.response?.data?.errors;
    if (erroresValidacion) {
      const primerError = Object.values(erroresValidacion).flat()[0];
      mensajePerfilError.value = primerError || 'Ocurrió un error de validación.';
    } else {
      mensajePerfilError.value = backendMsg || error.message || 'No fue posible actualizar el perfil.';
    }
  } finally {
    guardandoPerfil.value = false;
  }
}

async function guardarNuevaContrasena() {
  mensajePasswordExito.value = '';
  mensajePasswordError.value = '';

  if (!formularioPassword.value.password_actual) {
    mensajePasswordError.value = 'Debes ingresar tu contraseña actual.';
    return;
  }

  if (!formularioPassword.value.password) {
    mensajePasswordError.value = 'Debes ingresar una nueva contraseña.';
    return;
  }

  if (!passwordEsSegura(formularioPassword.value.password)) {
    mensajePasswordError.value = 'La nueva contraseña no cumple los requisitos de seguridad.';
    return;
  }

  if (formularioPassword.value.password !== formularioPassword.value.password_confirmation) {
    mensajePasswordError.value = 'La confirmacion de la contraseña no coincide.';
    return;
  }

  guardandoPassword.value = true;

  try {
    await actualizarContrasena({
      password_actual: formularioPassword.value.password_actual,
      password: formularioPassword.value.password,
      password_confirmation: formularioPassword.value.password_confirmation
    });

    mensajePasswordExito.value = 'La contraseña ha sido actualizada con éxito.';
    formularioPassword.value = {
      password_actual: '',
      password: '',
      password_confirmation: ''
    };
  } catch (error) {
    const backendMsg = error.response?.data?.message;
    const erroresValidacion = error.response?.data?.errors;
    if (erroresValidacion) {
      const primerError = Object.values(erroresValidacion).flat()[0];
      mensajePasswordError.value = primerError || 'Error al validar la contraseña.';
    } else {
      mensajePasswordError.value = backendMsg || error.message || 'No fue posible actualizar la contraseña.';
    }
  } finally {
    guardandoPassword.value = false;
  }
}

onMounted(() => {
  cargarDatosUsuario();
});
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Encabezado con boton exclusivo para regresar al panel como administrador -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
          Configuracion de Cuenta
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
          Administra tu información personal, datos de contacto y credenciales de acceso.
        </p>
      </div>

      <!-- Boton exclusivo de administrador para regresar al panel -->
      <div v-if="authStore.esPersonal">
        <RouterLink
          to="/admin"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
          title="Regresar al panel de control de administrador"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Regresar al Panel Admin</span>
        </RouterLink>
      </div>
    </div>

    <!-- Contenido principal en grilla -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Columna izquierda: Formulario de perfil (2 cols) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Tarjeta: Datos personales y contacto -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-7">
          <div class="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-pink-50 text-corporativo-rosa flex items-center justify-center font-bold">
                <User class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base sm:text-lg font-bold text-gray-900">
                  Datos de Perfil
                </h2>
                <p class="text-xs text-gray-500">
                  Actualiza tus datos de identificacion y contacto en el sistema.
                </p>
              </div>
            </div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck class="w-3.5 h-3.5" />
              Cuenta Activa
            </span>
          </div>

          <!-- Mensajes de alerta de perfil -->
          <div
            v-if="mensajePerfilExito"
            class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-800"
          >
            <Check class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div class="flex-1 font-medium">{{ mensajePerfilExito }}</div>
          </div>

          <div
            v-if="mensajePerfilError"
            class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
          >
            <AlertCircle class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div class="flex-1 font-medium">{{ mensajePerfilError }}</div>
          </div>

          <form @submit.prevent="guardarCambiosPerfil" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <!-- Nombre completo -->
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Nombre Completo
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User class="w-4 h-4" />
                  </div>
                    <input
                      v-model="formularioPerfil.nombre"
                      type="text"
                      required
                      maxlength="100"
                      placeholder="Ej. Juan Pérez"
                      class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all"
                      @input="filtrarPerfil('nombre', 'persona', 100, $event)"
                    />
                </div>
              </div>

              <!-- Correo Electronico -->
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Correo Electronico
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail class="w-4 h-4" />
                  </div>
                    <input
                      v-model="formularioPerfil.correo"
                      type="email"
                      required
                      maxlength="254"
                      placeholder="correo@fashionstyle.com"
                      class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all"
                      @input="(e)=>{ formularioPerfil.correo = String(e.target.value).replace(/\s+/g,'').slice(0,254); e.target.value = formularioPerfil.correo; }"
                    />
                </div>
              </div>

              <!-- teléfono -->
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  teléfono / Celular
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone class="w-4 h-4" />
                  </div>
                    <input
                      v-model="formularioPerfil.telefono"
                      type="tel"
                      inputmode="tel"
                      maxlength="20"
                      placeholder="300 123 4567"
                      class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all"
                      @input="filtrarPerfil('telefono', 'telefono', 20, $event)"
                    />
                </div>
              </div>

              <!-- Ciudad -->
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Ciudad
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Building class="w-4 h-4" />
                  </div>
                    <input
                      v-model="formularioPerfil.ciudad"
                      type="text"
                      maxlength="80"
                      placeholder="Ej. Bucaramanga"
                      class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all"
                      @input="filtrarPerfil('ciudad', 'persona', 80, $event)"
                    />
                </div>
              </div>

              <!-- Direccion -->
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Direccion
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <MapPin class="w-4 h-4" />
                  </div>
                    <input
                      v-model="formularioPerfil.direccion"
                      type="text"
                      maxlength="180"
                      placeholder="Calle 45 # 28-10"
                      class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all"
                      @input="filtrarPerfil('direccion', 'direccion', 180, $event)"
                    />
                </div>
              </div>
            </div>

            <!-- boton de guardado -->
            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="guardandoPerfil"
                class="inline-flex items-center gap-2 px-6 py-2.5 bg-corporativo-rosa text-white font-bold text-sm rounded-xl hover:bg-pink-700 focus:ring-4 focus:ring-pink-200 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save class="w-4 h-4" />
                {{ guardandoPerfil ? 'Guardando cambios...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Tarjeta: Cambio de contraseña -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-7">
          <div class="flex items-center gap-3 pb-4 mb-6 border-b border-gray-100">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <KeyRound class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-gray-900">
                Seguridad y contraseña
              </h2>
              <p class="text-xs text-gray-500">
                Para proteger tu cuenta, utiliza una contraseña robusta con al menos 8 caracteres.
              </p>
            </div>
          </div>

          <!-- Mensajes de alerta de contraseña -->
          <div
            v-if="mensajePasswordExito"
            class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-800"
          >
            <Check class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div class="flex-1 font-medium">{{ mensajePasswordExito }}</div>
          </div>

          <div
            v-if="mensajePasswordError"
            class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
          >
            <AlertCircle class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div class="flex-1 font-medium">{{ mensajePasswordError }}</div>
          </div>

          <form @submit.prevent="guardarNuevaContrasena" class="space-y-5">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                contraseña Actual
              </label>
              <div class="relative max-w-md">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock class="w-4 h-4" />
                </div>
                <input
                  v-model="formularioPassword.password_actual"
                  type="password"
                  required
                  maxlength="128"
                  placeholder="Tu contraseña actual"
                  class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Nueva contraseña
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock class="w-4 h-4" />
                  </div>
                  <input
                    v-model="formularioPassword.password"
                    type="password"
                    required
                    minlength="8"
                    maxlength="128"
                    placeholder="Minimoimo 8 caracteres"
                    class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all"
                  />
                </div>
                <RequisitosPassword :password="formularioPassword.password" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Confirmar Nueva contraseña
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock class="w-4 h-4" />
                  </div>
                  <input
                    v-model="formularioPassword.password_confirmation"
                    type="password"
                    required
                    minlength="8"
                    maxlength="128"
                    placeholder="Repite la nueva contraseña"
                    class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="guardandoPassword"
                class="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black focus:ring-4 focus:ring-gray-200 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <KeyRound class="w-4 h-4" />
                {{ guardandoPassword ? 'Actualizando contraseña...' : 'Actualizar contraseña' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Columna derecha: Resumen de usuario sin botones redundantes (1 col) -->
      <div class="space-y-6">
        <!-- Tarjeta de perfil resumida -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <SelectorFotoPerfil class="mb-4" />
          <h3 class="text-lg font-bold text-gray-900 truncate">
            {{ formularioPerfil.nombre || authStore.usuario?.nombre || 'Usuario' }}
          </h3>
          <p class="text-xs text-gray-500 truncate mt-0.5">
            {{ formularioPerfil.correo || authStore.usuario?.correo || 'Sin correo registrado' }}
          </p>

          <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-2">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-50 text-corporativo-rosa border border-pink-200">
              Rol: {{ rolLegible }}
            </span>
          </div>

          <div class="mt-4 text-xs text-gray-400">
            Identificador ID: {{ authStore.usuario?.id_usuario || authStore.usuario?.id || '1' }}
          </div>
        </div>

        <!-- Tarjeta de ayuda o guá -->
        <div class="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 p-6 text-gray-800">
          <h4 class="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-corporativo-rosa" />
            Seguridad de tu sesión
          </h4>
          <p class="text-xs text-gray-600 leading-relaxed mb-3">
            Tus datos se sincronizan de forma segura con el servidor. Al cambiar tu contraseña, tus tokens activos se renuevan para proteger tus operaciones.
          </p>
          <div class="text-xs text-gray-500 font-mono">
            Plataforma FashionStyle v1.0
          </div>
        </div>
      </div>
    </div>
  </div>
</template>