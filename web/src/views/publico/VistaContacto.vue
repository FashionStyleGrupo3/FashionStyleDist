<script setup>
// RE014: formulario de contacto tipo PQRS (petición, queja, reclamo, sugerencia...).
// RE015: ubicación de la tienda física. El mensaje llega a la bandeja del panel y
// la respuesta del personal se envía al correo que registra el cliente.
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ChevronDown, Clock, Loader2, Lock, Mail, MapPin, Phone, Search, Send } from 'lucide-vue-next';
import clienteApi, { obtenerMensajeError } from '@/services/clienteApi';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { useValidacionCiudad } from '@/composables/useValidacionCiudad';
import { validarCorreo } from '@/utils/validacionCampos';
import { FORMATO_DOCUMENTO, FORMATO_RADICADO, documento, documentoValido, radicado, sinEspacios, soloDigitos, soloLetras } from '@/utils/restriccionesCampos';

const route = useRoute();
const authStore = useAutenticacionStore();

const TIPOS = [
  { valor: 'peticion', etiqueta: 'Petición' },
  { valor: 'queja', etiqueta: 'Queja' },
  { valor: 'reclamo', etiqueta: 'Reclamo' },
  { valor: 'sugerencia', etiqueta: 'Sugerencia' },
  { valor: 'felicitacion', etiqueta: 'Felicitación' },
  { valor: 'consulta', etiqueta: 'Consulta' },
];
const DOCUMENTOS = [
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'TI', etiqueta: 'Tarjeta de identidad' },
  { valor: 'NIT', etiqueta: 'NIT' },
  { valor: 'PP', etiqueta: 'Pasaporte' },
];
const PAISES = ['Colombia', 'Argentina', 'Chile', 'Ecuador', 'España', 'Estados Unidos', 'México', 'Panamá', 'Perú', 'Venezuela', 'Otro'];
const ESTADOS = { nuevo: 'Recibida', leido: 'En revisión', respondido: 'Respondida' };

const tienda = ref({
  direccion: 'Carrera 7 # 72-41, Bogotá D.C.',
  telefono: '+57 300 000 0001',
  correo_contacto: 'soporte.fashionstyle@gmail.com',
  horario: 'Lunes a sábado, 9:00 a. m. – 7:00 p. m.',
  latitud: 4.6573,
  longitud: -74.0559,
});

const [nombreSesion, ...apellidosSesion] = String(authStore.usuario?.nombre || '').trim().split(/\s+/);
const form = reactive({
  tipo_comunicacion: '',
  nombre: nombreSesion || '',
  apellidos: apellidosSesion.join(' '),
  correo: authStore.usuario?.correo || '',
  tipo_documento: '',
  numero_documento: '',
  pais: 'Colombia',
  ciudad: authStore.usuario?.ciudad || '',
  telefono_fijo: '',
  telefono: soloDigitos(authStore.usuario?.telefono || '', 10),
  mensaje: '',
});
const errores = reactive({});
const enviando = ref(false);
const radicadoCreado = ref('');
const errorGeneral = ref('');

const esColombia = computed(() => form.pais === 'Colombia');

// RE014: radicar una PQRS exige sesión; la respuesta llega al correo de la cuenta.
const conSesion = computed(() => authStore.estaAutenticado);
watch(() => authStore.usuario?.correo, (correo) => { form.correo = correo || ''; }, { immediate: true });
const ciudad = useValidacionCiudad(() => (esColombia.value ? form.ciudad : ''));

// Consulta de una solicitud ya radicada
const modoConsulta = ref(Boolean(route.query.radicado || route.query.consulta));
const consulta = reactive({ radicado: String(route.query.radicado || ''), correo: authStore.usuario?.correo || '' });
const resultadoConsulta = ref(null);
const consultando = ref(false);
const errorConsulta = ref('');

