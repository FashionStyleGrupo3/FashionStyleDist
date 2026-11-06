<script setup>
// RE014: bandeja de PQRS del formulario de contacto. La respuesta del personal
// queda en el historial y se envía al correo que registró el cliente.
import { computed, onMounted, ref } from 'vue';
import { Loader2, Mail, RefreshCw, Search, Send } from 'lucide-vue-next';
import clienteApi, { obtenerMensajeError } from '@/services/clienteApi';
import { extraerPaginado } from '@/utils/respuestaApi';
import { useNotificacion } from '@/composables/useNotificacion';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import PaginadorTabla from '@/components/comunes/PaginadorTabla.vue';

const { notificarError, notificarExito } = useNotificacion();

const ESTADOS = { nuevo: 'Nuevo', leido: 'Leído', respondido: 'Respondido' };
const ESTILO = {
  nuevo: 'bg-tienda-negro text-white',
  leido: 'bg-tienda-arena-suave text-tienda-pizarra',
  respondido: 'bg-emerald-50 text-emerald-700',
};
const TIPOS = {
  peticion: 'Petición', queja: 'Queja', reclamo: 'Reclamo',
  sugerencia: 'Sugerencia', felicitacion: 'Felicitación', consulta: 'Consulta',
};
const DOCUMENTOS = { CC: 'Cédula', CE: 'Cédula de extranjería', TI: 'Tarjeta de identidad', NIT: 'NIT', PP: 'Pasaporte' };

const mensajes = ref([]);
const nuevos = ref(0);
const estado = ref('');
const tipo = ref('');
const buscar = ref('');
const pagina = ref(1);
const totalPaginas = ref(1);
const totalRegistros = ref(0);
const cargando = ref(false);

const seleccionado = ref(null);
const respuesta = ref('');
const enviando = ref(false);

const puedeResponder = computed(() => respuesta.value.trim().length >= 5 && !enviando.value);

async function cargar() {
  cargando.value = true;
  try {
    const respuestaApi = await clienteApi.get('/mensajes-contacto', {
      params: { page: pagina.value, estado: estado.value || undefined, tipo: tipo.value || undefined, buscar: buscar.value.trim() || undefined },
    });
    const { lista, totalPaginas: paginas, totalRegistros: total } = extraerPaginado(respuestaApi);
    mensajes.value = lista;
    totalPaginas.value = paginas;
    totalRegistros.value = total;
    nuevos.value = Number(respuestaApi.data?.meta?.nuevos ?? 0);
    if (seleccionado.value) {
      const actualizado = lista.find((m) => m.id === seleccionado.value.id);
      if (actualizado) seleccionado.value = actualizado;
    }
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudieron cargar los mensajes.');
  } finally {
    cargando.value = false;
  }
}

async function cambiarEstado(mensaje, nuevoEstado) {
  try {
    await clienteApi.patch(`/mensajes-contacto/${mensaje.id}`, { estado: nuevoEstado });
    if (mensaje.estado === 'nuevo' && nuevoEstado !== 'nuevo') nuevos.value = Math.max(0, nuevos.value - 1);
    mensaje.estado = nuevoEstado;
  } catch (error) {
    notificarError(error.response?.data?.message || 'No se pudo actualizar el mensaje.');
  }
}

function abrir(mensaje) {
  seleccionado.value = mensaje;
  respuesta.value = '';
  if (mensaje.estado === 'nuevo') cambiarEstado(mensaje, 'leido');
}

async function responder() {
  const mensaje = seleccionado.value;
  if (!mensaje || !puedeResponder.value) return;

  enviando.value = true;
  try {
    const { data } = await clienteApi.post(`/mensajes-contacto/${mensaje.id}/responder`, { mensaje: respuesta.value.trim() });
    const actualizado = data?.data;
    if (actualizado) {
      Object.assign(mensaje, actualizado);
      seleccionado.value = mensaje;
    }
    respuesta.value = '';
    if (data?.meta?.correo_enviado) notificarExito(`Respuesta enviada a ${mensaje.correo}.`);
    else notificarError(data?.message || 'La respuesta se guardó, pero el correo no se pudo enviar.');
  } catch (error) {
    notificarError(obtenerMensajeError(error, 'No se pudo enviar la respuesta.'));
  } finally {
    enviando.value = false;
  }
}

function irAPagina(n) {
  pagina.value = n;
  cargar();
}

const fecha = (v) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

