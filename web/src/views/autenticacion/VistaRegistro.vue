<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { useNotificacion } from '@/composables/useNotificacion';
import { obtenerMensajeError } from '@/services/clienteApi';
import BotonGoogle from '@/components/autenticacion/BotonGoogle.vue';
import { filtrarCampo } from '@/utils/validacionCampos';
import RequisitosPassword from '@/components/autenticacion/RequisitosPassword.vue';
import { passwordEsSegura } from '@/utils/validarPassword';
import { ciudadTieneFormatoValido, ciudadExiste, buscarCiudades } from '@/utils/Validarciudad';

const router = useRouter();
const authStore = useAutenticacionStore();
const { notificarError, notificarExito } = useNotificacion();

const nombre = ref('');
const correo = ref('');
const telefono = ref('');
const ciudad = ref('');
const direccion = ref('');
const sugerenciasCiudad = ref([]);
const ciudadExiste_ = ref(null); // true | false | null (sin comprobar)
let temporizadorCiudad = null;
const password = ref('');
const confirmacion = ref('');
const verPassword = ref(false);
const aceptaTerminos = ref(false);
const cargando = ref(false);
const errorMessage = ref('');

function filtrarRegistro(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  if (campo === 'nombre') nombre.value = valor;
  if (campo === 'telefono') telefono.value = valor;
  evento.target.value = valor;
}

const passwordCorta = computed(
  () => password.value.length > 0 && password.value.length < 8
);

const noCoinciden = computed(
  () => confirmacion.value.length > 0 && password.value !== confirmacion.value
);

// Celular colombiano: 10 dgitos que empiezan por 3 (se ignoran espacios y guiones).
const telefonoLimpio = computed(() => telefono.value.replace(/[\s-]/g, ''));
const telefonoInvalido = computed(
  () => telefonoLimpio.value.length > 0 && !/^3\d{9}$/.test(telefonoLimpio.value)
);
const ciudadInvalida = computed(
  () => ciudad.value.trim().length > 0 && !ciudadTieneFormatoValido(ciudad.value)
);

watch(ciudad, (valor) => {
  clearTimeout(temporizadorCiudad);
  ciudadExiste_.value = null;

  if (!ciudadTieneFormatoValido(valor)) {
    sugerenciasCiudad.value = [];
    return;
  }

  temporizadorCiudad = setTimeout(async () => {
    sugerenciasCiudad.value = await buscarCiudades(valor.trim());
    ciudadExiste_.value = await ciudadExiste(valor);
  }, 350);
});

const ciudadNoEncontrada = computed(() => ciudadExiste_.value === false);

const puedeEnviar = computed(
  () =>
    nombre.value.trim() &&
    correo.value.trim() &&
    /^3\d{9}$/.test(telefonoLimpio.value) &&
    ciudadTieneFormatoValido(ciudad.value) &&
    !ciudadNoEncontrada.value &&
    direccion.value.trim().length >= 5 &&
    passwordEsSegura(password.value) &&
    password.value === confirmacion.value &&
    aceptaTerminos.value &&
    !cargando.value
);

function mensajeDe(err, porDefecto) {
  return obtenerMensajeError(err, porDefecto);
}

const registrar = async () => {
  errorMessage.value = '';
  if (!/^\S+@\S+\.\S+$/.test(correo.value.trim())) {
    errorMessage.value = 'Ingresa un correo Electrónico válido.';
    return;
  }
  cargando.value = true;
  try {
    if ((await ciudadExiste(ciudad.value)) === false) {
      errorMessage.value = 'No encontramos esa ciudad. selecciónala de la lista de sugerencias.';
      notificarError(errorMessage.value);
      return;
    }

    await authStore.registrar({
      nombre: nombre.value.trim(),
      correo: correo.value.trim(),
      telefono: telefonoLimpio.value,
      ciudad: ciudad.value.trim(),
      direccion: direccion.value.trim(),
      password: password.value,
      password_confirmation: confirmacion.value,
      acepta_terminos: aceptaTerminos.value
    });
    notificarExito('Te enviamos un código a tu correo.');
    router.push({ name: 'verificar-correo', query: { correo: correo.value.trim() } });
  } catch (err) {
    if (err.response?.data?.data?.codigo === 'correo_pendiente_verificacion') {
      notificarError('Ese correo ya tiene un registro pendiente. Inicia sesión para verificarlo.');
      router.push({ name: 'login', query: { correo: correo.value.trim() } });
      return;
    }
    errorMessage.value = mensajeDe(err, 'No se pudo completar el registro.');
    notificarError(errorMessage.value);
  } finally {
    cargando.value = false;
  }
};

const registrarConGoogle = async (credential) => {
  errorMessage.value = '';
  cargando.value = true;
  try {
    await authStore.iniciarSesionConGoogle(credential, aceptaTerminos.value);
    notificarExito('Bienvenido a FashionStyle');
    await router.replace(authStore.rutaInicial());
  } catch (err) {
    errorMessage.value = mensajeDe(err, 'No se pudo continuar con Google.');
    notificarError(errorMessage.value);
  } finally {
    cargando.value = false;
  }
};

const handleGoogleError = (err) => { errorMessage.value = err.message; };
</script>

