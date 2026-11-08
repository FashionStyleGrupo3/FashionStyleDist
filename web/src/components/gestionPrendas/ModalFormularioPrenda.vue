<script setup>
import { ref, watch } from 'vue';
import {
  X,
  UploadCloud,
  Save,
  Plus,
  Trash2,
  Star,
  Palette,
  Layers,
  Globe,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Shirt
} from 'lucide-vue-next';
import { filtrarCampoPrenda, filtrarPrecio, filtrarStock } from '@/utils/validacionPrenda';
import { fondoMuestra, hexDeColor } from '@/utils/coloresPrenda';

const COLORES_SUGERIDOS = [
  'Negro', 'Blanco', 'Marfil', 'Beige', 'Camel', 'Café', 'Gris',
  'Azul marino', 'Azul', 'Celeste', 'Verde oliva', 'Vinotinto',
  'Rojo', 'Rosado', 'Mostaza', 'Negro y blanco'
];

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
</script>

<template>
  <div
    v-if="visible"
    role="dialog"
    aria-modal="true"
    aria-labelledby="titulo-formulario-prenda"
    class="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center animate-fadeIn"
    @click.self="emit('close')"
  >
    <div
      class="relative mx-auto my-4 w-full max-w-5xl min-w-0 overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 transition-all"
    >
      <!-- Cabecera del Modal -->
      <div class="flex items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-pink-50/40 via-white to-gray-50/40 px-6 py-5">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-corporativo-rosa shadow-sm ring-1 ring-pink-500/20">
            <Shirt class="h-6 w-6" />
          </div>
          <div>
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-corporativo-rosa">
              Gestión de Colección
            </span>
            <h2 id="titulo-formulario-prenda" class="text-xl sm:text-2xl font-black font-titulos text-gray-900 tracking-tight">
              {{ modo === 'crear' ? 'Nueva Prenda de Catálogo' : 'Editar Información de Prenda' }}
            </h2>
          </div>
        </div>

        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 disabled:opacity-50"
          aria-label="Cerrar formulario de prenda"
          :disabled="guardando"
          @click="emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Contenido en Dos Columnas -->
      <div class="grid min-w-0 grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)] max-h-[75vh] overflow-y-auto">
        <!-- Columna 1: Fotografías y Galería -->
        <div class="min-w-0 rounded-2xl border border-gray-200/90 bg-gray-50/60 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black uppercase tracking-wider text-gray-800">
              Galería de Fotos
            </h3>
            <span class="text-xs text-gray-400 font-semibold">
              {{ imagenes.length }} de 9 fotos
            </span>
          </div>

          <!-- Dropzone para arrastrar o subir fotos -->
          <div
            class="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-center transition hover:border-corporativo-rosa hover:bg-pink-50/20 cursor-pointer"
            @dragover.prevent
            @drop.prevent="emit('drop-archivos', $event.dataTransfer.files)"
            @click="inputArchivos?.click()"
          >
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-corporativo-rosa mb-2">
              <UploadCloud class="h-6 w-6" />
            </div>
            <p class="text-xs font-bold text-gray-800">
              Arrastra las fotos aquí o haz clic para subir
            </p>
            <p class="text-[11px] text-gray-400 mt-1">
              JPG, PNG o WEBP · Máximo 4 MB cada una
            </p>
          </div>

          <input
            ref="inputArchivos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            @change="emit('select-archivos', $event)"
          />

          <!-- Alerta de Error en Imágenes -->
          <div
            v-if="errorImagenes"
            class="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 flex items-start gap-2"
            role="alert"
          >
            <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
            <span>{{ errorImagenes }}</span>
          </div>

          <!-- Galería de Fotos Subidas -->
          <div v-if="imagenes.length" class="grid grid-cols-2 gap-3 pt-1">
            <figure
              v-for="(imagen, indice) in imagenes"
              :key="imagen.vista || indice"
              class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs"
            >
              <img
                :src="imagen.vista"
                :alt="imagen.archivo?.name || 'Foto de la prenda'"
                class="h-32 w-full object-cover bg-gray-100 transition-transform duration-300 group-hover:scale-105"
              />

              <!-- Badge de Portada -->
              <div
                v-if="imagen.portada"
                class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-corporativo-rosa px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm"
              >
                <Star class="h-2.5 w-2.5 fill-white" />
                <span>Portada</span>
              </div>

              <!-- Acciones de la Imagen -->
              <figcaption class="flex items-center justify-between p-2 bg-white/95 border-t border-gray-100">
                <button
                  v-if="!imagen.portada"
                  type="button"
                  class="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition"
                  @click="emit('marcar-portada', indice)"
                >
                  Portada
                </button>
                <span v-else class="text-[10px] font-bold text-corporativo-rosa">Principal</span>

                <button
                  type="button"
                  class="rounded-lg p-1 text-red-600 hover:bg-red-50 transition"
                  title="Eliminar foto"
                  @click="emit('quitar-imagen', indice)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </figcaption>
            </figure>
          </div>
        </div>

        <!-- Columna 2: Datos Generales, Publicación y Variantes -->
        <div class="min-w-0 space-y-5">
          <!-- Alerta de opciones del formulario -->
          <div
            v-if="errorOpcionesFormulario"
            class="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 flex items-center justify-between"
            role="alert"
          >
            <span>{{ errorOpcionesFormulario }}</span>
            <button
              type="button"
              class="font-bold underline hover:text-red-900 ml-2"
              @click="emit('refresh-categorias')"
            >
              Reintentar
            </button>
          </div>

          <!-- Campo Nombre -->
          <div>
            <label for="eNombre" class="mb-1 block text-xs font-black uppercase tracking-wider text-gray-700">
              Nombre de la Prenda
            </label>
            <input
              id="eNombre"
              :value="formulario.nombre"
              type="text"
              maxlength="60"
              class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
              placeholder="Ej: Vestido Midi Floral de Seda"
              @input="updateForm('nombre', $event.target.value, $event.target)"
            />
            <p class="mt-1 text-[11px] text-gray-400">Máximo 60 caracteres.</p>
          </div>

          <!-- Campo Descripción -->
          <div>
            <label for="eDescripcion" class="mb-1 block text-xs font-black uppercase tracking-wider text-gray-700">
              Descripción y Detalles
            </label>
            <textarea
              id="eDescripcion"
              :value="formulario.descripcion"
              rows="3"
              maxlength="500"
              class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition resize-y"
              placeholder="Detalles sobre tela, corte, ocasión de uso y cuidados..."
              @input="updateForm('descripcion', $event.target.value, $event.target)"
            />
            <p class="mt-1 text-[11px] text-gray-400">Máximo 500 caracteres.</p>
          </div>

          <!-- Color y Categoría en Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Selector de Color con Swatch y Chips Rápidos -->
            <div>
              <label for="eColor" class="mb-1 block text-xs font-black uppercase tracking-wider text-gray-700">
                Color Principal
              </label>
              <div class="flex items-center gap-2">
                <span
                  class="h-9 w-9 shrink-0 rounded-full border border-gray-300 shadow-inner"
                  :style="{ background: fondoMuestra(formulario.color) }"
                  :title="hexDeColor(formulario.color) ? 'Muestra del color' : 'Tono neutro'"
                ></span>
                <input
                  id="eColor"
                  :value="formulario.color"
                  type="text"
                  maxlength="30"
                  list="colores-sugeridos"
                  class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
                  placeholder="Ej: Negro, Marfil, Vinotinto"
                  @input="updateForm('color', $event.target.value, $event.target)"
                />
                <datalist id="colores-sugeridos">
                  <option v-for="c in COLORES_SUGERIDOS" :key="c" :value="c" />
                </datalist>
              </div>
            </div>

            <!-- Selector de Categoría -->
            <div>
              <label for="eCategoria" class="mb-1 block text-xs font-black uppercase tracking-wider text-gray-700">
                Categoría
              </label>
              <select
                id="eCategoria"
                :value="formulario.categoria_id"
                class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
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

              <!-- Creación Rápida de Categoría -->
              <div v-if="opcionEnCreacion === 'categoria'" class="mt-2 space-y-2 rounded-xl bg-pink-50/50 p-2.5 border border-pink-100">
                <input
                  :value="nombreOpcionNueva"
                  type="text"
                  maxlength="40"
                  class="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-corporativo-rosa focus:outline-none"
                  placeholder="Nombre de la nueva categoría"
                  @input="updateNombreOpcionNueva($event)"
                  @keydown.enter.prevent="emit('crear-categoria', nombreOpcionNueva.trim())"
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-lg bg-corporativo-rosa px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    :disabled="creandoCategoria || !nombreOpcionNueva.trim()"
                    @click="emit('crear-categoria', nombreOpcionNueva.trim())"
                  >
                    {{ creandoCategoria ? 'Guardando...' : 'Agregar' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    @click="cancelarCreacion"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Colección / Temporada -->
          <div>
            <label for="eColeccion" class="mb-1 block text-xs font-black uppercase tracking-wider text-gray-700">
              Colección o Temporada
            </label>
            <select
              id="eColeccion"
              :value="formulario.catalogo_id"
              class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
              @change="cambiarOpcion('catalogo', $event)"
            >
              <option value="">Seleccionar colección (opcional)</option>
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

            <!-- Creación Rápida de Colección -->
            <div v-if="opcionEnCreacion === 'catalogo'" class="mt-2 space-y-2 rounded-xl bg-pink-50/50 p-2.5 border border-pink-100">
              <input
                :value="nombreOpcionNueva"
                type="text"
                maxlength="40"
                class="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-corporativo-rosa focus:outline-none"
                placeholder="Nombre del nuevo catálogo"
                @input="updateNombreOpcionNueva($event)"
                @keydown.enter.prevent="emit('crear-catalogo', nombreOpcionNueva.trim())"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-corporativo-rosa px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  :disabled="creandoCatalogo || !nombreOpcionNueva.trim()"
                  @click="emit('crear-catalogo', nombreOpcionNueva.trim())"
                >
                  {{ creandoCatalogo ? 'Guardando...' : 'Agregar' }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  @click="cancelarCreacion"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          <!-- Switch Destacado de Publicación en Tienda -->
          <div
            class="rounded-2xl border p-4 transition-colors"
            :class="formulario.publicado ? 'border-pink-200 bg-pink-50/40' : 'border-gray-200 bg-gray-50/60'"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <label for="ePublicado" class="text-sm font-black text-gray-900 cursor-pointer flex items-center gap-2">
                  <span>Publicar en la tienda online</span>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                    :class="formulario.publicado ? 'bg-pink-100 text-corporativo-rosa border border-pink-200' : 'bg-gray-200 text-gray-600'"
                  >
                    {{ formulario.publicado ? 'Público en tienda' : 'Borrador / Oculto' }}
                  </span>
                </label>
                <p class="text-xs text-gray-500 mt-1 leading-relaxed">
                  {{ formulario.publicado
                    ? 'La prenda será visible para todos los clientes en el escaparate y catálogo online.'
                    : 'La prenda se guardará como borrador y NO será visible para los clientes hasta que el administrador decida publicarla.'
                  }}
                </p>
              </div>

              <label class="relative inline-flex h-6 w-11 cursor-pointer items-center shrink-0">
                <input
                  id="ePublicado"
                  type="checkbox"
                  :checked="Boolean(formulario.publicado)"
                  class="peer sr-only"
                  @change="updateForm('publicado', $event.target.checked)"
                />
                <span
                  class="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-corporativo-rosa peer-focus-visible:ring-2 peer-focus-visible:ring-corporativo-rosa"
                  aria-hidden="true"
                ></span>
                <span
                  class="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5"
                  aria-hidden="true"
                ></span>
              </label>
            </div>
          </div>

          <!-- Sección de Variantes y Tallas -->
          <section class="rounded-2xl border border-gray-200/90 bg-gray-50/60 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-black uppercase tracking-wider text-gray-800">
                  Tallas y Precios de Venta
                </h3>
                <p class="text-xs text-gray-500">Configura SKU, tallas disponibles y precios.</p>
              </div>
              <span class="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-bold text-pink-700">
                {{ variantes.length }} tallas
              </span>
            </div>

            <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table class="w-full min-w-[520px] text-left text-xs">
                <thead class="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <tr>
                    <th class="px-3 py-2.5">Talla</th>
                    <th class="px-3 py-2.5">SKU Único</th>
                    <th class="px-3 py-2.5">Precio Venta ($)</th>
                    <th class="px-3 py-2.5">
                      {{ modo === 'crear' ? 'Stock Inicial' : 'Stock Actual' }}
                    </th>
                    <th class="px-3 py-2.5 text-right">Acción</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="(variante, indice) in variantes"
                    :key="indice"
                    class="hover:bg-gray-50/50 transition"
                  >
                    <!-- Talla -->
                    <td class="px-3 py-2">
                      <input
                        :value="variante.talla"
                        type="text"
                        maxlength="10"
                        class="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-800 uppercase focus:border-corporativo-rosa focus:outline-none"
                        placeholder="S, M, L"
                        @input="updateVariantText(variante, 'talla', $event)"
                      />
                    </td>

                    <!-- SKU -->
                    <td class="px-3 py-2">
                      <input
                        :value="variante.sku"
                        type="text"
                        maxlength="30"
                        class="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-mono text-gray-700 uppercase focus:border-corporativo-rosa focus:outline-none"
                        placeholder="SKU-PRENDA"
                        @input="updateVariantText(variante, 'sku', $event)"
                      />
                    </td>

                    <!-- Precio -->
                    <td class="px-3 py-2">
                      <input
                        :value="variante.precio"
                        type="text"
                        maxlength="12"
                        inputmode="numeric"
                        class="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold text-corporativo-rosa focus:border-corporativo-rosa focus:outline-none"
                        placeholder="65000"
                        @input="updateVariantNumber(variante, 'precio', $event)"
                      />
                    </td>

                    <!-- Stock Inicial / Actual -->
                    <td class="px-3 py-2">
                      <input
                        :value="variante.stockInicial"
                        type="text"
                        maxlength="10"
                        inputmode="numeric"
                        class="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-800 focus:border-corporativo-rosa focus:outline-none"
                        placeholder="10"
                        @input="updateVariantNumber(variante, 'stockInicial', $event)"
                      />
                    </td>

                    <!-- Botón Quitar -->
                    <td class="px-3 py-2 text-right">
                      <button
                        type="button"
                        class="rounded-lg p-1 text-red-600 hover:bg-red-50 transition"
                        title="Quitar variante"
                        @click="emit('quitar-variante', indice)"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-bold text-corporativo-rosa hover:bg-pink-100 transition"
              @click="emit('agregar-variante')"
            >
              <Plus class="h-4 w-4" />
              <span>Agregar Talla / Variante</span>
            </button>
          </section>
        </div>
      </div>

      <!-- Pie del Modal -->
      <div class="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Error del formulario -->
        <div v-if="errorFormulario" class="flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-100 w-full sm:w-auto">
          <AlertCircle class="h-4 w-4 shrink-0 text-red-600" />
          <span>{{ errorFormulario }}</span>
        </div>
        <div v-else></div>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            class="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            :disabled="guardando"
            @click="emit('close')"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-pink-500/20 hover:opacity-95 disabled:opacity-50 transition"
            :disabled="guardando"
            @click="emit(reintentandoImagenes ? 'reintentar-imagenes' : 'guardar')"
          >
            <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            <span>
              {{
                guardando
                  ? 'Guardando prenda...'
                  : reintentandoImagenes
                    ? 'Reintentar imágenes'
                    : modo === 'crear'
                      ? 'Crear Prenda'
                      : 'Guardar Cambios'
              }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
