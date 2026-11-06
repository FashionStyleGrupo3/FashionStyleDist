<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useFavoritosStore } from '@/stores/favoritos';
import SeccionMisPedidos from '@/components/perfil/SeccionMisPedidos.vue';
import SelectorFotoPerfil from '@/components/perfil/SelectorFotoPerfil.vue';
import SeccionFavoritos from '@/components/perfil/SeccionFavoritos.vue';
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
  KeyRound,
  Package, 
  Heart
} from 'lucide-vue-next';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { obtenerPerfilActual, actualizarPerfil, actualizarContrasena, solicitarCambioCorreo, confirmarCambioCorreo } from '@/services/usuarioServicio';
import { filtrarCampo } from '@/utils/validacionCampos';
import { useValidacionCiudad } from '@/composables/useValidacionCiudad';
import RequisitosPassword from '@/components/autenticacion/RequisitosPassword.vue';
import { passwordEsSegura } from '@/utils/validarPassword';

const authStore = useAutenticacionStore();
const route = useRoute();
const router = useRouter();
const favoritosStore = useFavoritosStore();

const SECCIONES = ['datos', 'pedidos', 'favoritos'];
const seccion = computed(() =>
  SECCIONES.includes(route.query.seccion) ? route.query.seccion : 'datos'
);

const pestanas = [
  { id: 'datos', etiqueta: 'Mis datos', icono: User },
  { id: 'pedidos', etiqueta: 'Mis pedidos', icono: Package },
  { id: 'favoritos', etiqueta: 'Favoritos', icono: Heart }
];

function irASeccion(valor) {
  router.replace({ name: 'perfil', query: valor === 'datos' ? {} : { seccion: valor } });
}
const cargando = ref(true);
const guardandoPerfil = ref(false);
const guardandoPassword = ref(false);

const mensajePerfilExito = ref('');
const mensajePerfilError = ref('');
const mensajePasswordExito = ref('');
const mensajePasswordError = ref('');

const cambiandoCorreo = ref(false);
const correoNuevo = ref('');
const codigoCorreo = ref('');
const codigoEnviado = ref(false);
const enviandoCorreo = ref(false);
const mensajeCorreoExito = ref('');
const mensajeCorreoError = ref('');

const formulario = ref({ nombre: '', correo: '', telefono: '', direccion: '', ciudad: '' });
const password = ref({ password_actual: '', password: '', password_confirmation: '' });

function filtrarPerfil(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  if (campo === 'codigoCorreo') codigoCorreo.value = valor;
  else formulario.value[campo] = valor;
  evento.target.value = valor;
}

function cancelarCambioCorreo() {
  cambiandoCorreo.value = false;
  codigoEnviado.value = false;
  correoNuevo.value = '';
  codigoCorreo.value = '';
  mensajeCorreoError.value = '';
}

async function pedirCodigoCorreo() {
  mensajeCorreoError.value = '';
  mensajeCorreoExito.value = '';
  enviandoCorreo.value = true;
  try {
    const r = await solicitarCambioCorreo(correoNuevo.value.trim());
    codigoEnviado.value = true;
    mensajeCorreoExito.value = r.message;
  } catch (e) {
    mensajeCorreoError.value = primerError(e, 'No se pudo enviar el código.');
  } finally {
    enviandoCorreo.value = false;
  }
}

async function confirmarCorreo() {
  mensajeCorreoError.value = '';
  enviandoCorreo.value = true;
  try {
    const r = await confirmarCambioCorreo(codigoCorreo.value.trim());
    // el backend cierra las sesiones viejas y devuelve un token nuevo
    cargarFormulario(authStore.guardarSesion(r));
    cancelarCambioCorreo();
    mensajeCorreoExito.value = 'Tu correo se actualizó correctamente.';
  } catch (e) {
    mensajeCorreoError.value = primerError(e, 'El código es inválido o ha expirado.');
  } finally {
    enviandoCorreo.value = false;
  }
}

function cargarFormulario(usuario) {
  formulario.value = {
    nombre: usuario?.nombre || '',
    correo: usuario?.correo || usuario?.email || '',
    telefono: usuario?.telefono || '',
    direccion: usuario?.direccion || '',
    ciudad: usuario?.ciudad || ''
  };
}

function primerError(requestError, porDefecto) {
  return Object.values(requestError.response?.data?.errors || {}).flat()[0]
    || requestError.response?.data?.message
    || porDefecto;
}

