<script setup>
// Constructor de variantes para definir tallas, referencias SKU, precios y stock
import { filtrarCampoPrenda, filtrarPrecio, filtrarStock } from '@/utils/validacionPrenda';

defineProps({
  // -> TablaConstructorVariantes.vue: Modo actual de la vista ('crear' o 'editar')
  modo: {
    type: String,
    default: 'crear'
  }
});

// Lista de variantes vinculada bidireccionalmente con el formulario padre
const variantes = defineModel({
  default: () => []
});

// Inserta una nueva fila vacá para que el usuario ingrese otra talla
function agregarVariante() {
  variantes.value.push({
    id_variante: null,
    talla: '',
    sku: '',
    precio: '',
    stockInicial: 0
  });
}

// Elimina la variante correspondiente a la fila seleccionada
function quitarVariante(indice) {
  variantes.value.splice(indice, 1);
}

function actualizarTexto(variante, campo, evento) {
  const valor = filtrarCampoPrenda(campo, evento.target.value);
  variante[campo] = valor;
  evento.target.value = valor;
}

function actualizarNumero(variante, campo, evento) {
  const valor = campo === 'precio'
    ? filtrarPrecio(evento.target.value)
    : filtrarStock(evento.target.value);
  variante[campo] = valor;
  evento.target.value = valor;
}
</script>

<template>
  <!-- Bloque contenedor de variantes -->
  <section class="variantes-bloque">
    <div class="variantes-cabecera">
      <h3 class="variantes-titulo">Variantes de la prenda</h3>
      <span class="variantes-conteo">{{ variantes.length }} tallas configuradas</span>
    </div>

    <!-- Tabla con barra de desplazamiento horizontal para pantallas móviles -->
    <div class="tabla-envoltorio">
      <table class="tabla-variantes">
        <thead>
          <tr>
            <th scope="col">Talla</th>
            <th scope="col">SKU / Referencia</th>
            <th scope="col">Precio Venta (COP)</th>
            <th scope="col">{{ modo === 'crear' ? 'Stock Inicial' : 'Stock Actual' }}</th>
            <th scope="col" class="th-accion">acción</th>
          </tr>
        </thead>

        <tbody>
          <!-- Filas dinámicas de variantes -->
          <tr v-for="(variante, indice) in variantes" :key="indice">
            <td data-label="Talla">
              <input
                :value="variante.talla"
                maxlength="20"
                placeholder="Ej: M"
                class="variante-input"
                @input="actualizarTexto(variante, 'talla', $event)"
              />
            </td>
            <td data-label="SKU">
              <input
                :value="variante.sku"
                maxlength="24"
                placeholder="Ej: BLU-M-NEG"
                class="variante-input"
                @input="actualizarTexto(variante, 'sku', $event)"
              />
            </td>
            <td data-label="Precio">
              <input
                :value="variante.precio"
                type="text"
                inputmode="decimal"
                maxlength="13"
                placeholder="Ej: 85000"
                class="variante-input"
                @input="actualizarNumero(variante, 'precio', $event)"
              />
            </td>
            <td :data-label="modo === 'crear' ? 'Stock Inicial' : 'Stock Actual'">
              <input
                :value="variante.stockInicial"
                type="text"
                inputmode="numeric"
                maxlength="10"
                placeholder="0"
                class="variante-input"
                @input="actualizarNumero(variante, 'stockInicial', $event)"
              />
            </td>
            <td data-label="accion" class="td-accion">
              <button
                type="button"
                class="btn-quitar-fila"
                :aria-label="`Quitar variante ${variante.talla || indice + 1}`"
                @click="quitarVariante(indice)"
              >
                Quitar
              </button>
            </td>
          </tr>

          <!-- Mensaje si no hay variantes aádidas -->
          <tr v-if="!variantes.length">
            <td colspan="5" class="tabla-vacia">
              No hay variantes agregadas. Haz clic en el botón inferior para añadir una talla.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- boton para agregar una nueva fila -->
    <button
      type="button"
      class="btn-agregar-variante"
      @click="agregarVariante"
    >
      <span class="icono-mas" aria-hidden="true">+</span>
      Agregar talla / variante
    </button>
  </section>
</template>

<style scoped>
/* Estilos directos de la tabla constructora de variantes */
.variantes-bloque {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.variantes-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.variantes-titulo {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-texto, #111827);
  margin: 0;
}

.variantes-conteo {
  font-size: 12px;
  color: var(--color-texto-suave, #6b7280);
}

.tabla-envoltorio {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--color-borde, #e5e7eb);
  border-radius: var(--radio-md, 10px);
  background-color: var(--color-superficie, #ffffff);
}

.tabla-variantes {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.tabla-variantes th {
  padding: 10px 12px;
  background-color: var(--color-borde-suave, #f9fafb);
  color: var(--color-texto-secundario, #374151);
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-borde, #e5e7eb);
}

.tabla-variantes td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-borde-suave, #f3f4f6);
  vertical-align: middle;
}

.variante-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid var(--color-borde, #e5e7eb);
  border-radius: var(--radio-sm, 6px);
  background-color: var(--color-superficie, #ffffff);
  color: var(--color-texto, #111827);
  outline: 0;
  transition: border-color var(--transicion-rapida, 0.15s ease);
}

.variante-input:focus {
  border-color: var(--color-primario, #e91e8c);
  box-shadow: 0 0 0 2px var(--color-primario-suave, #fdf2f8);
}

.th-accion,
.td-accion {
  text-align: center;
  width: 90px;
}

.btn-quitar-fila {
  padding: 5px 10px;
  border: 1px solid var(--color-peligro-borde, #fecaca);
  background-color: var(--color-peligro-fondo, #fee2e2);
  color: var(--color-peligro, #b91c1c);
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radio-sm, 6px);
  cursor: pointer;
  transition: all var(--transicion-rapida, 0.15s ease);
}

.btn-quitar-fila:hover {
  background-color: var(--color-peligro, #b91c1c);
  color: var(--color-texto-blanco, #ffffff);
}

.tabla-vacia {
  text-align: center;
  padding: 24px;
  color: var(--color-texto-claro, #9ca3af);
  font-style: italic;
}

.btn-agregar-variante {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radio-md, 10px);
  border: 1px dashed var(--color-primario, #e91e8c);
  background-color: var(--color-primario-suave, #fdf2f8);
  color: var(--color-primario, #e91e8c);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transicion-rapida, 0.15s ease);
  width: fit-content;
}

.btn-agregar-variante:hover {
  background-color: var(--color-primario, #e91e8c);
  color: var(--color-texto-blanco, #ffffff);
}

.icono-mas {
  font-size: 16px;
  line-height: 1;
}
</style>
