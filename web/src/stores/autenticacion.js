
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import clienteApi from '@/services/clienteApi';

export const useAutenticacionStore = defineStore('autenticacion', () => {
  function leerJSON(clave, porDefecto) {
    const valor = localStorage.getItem(clave);

    if (!valor || valor === 'undefined') {
      return porDefecto;
    }

    try {
      return JSON.parse(valor);
    } catch {
      return porDefecto;
    }
  }

  function normalizarRoles(rolesCrudos, usuarioActual = null) {
    let lista = rolesCrudos;

    if (!Array.isArray(lista)) {
      if (lista && typeof lista === 'object') {
        lista = Object.values(lista);
      } else if (Array.isArray(usuarioActual?.roles)) {
        lista = usuarioActual.roles;
      } else if (usuarioActual?.rol) {
        lista = [usuarioActual.rol];
      } else {
        lista = [];
      }
    }

    return [
      ...new Set(
        lista
          .map((rol) => {
            if (typeof rol === 'string') {
              return rol.trim().toLowerCase();
            }

            if (rol && typeof rol === 'object') {
              return String(
                rol.name ?? rol.nombre ?? rol.rol ?? ''
              ).trim().toLowerCase();
            }

            return String(rol ?? '').trim().toLowerCase();
          })
          .filter(Boolean)
      ),
    ];
  }

  const tokenGuardado = localStorage.getItem('fs_token');

  const token = ref(
    tokenGuardado && tokenGuardado !== 'undefined'
      ? tokenGuardado
      : null
  );

  const usuario = ref(leerJSON('fs_user', null));

  const roles = ref(
    normalizarRoles(
      leerJSON('fs_roles', []),
      usuario.value
    )
  );

  const sesionHidratada = ref(false);

  const estaAutenticado = computed(() => Boolean(token.value));

  const rolesNormalizados = computed(() =>
    normalizarRoles(roles.value, usuario.value)
  );

  // El empleado no se considera administrador.
  const esAdmin = computed(() =>
    rolesNormalizados.value.some((rol) =>
      ['admin', 'administrador', 'super-admin'].includes(rol)
    )
  );

  const esEmpleado = computed(() =>
    rolesNormalizados.value.some((rol) =>
      ['empleado', 'staff'].includes(rol)
    )
  );

  // Personal de la tienda: administrador o empleado.
  const esPersonal = computed(() => esAdmin.value || esEmpleado.value);

  const rolUsuario = computed(() => {
    if (esAdmin.value) return 'admin';
    if (esEmpleado.value) return 'empleado';

    return rolesNormalizados.value[0] || 'cliente';
  });

  function rutaInicial() {
    if (esAdmin.value || esEmpleado.value) {
      return { name: 'admin-dashboard' };
    }

    return { name: 'inicio' };
  }

  function persistirSesion() {
    if (token.value) {
      localStorage.setItem('fs_token', token.value);
      localStorage.setItem('fs_user', JSON.stringify(usuario.value));
      localStorage.setItem('fs_roles', JSON.stringify(roles.value));
    }
  }

  function guardarSesion(datos) {
    const tokenRecibido = datos?.access_token || datos?.token;

    if (!tokenRecibido) {
      throw new Error(
        'La respuesta no contiene access_token ni token.'
      );
    }

    token.value = tokenRecibido;

    usuario.value = datos?.user ?? datos?.usuario ?? null;

    roles.value = normalizarRoles(
      datos?.roles ??
        usuario.value?.roles ??
        usuario.value?.rol,
      usuario.value
    );

    sesionHidratada.value = true;

    persistirSesion();

    return datos;
  }

  async function iniciarSesion(credenciales) {
    const respuesta = await clienteApi.post('/login', {
      ...credenciales,
      correo: credenciales.correo ?? credenciales.email,
    });

    const datos = respuesta.data?.data ?? respuesta.data;

    return guardarSesion(datos);
  }

  async function registrar(formulario) {
    const respuesta = await clienteApi.post('/register', formulario);

    return respuesta.data?.data ?? respuesta.data;
  }

  async function verificarCorreo({ correo, codigo }) {
    const respuesta = await clienteApi.post('/verify-email', {
      correo,
      codigo,
    });

    const datos = respuesta.data?.data ?? respuesta.data;

    return guardarSesion(datos);
  }

  async function reenviarCodigo(correo) {
    return clienteApi.post('/resend-verification', { correo });
  }

  async function iniciarSesionConGoogle(
    credential,
    aceptaTerminos = false
  ) {
    if (!credential) {
      throw new Error(
        'Google no proporcionó una credencial válida.'
      );
    }

    const respuesta = await clienteApi.post('/auth/google', {
      credential,
      acepta_terminos: aceptaTerminos,
    });

    const datos = respuesta.data?.data ?? respuesta.data;

    return guardarSesion(datos);
  }

  const iniciarSesionGoogle = iniciarSesionConGoogle;

  function actualizarUsuario(datos) {
    usuario.value = {
      ...(usuario.value || {}),
      ...datos,
    };

    if (datos?.roles !== undefined || datos?.rol !== undefined) {
      roles.value = normalizarRoles(
        datos.roles ?? datos.rol,
        usuario.value
      );
    }

    persistirSesion();

    return usuario.value;
  }

  async function hidratarSesion() {
    if (!token.value || sesionHidratada.value) {
      return;
    }

    try {
      const respuesta = await clienteApi.get('/me');
      const datos = respuesta.data?.data ?? respuesta.data;

      usuario.value = datos?.user ?? datos?.usuario ?? datos;

      roles.value = normalizarRoles(
        datos?.roles ??
          usuario.value?.roles ??
          usuario.value?.rol ??
          [],
        usuario.value
      );

      persistirSesion();
    } catch (error) {
      sesionHidratada.value = false;
      throw error;
    } finally {
      if (token.value) {
        sesionHidratada.value = true;
      }
    }
  }

  async function cerrarSesion() {
    try {
      if (token.value) {
        await clienteApi.post('/logout');
      }
    } catch (error) {
      console.warn(
        'No se pudo cerrar la sesión en el servidor:',
        error
      );
    } finally {
      token.value = null;
      usuario.value = null;
      roles.value = [];
      sesionHidratada.value = false;

      localStorage.removeItem('fs_token');
      localStorage.removeItem('fs_user');
      localStorage.removeItem('fs_roles');
      localStorage.removeItem('favoritos');
      localStorage.removeItem('fs_carrito');

      window.location.hash = '#/login';

    }
  }

  async function solicitarRecuperacion(email) {
    return clienteApi.post('/forgot-password', {
      correo: email,
    });
  }

  async function restablecerContrasena(datos) {
    return clienteApi.post('/reset-password', {
      correo: datos.correo,
      codigo: datos.codigo,
      nueva_password: datos.nueva_password,
      nueva_password_confirmation:
        datos.nueva_password_confirmation,
    });
  }

  return {
    token,
    usuario,
    roles,
    sesionHidratada,
    estaAutenticado,
    esAdmin,
    esEmpleado,
    esPersonal,
    rolUsuario,
    rutaInicial,
    guardarSesion,
    iniciarSesion,
    registrar,
    verificarCorreo,
    reenviarCodigo,
    iniciarSesionConGoogle,
    iniciarSesionGoogle,
    actualizarUsuario,
    hidratarSesion,
    cerrarSesion,
    solicitarRecuperacion,
    restablecerContrasena,
  };
});
