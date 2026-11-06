<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Heart } from 'lucide-vue-next'
import InsigniaDisponibilidad from './InsigniaDisponibilidad.vue'
import { usePromociones } from '@/composables/usePromociones'
import { useFormatoMoneda } from '@/composables/useFormatoMoneda'
import { useFavoritosStore } from '@/stores/favoritos'

import { useImagenStorage } from '@/composables/useImagenStorage'

const props = defineProps({
  producto: { type: Object, required: true },
})

const { formatearCOP } = useFormatoMoneda()
const { resolverUrlImagen, IMAGEN_RESPALDO } = useImagenStorage()
const favoritosStore = useFavoritosStore()

const variantes = computed(() => props.producto.variantes ?? [])
const stockTotal = computed(() => variantes.value.reduce((acc, v) => acc + Number(v.stock || 0), 0))
const agotado = computed(() => stockTotal.value <= 0)
const deshabilitado = computed(() => !props.producto.activo || agotado.value)

const imagenPrincipal = computed(() => {
  const imgs = [...(props.producto.imagenes ?? [])]
  if (!imgs.length) {
    return props.producto.imagen ? resolverUrlImagen(props.producto.imagen) : IMAGEN_RESPALDO
  }
  imgs.sort((a, b) => Number(b.es_principal) - Number(a.es_principal) || (a.orden ?? 0) - (b.orden ?? 0))
  const origen = imgs[0].url || imgs[0].ruta
  return origen ? resolverUrlImagen(origen) : IMAGEN_RESPALDO
})

const precios = computed(() => {
  const deVariantes = variantes.value
    .map((v) => Number(v.precio_venta))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (deVariantes.length) return deVariantes
  const delProducto = Number(props.producto.precio_venta ?? props.producto.precio_base)
  return Number.isFinite(delProducto) && delProducto > 0 ? [delProducto] : []
})

const precioMinimo = computed(() => (precios.value.length ? Math.min(...precios.value) : 0))
const preciosDistintos = computed(() => new Set(precios.value).size > 1)
const sinPrecio = computed(() => precioMinimo.value <= 0)

const { infoPrecio, tieneDescuento } = usePromociones(computed(() => props.producto), precioMinimo)

// Linea gris debajo del nombre: "Categorá • coleccion"
const subtitulo = computed(() =>
  [props.producto.categoria?.nombre, props.producto.catalogo?.nombre].filter(Boolean).join(' • ')
)

const esFavorito = computed(() => favoritosStore.esFavorito(props.producto.id_producto))

const cargada = ref(false)
const fallo = ref(false)
const src = computed(() => (fallo.value ? IMAGEN_RESPALDO : imagenPrincipal.value))
</script>

<template>
  <component
    :is="deshabilitado ? 'div' : RouterLink"
    :to="deshabilitado ? undefined : `/producto/${producto.id_producto}`"
    class="fs-card"
    :class="{ deshabilitada: deshabilitado }"
  >
    <!-- Insignia izquierda: descuento o Nuevo / Últimas piezas / Agotado -->
    <span v-if="tieneDescuento && !deshabilitado" class="fs-insignia fs-insignia--descuento">
      -{{ infoPrecio.porcentaje }}%
    </span>
    <InsigniaDisponibilidad v-else :variantes="variantes" :fecha-creacion="producto.created_at" />

    <!-- Corazon de favoritos (no abre el detalle) -->
    <button
      type="button"
      class="fs-corazon"
      :class="{ activo: esFavorito }"
      :title="esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      @click.prevent.stop="favoritosStore.alternar(producto.id_producto)"
    >
      <Heart class="w-5 h-5" :fill="esFavorito ? 'currentColor' : 'none'" />
    </button>

    <div class="fs-card__img">
      <img
        :src="src"
        :alt="producto.nombre"
        loading="lazy"
        :style="{ opacity: cargada ? 1 : 0 }"
        @load="cargada = true"
        @error="fallo = true; cargada = true"
      />
    </div>

    <h3 class="fs-card__nombre">{{ producto.nombre }}</h3>
    <span v-if="subtitulo" class="fs-card__meta">{{ subtitulo }}</span>

    <p v-if="sinPrecio" class="fs-card__nota">Precio por confirmar</p>
    <div v-else class="fs-card__precio">
      <small v-if="preciosDistintos">Desde</small>
      {{ formatearCOP(infoPrecio.precioFinal) }}
      <s v-if="tieneDescuento">{{ formatearCOP(infoPrecio.precioOriginal) }}</s>
    </div>

    <span v-if="deshabilitado" class="fs-card__nota">
      {{ !producto.activo ? 'No disponible' : 'Agotado' }}
    </span>
  </component>
</template>