<script setup>
// Interruptor rápido tipo switch para activar o desactivar una prenda en el catálogo
// -> ConmutadorEstado.vue: Vincula el valor booleano con el componente padre mediante v-model
const publicado = defineModel({
  type: Boolean,
  default: false
});
</script>

<template>
  <!-- Contenedor del conmutador interactivo -->
  <label class="conmutador-estado">
    <!-- Checkbox nativo oculto para accesibilidad -->
    <input
      v-model="publicado"
      type="checkbox"
      class="conmutador-input"
      aria-label="Cambiar estado de la prenda"
    />
    <!-- Pista visual y boton deslizante -->
    <span class="conmutador-pista">
      <span class="conmutador-circulo"></span>
    </span>
  </label>
</template>

<style scoped>
/* Contenedor del switch con tamaó fijo y cursor de mano */
.conmutador-estado {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
  user-select: none;
}

/* Oculta el checkbox nativo */
.conmutador-input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

/* Pista de fondo gris por defecto */
.conmutador-pista {
  position: absolute;
  inset: 0;
  background-color: var(--color-borde-fuerte, #d1d5db);
  border-radius: var(--radio-redondo, 9999px);
  transition: background-color var(--transicion-rapida, 0.15s ease);
}

/* Círculo blanco que se mueve de izquierda a derecha */
.conmutador-circulo {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: var(--color-superficie, #ffffff);
  border-radius: 50%;
  box-shadow: var(--sombra-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
  transition: transform var(--transicion-rapida, 0.15s ease);
}

/* Cuando está activo, cambia al color rosa de la marca */
.conmutador-input:checked + .conmutador-pista {
  background-color: var(--color-primario, #e91e8c);
}

/* Desplaza el círculo 20px hacia la derecha */
.conmutador-input:checked + .conmutador-pista .conmutador-circulo {
  transform: translateX(20px);
}

/* Anillo de enfoque para navegacion con teclado */
.conmutador-input:focus-visible + .conmutador-pista {
  box-shadow: 0 0 0 3px var(--color-primario-sombra, rgba(233, 30, 140, 0.25));
}
</style>