const urlMapa = computed(() => {
  const { latitud: lat, longitud: lon } = tienda.value;
  const d = 0.006;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lon}`;
});
const urlComoLlegar = computed(
  () => `https://www.openstreetmap.org/directions?to=${tienda.value.latitud}%2C${tienda.value.longitud}#map=17/${tienda.value.latitud}/${tienda.value.longitud}`
);

// Cada campo solo acepta los caracteres de su tipo.
const reglaDocumento = computed(() => FORMATO_DOCUMENTO[form.tipo_documento]);
const maxMovil = computed(() => (esColombia.value ? 10 : 15));
const maxFijo = computed(() => (esColombia.value ? 10 : 15));

function soloLetrasEn(campo, max) {
  form[campo] = soloLetras(form[campo], max);
}
function soloDigitosEn(campo, max) {
  let digitos = soloDigitos(form[campo], 20);
  // En Colombia se acepta pegar el número con el indicativo +57.
  if (esColombia.value && digitos.length > 10 && digitos.startsWith('57')) digitos = digitos.slice(2);
  form[campo] = digitos.slice(0, max);
}

// Al cambiar el tipo de documento se reajusta el número a su nuevo formato.
watch(() => form.tipo_documento, (tipo) => { form.numero_documento = documento(form.numero_documento, tipo); });
watch(esColombia, () => {
  form.telefono = soloDigitos(form.telefono, maxMovil.value);
  form.telefono_fijo = soloDigitos(form.telefono_fijo, maxFijo.value);
});

function validar() {
  Object.keys(errores).forEach((k) => delete errores[k]);
  if (!form.tipo_comunicacion) errores.tipo_comunicacion = 'Selecciona el tipo de comunicación.';
  if (form.nombre.trim().length < 2) errores.nombre = 'Escribe tu nombre.';
  if (form.apellidos.trim().length < 2) errores.apellidos = 'Escribe tus apellidos.';
  if (!form.tipo_documento) errores.tipo_documento = 'Selecciona el tipo de documento.';
  if (form.tipo_documento && !documentoValido(form.numero_documento, form.tipo_documento)) {
    errores.numero_documento = `Para este documento ingresa ${reglaDocumento.value.ayuda}.`;
  }
  if (!form.pais) errores.pais = 'Selecciona el país.';
  if (esColombia.value && !form.ciudad.trim()) errores.ciudad = 'Selecciona la ciudad.';
  else if (esColombia.value && ciudad.noEncontrada.value) errores.ciudad = 'No encontramos esa ciudad. Selecciónala de la lista.';
  if (form.telefono_fijo && !/^\d{7,}$/.test(form.telefono_fijo)) {
    errores.telefono_fijo = `El teléfono fijo debe tener entre 7 y ${maxFijo.value} dígitos.`;
  }
  if (esColombia.value ? !/^3\d{9}$/.test(form.telefono) : !/^\d{7,15}$/.test(form.telefono)) {
    errores.telefono = esColombia.value ? 'El móvil debe tener 10 dígitos y empezar por 3.' : 'El móvil debe tener entre 7 y 15 dígitos.';
  }
  if (form.mensaje.trim().length < 10) errores.mensaje = 'El mensaje debe tener al menos 10 caracteres.';
  return Object.keys(errores).length === 0;
}

async function enviar() {
  errorGeneral.value = '';
  radicadoCreado.value = '';
  if (!validar()) return;

  enviando.value = true;
  try {
    const { data } = await clienteApi.post('/contacto', {
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])),
      ciudad: esColombia.value ? form.ciudad.trim() : (form.ciudad.trim() || null),
      telefono_fijo: form.telefono_fijo.trim() || null,
    });
    radicadoCreado.value = data?.data?.radicado || '';
    form.mensaje = '';
    form.tipo_comunicacion = '';
  } catch (error) {
    const validacion = error?.response?.data?.errors;
    if (validacion && Object.keys(validacion).length) {
      Object.entries(validacion).forEach(([campo, mensajes]) => { errores[campo] = [].concat(mensajes)[0]; });
    } else {
      errorGeneral.value = obtenerMensajeError(error, 'No pudimos enviar tu mensaje. Intenta de nuevo.');
    }
  } finally {
    enviando.value = false;
  }
}