async function cargarPerfil() {
  if (authStore.usuario) cargarFormulario(authStore.usuario);
  try {
    cargarFormulario(await obtenerPerfilActual());
  } catch (requestError) {
    mensajePerfilError.value = primerError(requestError, 'No se pudo cargar tu perfil.');
  } finally {
    cargando.value = false;
  }
}

// RF-072: misma validación de ciudad que en el registro y el checkout.
const validacionCiudad = useValidacionCiudad(() => formulario.value.ciudad);
const sugerenciasCiudad = validacionCiudad.sugerencias;

async function guardarPerfil() {
  mensajePerfilExito.value = '';
  mensajePerfilError.value = '';

  if (!formulario.value.nombre.trim()) {
    mensajePerfilError.value = 'El nombre completo es obligatorio.';
    return;
  }

  if (formulario.value.ciudad.trim() && !(await validacionCiudad.comprobar())) {
    mensajePerfilError.value = 'No encontramos esa ciudad. Selecciónala de la lista de sugerencias.';
    return;
  }

  guardandoPerfil.value = true;
  try {
    const actualizado = await actualizarPerfil({
      nombre: formulario.value.nombre.trim(),
      correo: formulario.value.correo.trim(),
      telefono: formulario.value.telefono.trim(),
      ciudad: formulario.value.ciudad.trim(),
      direccion: formulario.value.direccion.trim()
    });
    cargarFormulario(authStore.actualizarUsuario(actualizado));
    mensajePerfilExito.value = 'Tu información se actualizó correctamente.';
  } catch (requestError) {
    mensajePerfilError.value = primerError(requestError, 'No se pudo actualizar tu perfil.');
  } finally {
    guardandoPerfil.value = false;
  }
}

async function guardarPassword() {
  mensajePasswordExito.value = '';
  mensajePasswordError.value = '';

  if (!passwordEsSegura(password.value.password)) {
    mensajePasswordError.value = 'La nueva contraseña no cumple los requisitos de seguridad.';
    return;
  }
  if (password.value.password !== password.value.password_confirmation) {
    mensajePasswordError.value = 'La confirmación de la contraseña no coincide.';
    return;
  }

  guardandoPassword.value = true;
  try {
    await actualizarContrasena(password.value);
    password.value = { password_actual: '', password: '', password_confirmation: '' };
    mensajePasswordExito.value = 'Tu contraseña se actualizó correctamente.';
  } catch (requestError) {
    mensajePasswordError.value = primerError(requestError, 'No se pudo actualizar la contraseña.');
  } finally {

    guardandoPassword.value = false;
  }
}

onMounted(cargarPerfil);

const campo =
  'w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-corporativo-rosa focus:ring-2 focus:ring-pink-100 focus:outline-none transition-all';
