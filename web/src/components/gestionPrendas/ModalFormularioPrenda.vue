<script setup>
import { ref, watch } from 'vue';
import { filtrarCampoPrenda, filtrarPrecio, filtrarStock } from '@/utils/validacionPrenda';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  modo: {
    type: String,
    default: 'crear'
  },
  formulario: {
    type: Object,
    default: () => ({})
  },
  categorias: {
    type: Array,
    default: () => []
  },
  catalogos: {
    type: Array,
    default: () => []
  },
  permitirCrearOpciones: {
    type: Boolean,
    default: false
  },
  creandoCategoria: {
    type: Boolean,
    default: false
  },
  creandoCatalogo: {
    type: Boolean,
    default: false
  },
  variantes: {
    type: Array,
    default: () => []
  },
  imagenes: {
    type: Array,
    default: () => []
  },
  errorImagenes: {
    type: String,
    default: ''
  },
  errorOpcionesFormulario: {
    type: String,
    default: ''
  },
  errorFormulario: {
    type: String,
    default: ''
  },
  guardando: {
    type: Boolean,
    default: false
  },
  reintentandoImagenes: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'close', 'drop-archivos', 'select-archivos', 'marcar-portada', 'quitar-imagen',
  'agregar-variante', 'quitar-variante', 'guardar', 'refresh-categorias',
  'update:formulario', 'crear-categoria', 'crear-catalogo', 'reintentar-imagenes'
]);

const opcionEnCreacion = ref('');
const nombreOpcionNueva = ref('');
const inputArchivos = ref(null);

function updateForm(field, value, input) {
  const camposFiltrados = ['nombre', 'descripcion', 'color'];
  const valorFiltrado = camposFiltrados.includes(field)
    ? filtrarCampoPrenda(field, value)
    : value;

  if (input && input.value !== valorFiltrado) input.value = valorFiltrado;

  emit('update:formulario', {
    ...props.formulario,
    [field]: valorFiltrado
  });
}

function updateVariantNumber(variante, field, event) {
  const value = field === 'precio'
    ? filtrarPrecio(event.target.value)
    : filtrarStock(event.target.value);
  variante[field] = value;
  if (event.target.value !== value) event.target.value = value;
}

function updateVariantText(variante, field, event) {
  const value = filtrarCampoPrenda(field, event.target.value);
  variante[field] = value;
  if (event.target.value !== value) event.target.value = value;
}

function updateNombreOpcionNueva(event) {
  const value = filtrarCampoPrenda('opcion', event.target.value);
  nombreOpcionNueva.value = value;
  if (event.target.value !== value) event.target.value = value;
}

function cambiarOpcion(tipo, event) {
  const valor = event.target.value;
  const opcionNueva = tipo === 'categoria'
    ? '__nueva_categoria__'
    : '__nuevo_catalogo__';

  if (valor === opcionNueva) {
    opcionEnCreacion.value = tipo;
    nombreOpcionNueva.value = '';
    return;
  }

  updateForm(
    tipo === 'categoria' ? 'categoria_id' : 'catalogo_id',
    valor
  );
}

function cancelarCreacion() {
  opcionEnCreacion.value = '';
  nombreOpcionNueva.value = '';
}

watch(() => props.formulario.categoria_id, (valor, anterior) => {
  if (
    opcionEnCreacion.value === 'categoria' &&
    valor &&
    valor !== anterior
  ) cancelarCreacion();
});

watch(() => props.formulario.catalogo_id, (valor, anterior) => {
  if (
    opcionEnCreacion.value === 'catalogo' &&
    valor &&
    valor !== anterior
  ) cancelarCreacion();
});
</script>