onMounted(cargar);
useRecargaAutomatica(cargar, { recursos: ['contacto', 'mensajes-contacto'] });
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Mensajes y PQRS</h1>
        <p class="text-sm text-tienda-gris">{{ nuevos }} sin leer · llegan desde la página Contacto de la tienda.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tienda-gris" />
          <input
            v-model="buscar"
            type="search"
            maxlength="80"
            placeholder="Radicado, nombre, correo o documento"
            class="w-64 rounded-lg border border-tienda-borde bg-white py-2 pl-9 pr-3 text-sm"
            @keyup.enter="irAPagina(1)"
          />
        </div>
        <select v-model="tipo" class="rounded-lg border border-tienda-borde bg-white px-3 py-2 text-sm" @change="irAPagina(1)">
          <option value="">Todos los tipos</option>
          <option v-for="(etiqueta, valor) in TIPOS" :key="valor" :value="valor">{{ etiqueta }}</option>
        </select>
        <select v-model="estado" class="rounded-lg border border-tienda-borde bg-white px-3 py-2 text-sm" @change="irAPagina(1)">
          <option value="">Todos los estados</option>
          <option value="nuevo">Nuevos</option>
          <option value="leido">Leídos</option>
          <option value="respondido">Respondidos</option>
        </select>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-tienda-borde bg-white px-3 py-2 text-sm font-semibold" :disabled="cargando" @click="cargar">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': cargando }" /> Actualizar
        </button>
      </div>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section class="overflow-hidden rounded-2xl border border-tienda-borde bg-white">
        <p v-if="cargando && !mensajes.length" class="p-8 text-center text-sm text-tienda-gris">Cargando mensajes...</p>
        <p v-else-if="!mensajes.length" class="p-8 text-center text-sm text-tienda-gris">No hay mensajes para mostrar.</p>
        <ul v-else class="divide-y divide-tienda-borde">
          <li v-for="m in mensajes" :key="m.id">
            <button
              type="button"
              class="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-tienda-crema"
              :class="{ 'bg-tienda-arena-suave': seleccionado?.id === m.id }"
              @click="abrir(m)"
            >
              <Mail class="mt-0.5 h-4 w-4 shrink-0 text-tienda-pizarra" />
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <strong class="text-sm" :class="m.estado === 'nuevo' ? 'text-tienda-negro' : 'font-medium text-tienda-texto'">
                    {{ TIPOS[m.tipo_comunicacion] || 'Mensaje' }} · {{ m.radicado }}
                  </strong>
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="ESTILO[m.estado]">{{ ESTADOS[m.estado] || m.estado }}</span>
                </span>
                <span class="block truncate text-xs text-tienda-gris">{{ m.nombre_completo || m.nombre }} · {{ m.correo }}</span>
                <span class="block truncate text-xs text-tienda-gris">{{ m.mensaje }}</span>
                <span class="block text-[11px] text-tienda-gris">{{ fecha(m.created_at) }}</span>
              </span>
            </button>
          </li>
        </ul>
        <PaginadorTabla v-if="totalPaginas > 1" :pagina-actual="pagina" :total-paginas="totalPaginas" :total-registros="totalRegistros" @cambiar-pagina="irAPagina" />
      </section>

      <section class="rounded-2xl border border-tienda-borde bg-white p-5">
        <p v-if="!seleccionado" class="py-16 text-center text-sm text-tienda-gris">Selecciona un mensaje para ver el detalle y responder.</p>
        <template v-else>
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-tienda-gris">{{ TIPOS[seleccionado.tipo_comunicacion] || 'Mensaje' }}</p>
              <h2 class="text-lg font-semibold">{{ seleccionado.radicado }}</h2>
            </div>
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="ESTILO[seleccionado.estado]">{{ ESTADOS[seleccionado.estado] }}</span>
          </div>

          <dl class="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt class="text-xs text-tienda-gris">Nombre</dt><dd>{{ seleccionado.nombre_completo }}</dd></div>
            <div><dt class="text-xs text-tienda-gris">Correo</dt><dd class="break-all">{{ seleccionado.correo }}</dd></div>
            <div><dt class="text-xs text-tienda-gris">Documento</dt><dd>{{ DOCUMENTOS[seleccionado.tipo_documento] || seleccionado.tipo_documento }} {{ seleccionado.numero_documento }}</dd></div>
            <div><dt class="text-xs text-tienda-gris">Ubicación</dt><dd>{{ [seleccionado.ciudad, seleccionado.pais].filter(Boolean).join(', ') }}</dd></div>
            <div><dt class="text-xs text-tienda-gris">Móvil</dt><dd>{{ seleccionado.telefono || '—' }}</dd></div>
            <div><dt class="text-xs text-tienda-gris">Teléfono fijo</dt><dd>{{ seleccionado.telefono_fijo || '—' }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-xs text-tienda-gris">Recibido</dt><dd>{{ fecha(seleccionado.created_at) }}</dd></div>
          </dl>

          <p class="mt-4 whitespace-pre-line rounded-xl bg-tienda-crema p-4 text-sm text-tienda-texto">{{ seleccionado.mensaje }}</p>

          <div v-if="seleccionado.respuestas?.length" class="mt-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-tienda-gris">Respuestas enviadas</p>
            <article v-for="r in seleccionado.respuestas" :key="r.id" class="border-l-4 border-tienda-negro bg-white pl-3 text-sm">
              <p class="text-xs text-tienda-gris">
                {{ r.usuario?.nombre || 'Equipo FashionStyle' }} · {{ fecha(r.created_at) }}
                <span v-if="r.correo_enviado_at" class="text-emerald-700">· enviada por correo</span>
                <span v-else class="text-tienda-rojo">· correo no enviado</span>
              </p>
              <p class="mt-1 whitespace-pre-line">{{ r.mensaje }}</p>
            </article>
          </div>

          <form class="mt-5 space-y-2" @submit.prevent="responder">
            <label for="respuesta-contacto" class="text-sm font-semibold">Responder a {{ seleccionado.correo }}</label>
            <textarea
              id="respuesta-contacto"
              v-model="respuesta"
              rows="5"
              maxlength="5000"
              placeholder="Escribe la respuesta. Se enviará al correo del cliente y quedará en el historial."
              class="w-full rounded-xl border border-tienda-borde bg-white p-3 text-sm focus:border-tienda-negro focus:outline-none"
            ></textarea>
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-tienda-gris">{{ respuesta.length }}/5000</span>
              <button type="submit" class="inline-flex items-center gap-2 rounded-lg bg-tienda-negro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="!puedeResponder">
                <Loader2 v-if="enviando" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                Enviar respuesta
              </button>
            </div>
          </form>
        </template>
      </section>
    </div>
  </div>
</template>