async function consultar() {
  errorConsulta.value = '';
  resultadoConsulta.value = null;
  if (!FORMATO_RADICADO.test(consulta.radicado)) {
    errorConsulta.value = 'El radicado tiene el formato PQRS-AAAA-NNNNNN (por ejemplo PQRS-2026-000123).';
    return;
  }
  if (!validarCorreo(consulta.correo)) {
    errorConsulta.value = 'Escribe el correo con el que enviaste la solicitud.';
    return;
  }
  consultando.value = true;
  try {
    const { data } = await clienteApi.get('/contacto/consulta', {
      params: { radicado: consulta.radicado.trim(), correo: consulta.correo.trim() },
    });
    resultadoConsulta.value = data?.data ?? null;
  } catch (error) {
    errorConsulta.value = obtenerMensajeError(error, 'No encontramos una solicitud con esos datos.');
  } finally {
    consultando.value = false;
  }
}

watch(() => route.query, (query) => {
  if (query.radicado || query.consulta) {
    modoConsulta.value = true;
    if (query.radicado) consulta.radicado = String(query.radicado);
  }
});

const fecha = (v) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '');

onMounted(async () => {
  try {
    const { data } = await clienteApi.get('/contacto');
    if (data?.data) tienda.value = { ...tienda.value, ...data.data };
  } catch {
    // Se muestran los datos por defecto de la tienda.
  }
});
</script>

