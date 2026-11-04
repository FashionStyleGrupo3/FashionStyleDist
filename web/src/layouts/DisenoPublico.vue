<script setup>
import { ref, onMounted, watch } from 'vue';
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router';
import {
  ShoppingBag, Search, User, LogOut, LayoutDashboard, Heart
} from 'lucide-vue-next';
import { useCarritoStore } from '@/stores/carrito';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { useFiltrosStore } from '@/stores/filtros';
import { useFavoritosStore } from '@/stores/favoritos';
import { obtenerCategorias } from '@/services/clasificacionServicio';
import CajonCotizacion from '@/components/carrito/CajonCotizacion.vue';
import AvatarUsuario from '@/components/perfil/AvatarUsuario.vue';
const router = useRouter();
const route = useRoute();
const carritoStore = useCarritoStore();
const authStore = useAutenticacionStore();
const filtrosStore = useFiltrosStore();
const favoritosStore = useFavoritosStore();
const menuUsuarioAbierto = ref(false);
const categoriasMenu = ref([]);

watch(
  () => authStore.estaAutenticado,
  (conSesion) => {
    if (conSesion) favoritosStore.cargarDesdeServidor();
  },
  { immediate: true }
);

function irAlCatalogo(query) {
  const actual = route.name === 'catalogo' ? route.query : {};
  router.push({ name: 'catalogo', query: query ?? actual });
}

function buscar() {
  if (filtrosStore.busqueda.trim() !== '') irAlCatalogo();
}

function irACategoria(id) {
  irAlCatalogo(id ? { categoria: id } : {});
}

function verFavoritos() {
  favoritosStore.soloFavoritos = !favoritosStore.soloFavoritos;
  if (route.name !== 'catalogo') irAlCatalogo({});
}

function esCategoriaActiva(cat) {
  const id = cat.id_categoria || cat.id;
  return Number(route.query.categoria) === Number(id);
}

onMounted(async () => {
  const cats = await obtenerCategorias();
  const lista = Array.isArray(cats) ? cats : [];
  categoriasMenu.value = lista.slice(0, 4);
});
</script>

<template>
  <div class="fs-pagina">
    <header class="fs-header">
      <div class="fs-contenedor fs-header__fila">
        <RouterLink to="/" class="fs-logo">FashionStyle</RouterLink>

        <nav class="fs-nav">
          <button
            type="button"
            class="fs-nav__link"
            :class="{ activo: route.name === 'catalogo' && !route.query.categoria }"
            @click="irACategoria(null)"
          >
            Catálogo
          </button>
          <button
            v-for="cat in categoriasMenu"
            :key="cat.id_categoria || cat.id"
            type="button"
            class="fs-nav__link"
            :class="{ activo: esCategoriaActiva(cat) }"
            @click="irACategoria(cat.id_categoria || cat.id)"
          >
            {{ cat.nombre }}
          </button>
        </nav>

        <div class="fs-buscador">
          <Search class="fs-buscador__icono" />
          <input
            v-model="filtrosStore.busqueda"
            type="text"
            maxlength="100"
            placeholder="Buscar productos..."
            @keyup.enter="buscar"
          />
        </div>

        <div class="fs-acciones">
          <RouterLink
            v-if="authStore.esPersonal"
            to="/admin"
            class="fs-btn-admin"
            title="Ir al panel de administrador"
          >
            <LayoutDashboard class="w-4 h-4" />
            <span>Panel admin</span>
          </RouterLink>

          <div v-if="authStore.estaAutenticado" class="relative">
            <button
              type="button"
              class="fs-icono-btn"
              title="Mi cuenta"
              @click="menuUsuarioAbierto = !menuUsuarioAbierto"
            >
              <AvatarUsuario
                v-if="authStore.usuario?.foto_perfil"
                :nombre="authStore.usuario?.nombre"
                :foto="authStore.usuario.foto_perfil"
                clases="h-8 w-8 text-xs"
              />
              <User v-else class="w-6 h-6" />
            </button>

            <div
              v-if="menuUsuarioAbierto"
              class="fs-menu-usuario"
              @click="menuUsuarioAbierto = false"
            >
              <div class="fs-menu-usuario__cabecera">
                <p><strong>{{ authStore.usuario?.nombre }}</strong></p>
                <p>
                  <small>
                    {{ authStore.usuario?.correo || authStore.usuario?.email }}
                  </small>
                </p>
              </div>
              <RouterLink v-if="authStore.esPersonal" :to="{ name: 'admin-dashboard' }">
                <LayoutDashboard class="w-4 h-4" /> Panel de control
              </RouterLink>
              <RouterLink :to="authStore.esPersonal ? '/admin/cuenta' : '/perfil'">
                <User class="w-4 h-4" /> Mi cuenta
              </RouterLink>
              <button type="button" class="peligro" @click="authStore.cerrarSesion()">
                <LogOut class="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          </div>

          <RouterLink
            v-else
            :to="{ name: 'login' }"
            class="fs-icono-btn"
            title="Iniciar sesión"
          >
            <User class="w-6 h-6" />
          </RouterLink>

          <!-- boton de apertura de bolsa de compras con contador reactivo -->
          <button
            type="button"
            class="fs-icono-btn"
            :class="{ activo: favoritosStore.soloFavoritos }"
            title="Mis favoritos"
            @click="verFavoritos"
          >
            <Heart class="w-6 h-6" />
            <span v-if="favoritosStore.total > 0" class="fs-contador">
              {{ favoritosStore.total }}
            </span>
          </button>

          <button
            type="button"
            class="fs-icono-btn"
            title="Ver bolsa de compras"
            @click="carritoStore.cajonAbierto = true"
          >
            <ShoppingBag class="w-6 h-6" />
            <span v-if="carritoStore.totalPrendas > 0" class="fs-contador">
              {{ carritoStore.totalPrendas }}
            </span>
          </button>
        </div>
      </div>

      <div class="fs-anuncio">
        Pagos seguros con Wompi · Envíos a todo el país
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

    <CajonCotizacion />

    <footer class="fs-footer">
      <div class="fs-contenedor">
        <span>
          © 2026 FashionStyle ·
          <RouterLink to="/terminos">Términos y condiciones</RouterLink> ·
          <RouterLink :to="{ name: 'catalogo' }">Catálogo</RouterLink> ·
          <a href="https://github.com/FashionStyleGrupo3/FashionStyleDist/tree/main/mobile" target="_blank" rel="noopener">📱 App Móvil (Flutter)</a>
        </span>
        <span>Síguenos: Instagram · TikTok · Pinterest</span>
      </div>
    </footer>
  </div>
</template>