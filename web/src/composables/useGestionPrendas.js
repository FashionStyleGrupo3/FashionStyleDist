  import { computed, onMounted, ref } from 'vue';
  import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
  import clienteApi from '@/services/clienteApi';
  import { useAutenticacionStore } from '@/stores/autenticacion';
  import { useNotificacion } from '@/composables/useNotificacion';
  import { useImagenStorage } from '@/composables/useImagenStorage';
  import {
    validarCampoPrenda,
    validarPrecio,
    seleccionarImagenesPrenda,
    validarStock
  } from '@/utils/validacionPrenda';

  const mensajesPorEstado = {
    400: 'La solicitud no es válida. Revisa los datos de la prenda e inténtalo de nuevo.',
    401: 'Tu sesión termin. Inicia sesión de nuevo para continuar.',
    403: 'No tienes permiso para realizar este cambio. Contacta al administrador si necesitas acceso.',
    404: 'No se encontr la prenda o el recurso solicitado. Actualiza la lista e inténtalo de nuevo.',
    409: 'No se pudo completar el cambio porque la prenda está relacionada con otros registros.',
    413: 'Las imgenes seleccionadas superan el tamaó permitido.',
    422: 'No se pudo guardar porque uno o más datos no tienen el formato esperado. Revísalos e inténtalo de nuevo.',
    500: 'El servidor tuvo un problema al procesar la solicitud. Inténtalo de nuevo más tarde.'
  };

  function obtenerMensajeErrorPrenda(error) {
    const status = error?.response?.status;
    if (mensajesPorEstado[status]) return mensajesPorEstado[status];
    if (status >= 500) return mensajesPorEstado[500];
    if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error')) {
      return 'No se pudo conectar con el servidor. Revisa tu conexion e inténtalo de nuevo.';
    }
    return 'Ocurri un error al procesar la prenda. Inténtalo de nuevo.';
  }

  function obtenerMensajeErrorEliminacionPrenda(error) {
    if (error?.response?.status === 409) {
      return 'No se puede eliminar esta prenda porque ya tiene ventas registradas. Puedes desactivarla para retirarla del catálogo.';
    }
    if (error?.response?.status === 403) return mensajesPorEstado[403];
    if (error?.response?.status === 404) return mensajesPorEstado[404];
    return 'No se pudo eliminar la prenda. Inténtalo de nuevo o desactvala para retirarla del catálogo.';
  }

  export function useGestionPrendas() {
    const authStore = useAutenticacionStore();
    const { notificarExito, notificarError, notificarAdvertencia, confirmarAccion } = useNotificacion();
    const { resolverUrlImagen } = useImagenStorage();
    const BASE = '/productos';

    const usuario = computed(() => authStore.usuario);
    const menuUsuarioAbierto = ref(false);

    const productos = ref([]);
    const categorias = ref([]);
    const catalogos = ref([]);
    const creandoCategoria = ref(false);
    const creandoCatalogo = ref(false);
    const cargandoProductos = ref(false);
    const errorCargaProductos = ref('');

    const mostrarModal = ref(false);
    const mostrarModalEditar = ref(false);
    const modoFormulario = ref('crear');
    const guardando = ref(false);
    const eliminandoProducto = ref(false);
    const productoPendienteImagenesId = ref(null);
    const errorFormulario = ref('');
    const errorOpcionesFormulario = ref('');
    const productoActual = ref(null);
    const busqueda = ref('');
    let solicitudDetalle = 0;

    const imagenes = ref([]);
    const imagenesEliminadas = ref([]);
    const variantes = ref([]);
    const idsVariantesOriginales = ref([]);
    const formulario = ref({
      nombre: '',
      descripcion: '',
      color: '',
      categoria_id: '',
      catalogo_id: ''
    });

    const inputArchivos = ref(null);
    const errorImagenes = ref('');

    function estaActivo(valor) {
      return valor === true || valor === 1 || valor === '1';
    }

    function abrirSelectorArchivos() {
      inputArchivos.value?.click();
    }

    function agregarArchivos(archivos) {
      errorImagenes.value = '';
      const { validas: validos, rechazadas } = seleccionarImagenesPrenda(
        archivos,
        imagenes.value.length
      );

      if (rechazadas) {
        errorImagenes.value = `No se agregaron ${rechazadas} imagen(es). Usa archivos JPG, PNG o WEBP de mximo 4 MB y no superes 9 fotos por prenda.`;
      }

      const necesitaPortada = !imagenes.value.some(imagen => imagen.portada);
      const nuevos = validos.map((archivo, indice) => ({
        archivo,
        vista: URL.createObjectURL(archivo),
        portada: necesitaPortada && indice === 0,
        portadaOriginal: false,
        existente: false
      }));

      imagenes.value.push(...nuevos);
    }

    function elegirArchivos(evento) {
      agregarArchivos(evento.target.files);
      evento.target.value = '';
    }

    function marcarPortada(indiceElegido) {
      imagenes.value.forEach((imagen, indice) => {
        imagen.portada = indice === indiceElegido;
      });
    }

    function registrarImagenEliminada(idImagen) {
      imagenesEliminadas.value.push(idImagen);
    }

    function quitarImagen(indice) {
      const [eliminada] = imagenes.value.splice(indice, 1);
      if (eliminada?.vista && eliminada.vista.startsWith('blob:')) {
        URL.revokeObjectURL(eliminada.vista);
      }
      if (eliminada?.id_imagen) {
        registrarImagenEliminada(eliminada.id_imagen);
      }

      if (!imagenes.value.some(imagen => imagen.portada) && imagenes.value.length) {
        imagenes.value[0].portada = true;
      }
    }

    function agregarVariante() {
      variantes.value.push({
        id_variante: null,
        talla: '',
        sku: '',
        precio: '',
        stockInicial: 0
      });
    }

    function quitarVariante(indice) {
      variantes.value.splice(indice, 1);
    }

    const productosFiltrados = computed(() => {
      const texto = busqueda.value.trim().toLocaleLowerCase();
      if (!texto) return productos.value;

      return productos.value.filter(p =>
        [p.nombre, p.tipo_producto, p.color]
          .some(valor => String(valor ?? '').toLocaleLowerCase().includes(texto))
      );
    });

    function cerrarModal() {
      mostrarModal.value = false;
    }

    function abrirNuevaPrenda() {
      modoFormulario.value = 'crear';
      productoPendienteImagenesId.value = null;
      formulario.value = {
        nombre: '',
        descripcion: '',
        color: '',
        categoria_id: '',
        catalogo_id: ''
      };
      variantes.value = [];
      imagenes.value.forEach(imagen => {
        if (imagen.vista && imagen.vista.startsWith('blob:')) URL.revokeObjectURL(imagen.vista);
      });
      imagenes.value = [];
      imagenesEliminadas.value = [];
      idsVariantesOriginales.value = [];
      errorFormulario.value = '';
      mostrarModalEditar.value = true;
    }

    function cerrarModalEditar() {
      if (guardando.value) return;
      imagenes.value.forEach(imagen => {
        if (imagen.vista && imagen.vista.startsWith('blob:')) URL.revokeObjectURL(imagen.vista);
      });
      imagenes.value = [];
      imagenesEliminadas.value = [];
      productoPendienteImagenesId.value = null;
      mostrarModalEditar.value = false;
      errorFormulario.value = '';
    }

    function resolverRuta(item) {
      return resolverUrlImagen(item);
    }

    function editarProducto() {
      const producto = productoActual.value;
      if (!producto) return;

      modoFormulario.value = 'editar';
      formulario.value = {
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        color: producto.color || '',
        categoria_id: producto.categoria_id ? String(producto.categoria_id) : '',
        catalogo_id: producto.catalogo_id ? String(producto.catalogo_id) : ''
      };
      variantes.value = (producto.variantes || []).map(variante => ({
        id_variante: variante.id_variante,
        talla: variante.talla || '',
        sku: variante.sku || '',
        precio: Number(variante.precio_venta),
        stockInicial: Number(variante.stock || 0),
        stockOriginal: Number(variante.stock || 0)
      }));
      idsVariantesOriginales.value = variantes.value.map(variante => variante.id_variante);
      imagenes.value = (producto.imagenes || []).map(imagen => ({
        id_imagen: imagen.id_imagen,
        ruta: imagen.ruta,
        archivo: null,
        vista: resolverRuta(imagen),
        portada: Boolean(imagen.es_principal),
        portadaOriginal: Boolean(imagen.es_principal),
        existente: true
      }));
      imagenesEliminadas.value = [];
      mostrarModal.value = false;
      mostrarModalEditar.value = true;
    }

    function stockTotal(producto) {
      return (producto?.variantes || []).reduce(
        (total, variante) => total + Number(variante.stock || 0),
        0
      );
    }

    async function borrarProducto() {
      if (eliminandoProducto.value) return;
      const producto = productoActual.value;
      if (!producto) return;
      const idProducto = Number(producto.id_producto || producto.id);
      if (!Number.isSafeInteger(idProducto) || idProducto <= 0) {
        notificarError('No se pudo identificar la prenda que quieres eliminar. Actualiza la lista e inténtalo de nuevo.');
        return;
      }
      eliminandoProducto.value = true;
      try {
        const confirmado = await confirmarAccion({
          titulo: 'Eliminar prenda',
          texto: `¿Eliminar "${producto.nombre}"? Solo se pueden eliminar prendas sin movimientos de inventario ni ventas. Si ya los tiene, puedes desactivarla para retirarla del catálogo.`,
          textoBotonConfirmar: 'Eliminar prenda'
        });
        if (!confirmado) return;

        await clienteApi.delete(`${BASE}/${idProducto}`);
        mostrarModal.value = false;
        await cargarProductos();
        notificarExito(`Se elimin "${producto.nombre}".`);
      } catch (error) {
        notificarError(`No se pudo eliminar "${producto.nombre}". ${obtenerMensajeErrorEliminacionPrenda(error, variantes.value)}`);
      } finally {
        eliminandoProducto.value = false;
      }
    }

    function validarFormularioPrenda() {
      errorFormulario.value = '';

      if (!validarCampoPrenda('nombre', formulario.value.nombre)) {
        errorFormulario.value = 'El nombre es obligatorio y solo admite letras, números y puntuacion comun.';
        return false;
      }

      if (!validarCampoPrenda('descripcion', formulario.value.descripcion)) {
        errorFormulario.value = 'La descripción es obligatoria y no admite caracteres de control.';
        return false;
      }

      if (!validarCampoPrenda('color', formulario.value.color)) {
        errorFormulario.value = 'El color es obligatorio y debe tener un formato válido.';
        return false;
      }

      if (variantes.value.length === 0) {
        errorFormulario.value = 'Agrega al menos una variante.';
        return false;
      }

      const tallas = new Set();
      const skus = new Set();

      for (const variante of variantes.value) {
        const talla = String(variante.talla || '').trim();
        const sku = String(variante.sku || '').trim();
        if (!validarCampoPrenda('talla', talla)) {
          errorFormulario.value = 'La talla solo puede contener letras y espacios.';
          return false;
        }

        if (!validarCampoPrenda('sku', sku)) {
          errorFormulario.value = 'El SKU solo admite letras, números, guion y guion bajo.';
          return false;
        }

        if (!validarPrecio(variante.precio)) {
          errorFormulario.value = 'El precio no puede ser negativo y admite mximo dos decimales.';
          return false;
        }

        if (!validarStock(variante.stockInicial)) {
          errorFormulario.value = 'El stock debe ser un entero igual o mayor que cero.';
          return false;
        }

        const tallaNormalizada = talla.toLocaleLowerCase();
        if (tallas.has(tallaNormalizada)) {
          errorFormulario.value = 'No repitas una talla dentro de la prenda.';
          return false;
        }
        const skuNormalizado = sku.toUpperCase();
        if (skus.has(skuNormalizado)) {
          errorFormulario.value = 'Cada variante debe tener un SKU distinto.';
          return false;
        }

        tallas.add(tallaNormalizada);
        skus.add(skuNormalizado);
      }

      return true;
    }

    function datosProducto() {
      return {
        nombre: formulario.value.nombre.trim(),
        descripcion: formulario.value.descripcion.trim(),
        color: formulario.value.color.trim(),
        categoria_id: formulario.value.categoria_id ? Number(formulario.value.categoria_id) : null,
        catalogo_id: formulario.value.catalogo_id ? Number(formulario.value.catalogo_id) : null
      };
    }

    async function registrarMovimientoStock(idProducto, idVariante, cantidad, tipo, concepto) {
      return clienteApi.post('/inventarios', {
        producto_id: idProducto,
        variante_id: idVariante,
        tipo_movimiento: tipo,
        concepto,
        cantidad
      });
    }

    async function guardarVariantes(idProducto, variantesCreadas, tareasPendientes) {
      const idsConservados = new Set(
        variantes.value.map(variante => variante.id_variante).filter(Boolean)
      );

      for (const variante of variantes.value) {
        let varianteGuardada;
        const esNueva = !variante.id_variante;
        const datos = {
          talla: String(variante.talla).trim(),
          sku: String(variante.sku).trim(),
          precio_venta: Number(variante.precio)
        };

        try {
          if (modoFormulario.value === 'crear') {
            varianteGuardada = variantesCreadas.find(item => item.sku === datos.sku);
          } else if (esNueva) {
            const respuesta = await clienteApi.post(`${BASE}/${idProducto}/variantes`, datos);
            varianteGuardada = respuesta.data?.data ?? respuesta.data;
            variante.id_variante = varianteGuardada?.id_variante;
          } else {
            const respuesta = await clienteApi.put(`${BASE}/variantes/${variante.id_variante}`, datos);
            varianteGuardada = respuesta.data?.data ?? respuesta.data;
          }

          if (!varianteGuardada?.id_variante) {
            tareasPendientes.push(`No pudimos confirmar el guardado de la talla ${datos.talla} (SKU ${datos.sku}). Revisa la prenda antes de volver a intentarlo.`);
            continue;
          }

          const cantidad = Number(variante.stockInicial);
          const debeRegistrarStock = modoFormulario.value === 'crear'
            ? cantidad > 0
            : (esNueva ? cantidad > 0 : cantidad !== Number(variante.stockOriginal));

          if (debeRegistrarStock) {
            const tipo = esNueva || modoFormulario.value === 'crear' ? 'entrada' : 'ajuste';
            const concepto = tipo === 'entrada' ? 'Stock inicial' : 'Ajuste desde administrador';
            await registrarMovimientoStock(
              idProducto,
              varianteGuardada.id_variante,
              cantidad,
              tipo,
              concepto
            );
          }
        } catch (error) {
          const msg = obtenerMensajeErrorPrenda(error, [variante]);
          tareasPendientes.push(`Variante ${datos.sku}: ${msg}`);
        }
      }

      if (modoFormulario.value === 'editar') {
        for (const idVariante of idsVariantesOriginales.value) {
          if (idsConservados.has(idVariante)) continue;

          try {
            await clienteApi.delete(`${BASE}/variantes/${idVariante}`);
          } catch (error) {
            const msg = obtenerMensajeErrorPrenda(error, variantes.value);
            tareasPendientes.push(`No se pudo quitar una variante anterior: ${msg}`);
          }
        }
      }
    }

    function obtenerMensajeError(error, fallback = 'No se pudo completar el cambio porque el servidor tuvo un problema temporal. Inténtalo nuevamente.') {
      return obtenerMensajeErrorPrenda(error, variantes.value, fallback);
    }

    function obtenerDetalleErrorImagen(error) {
      return obtenerMensajeError(error, 'No se pudo cargar la imagen. Revisa el archivo e inténtalo de nuevo.');
    }

    async function guardarImagenes(idProducto) {
      const erroresImagenes = [];

      for (const [orden, imagen] of imagenes.value.entries()) {
        if (imagen.subida) continue;

        let archivo = imagen.archivo;
        const cambiaPortadaExistente = imagen.existente && imagen.portada && !imagen.portadaOriginal;

        if (!archivo && cambiaPortadaExistente) {
          try {
            const respuestaFoto = await fetch(imagen.vista);
            if (!respuestaFoto.ok) throw new Error('No se pudo leer la foto existente.');
            const blob = await respuestaFoto.blob();
            const nombre = (imagen.ruta || '').split('/').pop() || 'portada.jpg';
            archivo = new File([blob], nombre, { type: blob.type || 'image/jpeg' });
          } catch (error) {
            erroresImagenes.push(`No se pudo cambiar la portada: ${obtenerDetalleErrorImagen(error)}`);
            continue;
          }
        }

        if (!archivo) continue;

        const datosImagen = new FormData();
        datosImagen.append('imagen', archivo);
        datosImagen.append('es_principal', imagen.portada ? '1' : '0');
        datosImagen.append('orden', String(orden));

        try {
          await clienteApi.post(`${BASE}/${idProducto}/imagenes`, datosImagen, {
            headers: { 'Content-Type': 'multipart/form-data' },
               timeout: 60000
              });
          imagen.subida = true;

          if (cambiaPortadaExistente && imagen.id_imagen) {
            if (!imagenesEliminadas.value.includes(imagen.id_imagen)) {
              imagenesEliminadas.value.push(imagen.id_imagen);
            }
          }
        } catch (error) {
          erroresImagenes.push(`${archivo.name}: ${obtenerDetalleErrorImagen(error)}`);
        }
      }

      for (const idImagen of [...imagenesEliminadas.value]) {
        try {
          await clienteApi.delete(`${BASE}/imagenes/${idImagen}`);
          imagenesEliminadas.value = imagenesEliminadas.value.filter(id => id !== idImagen);
        } catch (error) {
          erroresImagenes.push(`No se pudo eliminar una foto anterior: ${obtenerDetalleErrorImagen(error)}`);
        }
      }

      return erroresImagenes;
    }

    async function reintentarGuardadoImagenes() {
      const idProducto = productoPendienteImagenesId.value;
      if (!idProducto || guardando.value) return;

      guardando.value = true;
      errorImagenes.value = '';
      try {
        const erroresImagenes = await guardarImagenes(idProducto);
        if (erroresImagenes.length) {
          errorImagenes.value = `No se pudieron guardar todas las imgenes: ${erroresImagenes.join(' ')}`;
          return;
        }

        await cargarProductos();
        imagenes.value.forEach(imagen => {
          if (imagen.vista?.startsWith('blob:')) URL.revokeObjectURL(imagen.vista);
        });
        imagenes.value = [];
        imagenesEliminadas.value = [];
        productoPendienteImagenesId.value = null;
        mostrarModalEditar.value = false;
        errorImagenes.value = '';
        notificarExito('Imgenes guardadas correctamente.');
      } catch (error) {
        errorImagenes.value = obtenerDetalleErrorImagen(error);
      } finally {
        guardando.value = false;
      }
    }

    async function guardarPrenda() {
      if (guardando.value) return;
      if (!validarFormularioPrenda()) {
        return;
      }

      guardando.value = true;
      const tareasPendientes = [];

      try {
        let idProducto;
        let variantesCreadas = [];

        if (modoFormulario.value === 'crear') {
          const respuesta = await clienteApi.post(BASE, {
            ...datosProducto(),
            activo: true,
            publicado: true,
            variantes: variantes.value.map(variante => ({
              talla: String(variante.talla).trim(),
              sku: String(variante.sku).trim(),
              precio_venta: Number(variante.precio)
            }))
          });
          const dataRes = respuesta.data?.data ?? respuesta.data;
          idProducto = dataRes?.id_producto;
          variantesCreadas = dataRes?.variantes || [];
        } else {
          idProducto = productoActual.value?.id_producto;
          if (!idProducto) throw new Error('No se encontr la prenda que se quiere editar.');

          await clienteApi.patch(`${BASE}/${idProducto}`, datosProducto());
        }

        if (!idProducto) throw new Error('El servidor no devolvi el ID de la prenda.');

        await guardarVariantes(idProducto, variantesCreadas, tareasPendientes);
        const erroresImagenes = await guardarImagenes(idProducto);
        if (erroresImagenes.length) {
          productoPendienteImagenesId.value = idProducto;
          errorImagenes.value = `La prenda se guardó, pero no todas las imgenes: ${erroresImagenes.join(' ')}`;
          await cargarProductos();
          return;
        }
        await cargarProductos();

        imagenes.value.forEach(imagen => {
          if (imagen.vista && imagen.vista.startsWith('blob:')) URL.revokeObjectURL(imagen.vista);
        });
        imagenes.value = [];
        imagenesEliminadas.value = [];
        mostrarModalEditar.value = false;
        mostrarModal.value = false;

        if (tareasPendientes.length) {
          notificarAdvertencia('La prenda se guardó, pero algunas variantes o movimientos requieren atencion: ' + tareasPendientes.join(' '));
        } else {
          notificarExito(modoFormulario.value === 'crear'
            ? 'Prenda creada correctamente.'
            : 'Prenda actualizada correctamente.');
        }
      } catch (error) {
        errorFormulario.value = obtenerMensajeError(error, 'No se pudo guardar la prenda porque el servidor tuvo un problema temporal. Inténtalo nuevamente.');
      } finally {
        guardando.value = false;
      }
    }

    function obtenerPrimeraImagen(p) {
      if (!p) return null;
      if (p.imagen) return p.imagen;

      if (p.imagenes && p.imagenes.length > 0) {
        const primera = p.imagenes.find(imagen => imagen.es_principal) || p.imagenes[0];
        return primera?.url || primera?.ruta || null;
      }

      return null;
    }

    function precioDesde(producto) {
      const precios = (producto.variantes || [])
        .map(variante => Number(variante.precio_venta))
        .filter(precio => Number.isFinite(precio) && precio >= 0);

      return precios.length ? Math.min(...precios).toLocaleString('es-CO') : null;
    }

    async function cargarProductos() {
      cargandoProductos.value = true;
      errorCargaProductos.value = '';

      try {
        const respuesta = await clienteApi.get(BASE);
        const data = respuesta.data;
        const lista = data?.data ?? (Array.isArray(data) ? data : []);

        productos.value = lista;

      } catch (err) {
        productos.value = [];
        errorCargaProductos.value = obtenerMensajeError(err, 'No se pudieron cargar las prendas. Revisa tu conexion e inténtalo de nuevo.');
      } finally {
        cargandoProductos.value = false;
      }
    }

    async function cambiarEstadoActivo(producto, activo) {
      const id = Number(producto.id_producto || producto.id);
      const estadoAnterior = estaActivo(producto.activo);
      producto.activo = activo;

      try {
        const respuesta = await clienteApi.patch(`${BASE}/${id}/toggle-activo`);
        const data = respuesta.data?.data ?? respuesta.data;
        producto.activo = estaActivo(data?.activo ?? activo);
        notificarExito(`Prenda ${activo ? 'activada' : 'desactivada'} correctamente.`);
      } catch (error) {
        producto.activo = estadoAnterior;
        notificarError(`No se pudo ${activo ? 'activar' : 'desactivar'} "${producto.nombre}": ${obtenerMensajeError(error)}`);
      }
    }

    async function cambiarEstadoPublicado(producto, publicado) {
      const id = Number(producto.id_producto || producto.id);
      const estadoAnterior = estaActivo(producto.publicado);
      producto.publicado = publicado;

      try {
        const respuesta = await clienteApi.patch(`${BASE}/${id}/toggle-publicado`);
        const data = respuesta.data?.data ?? respuesta.data;
        producto.publicado = estaActivo(data?.publicado ?? publicado);
        notificarExito(`Prenda ${publicado ? 'publicada en la tienda' : 'oculta de la tienda'}.`);
      } catch (error) {
        producto.publicado = estadoAnterior;
        notificarError(`No se pudo ${publicado ? 'publicar' : 'ocultar'} "${producto.nombre}": ${obtenerMensajeError(error)}`);
      }
    }

    async function cargarOpcionesFormulario() {
      errorOpcionesFormulario.value = '';
      try {
        const [respuestaCategorias, respuestaCatalogos] = await Promise.all([
          clienteApi.get('/categorias'),
          clienteApi.get('/catalogos')
        ]);

        const datosCategorias = respuestaCategorias.data?.data ?? (Array.isArray(respuestaCategorias.data) ? respuestaCategorias.data : []);
        const datosCatalogos = respuestaCatalogos.data?.data ?? (Array.isArray(respuestaCatalogos.data) ? respuestaCatalogos.data : []);

        categorias.value = datosCategorias;
        catalogos.value = datosCatalogos;
      } catch (err) {
        errorOpcionesFormulario.value = obtenerMensajeError(err, 'No se pudieron cargar las categorías y colecciones. Inténtalo de nuevo.');
      }
    }

    async function crearOpcionFormulario(nombre, endpoint, opciones, idCampo, campoFormulario, estadoCreacion, etiqueta) {
      if (estadoCreacion.value) return;

      const nombreNormalizado = String(nombre || '').trim();
      if (!nombreNormalizado) {
        errorFormulario.value = `Escribe un nombre para ${etiqueta}.`;
        return;
      }
      if (!validarCampoPrenda('opcion', nombreNormalizado)) {
        errorFormulario.value = `El nombre de ${etiqueta} contiene caracteres no permitidos o supera 40 caracteres.`;
        return;
      }

      estadoCreacion.value = true;
      errorFormulario.value = '';
      try {
        const respuesta = await clienteApi.post(endpoint, { nombre: nombreNormalizado });
        const creada = respuesta.data?.data ?? respuesta.data ?? {};
        await cargarOpcionesFormulario();

        const idCreada = creada[idCampo] ?? creada.id;
        let opcion = opciones.value.find(item =>
          idCreada != null
            ? String(item[idCampo]) === String(idCreada)
            : String(item.nombre || '').trim().toLocaleLowerCase() === nombreNormalizado.toLocaleLowerCase()
        );

        if (!opcion && idCreada != null) {
          opcion = { ...creada, [idCampo]: idCreada, nombre: creada.nombre || nombreNormalizado };
          opciones.value = [...opciones.value, opcion];
        }

        if (!opcion) {
          errorFormulario.value = `Se cre ${etiqueta}, pero no apareci en la lista. Actualiza las opciones e inténtalo de nuevo.`;
          return;
        }
        formulario.value = { ...formulario.value, [campoFormulario]: String(opcion[idCampo]) };
        notificarExito(`${etiqueta.charAt(0).toUpperCase()}${etiqueta.slice(1)} creada correctamente.`);
      } catch (error) {
        errorFormulario.value = obtenerMensajeError(error, `No se pudo crear ${etiqueta}. Revisa los datos e inténtalo de nuevo.`);
      } finally {
        estadoCreacion.value = false;
      }
    }

    function crearCategoria(nombre) {
      return crearOpcionFormulario(nombre, '/categorias', categorias, 'id_categoria', 'categoria_id', creandoCategoria, 'la categoría');
    }

    function crearCatalogo(nombre) {
      return crearOpcionFormulario(nombre, '/catalogos', catalogos, 'id_catalogo', 'catalogo_id', creandoCatalogo, 'el catálogo');
    }

    async function abrirModal(id) {
      const idProducto = Number(id);
      if (!Number.isSafeInteger(idProducto) || idProducto <= 0) return;
      const solicitudActual = ++solicitudDetalle;

      try {
        const respuesta = await clienteApi.get(`${BASE}/${idProducto}`);
        if (solicitudActual !== solicitudDetalle) return;

        const producto = respuesta.data?.data ?? respuesta.data;
        if (!producto) {
          notificarError('No encontramos esta prenda. Actualiza la lista e inténtalo de nuevo.');
          return;
        }

        productoActual.value = producto;
        mostrarModal.value = true;
      } catch (error) {
        if (solicitudActual !== solicitudDetalle) return;
        notificarError(`No pudimos cargar el detalle de la prenda. ${obtenerMensajeError(error)}`);
      }
    }

    async function cerrarSesion() {
      await authStore.cerrarSesion();
    }

    onMounted(() => {
      cargarProductos();
      cargarOpcionesFormulario();
    });
    
    useRecargaAutomatica(() => Promise.all([cargarProductos(), cargarOpcionesFormulario()]));

    return {
      usuario,
      menuUsuarioAbierto,
      productos,
      categorias,
      catalogos,
      creandoCategoria,
      creandoCatalogo,
      cargandoProductos,
      errorCargaProductos,
      mostrarModal,
      mostrarModalEditar,
      modoFormulario,
      guardando,
      eliminandoProducto,
      errorFormulario,
      productoPendienteImagenesId,
      errorOpcionesFormulario,
      productoActual,
      busqueda,
      imagenes,
      imagenesEliminadas,
      variantes,
      idsVariantesOriginales,
      formulario,
      inputArchivos,
      errorImagenes,
      productosFiltrados,
      abrirSelectorArchivos,
      agregarArchivos,
      elegirArchivos,
      marcarPortada,
      quitarImagen,
      agregarVariante,
      quitarVariante,
      cerrarModal,
      abrirNuevaPrenda,
      cerrarModalEditar,
      editarProducto,
      stockTotal,
      borrarProducto,
      guardarPrenda,
      reintentarGuardadoImagenes,
      obtenerPrimeraImagen,
      precioDesde,
      cargarProductos,
      cambiarEstadoActivo,
      cambiarEstadoPublicado,
      cargarOpcionesFormulario,
      crearCategoria,
      crearCatalogo,
      abrirModal,
      cerrarSesion,
      resolverRuta
    };
  }
