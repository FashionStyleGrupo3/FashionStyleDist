# Playbook Maestro para Antigravity: Traducción de Fashion Style (Vue 3 $\rightarrow$ Flutter) y Sincronización Sostenible

Esta guía está diseñada específicamente para dirigir a un modelo más pequeño (**Gemini 3.8 en Antigravity**) en la misión de **traducir el frontend actual de Fashion Style (Vue 3 + Vite + Pinia + Tailwind CSS) a una aplicación móvil nativa en [Flutter](https://docs.flutter.dev/)** conectada al mismo backend Laravel (`https://fashionstyle.api.adsocidm.com/public/api`), garantizando que cada actualización futura en Web se sincronice de forma limpia en Flutter y que el despliegue en **Git / GitHub Pages** sea automático.

---

## 1. Mapa de Equivalencia Exacta: De Vue 3 (`FashionStyleFrontEnd-main`) a Flutter (Dart)

Un modelo débil falla al pasar de JavaScript a Dart porque JavaScript tiene tipado dinámico (`variante.id_variante ?? variante.id`, `"25000"` como string o número) mientras que **Dart tiene Null-Safety estricto**. Esta tabla define la traducción exacta archivo por archivo que el modelo debe respetar:

| Capa / Archivo Actual en Vue 3 (`src/`) | Equivalente Exacto en Flutter (`lib/`) | Paquete Oficial en `pub.dev` | Reglas Críticas de Traducción para Gemini 3.8 |
| :--- | :--- | :--- | :--- |
| `services/clienteApi.js` (Axios + Interceptores) | `core/network/api_client.dart` | [`dio`](https://pub.dev/packages/dio) | Inyectar header `Authorization: Bearer $token` y `X-Socket-ID`. Conservar la expresión regular `PATRON_DATOS_SENSIBLES` para sanitizar errores SQL/500 y emitir eventos al `ChangeBus` en `POST/PUT/PATCH/DELETE`. |
| `utils/respuestaApi.js` (`extraerDatos`, `extraerPaginado`) | `core/network/api_response_parser.dart` | Dart Core | Soportar tanto listas planas como respuestas paginadas de Laravel (`data.data`, `meta.current_page`, `last_page`, `total`) y coerción segura (`asInt`, `asDouble`, `asBool`, `asString`). |
| `stores/autenticacion.js`, `carrito.js`, `favoritos.js`, `filtros.js` | `presentation/providers/auth_provider.dart`, `cart_provider.dart`, `favorites_provider.dart`, `filters_provider.dart` | [`flutter_riverpod`](https://pub.dev/packages/flutter_riverpod) + [`shared_preferences`](https://pub.dev/packages/shared_preferences) | Conservar las mismas llaves de persistencia (`fs_token`, `fs_user`, `fs_roles`, `fs_carrito`, `favoritos`) y los getters de rol (`esAdmin`, `esEmpleado`, `esPersonal`). |
| `router/index.js` (Vue Router + Guards de Rol) | `core/router/app_router.dart` | [`go_router`](https://pub.dev/packages/go_router) | Replicar la validación de `requiereAutenticacion` y `rolesPermitidos` (`['admin', 'administrador', 'super-admin', 'empleado', 'staff']`). |
| `tailwind.config.js` + `assets/estilos/variables.css` | `core/theme/fashion_theme.dart` | `flutter/material.dart` + `google_fonts` | Usar los colores exactos de la tienda: Negro `#111111`, Texto `#2B2B2B`, Crema `#F7F4EF`, Arena `#ECE5DA`, Arena Suave `#F3EEE6`, Arena Oscura `#D4C2A8`, Pizarra `#56657A`, Borde `#E4DDD2`, Rojo `#D9434B`. Fuentes: `Poppins` y `Montserrat`. |
| `composables/useImagenStorage.js` | `core/utils/image_url_resolver.dart` | `cached_network_image` | Resolver siempre hacia `https://fashionstyle.api.adsocidm.com/storage/<ruta>` limpiando prefijos `/storage/` duplicados y usando placeholder local si viene vacío. |
| `services/wompiServicio.js` (`WidgetCheckout`) | `data/services/wompi_service.dart` + `presentation/widgets/wompi_checkout_webview.dart` | `webview_flutter` | Mantener intactos `POST /checkout`, `/reanudar`, `/cancelar` y `/confirmar`. Abrir el widget de Wompi en un `WebViewWidget` modal y confirmar el `transaccion_id` con el backend. |
| `VisorFacturaFashion.vue` + `VistaVentasPOS.vue` (`html2pdf.js`, `window.print`) | `core/utils/invoice_pdf_generator.dart` | `pdf` + `printing` + `share_plus` | Generar el PDF nativo de la factura/comprobante POS en Dart y abrir el diálogo nativo de compartir/imprimir del teléfono. |
| `services/tiempoReal.js` + `useRecargaAutomatica.js` | `core/realtime/reverb_service.dart` + `auto_reload_mixin.dart` | `web_socket_channel` + `AppLifecycleListener` | Escuchar el canal `cambios` (evento `.datos.actualizados`) y recargar datos cuando la app vuelve de segundo plano (`AppLifecycleState.resumed`). |
| `utils/validacionCampos.js`, `validacionPrenda.js`, `validarPassword.js`, `Validarciudad.js` | `core/validators/field_validators.dart`, `garment_validators.dart`, `password_validator.dart` | Dart RegExp (`unicode: true`) | Traducir 1:1 las expresiones regulares Unicode y reglas de contraseña (10–64 caracteres, mayúscula, minúscula, número, símbolo y lista negra de palabras comunes). |

---

## 2. Arquitectura Sostenible en el Tiempo: Cómo Actualizar Web (Vue 3) y Mantener Flutter al Día

El mayor riesgo al tener el frontend web en **Vue 3** y la app móvil en **Flutter** es que, al actualizar el proyecto web, nadie sepa qué archivos de Dart deben actualizarse. Para que la evolución sea **100% sostenible y mecánica** con Antigravity, implementa estas 3 reglas:

### Regla 1: Arquitectura Espejo 1:1 con Etiquetas `@source-mirror`
Cada archivo en Flutter debe llevar en su primera línea un comentario que indique de qué archivo de Vue proviene:
```dart
// @source-mirror: src/services/promocionServicio.js
// @last-synced-commit: a1b2c3d
```
De este modo, la estructura de carpetas en Flutter (`lib/`) refleja exactamente la de Vue (`src/`):

```text
fashion_style_mobile/ (Proyecto Flutter)
├── pubspec.yaml
└── lib/
    ├── main.dart
    ├── core/
    │   ├── config/env_config.dart             # <- vite.config.js / .env
    │   ├── theme/fashion_theme.dart           # <- tailwind.config.js + style.css
    │   ├── network/api_client.dart            # <- src/services/clienteApi.js
    │   ├── network/api_response_parser.dart   # <- src/utils/respuestaApi.js
    │   ├── network/change_bus.dart            # <- src/utils/busCambios.js
    │   ├── router/app_router.dart             # <- src/router/index.js
    │   ├── utils/currency_formatter.dart      # <- src/composables/useFormatoMoneda.js
    │   ├── utils/image_url_resolver.dart      # <- src/composables/useImagenStorage.js
    │   ├── utils/audit_text_formatter.dart    # <- src/utils/auditoriaTexto.js
    │   └── validators/                        # <- src/utils/validacion*.js
    ├── data/
    │   ├── models/                            # Modelos Dart con fromJson defensivo
    │   └── services/                          # <- Los 14 archivos de src/services/*.js
    └── presentation/
        ├── providers/                         # <- Los 4 stores de src/stores/*.js + composables
        ├── layouts/                           # <- src/layouts/DisenoPublico, DisenoAdmin, DisenoAutenticacion
        ├── screens/
        │   ├── publico/                       # <- 7 vistas de src/views/publico/
        │   ├── autenticacion/                 # <- 6 vistas de src/views/autenticacion/
        │   └── admin/                         # <- 10 vistas de src/views/admin/
        └── widgets/                           # <- Componentes de src/components/
```

### Regla 2: Sincronización Basada en `git diff` (Cero Retraducción Completa)
Cuando modifiques algo en el frontend Web (Vue 3):
1. Haz tu commit en el repositorio Web.
2. Ejecuta en la terminal: `git diff HEAD~1 HEAD -- src/ > ultimo_cambio_web.diff`
3. Pega ese `diff` en Antigravity usando el **Prompt 9 (Sincronizador Diferencial Web $\rightarrow$ Flutter)** incluido más abajo. El modelo localizará los archivos Dart con la etiqueta `@source-mirror` correspondiente y aplicará **únicamente el cambio incremental**.

---

## 3. Serie Secuencial de Prompts para Gemini 3.8 en Antigravity (Copiar y Pegar en Orden)

### Prompt 0: System Prompt / Reglas Globales de Traducción Vue 3 $\rightarrow$ Flutter (Pegar al iniciar)

```markdown
Actúa como un Ingeniero Senior experto en Flutter (Dart 3) y Vue 3. Tu misión es traducir el frontend de "Fashion Style" (actualmente en Vue 3 + Vite + Pinia + Tailwind CSS) a una aplicación móvil nativa en Flutter siguiendo las recomendaciones oficiales de arquitectura de Flutter (`docs.flutter.dev/app-architecture`).

REGLAS INQUEBRANTABLES PARA CADA RESPUESTA:
1. FIDELIDAD AL BACKEND LARAVEL: Prohibido cambiar URLs de endpoints, métodos HTTP o nombres de propiedades JSON que espera o devuelve el backend (`id_producto`, `id_variante`, `precio_venta`, `es_principal`, `categoria_id`, `catalogo_id`, `correo`, `access_token`, `transaccion_id`).
2. PARSEO JSON DEFENSIVO EN DART: En JavaScript los tipos son dinámicos, pero en Dart no. NUNCA hagas `json['precio_venta'] as double` directo porque Laravel puede enviar `"25000.00"` como String o Int. Usa siempre helpers seguros: `JsonParser.toInt()`, `JsonParser.toDouble()`, `JsonParser.toBool()`, `JsonParser.toStr()`.
3. PROHIBIDO TRUNCAR CÓDIGO: Nunca escribas `// ... resto del código`, `// TODO: implementar` ni omitas métodos. Entrega cada archivo `.dart` 100% completo, compilable y con todos sus imports.
4. TRAZABILIDAD SOSTENIBLE: En la primera línea de cada archivo `.dart`, incluye siempre el comentario `// @source-mirror: <ruta-del-archivo-original-en-vue>` indicando qué archivo de Vue estás traduciendo.
5. UN PASO A LA VEZ: Genera únicamente los archivos solicitados en el prompt actual y al final incluye una lista de 3 puntos llamada "Verificación en Terminal (`flutter analyze`)" antes de pasar al siguiente prompt.

Responde únicamente: "Reglas cargadas. Listo para ejecutar el Prompt 1."
```

---

### Prompt 1: Configuración Base (`pubspec.yaml`), Tema Visual (`fashion_theme.dart`) y Parseadores Defensivos

```markdown
TAREA: Crear la base del proyecto Flutter traduciendo la configuración visual de `tailwind.config.js`, `src/style.css`, `src/assets/estilos/variables.css`, `src/utils/respuestaApi.js` y `src/composables/useImagenStorage.js`.

Genera estos 4 archivos completos sin omitir ninguna línea:

1. `pubspec.yaml`:
   - Incluye dependencias estables para Flutter 3.x: `dio`, `flutter_riverpod`, `shared_preferences`, `go_router`, `google_fonts`, `cached_network_image`, `lucide_icons`, `intl`, `webview_flutter`, `web_socket_channel`, `image_picker`, `file_picker`, `pdf`, `printing`, `share_plus`, `url_launcher`.

2. `lib/core/theme/fashion_theme.dart` (`// @source-mirror: tailwind.config.js, src/style.css`):
   - Define la clase `FashionColors` con los colores exactos del proyecto:
     - `negro = Color(0xFF111111)`
     - `texto = Color(0xFF2B2B2B)`
     - `gris = Color(0xFF6F6F6F)`
     - `crema = Color(0xFFF7F4EF)`
     - `arena = Color(0xFFECE5DA)`
     - `arenaSuave = Color(0xFFF3EEE6)`
     - `arenaOscura = Color(0xFFD4C2A8)`
     - `pizarra = Color(0xFF56657A)`
     - `borde = Color(0xFFE4DDD2)`
     - `rojo = Color(0xFFD9434B)`
     - `rosaCorporativo = Color(0xFFE60067)`
   - Configura `ThemeData` con `GoogleFonts.poppinsTextTheme` para títulos y `GoogleFonts.montserratTextTheme` para cuerpo, botones con bordes redondeados (`10px`) y estilo limpio de boutique.

3. `lib/core/network/api_response_parser.dart` (`// @source-mirror: src/utils/respuestaApi.js`):
   - Implementa `JsonParser` con métodos estáticos `toInt(dynamic v, [int def = 0])`, `toDouble(dynamic v, [double def = 0.0])`, `toBool(dynamic v, [bool def = false])` (que acepte `true`, `1`, `'1'`, `'true'`, `'activa'`), `toStr(dynamic v, [String def = ''])`.
   - Implementa `extractData(dynamic responseData)` y `extractPaginated<T>(dynamic responseData, T Function(Map<String, dynamic>) fromJson)` replicando exactamente la lógica de `extraerDatos` y `extraerPaginado` de `src/utils/respuestaApi.js`.

4. `lib/core/utils/image_url_resolver.dart` (`// @source-mirror: src/composables/useImagenStorage.js`) y `lib/core/utils/currency_formatter.dart` (`// @source-mirror: src/composables/useFormatoMoneda.js`):
   - En `image_url_resolver.dart`, traduce `resolverUrlAlmacenamiento` usando como base `https://fashionstyle.api.adsocidm.com/storage`.
   - En `currency_formatter.dart`, traduce `formatearCOP(num? valor)` usando `NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0)`.
```

---

### Prompt 2: Cliente HTTP Dio (`api_client.dart`), Bus de Cambios (`change_bus.dart`) y Validadores

```markdown
TAREA: Traducir a Dart los archivos `src/services/clienteApi.js`, `src/utils/busCambios.dart`, `src/utils/validacionCampos.js`, `src/utils/validacionPrenda.js` y `src/utils/validarPassword.js`.

Lee el código original de esos archivos y genera estos 4 archivos Dart completos:

1. `lib/core/network/change_bus.dart` (`// @source-mirror: src/utils/busCambios.js`):
   - Implementa un `StreamController<DataChangeEvent>.broadcast()` que replique `emitirCambio(String ruta)`, `recibirCambioRemoto` y `normalizarRuta`, ignorando las rutas de `RUTAS_IGNORADAS` (`login`, `logout`, `register`, `auth`, `forgot-password`, `reset-password`, `verify-email`, `resend-verification`).

2. `lib/core/network/api_client.dart` (`// @source-mirror: src/services/clienteApi.js`):
   - Configura una instancia de `Dio` con `baseUrl: const String.fromEnvironment('API_BASE_URL', defaultValue: 'https://fashionstyle.api.adsocidm.com/public/api')`, `connectTimeout: Duration(seconds: 15)` y headers `Accept: application/json`.
   - En `onRequest`: lee `fs_token` desde `SharedPreferences` y agrega `Authorization: Bearer $token`, más `X-Socket-ID` si está disponible.
   - En `onResponse`: si el método es `post`, `put`, `patch` o `delete`, llama a `ChangeBus.instance.emitirCambio(...)`.
   - En `onError`: traduce exactamente `PATRON_DATOS_SENSIBLES`, `sanitizarTextoError` y `obtenerMensajeError(DioException error, [String fallback])`. Si `statusCode == 401`, limpia `fs_token`, `fs_user`, `fs_roles` y dispara un callback `onUnauthorized` para que GoRouter redirija a `/login`.

3. `lib/core/validators/garment_and_field_validators.dart` (`// @source-mirror: src/utils/validacionCampos.js, src/utils/validacionPrenda.js`):
   - Traduce todas las funciones de filtrado y validación (`filtrarCampo`, `validarCorreo`, `normalizarDatosEntrega`, `validarDatosEntrega`, `filtrarCampoPrenda`, `validarCampoPrenda`, `validarPrecio`, `validarStock`, `validarArchivoImagen`).

4. `lib/core/validators/password_validator.dart` (`// @source-mirror: src/utils/validarPassword.js`):
   - Traduce `REQUISITOS_PASSWORD` y `passwordEsSegura(String password)` con las 6 reglas exactas (10-64 caracteres, mayúscula, minúscula, número, símbolo y validación contra palabras comunes como `'password'`, `'fashionstyle'`, `'colombia'`).
```

---

### Prompt 3: Traducción de los Servicios de Tienda, Catálogo, Favoritos, Promociones y Pagos

```markdown
TAREA: Traducir a Dart los servicios públicos y de e-commerce desde `src/services/`:
- `src/services/productoServicio.js`
- `src/services/clasificacionServicio.js`
- `src/services/favoritosServicio.js`
- `src/services/promocionServicio.js`
- `src/services/wompiServicio.js`
- `src/utils/Validarciudad.js`

Genera los siguientes archivos Dart completos con sus modelos fuertemente tipados y `fromJson` defensivos:

1. `lib/data/models/product_models.dart`:
   - Modelos `Product`, `ProductVariant`, `ProductImage`, `Category`, `Catalog`, `Promotion`, `PriceInfo`.
   - Asegúrate de mapear tanto `id_producto` como `id`, `id_variante` como `id`, `precio_venta`, `stock`, `es_principal`, `id_categoria` y `id_catalogo`.

2. `lib/data/services/product_service.dart` (`// @source-mirror: src/services/productoServicio.js, src/services/clasificacionServicio.js`):
   - Traduce `obtenerProductos(filtros)` (incluyendo el filtrado de seguridad en cliente por `activo`, `categoriaId`, `catalogoId` y `busqueda`), `obtenerProducto(id)`, `obtenerCategorias()` y `obtenerCatalogos()`.

3. `lib/data/services/promotion_service.dart` (`// @source-mirror: src/services/promocionServicio.js`):
   - Traduce la caché de 60 segundos (`TTL_CACHE_MS = 60000`), `normalizarPromocion`, `estaVigente`, `obtenerPromocionesVigentes`, `calcularPrecioPromocional` y el CRUD (`listarPromociones`, `crearPromocion`, `actualizarPromocion`, `eliminarPromocion`).

4. `lib/data/services/favorites_and_city_service.dart` (`// @source-mirror: src/services/favoritosServicio.js, src/utils/Validarciudad.js`):
   - Traduce `listarFavoritosApi`, `agregarFavoritoApi`, `quitarFavoritoApi`, `sincronizarFavoritosApi`, `ciudadTieneFormatoValido`, `buscarCiudades` y `ciudadExiste`.

5. `lib/data/services/wompi_service.dart` (`// @source-mirror: src/services/wompiServicio.js`):
   - Traduce `crearCheckout`, `reanudarCheckout`, `cancelarCheckout`, `confirmarCheckout` y `consultarTransaccionWompi`.
```

---

### Prompt 4: Traducción de los Servicios Administrativos (Pedidos, Facturas, Ventas POS, Producción, Usuarios y Seguridad)

```markdown
TAREA: Traducir a Dart los servicios administrativos restantes de `src/services/`:
- `src/services/pedidoServicio.js`
- `src/services/facturaServicio.js`
- `src/services/ventaServicio.js`
- `src/services/pagoServicio.js`
- `src/services/Produccionservicio.js`
- `src/services/calculadoraApi.js`
- `src/services/usuarioServicio.js`
- `src/services/seguridadServicio.js`

Genera los siguientes 4 archivos Dart completos:

1. `lib/data/services/order_and_invoice_service.dart` (`// @source-mirror: src/services/pedidoServicio.js, src/services/facturaServicio.js`):
   - Incluye las constantes `ESTADOS_PEDIDO`, `ESTADOS_SIN_FLUJO`, `ESTADOS_CON_GUIA`, `TRANSPORTADORAS_SUGERIDAS`, `normalizarPedido`, `listarPedidos`, `obtenerPedido`, `actualizarDespacho`.
   - Incluye `normalizarFactura`, `listarFacturas`, `obtenerFactura`, `crearFactura`, `autoFacturarPedido` y `cargarFacturasMasivo` (usando `MultipartFile` de `dio`).

2. `lib/data/services/pos_and_payment_service.dart` (`// @source-mirror: src/services/ventaServicio.js, src/services/pagoServicio.js`):
   - Traduce `MEDIOS_PAGO_POS`, `normalizarVenta`, `listarVentas`, `obtenerResumenVentas`, `registrarVenta`, `cancelarVenta`, `obtenerConfiguracionPasarela`, `guardarConfiguracionPasarela`, `calcularDispersionFondos` y `obtenerControlParaleloPagos`.

3. `lib/data/services/production_and_calculator_service.dart` (`// @source-mirror: src/services/Produccionservicio.js, src/services/calculadoraApi.js`):
   - Traduce los CRUDs de `/materias-primas`, `/unidades-medida`, `/proveedores`, `/formulas-produccion`, `/ordenes-produccion` (incluyendo `/completar`) y la función completa `cargarDatosCalculadora()` con `indexarUnidades`, `indexarProductos`, `normalizarMaterias` y `agruparFormulas`.

4. `lib/data/services/user_and_security_service.dart` (`// @source-mirror: src/services/usuarioServicio.js, src/services/seguridadServicio.js`):
   - Traduce `obtenerPerfilActual`, `actualizarPerfil`, `actualizarContrasena`, `solicitarCambioCorreo`, `confirmarCambioCorreo`, `subirFotoPerfil`, `quitarFotoPerfil`, `obtenerClientes`, `actualizarCliente`, `obtenerUsuarios`, `crearUsuario`, `actualizarUsuario`, `asignarRolUsuario` y `obtenerAuditorias`.
```

---

### Prompt 5: Estado Global con Riverpod (Traducción de `src/stores/`) y Enrutador `GoRouter` (`src/router/index.js`)

```markdown
TAREA: Traducir los 4 almacenes de Pinia (`src/stores/autenticacion.js`, `src/stores/carrito.js`, `src/stores/favoritos.js`, `src/stores/filtros.js`) a Riverpod Notifiers y traducir `src/router/index.js` a `GoRouter`.

Genera estos 5 archivos completos:

1. `lib/presentation/providers/auth_provider.dart` (`// @source-mirror: src/stores/autenticacion.js`):
   - Estado con `token`, `usuario`, `roles`, `sesionHidratada`.
   - Getters exactos: `estaAutenticado`, `esAdmin` (`['admin', 'administrador', 'super-admin']`), `esEmpleado` (`['empleado', 'staff']`), `esPersonal`, `rolUsuario` y `rutaInicial()`.
   - Métodos: `iniciarSesion`, `registrar`, `verificarCorreo`, `reenviarCodigo`, `iniciarSesionConGoogle`, `actualizarUsuario`, `hidratarSesion`, `cerrarSesion`, `solicitarRecuperacion`, `restablecerContrasena`.
   - Persistencia en `SharedPreferences` usando las claves exactas `fs_token`, `fs_user`, `fs_roles`.

2. `lib/presentation/providers/cart_provider.dart` (`// @source-mirror: src/stores/carrito.js`):
   - Persistencia en `fs_carrito`.
   - Getters: `totalPrendas`, `totalMonto`, `categoriasEnCarrito`, `idsEnCarrito`.
   - Métodos: `agregarPrenda`, `actualizarCantidad`, `eliminarPrenda`, `actualizarPrecios`, `vaciarCarrito`, `actualizarStockDisponible`.

3. `lib/presentation/providers/favorites_provider.dart` (`// @source-mirror: src/stores/favoritos.js`):
   - Actualización optimista en `alternar(id)` con reversión en caso de fallo y `cargarDesdeServidor()`.

4. `lib/presentation/providers/filters_provider.dart` (`// @source-mirror: src/stores/filtros.js`):
   - Manejo de `categoriaId`, `catalogoId`, `busqueda`, `orden` (`'recientes'`) y `limpiarFiltros()`.

5. `lib/core/router/app_router.dart` (`// @source-mirror: src/router/index.js`):
   - Configura todas las rutas públicas (`/`, `/catalogo`, `/producto/:id`, `/carrito`, `/terminos`, `/perfil`), de autenticación (`/login`, `/registro`, `/verificar-correo`, `/recuperar-contrasena`, `/restablecer-contrasena`) y administrativas (`/admin`, `/admin/inventario`, `/admin/ventas`, `/admin/pedidos`, `/admin/produccion`, `/admin/prendas`, `/admin/cuenta`, `/admin/pagos`, `/admin/seguridad`, `/admin/seguridad/auditoria`) con sus guards de rol exactos.
```

---

### Prompt 6: Traducción de Layouts y Vistas Públicas (Escaparate, Catálogo, Detalle y Bolsa)

```markdown
TAREA: Traducir a widgets de Flutter el layout público y las vistas de la tienda para el cliente:
- `src/layouts/DisenoPublico.vue`
- `src/views/publico/VistaInicio.vue`
- `src/views/publico/Vistacatalogo.vue`
- `src/views/publico/VistaDetallePrenda.vue`
- `src/components/carrito/CajonCotizacion.vue`

Instrucciones de diseño y comportamiento en Flutter:
1. `lib/presentation/layouts/public_shell_layout.dart` (`// @source-mirror: src/layouts/DisenoPublico.vue`):
   - Crea un `Scaffold` con `AppBar` elegante de Fashion Style, `BottomNavigationBar` para navegar entre Inicio, Catálogo, Favoritos, Bolsa (con `Badge` mostrando `cartProvider.totalPrendas`) y Perfil/Admin, más un `EndDrawer` para el `CajonCotizacion` (Bolsa de compras).
2. `lib/presentation/screens/publico/home_screen.dart` (`// @source-mirror: src/views/publico/VistaInicio.vue`):
   - Banner hero, colecciones destacadas, cuadrícula de productos con `TarjetaProductoWidget` (mostrando insignia de descuento con `usePromociones`, botón de favorito y selector rápido de tallas).
3. `lib/presentation/screens/publico/catalog_screen.dart` (`// @source-mirror: src/views/publico/Vistacatalogo.vue`):
   - Barra de búsqueda, chips de filtro por categoría/colección, ordenamiento y `GridView.builder` responsivo con `RefreshIndicator`.
4. `lib/presentation/screens/publico/product_detail_screen.dart` (`// @source-mirror: src/views/publico/VistaDetallePrenda.vue`):
   - Galería deslizable con `PageView`, modal de guía de medidas (`ModalGuiaMedidas`), selector de variante/talla con stock en tiempo real, selector de cantidad y botón "Agregar a la bolsa".

Entrégame primero `public_shell_layout.dart` y `home_screen.dart` completos, y luego te pediré `catalog_screen.dart` y `product_detail_screen.dart`.
```

---

### Prompt 7: Traducción de Checkout Wompi (`VistaCarrito.vue`), Autenticación y Perfil del Cliente

```markdown
TAREA: Traducir a Flutter el flujo de Checkout con Wompi, las vistas de Autenticación y el Perfil de Usuario:
- `src/views/publico/VistaCarrito.vue`
- `src/views/publico/VistaMiPerfil.vue`
- `src/views/autenticacion/VistaInicioSesion.vue`
- `src/views/autenticacion/VistaRegistro.vue`
- `src/views/autenticacion/VistaVerificarCorreo.vue`
- `src/views/autenticacion/VistaRecuperarContrasena.vue`
- `src/views/autenticacion/VistaRestablecerContrasena.vue`

Genera en dos tandas:
Tanda 7A (Carrito, Checkout Wompi y Perfil):
1. `lib/presentation/screens/publico/cart_checkout_screen.dart` (`// @source-mirror: src/views/publico/VistaCarrito.vue`):
   - Formulario de datos de entrega con autocompletado de ciudades (`buscarCiudades` de `Validarciudad.js`) y validación `validarDatosEntrega`.
   - Al confirmar pedido, llama a `wompiService.crearCheckout(items, cliente)`. Si `pedido.simulado == true`, confirma con `SIM-${DateTime.now().millisecondsSinceEpoch}`; de lo contrario, abre `WompiCheckoutModal` (`webview_flutter`) con la referencia y `firma_integridad`, y al cerrar verifica con `confirmarCheckout(referencia, transaccionId)`.
2. `lib/presentation/screens/publico/profile_screen.dart` (`// @source-mirror: src/views/publico/VistaMiPerfil.vue`):
   - Pestañas de Datos Personales, Cambio de Contraseña, Cambio de Correo con código, Foto de Perfil (`image_picker`), Mis Pedidos (`SeccionMisPedidos` con opción de reanudar pago pendiente o ver factura) y Mis Favoritos (`SeccionFavoritos`).

Tanda 7B (Pantallas de Autenticación):
3. `lib/presentation/screens/autenticacion/auth_screens.dart`:
   - Traduce Login, Registro (con el widget interactivo `RequisitosPassword` en tiempo real), Verificación de Correo por código de 6 dígitos, Recuperar y Restablecer Contraseña.
```

---

### Prompt 8: Traducción del Panel Administrativo, Gestión de Prendas, Ventas POS, Producción y Facturas PDF

```markdown
TAREA: Traducir el Panel de Administración (`src/layouts/DisenoAdmin.vue` y las 10 vistas de `src/views/admin/`) a pantallas móviles nativas en Flutter optimizadas para pantallas táctiles (usando tarjetas expandibles en lugar de tablas horizontales gigantes).

Divide la entrega en 3 bloques claros:

Bloque 8A (Layout Admin, Dashboard, Gestión de Prendas e Inventario):
- `lib/presentation/layouts/admin_shell_layout.dart` (`// @source-mirror: src/layouts/DisenoAdmin.vue`) con `NavigationDrawer` filtrado según rol (`esAdmin` vs `esEmpleado`).
- `lib/presentation/screens/admin/dashboard_screen.dart` (`VistaPanelControl.vue`).
- `lib/presentation/screens/admin/garment_management_screen.dart` (`VistaGestionPrendas.vue` + lógica completa de `useGestionPrendas.js`: crear/editar prenda, constructor de variantes Talla/SKU/Precio/Stock, subida de hasta 9 fotos JPG/PNG/WEBP con `image_picker`, marcar portada y gestionar promociones).
- `lib/presentation/screens/admin/inventory_screen.dart` (`VistaInventario.vue` con alertas de stock bajo, ajustes de entrada/salida y exportación CSV con `share_plus`).

Bloque 8B (Ventas POS, Pedidos, Facturas y Generador PDF Nativo):
- `lib/presentation/screens/admin/pos_sales_screen.dart` (`VistaVentasPOS.vue`).
- `lib/presentation/screens/admin/orders_and_invoices_screen.dart` (`VistaPedidosyFacturas.vue` con modal de despacho `empresa_transportadora` + `numero_guia` y carga masiva `.xlsx`/`.csv` con `file_picker`).
- `lib/core/utils/invoice_pdf_generator.dart` (`// @source-mirror: src/components/facturas/VisorFacturaFashion.vue`): genera el diseño de factura de Fashion Style usando el paquete `pdf` y permite imprimir o compartir en WhatsApp/correo con `printing`.

Bloque 8C (Producción, Calculadora de Costos, Pagos, Usuarios y Bitácora de Auditoría):
- `lib/presentation/screens/admin/production_screen.dart` (`VistaProduccion.vue`: calculadora de producción con factibilidad de bodega, fórmulas, materias primas, proveedores y órdenes de producción).
- `lib/presentation/screens/admin/payment_config_screen.dart` (`VistaConfiguracionPagos.vue`: control paralelo Wompi + POS y dispersión porcentual entre cuentas bancarias).
- `lib/presentation/screens/admin/users_and_audit_screen.dart` (`VistaUsuariosYClientes.vue` y `VistaAuditoria.vue` usando la lógica de `auditoriaTexto.js`).
```

---

### Prompt 9: Prompt de Mantenimiento Sostenible (Usar cada vez que actualices el Front Web en Vue)

Guarda este prompt. Cada vez que hagas cambios en el proyecto Web (Vue 3) en el futuro, ejecuta `git diff HEAD~1 HEAD -- src/` y pégalo junto con este prompt en Antigravity:

```markdown
TAREA DE SINCRONIZACIÓN INCREMENTAL (WEB VUE 3 -> MOBILE FLUTTER):
He actualizado el frontend Web de Fashion Style. A continuación te pego el `git diff` exacto de los archivos modificados en `src/`.

Tu objetivo es trasladar ÚNICAMENTE estos cambios a sus archivos espejo correspondientes en el proyecto Flutter (`lib/`), guiándote por el encabezado `// @source-mirror:`:

REGLAS DE SINCRONIZACIÓN:
1. Identifica qué archivos `.dart` tienen el `@source-mirror` de los archivos `.js` o `.vue` que aparecen en el `git diff`.
2. Si el cambio es en un servicio (`src/services/`), store (`src/stores/`) o validador (`src/utils/`), replica exactamente los nuevos campos, parámetros o validaciones en la capa `lib/data/` o `lib/presentation/providers/`.
3. Si el cambio es visual en un `.vue`, adapta el widget equivalente en `lib/presentation/screens/` o `widgets/` manteniendo la estética de `FashionTheme`.
4. Actualiza el comentario `// @last-synced-commit:` en cada archivo `.dart` modificado y entrégame los archivos `.dart` completos.

AQUÍ ESTÁ EL GIT DIFF DEL FRONT WEB:
[PEGAR AQUÍ LA SALIDA DE git diff]
```

---

## 4. Cómo Subir Ambos Proyectos a Git, Desplegar Web en GitHub Pages y Compilar el APK de Flutter

Puedes organizar todo en un **único repositorio de Git** (o dos repositorios sincronizados) con despliegue continuo mediante **GitHub Actions**:

### Estructura Recomendada en Git
```text
FashionStyle/
├── .github/
│   └── workflows/
│       ├── deploy-web-pages.yml      # Publica el front Vue 3 en GitHub Pages
│       └── build-flutter-mobile.yml  # Analiza, prueba y compila el APK de Flutter
├── web/                              # Contenido actual de FashionStyleFrontEnd-main (Vue 3)
└── mobile/                           # Proyecto Flutter generado con los Prompts 1 al 8
```

### Paso 1: Subir el código a GitHub con buenas prácticas de ramas
```bash
git init
git branch -M main
git add .
git commit -m "feat: inicializar plataforma Fashion Style (Web Vue 3 + Mobile Flutter)"
git remote add origin https://github.com/TU_USUARIO/FashionStyle.git
git push -u origin main

# Crear rama de desarrollo para trabajo diario
git checkout -b develop
git push -u origin develop
```

### Paso 2: Workflow Automático para GitHub Pages (`.github/workflows/deploy-web-pages.yml`)
Antes de activar GitHub Pages, recuerda que en `public/404.html` de tu proyecto Vue actual la línea 9 tiene fijo `var repo = '/FashionStyleDist';`. Cámbiala por `var repo = '/' + window.location.pathname.split('/')[1];` para que funcione con cualquier nombre de repositorio en GitHub Pages. Luego crea `.github/workflows/deploy-web-pages.yml`:

```yaml
name: Desplegar Fashion Style Web en GitHub Pages

on:
  push:
    branches: ['main']

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout del código
        uses: actions/checkout@v4

      - name: Configurar Node 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Instalar dependencias y compilar Vite
        env:
          VITE_API_BASE_URL: https://fashionstyle.api.adsocidm.com/public/api
          VITE_STORAGE_BASE_URL: https://fashionstyle.api.adsocidm.com/storage
        run: |
          npm ci
          npm run build

      - name: Configurar GitHub Pages
        uses: actions/configure-pages@v5

      - name: Subir carpeta dist
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Publicar en GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Paso 3: Workflow Automático para Compilar el APK de Flutter en GitHub (`.github/workflows/build-flutter-mobile.yml`)
Siguiendo la [guía oficial de entrega continua de Flutter](https://docs.flutter.dev/deployment/cd), este workflow compila el APK de tu app móvil cada vez que actualizas Flutter y lo deja listo para descargar en la pestaña **Actions** de GitHub (e incluso puedes publicar una versión de Flutter Web en GitHub Pages si lo deseas):

```yaml
name: Build Fashion Style Flutter APK

on:
  push:
    branches: ['main', 'develop']
    paths:
      - 'mobile/**'

jobs:
  build-apk:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          cache: true
      - name: Instalar paquetes Dart
        run: flutter pub get
      - name: Verificar tipado y arquitectura
        run: flutter analyze
      - name: Compilar APK de Producción
        run: flutter build apk --release --dart-define=API_BASE_URL=https://fashionstyle.api.adsocidm.com/public/api
      - name: Subir APK listo para instalar
        uses: actions/upload-artifact@v4
        with:
          name: fashion-style-release-apk
          path: mobile/build/app/outputs/flutter-apk/app-release.apk
```

---

## 5. Enlaces Oficiales de Investigación y Referencia

* **Flutter y Arquitectura Limpia**:
  * [Guía Oficial de Arquitectura de Aplicaciones en Flutter (`docs.flutter.dev/app-architecture`)](https://docs.flutter.dev/app-architecture)
  * [Conceptos y Recomendaciones de Arquitectura en Flutter](https://docs.flutter.dev/app-architecture/recommendations)
  * [Flutter para Desarrolladores Web: Equivalencias HTML/CSS/JS a Widgets Dart](https://docs.flutter.dev/flutter-for/web-devs)
  * [Desarrollo con IA y Antigravity en Flutter (`docs.flutter.dev/ai/get-started`)](https://docs.flutter.dev/ai/get-started)
* **Paquetes Clave en `pub.dev` Equivalentes a tu Stack de Vue 3**:
  * [`dio` (Equivalente a `axios` con interceptores en `clienteApi.js`)](https://pub.dev/packages/dio)
  * [`flutter_riverpod` (Equivalente reactivo a los stores de `Pinia`)](https://pub.dev/packages/flutter_riverpod)
  * [`go_router` (Equivalente declarativo a `vue-router` con redirecciones y guards)](https://pub.dev/packages/go_router)
  * [`shared_preferences` (Equivalente nativo a `localStorage` para sesión y carrito)](https://pub.dev/packages/shared_preferences)
* **Git, GitHub Pages y CI/CD para Web + Flutter**:
  * [Entrega Continua (CI/CD) con GitHub Actions en Flutter (`docs.flutter.dev/deployment/cd`)](https://docs.flutter.dev/deployment/cd)
  * [Compilación y Publicación de Apps Android en Flutter](https://docs.flutter.dev/deployment/android)
  * [Despliegue de Sitios Estáticos en Vite para GitHub Pages](https://vite.dev/guide/static-deploy)
  * [Configuración de Fuentes de Publicación en GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
  * [Flujos de Ramas en Git (`Pro Git - Branching Workflows`)](https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows)