<template>
  <section class="fs-contenedor pqrs">
    <nav class="fs-migas"><RouterLink to="/">Inicio</RouterLink> / <span>Contacto</span></nav>

    <header class="pqrs__cabecera">
      <div>
        <h1>Contáctanos</h1>
        <p class="pqrs__lineas">
          Línea de atención: {{ tienda.telefono }}<br />
          Correo: <a :href="`mailto:${tienda.correo_contacto}`">{{ tienda.correo_contacto }}</a>
        </p>
      </div>
      <div class="pqrs__consulta-cta">
        <strong>Consulta tu PQRS</strong>
        <span>
          Si ya radicaste y deseas consultarla, selecciona
          <button type="button" @click="modoConsulta = !modoConsulta">aquí</button>.
        </span>
      </div>
    </header>

    <div v-if="modoConsulta" class="pqrs__panel-consulta">
      <form class="pqrs__grid" novalidate @submit.prevent="consultar">
        <label class="pqrs__campo">
          <span>Número de radicado *</span>
          <input v-model="consulta.radicado" type="text" maxlength="16" autocomplete="off" placeholder="PQRS-2026-000123" @input="consulta.radicado = radicado(consulta.radicado)" />
        </label>
        <label class="pqrs__campo">
          <span>Email *</span>
          <input v-model="consulta.correo" type="email" maxlength="255" placeholder="Correo con el que radicaste" @input="consulta.correo = sinEspacios(consulta.correo)" />
        </label>
        <div class="pqrs__ancho">
          <button type="submit" class="fs-btn-negro pqrs__boton" :disabled="consultando">
            <Loader2 v-if="consultando" class="h-4 w-4 animate-spin" />
            <Search v-else class="h-4 w-4" />
            Consultar estado
          </button>
          <p v-if="errorConsulta" class="pqrs__error" role="alert">{{ errorConsulta }}</p>
        </div>
      </form>

      <article v-if="resultadoConsulta" class="pqrs__resultado">
        <p class="pqrs__resultado-cabecera">
          <strong>{{ resultadoConsulta.radicado }}</strong>
          <span class="pqrs__estado" :class="`pqrs__estado--${resultadoConsulta.estado}`">
            {{ ESTADOS[resultadoConsulta.estado] || resultadoConsulta.estado }}
          </span>
        </p>
        <p class="pqrs__resultado-meta">Radicada el {{ fecha(resultadoConsulta.fecha) }}</p>
        <p class="pqrs__resultado-texto">{{ resultadoConsulta.mensaje }}</p>
        <div v-for="(r, i) in resultadoConsulta.respuestas" :key="i" class="pqrs__respuesta">
          <span>Respuesta de FashionStyle · {{ fecha(r.fecha) }}</span>
          <p>{{ r.mensaje }}</p>
        </div>
        <p v-if="!resultadoConsulta.respuestas?.length" class="pqrs__resultado-meta">
          Aún no tiene respuesta. Te escribiremos al correo registrado.
        </p>
      </article>
    </div>

    <hr class="pqrs__separador" />
    <p class="pqrs__intro">
      Para nosotros es muy importante darte una pronta respuesta. Por favor diligencia la siguiente información:
    </p>

    <div v-if="radicadoCreado" class="pqrs__exito" role="status">
      ¡Gracias! Recibimos tu mensaje con el radicado <strong>{{ radicadoCreado }}</strong>.
      Te enviamos una copia a <strong>{{ form.correo }}</strong> y te responderemos a ese mismo correo.
    </div>

    <div v-if="!conSesion" class="pqrs__bloqueo">
      <Lock class="pqrs__bloqueo-icono" />
      <div>
        <strong>Inicia sesión para radicar tu PQRS</strong>
        <p>Así podemos verificar tu identidad y enviarte la respuesta al correo registrado en tu cuenta.</p>
      </div>
      <div class="pqrs__bloqueo-acciones">
        <RouterLink :to="{ name: 'login', query: { redir: '/contacto' } }" class="fs-btn-negro pqrs__boton">Iniciar sesión</RouterLink>
        <RouterLink :to="{ name: 'registro', query: { redir: '/contacto' } }" class="pqrs__llegar">Crear cuenta</RouterLink>
      </div>
    </div>

    <form v-else class="pqrs__grid" novalidate @submit.prevent="enviar">
      <label class="pqrs__campo pqrs__ancho" :class="{ 'pqrs__campo--error': errores.tipo_comunicacion }">
        <span>Tipo de comunicación *</span>
        <select v-model="form.tipo_comunicacion">
          <option value="" disabled>Selecciona una opción</option>
          <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>
        </select>
        <ChevronDown class="pqrs__flecha" />
        <small v-if="errores.tipo_comunicacion">{{ errores.tipo_comunicacion }}</small>
      </label>

      <label class="pqrs__campo" :class="{ 'pqrs__campo--error': errores.nombre }">
        <span>Nombre(s) *</span>
        <input v-model="form.nombre" type="text" maxlength="120" autocomplete="given-name" placeholder="Ingresa tu nombre" @input="soloLetrasEn('nombre', 120)" />
        <small v-if="errores.nombre">{{ errores.nombre }}</small>
      </label>
      <label class="pqrs__campo" :class="{ 'pqrs__campo--error': errores.apellidos }">
        <span>Apellido(s) *</span>
        <input v-model="form.apellidos" type="text" maxlength="120" autocomplete="family-name" placeholder="Ingresa tus apellidos" @input="soloLetrasEn('apellidos', 120)" />
        <small v-if="errores.apellidos">{{ errores.apellidos }}</small>
      </label>

      <label class="pqrs__campo pqrs__ancho" :class="{ 'pqrs__campo--error': errores.correo }">
        <span>Email (de tu cuenta)</span>
        <input v-model="form.correo" type="email" readonly title="Responderemos al correo registrado en tu cuenta" />
        <small v-if="errores.correo">{{ errores.correo }}</small>
      </label>

      <label class="pqrs__campo" :class="{ 'pqrs__campo--error': errores.tipo_documento }">
        <span>Tipo de documento *</span>
        <select v-model="form.tipo_documento">
          <option value="" disabled>Selecciona una opción</option>
          <option v-for="d in DOCUMENTOS" :key="d.valor" :value="d.valor">{{ d.etiqueta }}</option>
        </select>
        <ChevronDown class="pqrs__flecha" />
        <small v-if="errores.tipo_documento">{{ errores.tipo_documento }}</small>
      </label>
      <label class="pqrs__campo" :class="{ 'pqrs__campo--error': errores.numero_documento }">
        <span>Número de documento *</span>
        <input
          v-model="form.numero_documento"
          type="text"
          :maxlength="reglaDocumento?.max || 12"
          :inputmode="reglaDocumento && reglaDocumento.tipo !== 'alfanumerico' ? 'numeric' : 'text'"
          :disabled="!form.tipo_documento"
          :placeholder="form.tipo_documento ? `${reglaDocumento.ayuda}` : 'Primero elige el tipo de documento'"
          @input="form.numero_documento = documento(form.numero_documento, form.tipo_documento)"
        />
        <small v-if="errores.numero_documento">{{ errores.numero_documento }}</small>
      </label>

      <label class="pqrs__campo" :class="{ 'pqrs__campo--error': errores.pais }">
        <span>País *</span>
        <select v-model="form.pais">
          <option v-for="p in PAISES" :key="p" :value="p">{{ p }}</option>
        </select>
        <ChevronDown class="pqrs__flecha" />
        <small v-if="errores.pais">{{ errores.pais }}</small>
      </label>
      <label class="pqrs__campo" :class="{ 'pqrs__campo--error': errores.ciudad }">
        <span>Ciudad{{ esColombia ? ' *' : '' }}</span>
        <input
          v-model="form.ciudad"
          type="text"
          maxlength="100"
          :list="esColombia ? 'pqrs-ciudades' : undefined"
          autocomplete="address-level2"
          :placeholder="esColombia ? 'Escribe y selecciona tu ciudad' : 'Ciudad (opcional)'"
          @input="soloLetrasEn('ciudad', 100)"
        />
        <datalist id="pqrs-ciudades">
          <option v-for="c in ciudad.sugerencias.value" :key="c" :value="c" />
        </datalist>
        <small v-if="errores.ciudad">{{ errores.ciudad }}</small>
      </label>

      <label class="pqrs__campo" :class="{ 'pqrs__campo--error': errores.telefono_fijo }">
        <span>Teléfono fijo</span>
        <input v-model="form.telefono_fijo" type="tel" inputmode="numeric" :maxlength="maxFijo" autocomplete="tel-national" placeholder="Solo números, ej. 6015551234" @input="soloDigitosEn('telefono_fijo', maxFijo)" />
        <small v-if="errores.telefono_fijo">{{ errores.telefono_fijo }}</small>
      </label>
      <label class="pqrs__campo" :class="{ 'pqrs__campo--error': errores.telefono }">
        <span>Móvil *</span>
        <input v-model="form.telefono" type="tel" inputmode="numeric" :maxlength="maxMovil" autocomplete="tel" :placeholder="esColombia ? '10 dígitos, ej. 3001234567' : 'Solo números'" @input="soloDigitosEn('telefono', maxMovil)" />
        <small v-if="errores.telefono">{{ errores.telefono }}</small>
      </label>

      <label class="pqrs__campo pqrs__ancho" :class="{ 'pqrs__campo--error': errores.mensaje }">
        <span>Mensaje *</span>
        <textarea v-model="form.mensaje" rows="6" maxlength="2000" placeholder="Tu mensaje aquí..."></textarea>
        <small v-if="errores.mensaje">{{ errores.mensaje }}</small>
        <em class="pqrs__contador">{{ form.mensaje.length }}/2000</em>
      </label>

      <div class="pqrs__ancho pqrs__acciones">
        <p class="pqrs__aviso">
          Al enviar autorizas el tratamiento de tus datos para atender tu solicitud, según nuestros
          <RouterLink to="/terminos">términos y condiciones</RouterLink>.
        </p>
        <button type="submit" class="fs-btn-negro pqrs__boton" :disabled="enviando">
          <Loader2 v-if="enviando" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          {{ enviando ? 'Enviando...' : 'Enviar' }}
        </button>
        <p v-if="errorGeneral" class="pqrs__error" role="alert">{{ errorGeneral }}</p>
      </div>
    </form>

    <section class="pqrs__ubicacion">
      <div class="pqrs__mapa">
        <iframe :src="urlMapa" title="Ubicación de la tienda FashionStyle" loading="lazy" referrerpolicy="no-referrer"></iframe>
      </div>
      <div class="pqrs__datos">
        <h2>Visítanos en la tienda</h2>
        <ul>
          <li><MapPin class="h-4 w-4" /><span>{{ tienda.direccion }}</span></li>
          <li><Clock class="h-4 w-4" /><span>{{ tienda.horario }}</span></li>
          <li><Phone class="h-4 w-4" /><a :href="`tel:${String(tienda.telefono).replace(/\s/g, '')}`">{{ tienda.telefono }}</a></li>
          <li><Mail class="h-4 w-4" /><a :href="`mailto:${tienda.correo_contacto}`">{{ tienda.correo_contacto }}</a></li>
        </ul>
        <a :href="urlComoLlegar" target="_blank" rel="noopener noreferrer" class="pqrs__llegar">Cómo llegar</a>
      </div>
    </section>
  </section>
