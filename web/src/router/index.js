import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import { useAutenticacionStore } from '@/stores/autenticacion';

function redireccionGestionPrendas(to) {
  return {
    name: 'gestion-prendas',
    query: to.query,
    hash: to.hash,
  };
}

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/DisenoPublico.vue'),
    children: [
      {
        path: '',
        name: 'inicio',
        component: () => import('@/views/publico/VistaInicio.vue'),
      },
      {
        path: 'producto/:id',
        name: 'detalle-producto',
        component: () => import('@/views/publico/VistaDetallePrenda.vue'),
      },
      {
        path: 'carrito',
        name: 'carrito',
        component: () => import('@/views/publico/VistaCarrito.vue'),
      },
      {
        path: 'catalogo',
        name: 'catalogo',
        component: () => import('@/views/publico/Vistacatalogo.vue'),
      },
      {
        path: 'clasificacion',
        name: 'clasificacion',
        redirect: (to) => ({
          path: '/catalogo',
          query: to.query,
        }),
      },
      {
        path: 'contacto',
        name: 'contacto',
        component: () => import('@/views/publico/VistaContacto.vue'),
      },
      {
        path: 'terminos',
        name: 'terminos',
        component: () => import('@/views/publico/VistaTerminos.vue'),
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: () => import('@/views/publico/VistaMiPerfil.vue'),
        meta: {
          requiereAutenticacion: true,
        },
      },
    ],
  },

  {
    path: '/',
    component: () => import('@/layouts/DisenoAutenticacion.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/autenticacion/VistaInicioSesion.vue'),
      },
      {
        path: 'registro',
        name: 'registro',
        component: () => import('@/views/autenticacion/VistaRegistro.vue'),
      },
      {
        path: 'verificar-correo',
        name: 'verificar-correo',
        component: () => import('@/views/autenticacion/VistaVerificarCorreo.vue'),
      },
      {
        path: 'recuperar-contrasena',
        name: 'recuperar-contrasena',
        component: () => import('@/views/autenticacion/VistaRecuperarContrasena.vue'),
      },
      {
        path: 'restablecer-contrasena',
        name: 'restablecer-contrasena',
        component: () => import('@/views/autenticacion/VistaRestablecerContrasena.vue'),
      },
    ],
  },

  {
    path: '/acceso',
    name: 'acceso',
    redirect: { name: 'login' },
  },
  {
    path: '/iniciar-sesion',
    name: 'iniciar-sesion',
    redirect: { name: 'login' },
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    redirect: (to) => ({
      name: 'login',
      query: to.query,
    }),
  },
  {
    path: '/administrador-prendas',
    redirect: redireccionGestionPrendas,
  },

  {
    path: '/admin',
    component: () => import('@/layouts/DisenoAdmin.vue'),
    meta: {
      requiereAutenticacion: true,
      rolesPermitidos: ['admin', 'administrador', 'empleado', 'staff'],
    },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/VistaPanelControl.vue'),
      },
      {
        path: 'inventario',
        name: 'admin-inventario',
        component: () => import('@/views/admin/VistaInventario.vue'),
      },
      {
        path: 'ventas',
        name: 'admin-ventas',
        component: () => import('@/views/admin/VistaVentasPOS.vue'),
      },
      {
        path: 'pedidos',
        name: 'admin-pedidos',
        component: () => import('@/views/admin/VistaPedidosyFacturas.vue'),
      },
      {
        path: 'produccion',
        name: 'admin-produccion',
        component: () => import('@/views/admin/VistaProduccion.vue'),
      },
      {
        path: 'prendas',
        name: 'gestion-prendas',
        component: () => import('@/views/admin/VistaGestionPrendas.vue'),
      },
      {
        path: 'ayuda',
        name: 'admin-ayuda',
        component: () => import('@/views/admin/VistaAyudaAdmin.vue'),
      },
      {
        path: 'mensajes',
        name: 'admin-mensajes',
        component: () => import('@/views/admin/VistaMensajesContacto.vue'),
      },
      {
        path: 'cuenta',
        name: 'admin-cuenta',
        component: () => import('@/views/admin/VistaEditarCuenta.vue'),
      },
      {
        path: 'pagos',
        name: 'admin-pagos',
        component: () => import('@/views/admin/VistaConfiguracionPagos.vue'),
      },
      {
        path: 'seguridad',
        name: 'admin-seguridad',
        component: () => import('@/views/admin/VistaUsuariosYClientes.vue'),
      },
      {
        path: 'seguridad/auditoria',
        name: 'admin-auditoria',
        component: () => import('@/views/admin/VistaAuditoria.vue'),
        meta: {
          rolesPermitidos: ['admin', 'administrador'],
        },
      },
    ],
  },

  {
    path: '/cuenta',
    redirect: '/admin/cuenta',
  },

  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'inicio' },
  },
];

