<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { useRouter, RouterLink } from 'vue-router';
import { ChevronLeft, ChevronRight, Shirt, ArrowRight } from 'lucide-vue-next';
import { obtenerProductos } from '@/services/productoServicio';
import { obtenerCategorias, obtenerCatalogos } from '@/services/clasificacionServicio';
import { useImagenStorage } from '@/composables/useImagenStorage';
import TarjetaProducto from '@/components/escaparate/TarjetaProducto.vue';
const router = useRouter();
const { resolverUrlImagen } = useImagenStorage();

const productos = ref([]);
const categorias = ref([]);
const colecciones = ref([]);

const idCategoriaDe = (p) =>
  p.id_categoria ?? p.categoria_id ?? p.categoria?.id_categoria ?? p.categoria?.id;
const idColeccionDe = (p) =>
  p.id_catalogo ?? p.catalogo_id ?? p.catalogo?.id_catalogo ?? p.catalogo?.id;

function imagenDeProducto(p) {
  const imgs = p?.imagenes || [];
  const img = imgs.find((i) => Number(i.es_principal) === 1) || imgs[0];
  const origen = img?.url || img?.ruta || p?.imagen;
  return origen ? resolverUrlImagen(origen) : null;
}

function prendasDe(obtenerId, id) {
  return productos.value.filter((p) => Number(obtenerId(p)) === Number(id));
}

function imagenesDe(obtenerId, id, cantidad) {
  return prendasDe(obtenerId, id)
    .map(imagenDeProducto)
    .filter(Boolean)
    .slice(0, cantidad);
}

const diapositivas = computed(() => {
  const lista = colecciones.value.map((c) => {
    const id = c.id_catalogo || c.id;
    return {
      id,
      titulo: c.nombre,
      texto: c.descripcion || 'Piezas seleccionadas de nuestra colección.',
      foto: c.imagen ? resolverUrlImagen(c.imagen) : null,
      prendas: imagenesDe(idColeccionDe, id, 3),
      total: prendasDe(idColeccionDe, id).length
    };
  });

  if (lista.length) return lista;

  return [{
    id: null,
    titulo: `Nueva colección ${new Date().getFullYear()}`,
    texto: 'Moda minimalista para la nueva temporada.',
    foto: `${import.meta.env.BASE_URL}img/hero.jpg`,
    prendas: productos.value.map(imagenDeProducto).filter(Boolean).slice(0, 3),
    total: productos.value.length
  }];
});

const actual = ref(0);
const fotoFallida = ref([]);
let temporizador = null;

const diapositiva = computed(
  () => diapositivas.value[actual.value] || diapositivas.value[0]
);

const usarFoto = computed(
  () => diapositiva.value.foto && !fotoFallida.value.includes(diapositiva.value.foto)
);

function mover(paso) {
  const n = diapositivas.value.length;
  actual.value = (actual.value + paso + n) % n;
  iniciar();
}

function irA(i) {
  actual.value = i;
  iniciar();
}

function iniciar() {
  detener();
  if (diapositivas.value.length > 1) {
    temporizador = setInterval(() => {
      const n = diapositivas.value.length;
      actual.value = (actual.value + 1) % n;
    }, 6000);
  }
}

function detener() {
  clearInterval(temporizador);
}

function explorarColeccion(id) {
  router.push({ name: 'catalogo', query: id ? { catalogo: id } : {} });
}