const etiqueta = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2';
const icono = 'absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400';
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <!-- Encabezado -->
    <div class="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-gray-900 font-titulos sm:text-3xl">Mi perfil</h1>
        <p class="mt-0.5 text-xs text-gray-500 sm:text-sm">
          Administra tu información personal, datos de contacto y credenciales de acceso.
        </p>
      </div>
      <RouterLink to="/"
        class="inline-flex items-center gap-2 self-start rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50">
        <ArrowLeft class="h-4 w-4" />
        Volver a la tienda
      </RouterLink>
    </div>

          <nav class="flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="Secciones del perfil">
      <button
        v-for="p in pestanas"
        :key="p.id"
        type="button"
        class="inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors"
        :class="seccion === p.id
          ? 'border-corporativo-rosa text-corporativo-rosa'
          : 'border-transparent text-gray-500 hover:text-gray-800'"
        @click="irASeccion(p.id)"
      >
        <component :is="p.icono" class="h-4 w-4" />
        {{ p.etiqueta }}
        <span v-if="p.id === 'favoritos' && favoritosStore.total > 0"
          class="rounded-full bg-pink-100 px-2 py-0.5 text-xs text-corporativo-rosa">
          {{ favoritosStore.total }}
        </span>
      </button>
    </nav>

    <div v-if="seccion === 'datos' && cargando"
      class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
      Cargando tu perfil...
    </div>

    <div v-else-if="seccion === 'datos'" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Columna principal -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Datos personales -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
          <div class="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-corporativo-rosa">
                <User class="h-5 w-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-gray-900 sm:text-lg">Datos personales</h2>
                <p class="text-xs text-gray-500">Manten al día tus datos para tus pedidos y entregas.</p>
              </div>
            </div>
            <span
              class="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
              <ShieldCheck class="h-3.5 w-3.5" />
              Cuenta verificada
            </span>
          </div>

          <div v-if="mensajePerfilExito"
            class="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <Check class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div class="flex-1 font-medium">{{ mensajePerfilExito }}</div>
          </div>
          <div v-if="mensajePerfilError"
            class="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div class="flex-1 font-medium">{{ mensajePerfilError }}</div>
          </div>

          <form class="space-y-5" @submit.prevent="guardarPerfil">
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label :class="etiqueta">Nombre completo</label>
                <div class="relative">
                  <div :class="icono">
                    <User class="h-4 w-4" />
                  </div>
                  <input v-model="formulario.nombre" type="text" required maxlength="100" placeholder="Ej. Juan Pérez" :class="campo" @input="filtrarPerfil('nombre', 'persona', 100, $event)" />
                </div>
              </div>

              <div>
                <label :class="etiqueta">Correo Electrónico</label>
                <div class="relative">
                  <div :class="icono">
                    <Mail class="h-4 w-4" />
                  </div>
                  <input :value="formulario.correo" type="email" readonly
                    :class="[campo, 'cursor-not-allowed bg-gray-100 text-gray-500']" />
                </div>

                <button v-if="!cambiandoCorreo" type="button"
                  class="mt-2 text-xs font-semibold text-corporativo-rosa hover:underline"
                  @click="cambiandoCorreo = true">
                  Cambiar correo
                </button>

                <div v-else class="mt-4 space-y-4">
                  <div>
                    <label :class="etiqueta">Nuevo correo Electrónico</label>
                    <div class="relative">
                      <div :class="icono">
                        <Mail class="h-4 w-4" />
                      </div>
                      <input v-model="correoNuevo" type="email" maxlength="254" :disabled="codigoEnviado" placeholder="nuevo@correo.com"
                        :class="[campo, 'disabled:cursor-not-allowed disabled:opacity-60']" />
                    </div>
                  </div>

                  <div v-if="codigoEnviado">
                    <label :class="etiqueta">código de verificación</label>
                    <div class="relative">
                      <div :class="icono">
                        <KeyRound class="h-4 w-4" />
                      </div>
                      <input v-model="codigoCorreo" type="text" inputmode="numeric" maxlength="6"
                        placeholder="6 dígitos" :class="campo" />
                    </div>
                  </div>

                  <div v-if="mensajeCorreoExito"
                    class="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div class="flex-1 font-medium">{{ mensajeCorreoExito }}</div>
                  </div>
                  <div v-if="mensajeCorreoError"
                    class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <div class="flex-1 font-medium">{{ mensajeCorreoError }}</div>
                  </div>

                  <div class="flex items-center gap-3">
                    <button v-if="!codigoEnviado" type="button" :disabled="enviandoCorreo || !correoNuevo"
                      class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-pink-700 focus:ring-4 focus:ring-pink-200 disabled:cursor-not-allowed disabled:opacity-50"
                      @click="pedirCodigoCorreo">
                      {{ enviandoCorreo ? 'Enviando...' : 'Enviar código' }}
                    </button>
                    <button v-else type="button" :disabled="enviandoCorreo || codigoCorreo.length !== 6"
                      class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-pink-700 focus:ring-4 focus:ring-pink-200 disabled:cursor-not-allowed disabled:opacity-50"
                      @click="confirmarCorreo">
                      {{ enviandoCorreo ? 'Confirmando...' : 'Confirmar correo' }}
                    </button>
                    <button type="button" class="text-sm font-semibold text-gray-500 hover:text-gray-700"
                      @click="cancelarCambioCorreo">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label :class="etiqueta">teléfono / celular</label>
                <div class="relative">
                  <div :class="icono">
                    <Phone class="h-4 w-4" />
                  </div>
                  <input v-model="formulario.telefono" type="tel" inputmode="tel" maxlength="20" placeholder="300 123 4567" :class="campo" @input="filtrarPerfil('telefono', 'telefono', 20, $event)" />
                </div>
              </div>

              <div>
                <label :class="etiqueta">Ciudad</label>
                <div class="relative">
                  <div :class="icono">
                    <Building class="h-4 w-4" />
                  </div>
                  <input v-model="formulario.ciudad" type="text" maxlength="80" list="perfil-ciudades" autocomplete="address-level2" placeholder="Ej. Bogotá" :class="campo" @input="filtrarPerfil('ciudad', 'persona', 80, $event)" />
                  <datalist id="perfil-ciudades">
                    <option v-for="c in sugerenciasCiudad" :key="c" :value="c" />
                  </datalist>
                </div>
                <p v-if="validacionCiudad.noEncontrada.value" class="mt-1 text-xs font-medium text-red-600">
                  No encontramos esa ciudad. Selecciónala de la lista de sugerencias.
                </p>
              </div>

              <div>
                <label :class="etiqueta">Dirección</label>
                <div class="relative">
                  <div :class="icono">
                    <MapPin class="h-4 w-4" />
                  </div>
                  <input v-model="formulario.direccion" type="text" maxlength="180" placeholder="Calle 45 # 28-10" :class="campo" @input="filtrarPerfil('direccion', 'direccion', 180, $event)" />
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-4">
              <button type="submit" :disabled="guardandoPerfil"
                class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-pink-700 focus:ring-4 focus:ring-pink-200 disabled:cursor-not-allowed disabled:opacity-50">
                <Save class="h-4 w-4" />
                {{ guardandoPerfil ? 'Guardando cambios...' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </div>

        <!-- contraseña -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
          <div class="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <KeyRound class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-900 sm:text-lg">Seguridad y contraseña</h2>
              <p class="text-xs text-gray-500">Usa una contraseña robusta de al menos 8 caracteres.</p>
            </div>
          </div>

          <div v-if="mensajePasswordExito"
            class="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <Check class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div class="flex-1 font-medium">{{ mensajePasswordExito }}</div>
          </div>
          <div v-if="mensajePasswordError"
            class="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div class="flex-1 font-medium">{{ mensajePasswordError }}</div>
          </div>

          <form class="space-y-5" @submit.prevent="guardarPassword">
            <div>
              <label :class="etiqueta">contraseña actual</label>
              <div class="relative max-w-md">
                <div :class="icono">
                  <Lock class="h-4 w-4" />
                </div>
                <input v-model="password.password_actual" type="password" required maxlength="128" autocomplete="current-password"
                  placeholder="Tu contraseña actual" :class="campo" />
              </div>
            </div>

            <div class="grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label :class="etiqueta">Nueva contraseña</label>
                <div class="relative">
                  <div :class="icono">
                    <Lock class="h-4 w-4" />
                  </div>
                  <input v-model="password.password" type="password" required minlength="8" maxlength="128" autocomplete="new-password"
                    placeholder="Mínimo 8 caracteres" :class="campo" />
                </div>
                <RequisitosPassword :password="password.password" />
              </div>
              <div>
                <label :class="etiqueta">Confirmar contraseña</label>
                <div class="relative">
                  <div :class="icono">
                    <Lock class="h-4 w-4" />
                  </div>
                  <input v-model="password.password_confirmation" type="password" required minlength="8" maxlength="128"
                    autocomplete="new-password" placeholder="Repite la nueva contraseña" :class="campo" />
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-4">
              <button type="submit" :disabled="guardandoPassword"
                class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-black focus:ring-4 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50">
                <KeyRound class="h-4 w-4" />
                {{ guardandoPassword ? 'Actualizando contraseña...' : 'Actualizar contraseña' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Columna lateral -->
      <div class="space-y-6">
        <div class="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <SelectorFotoPerfil class="mb-4" />
          <h3 class="truncate text-lg font-bold text-gray-900">{{ formulario.nombre || 'Usuario' }}</h3>
          <p class="mt-0.5 truncate text-xs text-gray-500">{{ formulario.correo || 'Sin correo registrado' }}</p>
          <div class="mt-4 flex items-center justify-center border-t border-gray-100 pt-4">
            <span
              class="inline-block rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-semibold text-corporativo-rosa">
              Cliente FashionStyle
            </span>
          </div>
        </div>

        <div class="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-rose-50 p-6 text-gray-800">
          <h4 class="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Package class="h-4 w-4 text-corporativo-rosa" />
            Tus datos de entrega
          </h4>
          <p class="text-xs leading-relaxed text-gray-600">
            Completa tu ciudad, dirección y teléfono para que podamos cotizar y entregar tus pedidos sin contratiempos.
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-6">
          <h4 class="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
            <ShieldCheck class="h-4 w-4 text-corporativo-rosa" />
            Seguridad de tu sesión
          </h4>
          <p class="text-xs leading-relaxed text-gray-600">
            Tus datos viajan de forma segura al servidor. Si cambias tu contraseña, te recomendamos cerrar sesión en
            otros dispositivos.
          </p>
        </div>
      </div>
    </div>

    <SeccionMisPedidos v-else-if="seccion === 'pedidos'" />
    <SeccionFavoritos v-else-if="seccion === 'favoritos'" />
  </div>
</template>