<template>
  <div
    v-if="visible"
    role="dialog"
    aria-modal="true"
    aria-labelledby="titulo-formulario-prenda"
    class="fixed inset-0 z-50 overflow-y-auto overscroll-contain
           bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4"
  >
    <div
      class="mx-auto my-2 w-full max-w-6xl min-w-0
             overflow-hidden rounded-2xl bg-white shadow-2xl
             sm:my-4 sm:rounded-3xl"
    >
      <!-- Cabecera -->
      <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
        <h2 id="titulo-formulario-prenda" class="min-w-0 break-words text-xl font-bold text-slate-900 sm:text-2xl">
          {{ modo === 'crear' ? 'Nueva prenda' : 'Editar prenda' }}
        </h2>

        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                 bg-slate-100 text-lg text-slate-500 transition
                 hover:bg-slate-200 hover:text-slate-700
                 disabled:opacity-50"
          aria-label="Cerrar formulario de prenda"
          :disabled="guardando"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Contenido -->
      <div class="grid min-w-0 grid-cols-1 gap-4 p-3 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">

        <!-- Fotografás -->
        <div class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <section class="space-y-4">
            <h3 class="text-lg font-bold text-slate-900">
              Fotografás
            </h3>

            <div
              class="rounded-2xl border-2 border-dashed border-slate-300
                     bg-white p-4 text-center sm:p-5"
              @dragover.prevent
              @drop.prevent="emit('drop-archivos', $event.dataTransfer.files)"
            >
              <p class="text-sm leading-6 text-slate-500">
                Arrastra las fotos aquí o seleccionalas. Máximo 4 MB cada una.
              </p>

              <button
                type="button"
                class="mt-4 rounded-xl bg-slate-900 px-4 py-2.5
                       text-sm font-semibold text-white transition hover:bg-slate-800"
                @click="inputArchivos?.click()"
              >
                Elegir fotografás
              </button>
            </div>

            <input
              ref="inputArchivos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              @change="emit('select-archivos', $event)"
            />

            <p
              v-if="errorImagenes"
              class="break-words rounded-xl border border-red-200
                     bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {{ errorImagenes }}
            </p>

            <div class="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <figure
                v-for="(imagen, indice) in imagenes"
                :key="imagen.vista || indice"
                class="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <img
                  :src="imagen.vista"
                  :alt="imagen.archivo?.name || 'Foto de la prenda'"
                  class="h-36 w-full bg-slate-100 object-cover sm:h-40"
                />

                <figcaption class="flex flex-wrap gap-2 p-3">
                  <span
                    v-if="imagen.portada"
                    class="rounded-full bg-pink-50 px-2 py-1
                           text-[10px] font-semibold uppercase
                           tracking-[0.18em] text-pink-700"
                  >
                    Portada
                  </span>

                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2 py-1.5
                           text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    @click="emit('marcar-portada', indice)"
                  >
                    Elegir portada
                  </button>

                  <button
                    type="button"
                    class="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5
                           text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    @click="emit('quitar-imagen', indice)"
                  >
                    Quitar
                  </button>
                </figcaption>
              </figure>
            </div>
          </section>
        </div>

        <!-- Formulario -->
        <div class="min-w-0 space-y-5">
          <p
            v-if="errorOpcionesFormulario"
            class="break-words rounded-xl border border-red-200
                   bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {{ errorOpcionesFormulario }}
            <button
              type="button"
              class="ml-2 font-semibold underline"
              @click="emit('refresh-categorias')"
            >
              Reintentar
            </button>
          </p>

          <!-- Nombre -->
          <div>
            <label for="eNombre" class="mb-2 block text-sm font-semibold text-slate-700">
              Nombre
            </label>

              <input
                id="eNombre"
                :value="formulario.nombre"
                type="text"
                maxlength="60"
                class="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-800 outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                placeholder="Nombre del producto"
                @input="updateForm('nombre', $event.target.value, $event.target)"
              />
            <p class="mt-1 text-xs text-slate-500">Máximo 60 caracteres.</p>
          </div>

          <!-- Descripcion -->
          <div>
            <label for="eDescripcion" class="mb-2 block text-sm font-semibold text-slate-700">
              Descripcion
            </label>

            <textarea
              id="eDescripcion"
              :value="formulario.descripcion"
              rows="4"
              maxlength="500"
              class="w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-800 outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
              @input="updateForm('descripcion', $event.target.value, $event.target)"
            />
            <p class="mt-1 text-xs text-slate-500">Máximo 500 caracteres.</p>
          </div>

          <!-- Color y categoría -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="min-w-0">
              <label for="eColor" class="mb-2 block text-sm font-semibold text-slate-700">
                Color
              </label>

              <input
                id="eColor"
                :value="formulario.color"
                type="text"
                maxlength="30"
                class="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-800 outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                placeholder="Ej: Negro"
                @input="updateForm('color', $event.target.value, $event.target)"
              />
              <p class="mt-1 text-xs text-slate-500">Máximo 30 caracteres.</p>
            </div>

            <div class="min-w-0">
              <label for="eCategoria" class="mb-2 block text-sm font-semibold text-slate-700">
                Categoría
              </label>

              <select
                id="eCategoria"
                :value="formulario.categoria_id"
                class="w-full min-w-0 rounded-xl border border-slate-200
                       bg-white px-3 py-3 text-base text-slate-800
                       outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                @change="cambiarOpcion('categoria', $event)"
              >
                <option value="">Seleccionar categoría</option>
                <option
                  v-for="categoria in categorias"
                  :key="categoria.id_categoria"
                  :value="String(categoria.id_categoria)"
                >
                  {{ categoria.nombre }}
                </option>
                <option v-if="permitirCrearOpciones" value="__nueva_categoria__">
                  + Agregar nueva categoría
                </option>
              </select>

              <div v-if="opcionEnCreacion === 'categoria'" class="mt-2 space-y-2">
                <input
                  :value="nombreOpcionNueva"
                  type="text"
                  maxlength="40"
                  class="w-full min-w-0 rounded-lg border border-slate-200
                         px-3 py-2.5 text-base outline-none
                         focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  placeholder="Nombre de la categoría"
                  aria-label="Nombre de la nueva categoría"
                  @input="updateNombreOpcionNueva($event)"
                  @keydown.enter.prevent="emit('crear-categoria', nombreOpcionNueva.trim())"
                />
                <p class="text-xs text-slate-500">Máximo 40 caracteres.</p>

                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="flex-1 rounded-lg bg-pink-600 px-3 py-2.5
                           text-sm font-semibold text-white disabled:opacity-50"
                    :disabled="creandoCategoria || !nombreOpcionNueva.trim()"
                    @click="emit('crear-categoria', nombreOpcionNueva.trim())"
                  >
                    {{ creandoCategoria ? 'Guardando...' : 'Agregar' }}
                  </button>

                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2.5
                           text-sm font-semibold text-slate-600"
                    :disabled="creandoCategoria"
                    @click="cancelarCreacion"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- coleccion -->
          <div>
            <label for="eColeccion" class="mb-2 block text-sm font-semibold text-slate-700">
              coleccion / temporada
            </label>

            <select
              id="eColeccion"
              :value="formulario.catalogo_id"
              class="w-full min-w-0 rounded-xl border border-slate-200
                     bg-white px-3 py-3 text-base text-slate-800
                     outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
              @change="cambiarOpcion('catalogo', $event)"
            >
              <option value="">Seleccionar colección</option>
              <option
                v-for="catalogo in catalogos"
                :key="catalogo.id_catalogo"
                :value="String(catalogo.id_catalogo)"
              >
                {{ catalogo.nombre }}
              </option>
              <option v-if="permitirCrearOpciones" value="__nuevo_catalogo__">
                + Agregar nuevo catálogo
              </option>
            </select>

            <div v-if="opcionEnCreacion === 'catalogo'" class="mt-2 space-y-2">
              <input
                :value="nombreOpcionNueva"
                type="text"
                maxlength="40"
                class="w-full min-w-0 rounded-lg border border-slate-200
                       px-3 py-2.5 text-base outline-none
                       focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                placeholder="Nombre del catálogo"
                aria-label="Nombre del nuevo catálogo"
                @input="updateNombreOpcionNueva($event)"
                @keydown.enter.prevent="emit('crear-catalogo', nombreOpcionNueva.trim())"
              />
              <p class="text-xs text-slate-500">Máximo 40 caracteres.</p>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-lg bg-pink-600 px-3 py-2.5
                         text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="creandoCatalogo || !nombreOpcionNueva.trim()"
                  @click="emit('crear-catalogo', nombreOpcionNueva.trim())"
                >
                  {{ creandoCatalogo ? 'Guardando...' : 'Agregar' }}
                </button>

                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-2.5
                         text-sm font-semibold text-slate-600"
                  :disabled="creandoCatalogo"
                  @click="cancelarCreacion"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          <!-- Variantes -->
          <section class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <h3 class="mb-4 text-lg font-bold text-slate-900">
              Variantes de la prenda
            </h3>

            <div class="overflow-x-auto">
              <table class="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-500">
                    <th class="pb-3 pr-2 font-semibold">Talla</th>
                    <th class="pb-3 pr-2 font-semibold">SKU</th>
                    <th class="pb-3 pr-2 font-semibold">Precio</th>
                    <th class="pb-3 pr-2 font-semibold">
                      {{ modo === 'crear' ? 'Stock inicial' : 'Stock actual' }}
                    </th>
                    <th class="pb-3 font-semibold">accion</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="(variante, indice) in variantes"
                    :key="indice"
                    class="border-b border-slate-200 last:border-0"
                  >
                    <td class="py-2 pr-2">
                        <input
                          :value="variante.talla"
                          maxlength="20"
                          aria-label="Talla"
                          class="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                          placeholder="Ej: M o Extra Grande"
                          @input="updateVariantText(variante, 'talla', $event)"
                        />
                    </td>

                    <td class="py-2 pr-2">
                        <input
                          :value="variante.sku"
                          maxlength="24"
                          aria-label="SKU"
                          class="w-32 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                          placeholder="Ej: CAM-M-NEG"
                          @input="updateVariantText(variante, 'sku', $event)"
                        />
                    </td>

                    <td class="py-2 pr-2">
                        <input
                          :value="variante.precio"
                          type="text"
                          maxlength="13"
                          inputmode="decimal"
                          aria-label="Precio"
                          class="w-24 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                          @input="updateVariantNumber(variante, 'precio', $event)"
                        />
                    </td>

                    <td class="py-2 pr-2">
                        <input
                          :value="variante.stockInicial"
                          type="text"
                          maxlength="10"
                          inputmode="numeric"
                          aria-label="Stock"
                          class="w-24 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                          @input="updateVariantNumber(variante, 'stockInicial', $event)"
                        />
                    </td>

                    <td class="py-2">
                      <button
                        type="button"
                        class="whitespace-nowrap rounded-lg border border-red-200
                               bg-red-50 px-2 py-2 text-xs font-semibold
                               text-red-600 transition hover:bg-red-100"
                        @click="emit('quitar-variante', indice)"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              type="button"
              class="mt-4 inline-flex w-full items-center justify-center gap-2
                     rounded-xl border border-pink-200 bg-pink-50 px-3 py-3
                     text-sm font-semibold text-pink-700 transition hover:bg-pink-100
                     sm:w-auto"
              @click="emit('agregar-variante')"
            >
              <span class="text-lg">+</span>
              Agregar talla / variante
            </button>
          </section>
        </div>
      </div>

      <!-- Pie del modal -->
      <div class="border-t border-slate-200 bg-white px-3 py-4 sm:px-6">
        <p
          v-if="errorFormulario"
          class="mb-4 break-words rounded-xl border border-red-200
                 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {{ errorFormulario }}
        </p>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2
                   rounded-xl border border-slate-200 bg-white px-4 py-3
                   text-sm font-semibold text-slate-700 transition hover:bg-slate-50
                   disabled:opacity-50 sm:w-auto"
            :disabled="guardando"
            @click="emit('close')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cancelar
          </button>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2
                   rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold
                   text-white transition hover:bg-pink-500
                   disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            :disabled="guardando"
            @click="emit(reintentandoImagenes ? 'reintentar-imagenes' : 'guardar')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>

            {{
              guardando
                ? 'Guardando...'
                : reintentandoImagenes
                  ? 'Reintentar imágenes'
                  : modo === 'crear'
                    ? 'Crear prenda'
                    : 'Guardar cambios'
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>