const categoriasDestacadas = computed(() =>
  categorias.value
    .map((c) => {
      const id = c.id_categoria || c.id;
      const propia = c.imagen ? resolverUrlImagen(c.imagen) : null;
      return {
        id,
        nombre: c.nombre,
        imagen: propia || imagenesDe(idCategoriaDe, id, 1)[0] || null,
        total: prendasDe(idCategoriaDe, id).length
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
);

function verCategoria(id) {
  router.push({ name: 'catalogo', query: { categoria: id } });
}

const imprescindibles = computed(() =>
  [...productos.value]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 3)
);

// Carga de productos, categorías y colecciones (también se usa para recargar
// cuando el admin cambia algo en otra pestaña o el cliente vuelve a la pestaña)
async function cargarDatosTienda() {
  try {
    const [prods, cats, cols] = await Promise.all([
      obtenerProductos(),
      obtenerCategorias(),
      obtenerCatalogos()
    ]);
    productos.value = prods;
    categorias.value = Array.isArray(cats) ? cats : [];
    colecciones.value = Array.isArray(cols) ? cols : [];
  } catch (e) {
    console.warn('No se pudo cargar la portada:', e);
  }
  iniciar();
}

onMounted(cargarDatosTienda);
useRecargaAutomatica(cargarDatosTienda, { recursos: ['productos', 'categorias', 'catalogos', 'promociones', 'inventarios', 'ventas', 'pedidos', 'ordenes-produccion'] });

onBeforeUnmount(detener);
</script>

<template>
  <div>
    <section class="fs-hero" @mouseenter="detener" @mouseleave="iniciar">
      <Transition name="fs-fade" mode="out-in">
        <div :key="'t' + actual" class="fs-hero__texto">
          <span class="fs-hero__etiqueta">colección</span>
          <h1>{{ diapositiva.titulo }}</h1>
          <p>{{ diapositiva.texto }}</p>
          <button
            type="button"
            class="fs-btn-negro"
            @click="explorarColeccion(diapositiva.id)"
          >
            Explorar colección
          </button>
          <div class="fs-hero__puntos">
            {{ diapositiva.total }} prendas · Calidad premium · Envíos a todo el país
          </div>
        </div>
      </Transition>

      <div class="fs-hero__imagen">
        <Transition name="fs-fade" mode="out-in">
          <img
            v-if="usarFoto"
            :key="'f' + actual"
            class="fs-hero__foto"
            :src="diapositiva.foto"
            :alt="diapositiva.titulo"
            @error="fotoFallida.push(diapositiva.foto)"
          />
          <div
            v-else-if="diapositiva.prendas.length"
            :key="'c' + actual"
            class="fs-collage"
            :class="'fs-collage--' + diapositiva.prendas.length"
          >
            <div
              v-for="(img, i) in diapositiva.prendas"
              :key="img + i"
              class="fs-collage__item"
            >
              <img :src="img" :alt="diapositiva.titulo" />
            </div>
          </div>
        </Transition>

        <template v-if="diapositivas.length > 1">
          <button
            type="button"
            class="fs-hero__flecha izq"
            aria-label="Anterior"
            @click="mover(-1)"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
          <button
            type="button"
            class="fs-hero__flecha der"
            aria-label="Siguiente"
            @click="mover(1)"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
          <div class="fs-hero__puntitos">
            <button
              v-for="(d, i) in diapositivas"
              :key="d.id ?? i"
              type="button"
              :class="{ activo: i === actual }"
              :aria-label="'Ver ' + d.titulo"
              @click="irA(i)"
            ></button>
          </div>
        </template>
      </div>
    </section>

    <section v-if="categoriasDestacadas.length" class="fs-seccion fs-seccion--blanca">
      <div class="fs-contenedor">
        <h2 class="fs-titulo-seccion">Categorías destacadas</h2>
        <div class="fs-categorias">
          <button
            v-for="cat in categoriasDestacadas"
            :key="cat.id"
            type="button"
            class="fs-categoria"
            @click="verCategoria(cat.id)"
          >
            <div class="fs-categoria__img">
              <img v-if="cat.imagen" :src="cat.imagen" :alt="cat.nombre" />
              <Shirt v-else class="w-8 h-8" />
            </div>
            <strong>{{ cat.nombre }}</strong>
            <span>{{ cat.total }} productos</span>
          </button>
        </div>
        <div class="fs-ver-todo">
          <RouterLink :to="{ name: 'catalogo' }">
            Ver todo el catálogo <ArrowRight class="w-4 h-4" />
          </RouterLink>
        </div>
      </div>
    </section>

    <section v-if="imprescindibles.length" class="fs-seccion">
      <div class="fs-contenedor fs-imprescindibles">
        <h2>Imprescindibles de la temporada</h2>
        <div class="fs-grid fs-grid--3">
          <TarjetaProducto
            v-for="p in imprescindibles"
            :key="p.id_producto"
            :producto="p"
          />
        </div>
      </div>
    </section>
  </div>
</template>