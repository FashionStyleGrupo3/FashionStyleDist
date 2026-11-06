<script setup>
import { ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Eye, EyeOff } from 'lucide-vue-next'
import { useAutenticacionStore } from '@/stores/autenticacion'
import { useNotificacion } from '@/composables/useNotificacion'
import { obtenerMensajeError } from '@/services/clienteApi'
import BotonGoogle from '@/components/autenticacion/BotonGoogle.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAutenticacionStore()
const { notificarError, notificarExito } = useNotificacion()

const correoInicial =
  typeof route.query.correo === 'string' ? route.query.correo : ''

const correo = ref(correoInicial)
const password = ref('')
const verPassword = ref(false)
const cargando = ref(false)
const errorMessage = ref('')

const credencialPendiente = ref(null)
const aceptaTerminosGoogle = ref(false)

function redirSeguro() {
  const redir = route.query.redir
  const prohibidas = ['login', 'registro', 'verificar-correo']

  const valido =
    typeof redir === 'string' &&
    redir.startsWith('/') &&
    !redir.startsWith('//') &&
    !prohibidas.some((p) => redir.includes(p))

  return valido ? redir : null
}

async function entrar() {
  await router.replace(redirSeguro() ?? authStore.rutaInicial())
}

function mensajeDe(err, porDefecto) {
  return obtenerMensajeError(err, porDefecto)
}

const handleLogin = async () => {
  errorMessage.value = ''
  cargando.value = true

  try {
    await authStore.iniciarSesion({
      correo: correo.value.trim(),
      password: password.value
    })

    notificarExito('Bienvenido a FashionStyle')
    await entrar()
  } catch (err) {
    const datos = err.response?.data?.data

    if (datos?.codigo === 'email_no_verificado') {
      notificarError('Verifica tu correo para continuar.')

      const query = {
        correo: datos.correo || correo.value.trim()
      }

      const redir = redirSeguro()

      if (redir) {
        query.redir = redir
      }

      await router.push({
        name: 'verificar-correo',
        query
      })

      return
    }

    if (err.response) {
      errorMessage.value = mensajeDe(err, 'Credenciales incorrectas')
    } else {
      console.error(err)
      errorMessage.value =
        'No se pudo conectar con el servidor. Intenta de nuevo.'
    }
  } finally {
    cargando.value = false
  }
}

const enviarGoogle = async (credential, acepta = false) => {
  errorMessage.value = ''
  cargando.value = true

  try {
    await authStore.iniciarSesionConGoogle(credential, acepta)

    credencialPendiente.value = null
    aceptaTerminosGoogle.value = false

    notificarExito('Bienvenido a FashionStyle')
    await entrar()
  } catch (err) {
    if (err.response?.data?.data?.codigo === 'requiere_terminos') {
      credencialPendiente.value = credential
      return
    }

    errorMessage.value = mensajeDe(
      err,
      'No fue posible iniciar sesión con Google.'
    )
  } finally {
    cargando.value = false
  }
}

const handleGoogleCredential = (credential) =>
  enviarGoogle(credential, false)

const confirmarGoogleConTerminos = () => {
  if (!credencialPendiente.value) {
    return
  }

  enviarGoogle(credencialPendiente.value, true)
}

const handleGoogleError = (err) => {
  errorMessage.value = err.message
}
</script>

<template>
  <div>
    <p class="fs-auth__sobre">FASHIONSTYLE</p>

    <h2 class="fs-auth__titulo">Iniciar sesión</h2>

    <p class="fs-auth__ayuda">
      Ingresa con tu cuenta para continuar.
    </p>

    <form
      class="fs-auth__form"
      novalidate
      @submit.prevent="handleLogin"
    >
      <div class="fs-auth__campo">
        <label for="correo">Correo Electrónico</label>

        <div class="fs-auth__input">
            <input
              id="correo"
              v-model="correo"
              type="email"
              required
              autocomplete="email"
              placeholder="tu@correo.com"
              maxlength="254"
              @input="(e)=>{ correo = String(e.target.value).replace(/\s+/g,'').slice(0,254); e.target.value = correo; }"
            />
        </div>
      </div>

      <div class="fs-auth__campo">
        <label for="password">contraseña</label>

        <div class="fs-auth__input">
            <input
              id="password"
              v-model="password"
              :type="verPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="contraseña"
              maxlength="128"
            />

          <button
            type="button"
            class="fs-auth__ojo"
            :aria-label="
              verPassword
                ? 'Ocultar contraseña'
                : 'Mostrar contraseña'
            "
            @click="verPassword = !verPassword"
          >
            <EyeOff v-if="verPassword" class="w-5 h-5" />
            <Eye v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <p
        v-if="errorMessage"
        role="alert"
        class="fs-auth__error"
      >
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="fs-auth__boton"
        :disabled="cargando"
      >
        {{ cargando ? 'Ingresando...' : 'Iniciar sesión' }}
      </button>
    </form>

    <RouterLink
      :to="{ name: 'recuperar-contrasena' }"
      class="fs-auth__olvido"
    >
      ¿Olvidaste tu contraseña?
    </RouterLink>

    <div class="fs-auth__separador">
      o continúa con
    </div>

    <BotonGoogle
      :deshabilitado="cargando"
      @credential="handleGoogleCredential"
      @error="handleGoogleError"
    />

    <div
      v-if="credencialPendiente"
      class="fs-auth__terminos-google"
    >
      <p>Vas a crear tu cuenta con Google.</p>

      <label class="fs-auth__check">
        <input
          v-model="aceptaTerminosGoogle"
          type="checkbox"
        />

        <span>
          Acepto los
          <a
            href="#/terminos"
            target="_blank"
            rel="noopener noreferrer"
          >
            términos y condiciones
          </a>
          y el tratamiento de mis datos personales.
        </span>
      </label>

      <button
        type="button"
        class="fs-auth__boton"
        :disabled="!aceptaTerminosGoogle || cargando"
        @click="confirmarGoogleConTerminos"
      >
        Crear cuenta con Google
      </button>
    </div>

    <p class="fs-auth__pie">
      ¿No tienes cuenta?
      <RouterLink :to="{ name: 'registro' }">
        Regístrate
      </RouterLink>
    </p>
  </div>
</template>
