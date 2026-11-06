<script setup>
// Zona para subir y administrar fotos de la prenda (drag & drop o selector de archivos)
import { ref } from 'vue';

// Lista de imágenes vinculada bidireccionalmente con el formulario padre
const imagenes = defineModel({
  default: () => []
});

// Emite el identificador de una foto que fue eliminada por el usuario
const emit = defineEmits(['imagen-eliminada']);

// Referencia al input file invisible
const inputArchivos = ref(null);
const error = ref('');
const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
const tamanoMaximo = 4 * 1024 * 1024; // 4 MB
const limiteImagenes = 9;

// Abre la ventana de exploracion de archivos de la computadora
function abrirSelector() {
  inputArchivos.value?.click();
}

// Lee los archivos seleccionados y genera previsualizaciones locales en blob
function agregarArchivos(archivos) {
  error.value = '';
  const seleccionados = Array.from(archivos);
  const validos = seleccionados.filter(archivo =>
    tiposPermitidos.includes(archivo.type) &&
    archivo.size > 0 &&
    archivo.size <= tamanoMaximo
  );
  const espacioDisponible = Math.max(0, limiteImagenes - imagenes.value.length);
  const aceptados = validos.slice(0, espacioDisponible);

  if (aceptados.length < seleccionados.length) {
    error.value = `Usa imágenes JPG, PNG o WEBP de máximo 4 MB y no superes ${limiteImagenes} fotos por prenda.`;
  }

  const necesitaPortada = !imagenes.value.some(img => img.portada);

  const nuevos = aceptados.map((archivo, indice) => ({
    archivo,
    vista: URL.createObjectURL(archivo),
    portada: necesitaPortada && indice === 0,
    portadaOriginal: false,
    existente: false
  }));

  imagenes.value.push(...nuevos);
}

// Se dispara cuando el usuario escoge fotos desde el explorador
function elegirArchivos(evento) {
  agregarArchivos(evento.target.files);
  evento.target.value = '';
}

// Marca una imagen seleccionada como la portada principal de la prenda
function marcarPortada(indiceElegido) {
  imagenes.value.forEach((imagen, indice) => {
    imagen.portada = indice === indiceElegido;
  });
}

// Elimina una imagen de la lista y libera la memoria en el navegador
function quitarImagen(indice) {
  const [eliminada] = imagenes.value.splice(indice, 1);
  if (eliminada?.vista && eliminada.vista.startsWith('blob:')) {
    URL.revokeObjectURL(eliminada.vista);
  }
  if (eliminada?.id_imagen) {
    emit('imagen-eliminada', eliminada.id_imagen);
  }

  // Si quitó la portada y Año quedan fotos, asigna la primera como portada
  if (!imagenes.value.some(img => img.portada) && imagenes.value.length) {
    imagenes.value[0].portada = true;
  }
}
</script>

<template>
  <!-- Bloque de gestion de fotos -->
  <section class="zona-imagenes-bloque">
    <div class="zona-cabecera">
      <h3 class="zona-titulo">Fotografás de la prenda</h3>
      <span class="zona-conteo">{{ imagenes.length }} imagen(es)</span>
    </div>

    <!-- Área interactiva de arrastrar y soltar -->
    <div
      class="zona-soltar"
      @dragover.prevent
      @drop.prevent="agregarArchivos($event.dataTransfer.files)"
    >
      <p class="zona-soltar-texto">
        Arrastra las imágenes aquí o haz clic en el boton para seleccionarlas.
      </p>
      <p class="zona-soltar-pista">Formatos: JPG, PNG o WEBP (máx. 4 MB).</p>

      <button
        type="button"
        class="btn-seleccionar"
        @click="abrirSelector"
      >
        Elegir fotografás
      </button>
    </div>

    <!-- Selector de archivos del sistema operativo (oculto) -->
    <input
      ref="inputArchivos"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      hidden
      @change="elegirArchivos"
    />

    <!-- Alerta de validación de formato o tamaó -->
    <p v-if="error" class="mensaje-error" role="alert">
      {{ error }}
    </p>

    <!-- Cuadrícula de fotos cargadas con opcion de portada y borrado -->
    <div v-if="imagenes.length" class="fotos-cuadricula">
      <figure
        v-for="(img, idx) in imagenes"
        :key="img.vista || idx"
        class="foto-tarjeta"
        :class="{ 'es-portada': img.portada }"
      >
        <img
          :src="img.vista"
          :alt="img.archivo?.name || 'Foto de la prenda'"
          class="foto-miniatura"
        />

        <figcaption class="foto-acciones">
          <span v-if="img.portada" class="badge-portada">Portada</span>
          <button
            v-else
            type="button"
            class="btn-accion-foto"
            @click="marcarPortada(idx)"
          >
            Hacer portada
          </button>

          <button
            type="button"
            class="btn-accion-foto btn-quitar-foto"
            @click="quitarImagen(idx)"
          >
            Quitar
          </button>
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
/* Estilos directos de la zona de subida de imágenes */
.zona-imagenes-bloque {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zona-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.zona-titulo {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-texto, #111827);
  margin: 0;
}

.zona-conteo {
  font-size: 12px;
  color: var(--color-texto-suave, #6b7280);
}

.zona-soltar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  border: 2px dashed var(--color-borde-fuerte, #d1d5db);
  border-radius: var(--radio-md, 12px);
  background-color: var(--color-borde-suave, #f9fafb);
  text-align: center;
  transition: all var(--transicion-rapida, 0.15s ease);
}

.zona-soltar:hover {
  border-color: var(--color-primario, #e91e8c);
  background-color: var(--color-primario-suave, #fdf2f8);
}

.zona-soltar-texto {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-texto, #111827);
  margin: 0;
}

.zona-soltar-pista {
  font-size: 11px;
  color: var(--color-texto-suave, #6b7280);
  margin: 4px 0 12px;
}

.btn-seleccionar {
  padding: 8px 16px;
  border-radius: var(--radio-md, 8px);
  border: 1px solid var(--color-borde, #e5e7eb);
  background-color: var(--color-superficie, #ffffff);
  color: var(--color-texto, #111827);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transicion-rapida, 0.15s ease);
}

.btn-seleccionar:hover {
  border-color: var(--color-primario, #e91e8c);
  color: var(--color-primario, #e91e8c);
}

.mensaje-error {
  font-size: 12px;
  color: var(--color-peligro, #b91c1c);
  margin: 0;
}

.fotos-cuadricula {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.foto-tarjeta {
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0;
  border-radius: var(--radio-md, 10px);
  overflow: hidden;
  border: 2px solid var(--color-borde, #e5e7eb);
  background-color: var(--color-superficie, #ffffff);
}

.foto-tarjeta.es-portada {
  border-color: var(--color-primario, #e91e8c);
}

.foto-miniatura {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.foto-acciones {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  background-color: var(--color-superficie, #ffffff);
  border-top: 1px solid var(--color-borde-suave, #f3f4f6);
}

.badge-portada {
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  color: var(--color-primario, #e91e8c);
  background-color: var(--color-primario-suave, #fdf2f8);
  padding: 2px 4px;
  border-radius: var(--radio-sm, 4px);
}

.btn-accion-foto {
  border: 0;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-texto-secundario, #4b5563);
  cursor: pointer;
  padding: 3px 0;
  text-align: center;
}

.btn-accion-foto:hover {
  color: var(--color-primario, #e91e8c);
}

.btn-quitar-foto {
  color: var(--color-peligro, #b91c1c);
}

.btn-quitar-foto:hover {
  text-decoration: underline;
}
</style>