<template>
  <div>
    <p class="fs-auth__sobre">FASHIONSTYLE</p>
    <h2 class="fs-auth__titulo">Crear cuenta</h2>
    <p class="fs-auth__ayuda">Regístrate para hacer pedidos y cotizaciones.</p>

    <form class="fs-auth__form" novalidate @submit.prevent="registrar">
      <div class="fs-auth__campo">
        <label for="nombre">Nombre completo</label>
        <div class="fs-auth__input">
          <input
            id="nombre"
            v-model="nombre"
            type="text"
            required
            maxlength="100"
            autocomplete="name"
            placeholder="Tu nombre"
            @input="filtrarRegistro('nombre', 'persona', 100, $event)"
          />
        </div>
      </div>

      <div class="fs-auth__fila">
        <div class="fs-auth__campo">
          <label for="correo">Correo Electrónico</label>
          <div class="fs-auth__input">
                <input
                  id="correo"
                  v-model="correo"
                  type="email"
                  required
                  maxlength="254"
                  autocomplete="email"
                  placeholder="tu@correo.com"
                  @input="(e)=>{ correo = String(e.target.value).replace(/\s+/g,'').slice(0,254); e.target.value = correo; }"
                />
          </div>
        </div>

        <div class="fs-auth__campo">
          <label for="telefono">Celular</label>
          <div class="fs-auth__input">
            <input
              id="telefono"
              v-model="telefono"
              type="tel"
              required
              maxlength="14"
              autocomplete="tel"
              placeholder="3001234567"
              @input="filtrarRegistro('telefono', 'telefono', 20, $event)"
            />
          </div>
          <p v-if="telefonoInvalido" class="fs-auth__nota mal">
            Ingresa un celular válido de 10 dígitos (ej. 3001234567).
          </p>
        </div>
      </div>

      <div class="fs-auth__fila">
        <div class="fs-auth__campo">
          <label for="ciudad">Ciudad</label>
          <div class="fs-auth__input">
            <input
              id="ciudad"
              v-model="ciudad"
              type="text"
              required
              list="lista-ciudades"
              autocomplete="off"
              placeholder="Ej. Bucaramanga"
            />
            <datalist id="lista-ciudades">
              <option v-for="c in sugerenciasCiudad" :key="c" :value="c" />
            </datalist>
          </div>
          <p v-if="ciudadInvalida" class="fs-auth__nota mal">
            Ingresa un nombre de ciudad válido.
          </p>
          <p v-else-if="ciudadNoEncontrada" class="fs-auth__nota mal">
            No encontramos esa ciudad. selecciónala de la lista de sugerencias.
          </p>
        </div>

        <div class="fs-auth__campo">
          <label for="direccion">Dirección</label>
          <div class="fs-auth__input">
            <input
              id="direccion"
              v-model="direccion"
              type="text"
              required
              maxlength="255"
              autocomplete="street-address"
              placeholder="Calle 45 # 28-10"
            />
          </div>
        </div>
      </div>

      <div class="fs-auth__fila">
        <div class="fs-auth__campo">
          <label for="password">contraseña</label>
          <div class="fs-auth__input">
            <input
              id="password"
              v-model="password"
              :type="verPassword ? 'text' : 'password'"
              required
              minlength="8"
              maxlength="128"
              autocomplete="new-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              class="fs-auth__ojo"
              :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="verPassword = !verPassword"
            >
              <EyeOff v-if="verPassword" class="w-5 h-5" />
              <Eye v-else class="w-5 h-5" />
            </button>
          </div>
          <p v-if="!password" class="fs-auth__nota">
            Mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo.
          </p>
          <RequisitosPassword v-else :password="password" />
        </div>

        <div class="fs-auth__campo">
          <label for="confirmacion">Confirmar contraseña</label>
          <div class="fs-auth__input">
            <input
              id="confirmacion"
              v-model="confirmacion"
              :type="verPassword ? 'text' : 'password'"
              required
              minlength="8"
              maxlength="128"
              autocomplete="new-password"
              placeholder="••••••••"
            />
          </div>
          <p v-if="noCoinciden" class="fs-auth__nota mal">
            Las contraseñas no coinciden.
          </p>
        </div>
      </div>

      <label class="fs-auth__check">
        <input v-model="aceptaTerminos" type="checkbox" />
        <span>
          Acepto los
          <a href="#/terminos" target="_blank">términos y condiciones</a>
          y el tratamiento de mis datos personales.
        </span>
      </label>

      <p v-if="errorMessage" role="alert" class="fs-auth__error">
        {{ errorMessage }}
      </p>

      <button type="submit" class="fs-auth__boton" :disabled="!puedeEnviar">
        {{ cargando ? 'Creando cuenta...' : 'Crear cuenta' }}
      </button>
    </form>

    <div class="fs-auth__separador">o continúa con</div>

    <BotonGoogle
      :deshabilitado="cargando || !aceptaTerminos"
      @credential="registrarConGoogle"
      @error="handleGoogleError"
    />
    <p v-if="!aceptaTerminos" class="fs-auth__google-nota">
      Acepta los términos para continuar con Google.
    </p>

    <p class="fs-auth__pie">
      ¿Ya tienes cuenta?
      <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
    </p>
  </div>
</template>
