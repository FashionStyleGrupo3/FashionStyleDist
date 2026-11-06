<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  X,
  MessageCircle,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ShoppingCart
} from 'lucide-vue-next';

import { useCarritoStore } from '@/stores/carrito';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useImagenStorage } from '@/composables/useImagenStorage';

const router = useRouter();
const carritoStore = useCarritoStore();
const { formatearCOP } = useFormatoMoneda();
const { resolverUrlImagen, IMAGEN_RESPALDO } = useImagenStorage();

function cerrarCajon() {
  carritoStore.cajonAbierto = false;
}

// Cierra el cajon y lleva al cliente a la página del carrito,
// donde se completan los datos de entrega y se paga con Wompi.
function verMiCarrito() {
  cerrarCajon();
  router.push('/carrito');
}

function abrirAsistenciaWhatsApp() {
  const numero = String(import.meta.env.VITE_WHATSAPP_NUMERO || '573001234567').replace(/\D/g, '');
  let texto = 'Hola Servicio al Cliente FashionStyle, requiero asistencia con mi pedido.\n';

  if (carritoStore.items.length > 0) {
    texto += 'Tengo dudas sobre los siguientes artículos en mi bolsa:\n';
    carritoStore.items.forEach((item) => {
      texto += `- ${item.nombre} (Talla: ${item.talla}) x${item.cantidad}\n`;
    });
  }

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function aumentar(item) {
  carritoStore.actualizarCantidad(item.varianteId, Number(item.cantidad) + 1);
}

function disminuir(item) {
  carritoStore.actualizarCantidad(item.varianteId, Number(item.cantidad) - 1);
}

function alTeclear(evento) {
  if (evento.key === 'Escape' && carritoStore.cajonAbierto) {
    cerrarCajon();
  }
}

watch(
  () => carritoStore.cajonAbierto,
  (abierto) => {
    document.body.style.overflow = abierto ? 'hidden' : '';
  }
);

onMounted(() => {
  window.addEventListener('keydown', alTeclear);
});

onUnmounted(() => {
  window.removeEventListener('keydown', alTeclear);
  document.body.style.overflow = '';
});
</script>

<template>
  <div v-if="carritoStore.cajonAbierto" class="fixed inset-0 z-50 overflow-hidden">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrarCajon"></div>

    <aside class="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
      <header class="flex items-center justify-between border-b border-gray-100 p-5 bg-white">
        <div>
          <h2 class="text-base font-bold font-titulos text-gray-900 sm:text-lg">Bolsa de Compras</h2>
          <p class="mt-1 text-[11px] text-gray-500">
            {{ carritoStore.totalPrendas }} prenda(s) seleccionada(s)
          </p>
        </div>

        <button type="button" @click="cerrarCajon" class="rounded-lg p-1 text-gray-400 transition hover:text-gray-700"
          title="Cerrar">
          <X class="h-5 w-5" />
        </button>
      </header>

      <div class="flex-1 overflow-y-auto p-5">
        <div v-if="!carritoStore.items.length"
          class="flex h-full flex-col items-center justify-center gap-3 text-center text-gray-400">
          <ShoppingBag class="h-12 w-12 text-gray-300" />
          <p class="font-medium text-gray-600">Tu bolsa de compra está vacía.</p>
          <p class="text-xs text-gray-400">Explora el escaparate y agrega tus prendas favoritas.</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="item in carritoStore.items" :key="item.varianteId"
            class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div class="flex gap-3">
              <div class="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img
                  v-if="item.imagen"
                  :src="resolverUrlImagen(item.imagen)"
                  :alt="item.nombre"
                  class="h-full w-full object-cover"
                  @error="(e) => { e.target.onerror = null; e.target.src = IMAGEN_RESPALDO; }"
                />
                <div v-else class="flex h-full items-center justify-center text-gray-300">—</div>
              </div>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-gray-900">{{ item.nombre }}</p>
                <p class="mt-1 text-xs text-gray-500">
                  Talla:
                  <strong class="text-gray-800">{{ item.talla }}</strong>
                </p>
                <p class="mt-1 text-sm font-bold text-corporativo-rosa">
                  {{ formatearCOP(item.precio) }}
                  <span v-if="item.precioOriginal && item.precioOriginal > item.precio"
                    class="ml-1 text-xs font-normal text-gray-400 line-through">{{ formatearCOP(item.precioOriginal)
                    }}</span>
                </p>
              </div>

              <button type="button" class="h-fit text-gray-400 transition hover:text-red-500" aria-label="Quitar prenda"
                @click="carritoStore.eliminarPrenda(item.varianteId)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>

            <div class="mt-4 flex items-center justify-between">
              <span class="text-xs text-gray-500">Cantidad</span>

              <div class="flex items-center overflow-hidden rounded-lg border border-gray-200">
                <button type="button" class="p-2 text-gray-600 hover:bg-gray-100" aria-label="Quitar una unidad"
                  @click="disminuir(item)">
                  <Minus class="h-3.5 w-3.5" />
                </button>

                <span class="min-w-10 text-center text-sm font-semibold text-gray-900">{{ item.cantidad }}</span>

                <button type="button" class="p-2 text-gray-600 hover:bg-gray-100" aria-label="Agregar una unidad"
                  @click="aumentar(item)">
                  <Plus class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="border-t border-gray-100 bg-gray-50 p-5">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-700">Total estimado</span>
            <span class="text-lg font-extrabold text-corporativo-rosa">{{ formatearCOP(carritoStore.totalMonto)
            }}</span>
          </div>

          <button type="button" :disabled="!carritoStore.items.length"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-corporativo-rosa py-3 font-semibold text-white shadow-md transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
            @click="verMiCarrito">
            <ShoppingCart class="h-5 w-5" />
            Ver mi carrito
          </button>

          <button v-if="carritoStore.items.length" type="button"
            class="w-full text-xs text-gray-500 hover:text-red-500 hover:underline"
            @click="carritoStore.vaciarCarrito()">
            Vaciar lista
          </button>

          <div class="pt-2 text-center">
            <p class="mb-2 text-[11px] text-gray-500">¿Dudas o dificultades con tu pedido?</p>
            <button type="button" @click="abrirAsistenciaWhatsApp"
              class="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <MessageCircle class="h-3.5 w-3.5" />
              Hablar con soporte
            </button>
          </div>
        </div>
      </footer>
    </aside>
  </div>
</template>
