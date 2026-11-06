<script setup>
import { filtrarNumero } from '@/utils/validacionCampos';

defineProps({
  abierto: {
    type: Boolean,
    default: false
  },

  editando: {
    type: Object,
    default: null
  },

  variantes: {
    type: Array,
    default: () => []
  },

  form: {
    type: Object,
    required: true
  },

  guardando: {
    type: Boolean,
    default: false
  }
});

defineEmits([
  'guardar',
  'cerrar'
]);

function bloquearNotacionCientifica(evento) {
  if ([
    'e',
    'E',
    '+',
    '-',
    '.',
    ','
  ].includes(evento.key)) {
    evento.preventDefault();
  }
}

function actualizarCantidad(evento, form) {
  const valor = filtrarNumero(evento.target.value, 7);
  form.cantidad = valor;
  evento.target.value = valor;
}
</script>

<template>
  <div
    v-if="abierto"
    class="modal-backdrop"
    @click.self="$emit('cerrar')"
  >
    <form
      class="modal"
      @submit.prevent="$emit('guardar')"
    >
      <button
        type="button"
        class="close"
        aria-label="Cerrar ventana"
        @click="$emit('cerrar')"
      >
        ×
      </button>

      <p class="eyebrow">
        INVENTARIO
      </p>

      <h2>
        {{
          editando
            ? 'Editar movimiento'
            : 'Registrar movimiento'
        }}
      </h2>

      <template v-if="!editando">
        <label>
          Producto / variante

          <select
            v-model="form.variante_id"
            required
          >
            <option value="">
              Seleccione una variante
            </option>

            <option
              v-for="variante in variantes"
              :key="variante.id_variante"
              :value="variante.id_variante"
            >
              {{ variante.label }}
            </option>
          </select>
        </label>

        <div class="form-row">
          <label>
            Tipo

            <select
              v-model="form.tipo_movimiento"
            >
              <option value="entrada">
                Entrada
              </option>

              <option value="salida">
                Salida
              </option>

              <option value="ajuste">
                Ajuste
              </option>
            </select>
          </label>

          <label>
            Cantidad

            <input
              v-model="form.cantidad"
              type="number"
              inputmode="numeric"
              min="0"
              max="1000000"
              step="1"
              maxlength="7"
              required
              autocomplete="off"
              placeholder="Ejemplo: 10"
              @keydown="bloquearNotacionCientifica"
              @input="actualizarCantidad($event, form)"
            />

            <small class="ayuda-cantidad">
              Solo números enteros.
            </small>
          </label>
        </div>
      </template>

      <label>
        Concepto

        <input
          v-model="form.concepto"
          type="text"
          maxlength="100"
          required
          autocomplete="off"
          placeholder="Compra, venta, correccion..."
        />
      </label>

      <label>
        Observaciones

        <textarea
          v-model="form.observaciones"
          rows="3"
          maxlength="500"
          placeholder="Información adicional"
        ></textarea>
      </label>

      <div class="modal-actions">
        <button
          type="button"
          class="button secondary"
          :disabled="guardando"
          @click="$emit('cerrar')"
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="button primary"
          :disabled="guardando"
        >
          {{
            guardando
              ? 'Guardando...'
              : 'Guardar'
          }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.ayuda-cantidad {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 11px;
}
</style>