const esGitHubPages = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  window.location.hostname.includes('github.io')
);

const router = createRouter({
  history: esGitHubPages
    ? createWebHashHistory()
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

function normalizarRol(rol) {
  if (typeof rol === 'string') {
    return rol.trim().toLowerCase();
  }

  if (rol && typeof rol === 'object') {
    return String(rol.name ?? rol.nombre ?? rol.rol ?? '')
      .trim()
      .toLowerCase();
  }

  return '';
}

function obtenerRolesActuales(authStore) {
  const roles = Array.isArray(authStore.roles)
    ? authStore.roles
    : authStore.roles
      ? [authStore.roles]
      : [];

  return [
    ...new Set(
      roles
        .map(normalizarRol)
        .filter(Boolean)
    ),
  ];
}

function tienePermiso(authStore, rolesPermitidos) {
  if (!rolesPermitidos?.length) {
    return true;
  }

  const rolesUsuario = obtenerRolesActuales(authStore);
  const rolesRequeridos = rolesPermitidos.map(normalizarRol);

  return rolesUsuario.some((rol) => rolesRequeridos.includes(rol));
}

router.beforeEach(async (to) => {
  const authStore = useAutenticacionStore();

  const requiereAutenticacion = to.matched.some(
    (ruta) => ruta.meta.requiereAutenticacion
  );

  if (authStore.estaAutenticado && !authStore.sesionHidratada) {
    try {
      await authStore.hidratarSesion();
    } catch {
      if (requiereAutenticacion) {
        await authStore.cerrarSesion();

        return {
          name: 'login',
          query: { redir: to.fullPath },
        };
      }
    }
  }

  if (requiereAutenticacion && !authStore.estaAutenticado) {
    return {
      name: 'login',
      query: { redir: to.fullPath },
    };
  }

  if (requiereAutenticacion) {
    const rutasConRoles = to.matched.filter(
      (ruta) => ruta.meta.rolesPermitidos?.length
    );

    for (const ruta of rutasConRoles) {
      if (!tienePermiso(authStore, ruta.meta.rolesPermitidos)) {
        return authStore.estaAutenticado
          ? { name: 'inicio' }
          : {
              name: 'login',
              query: { redir: to.fullPath },
            };
      }
    }
  }

  const pantallasAutenticacion = [
    'login',
    'registro',
    'verificar-correo',
    'recuperar-contrasena',
    'restablecer-contrasena',
  ];

  if (
    pantallasAutenticacion.includes(to.name) &&
    authStore.estaAutenticado
  ) {
    return authStore.rutaInicial();
  }

  return true;
});

router.onError((error) => {
  if (error.message?.includes('Failed to fetch dynamically imported module')) {
    if (!sessionStorage.getItem('fs_chunk_reload')) {
      sessionStorage.setItem('fs_chunk_reload', '1');
      window.location.reload();
    }
  }
});

router.afterEach(() => {
  sessionStorage.removeItem('fs_chunk_reload');
});

export default router;