</template>

<style scoped>
.pqrs { padding-top: 28px; padding-bottom: 24px; }

.pqrs__cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.pqrs__cabecera h1 {
  margin: 0;
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 600;
  color: var(--fs-negro);
}

.pqrs__lineas { margin: 10px 0 0; font-size: 14px; color: var(--fs-gris); line-height: 1.7; }
.pqrs__lineas a { color: var(--fs-gris); }

.pqrs__consulta-cta { text-align: right; font-size: 15px; color: var(--fs-texto); }
.pqrs__consulta-cta strong { display: block; font-size: clamp(24px, 3vw, 34px); font-weight: 600; color: var(--fs-negro); }
.pqrs__consulta-cta button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--fs-pizarra);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.pqrs__separador { margin: 20px 0 18px; border: 0; border-top: 1px solid var(--fs-gris-claro); }
.pqrs__intro { margin: 0 0 18px; font-size: 16px; font-weight: 500; color: var(--fs-texto); }

.pqrs__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 24px;
}

.pqrs__ancho { grid-column: 1 / -1; }

/* Recuadro con la etiqueta dentro, como en el formulario de referencia. */
.pqrs__campo {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 22px 10px;
  border: 1px solid var(--fs-borde);
  border-radius: 10px;
  background: var(--fs-blanco);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pqrs__campo:focus-within { border-color: var(--fs-negro); box-shadow: 0 0 0 3px rgb(17 17 17 / 0.06); }
.pqrs__campo--error { border-color: var(--fs-rojo); }

.pqrs__campo > span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--fs-texto);
}

.pqrs__campo input,
.pqrs__campo select,
.pqrs__campo textarea {
  width: 100%;
  padding: 2px 24px 2px 2px;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: var(--fs-texto);
  outline: none;
  appearance: none;
}

.pqrs__campo textarea { padding-right: 2px; resize: vertical; min-height: 110px; }
.pqrs__campo input::placeholder,
.pqrs__campo textarea::placeholder { color: var(--fs-gris); }

.pqrs__flecha {
  position: absolute;
  right: 18px;
  bottom: 14px;
  width: 16px;
  height: 16px;
  color: var(--fs-texto);
  pointer-events: none;
}

.pqrs__campo small { color: var(--fs-rojo); font-size: 12px; font-weight: 500; }
.pqrs__contador { align-self: flex-end; font-size: 11px; font-style: normal; color: var(--fs-gris); }

.pqrs__acciones { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px; }
.pqrs__aviso { margin: 0; max-width: 560px; font-size: 12px; color: var(--fs-gris); }
.pqrs__aviso a { color: var(--fs-texto); }
.pqrs__boton { min-width: 200px; font-size: 15px; }
.pqrs__boton:disabled { opacity: 0.6; cursor: not-allowed; }
.pqrs__error { width: 100%; margin: 0; color: var(--fs-rojo); font-size: 13px; font-weight: 500; }

.pqrs__bloqueo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 20px;
  padding: 22px;
  border: 1px solid var(--fs-borde);
  border-radius: var(--fs-radio);
  background: var(--fs-blanco);
}

.pqrs__bloqueo > div:nth-child(2) { flex: 1 1 320px; }
.pqrs__bloqueo strong { font-size: 17px; color: var(--fs-negro); }
.pqrs__bloqueo p { margin: 4px 0 0; font-size: 14px; color: var(--fs-gris); }
.pqrs__bloqueo-icono { width: 28px; height: 28px; color: var(--fs-pizarra); }
.pqrs__bloqueo-acciones { display: flex; flex-wrap: wrap; gap: 10px; }
.pqrs__bloqueo-acciones a { text-decoration: none; }

.pqrs__campo input[readonly] { color: var(--fs-gris); cursor: not-allowed; }

.pqrs__exito {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--fs-arena-suave);
  font-size: 14px;
}

.pqrs__panel-consulta {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--fs-borde);
  border-radius: var(--fs-radio);
  background: var(--fs-arena-suave);
}

.pqrs__resultado { margin-top: 16px; padding: 16px; border-radius: 10px; background: var(--fs-blanco); font-size: 14px; }
.pqrs__resultado-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0; }
.pqrs__resultado-meta { margin: 4px 0 0; font-size: 12px; color: var(--fs-gris); }
.pqrs__resultado-texto { margin: 12px 0 0; white-space: pre-line; color: var(--fs-texto); }
.pqrs__respuesta { margin-top: 12px; padding: 12px; border-left: 3px solid var(--fs-negro); background: var(--fs-crema); }
.pqrs__respuesta span { font-size: 12px; font-weight: 600; color: var(--fs-gris); }
.pqrs__respuesta p { margin: 6px 0 0; white-space: pre-line; }

.pqrs__estado { padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; background: var(--fs-arena); }
.pqrs__estado--respondido { background: #e2f6ec; color: #1f6b45; }
.pqrs__estado--nuevo { background: var(--fs-negro); color: var(--fs-blanco); }

.pqrs__ubicacion {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 24px;
  margin-top: 36px;
  padding: 20px;
  border: 1px solid var(--fs-borde);
  border-radius: var(--fs-radio);
  background: var(--fs-blanco);
}

.pqrs__mapa { overflow: hidden; border-radius: 10px; min-height: 260px; background: var(--fs-arena); }
.pqrs__mapa iframe { width: 100%; height: 100%; min-height: 260px; border: 0; }
.pqrs__datos h2 { margin: 0 0 14px; font-size: 22px; font-weight: 600; }
.pqrs__datos ul { display: flex; flex-direction: column; gap: 10px; margin: 0 0 18px; padding: 0; list-style: none; font-size: 14px; }
.pqrs__datos li { display: flex; align-items: flex-start; gap: 10px; }
.pqrs__datos li svg { margin-top: 2px; flex-shrink: 0; color: var(--fs-pizarra); }
.pqrs__datos a { color: var(--fs-texto); }

.pqrs__llegar {
  display: inline-flex;
  padding: 10px 18px;
  border: 1px solid var(--fs-negro);
  border-radius: 8px;
  color: var(--fs-negro);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.pqrs__llegar:hover { background: var(--fs-negro); color: var(--fs-blanco); }

@media (max-width: 760px) {
  .pqrs__grid,
  .pqrs__ubicacion { grid-template-columns: 1fr; }
  .pqrs__consulta-cta { text-align: left; }
  .pqrs__boton { width: 100%; }
}
</style>
