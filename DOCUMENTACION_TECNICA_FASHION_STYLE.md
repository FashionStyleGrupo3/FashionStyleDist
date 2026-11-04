# 📘 Documentación Técnica de Arquitectura e Implementación
## Plataforma Omnicanal Fashion Style (Web, Mobile & Backend API)

**Proyecto:** Fashion Style — Sistema Integral de E-Commerce Textil, Manufactura y Facturación Omnicanal  
**Programa:** Análisis y Desarrollo de Software (ADSO) — SENA  
**Fecha de Consolidación:** Noviembre de 2026  
**Versión de Documentación:** 2.0.0 (Release Productivo)  
**Entorno de Producción API:** `https://fashionstyle.api.adsocidm.com/public/api`  
**Tienda Web en Producción:** `https://fashionstylegrupo3.github.io/FashionStyleDist/`  

---

## 1. Introducción y Propósito

### 1.1. Propósito del Sistema
**Fashion Style** es una plataforma integral omnicanal diseñada específicamente para el sector textil y de confección de moda colombiana. El sistema automatiza y sincroniza en tiempo real el ciclo completo del negocio:
1. **Comercio Electrónico B2C (Web y Móvil):** Catálogo de prendas facetado por tallas, colores y categorías, gestión de favoritos, bolsa de compras persistente, cotización express y pasarela de pagos digital integrada con Wompi (Tarjetas de crédito/débito, PSE, Nequi y Corresponsal Bancario Bancolombia).
2. **Manufactura y Costeo Textil (BOM / Fichas Técnicas):** Control de materias primas (telas, hilos, forros, botones, cierres), definición de fórmulas de consumo por prenda con cálculo dinámico de merma o desperdicio, simulador de costos de producción en lote y emisión de órdenes de confección con kárdex de insumos.
3. **Punto de Venta Presencial (POS Físico) y Facturación Unificada:** Registro ágil de ventas en mostrador físico con cálculo de cambio en efectivo, lector o selección táctil de prendas, emisión instantánea de comprobantes POS en formato de tirilla térmica (rollo 80 mm) y facturas estándar A4 vinculadas a la trazabilidad fiscal.
4. **Control Paralelo y Dispersión Financiera:** Auditoría en tiempo real para conciliar ingresos provenientes de pasarelas electrónicas (Wompi), efectivo en caja física y transferencias bancarias directas.
5. **Sincronización Reactiva Bidireccional:** Notificación instantánea mediante WebSockets (Laravel Reverb) de fluctuaciones de inventario, ventas y órdenes hacia todos los clientes conectados sin necesidad de recargar la interfaz.

### 1.2. Alcance del Software
El ecosistema técnico de Fashion Style está compuesto por:
* **Backend REST API:** Construido sobre **Laravel 12 / PHP 8.3+**, encargado de la lógica de negocio, políticas de seguridad con Laravel Sanctum y Spatie Roles, reservas temporales de stock con expiración automática, integración transaccional con Wompi y servidor de WebSockets con Laravel Reverb.
* **Cliente Web SPA:** Desarrollado en **Vue 3 (Composition API) + Vite + Pinia + Tailwind CSS**, con soporte para responsividad fluida, temas visuales de alta costura y previsualización de facturas PDF nativas.
* **Aplicación Móvil Nativa:** Implementada en **Flutter 3 (Dart 3)** con arquitectura limpia en capas (`core`, `data`, `presentation`), inyección de dependencias y estado reactivo con **Riverpod**, enrutamiento declarativo seguro con **GoRouter** y consumo de servicios con **Dio**.
* **Base de Datos Relacional:** Motor **MySQL 8.0 InnoDB** compuesto por 38 tablas normalizadas con integridad referencial estricta, restricciones en cascada y auditoría de eventos.

### 1.3. Roles del Sistema y Control de Acceso
El sistema implementa el estándar RBAC (*Role-Based Access Control*) potenciado por el paquete `spatie/laravel-permission`:
* **Administrador (`admin`):** Acceso total al panel de control, analítica de ventas y KPIs, inventario general/kárdex, aprobación de compras, costeo y parametrización de materias primas, gestión de personal, asignación de roles y visor forense de auditoría.
* **Empleado / Staff (`empleado`):** Operación de mostrador en la caja POS, despacho y actualización de guías de pedidos e-commerce, consulta de inventario por variantes, seguimiento de órdenes de confección y registro de mermas textiles.
* **Cliente Registrado (`cliente`):** Navegación completa del catálogo, configuración de perfil con avatar personalizado, autenticación tradicional o mediante Google OAuth 2.0, lista de deseos sincronizada, gestión de direcciones validadas por municipio y consulta de trazabilidad de pedidos.
* **Visitante / Público (`visitante`):** Exploración del catálogo público de prendas, filtrado por categorías, consulta de guía de medidas e incorporación de artículos a la bolsa antes del checkout.

---

## 2. Arquitectura General del Sistema

### 2.1. Diagrama de Arquitectura de la Solución (ASCII)

```text
+---------------------------------------------------------------------------------------------------+
|                                   CAPA CLIENTE (FRONTEND MULTIPLATAFORMA)                        |
|                                                                                                   |
|   +------------------------------------+             +----------------------------------------+   |
|   |         CLIENTE WEB SPA            |             |        APLICACION MOVIL NATIVA         |   |
|   |   (Vue 3.4 + Vite 6 + Tailwind)    |             |       (Flutter 3.x + Dart 3.x)         |   |
|   |                                    |             |                                        |   |
|   |  - Tienda Pública & Carrito        |             |  - Tienda Móvil Fluida                 |   |
|   |  - Panel POS Táctil Roll-80        |             |  - Wompi Checkout Modal Nativo         |   |
|   |  - Simulador Costos Producción     |             |  - Visor Facturas PDF & Share          |   |
|   |  - Laravel Echo (WebSockets)       |             |  - Reverb WebSocket Service            |   |
|   +-----------------+------------------+             +-------------------+--------------------+   |
+---------------------|----------------------------------------------------|------------------------+
                      | HTTPS (REST / JSON)                                | HTTPS (REST / JSON)
                      | WSS (WebSockets)                                   | WSS (WebSockets)
                      v                                                    v
+---------------------------------------------------------------------------------------------------+
|                                   CAPA DE SERVICIOS & GATEWAY                                     |
|               Servidor Web Nginx / Reverse Proxy (Adsocidm Production / Render Mirror)             |
|                        Endpoint Base: https://fashionstyle.api.adsocidm.com                       |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                 CAPA BACKEND (LARAVEL 12 / PHP 8.3+)                              |
|                                                                                                   |
|  +------------------------+  +------------------------+  +-------------------------------------+  |
|  |   SEGURIDAD & FILTROS  |  |   CONTROLADORES REST   |  |        SERVICIOS DE DOMINIO         |  |
|  |                        |  |                        |  |                                     |  |
|  | - Sanctum (Tokens API) |  | - Producto / Variante  |  | - WompiService (Cobros & Webhooks)  |  |
|  | - Spatie RBAC (Roles)  |  | - Venta POS & Factura  |  | - ReservaPedidoService (Stock Lock) |  |
|  | - Throttle / Rate Limit|  | - Orden Produccion     |  | - CalculadoraProduccionService      |  |
|  | - Sanitizador SQL/Error|  | - Carrito / Checkout   |  | - AuditoriaObserver                |  |
|  +------------------------+  +------------------------+  +-------------------------------------+  |
|                                         |                                  |                      |
|                                         | Difusión de Eventos              |                      |
|                                         v                                  |                      |
|                       +----------------------------------+                 |                      |
|                       |  LARAVEL REVERB (WEBSOCKETS)     |                 |                      |
|                       |  Puerto: 8080 (WSS Seguro)       |                 |                      |
|                       |  Canal: 'cambios'                |                 |                      |
|                       |  Evento: '.datos.actualizados'   |                 |                      |
|                       +----------------------------------+                 |                      |
+----------------------------------------------------------------------------|----------------------+
                                                                             | Eloquent ORM
                                                                             v
+---------------------------------------------------------------------------------------------------+
|                                CAPA DE PERSISTENCIA (BASE DE DATOS)                               |
|                                                                                                   |
|                            Motor Relacional MySQL 8.0 Community / InnoDB                          |
|                       38 Tablas Normalizadas - Cotejamiento utf8mb4_unicode_ci                    |
|                                                                                                   |
|  [usuarios / roles] <---> [productos / variantes / imagenes] <---> [inventarios / kardex]         |
|         |                                    |                                 |                  |
|         v                                    v                                 v                  |
|  [pedidos / ventas] <-----------> [facturas / detalle] <---------> [formulas / produccion]       |
+---------------------------------------------------------------------------------------------------+
```

### 2.2. Matriz de Pila Tecnológica (Stack Real)

| Componente | Tecnología | Versión Verificada | Propósito en Fashion Style |
| :--- | :--- | :--- | :--- |
| **Lenguaje Backend** | PHP | `8.3.x` | Ejecución del núcleo del servidor y APIs RESTful. |
| **Framework Backend** | Laravel Framework | `12.x / 13.8` | Enrutamiento, validación, Eloquent ORM y consola Artisan. |
| **Autenticación API** | Laravel Sanctum | `^4.0` | Emisión y validación de tokens Bearer persistentes y efímeros. |
| **Autorización & RBAC** | Spatie Laravel Permission | `^8.3` | Gestión granular de roles (`admin`, `empleado`, `cliente`) y permisos. |
| **Servidor WebSockets** | Laravel Reverb | `^1.12` | Servidor WebSocket nativo de alto rendimiento para refresco reactivo. |
| **Exportación & Reportes** | Maatwebsite Excel | `^4.0` | Importación y exportación masiva de kárdex, facturas e inventario. |
| **Autenticación Federada**| Google API Client | `^2.20` | Verificación de tokens de identidad para inicio de sesión social. |
| **Base de Datos** | MySQL InnoDB | `8.0+` | Almacenamiento relacional transaccional ACID en 38 tablas. |
| **Lenguaje Web** | TypeScript / JavaScript | ES2023 | Lenguaje de desarrollo del cliente web. |
| **Framework Web** | Vue.js | `3.4.21` | Renderizado reactivo SPA basado en Composition API y `<script setup>`. |
| **Bundler & Build Tool**| Vite | `6.4.4` | Servidor de desarrollo instantáneo y empaquetado optimizado. |
| **Gestor de Estado Web**| Pinia + PersistedState | `2.1.7` / `3.2.1` | Manejo de almacenes globales (`autenticacion`, `carrito`, `favoritos`). |
| **Enrutador Web** | Vue Router | `4.3.0` | Enrutamiento dinámico SPA con guardas de autenticación por rol. |
| **Estilos & Diseño** | Tailwind CSS + Lucide | `3.4.17` / `0.368`| Utilidades CSS atómicas y juego unificado de iconos vectoriales. |
| **Framework Móvil** | Flutter SDK | `>=3.2.0 <4.0.0` | Framework declarativo multiplataforma para Android e iOS nativo. |
| **Lenguaje Móvil** | Dart | `3.x` | Lenguaje fuertemente tipado con Null-Safety estricto. |
| **Cliente HTTP Móvil** | Dio | `5.7.0` | Cliente con soporte de interceptores Bearer, timeouts y sanitización. |
| **Estado Móvil** | Flutter Riverpod | `2.6.1` | Gestor reactivo de estado unidireccional y sin dependencias de BuildContext. |
| **Enrutador Móvil** | GoRouter | `14.8.0` | Rutas declarativas, sub-rutas anidadas y guardas de acceso. |
| **Generador PDF Móvil** | Pdf & Printing | `3.11.1` / `5.13.3`| Renderizado nativo de tirillas térmicas roll-80 y facturas DIAN A4. |
| **Pasarela de Pagos** | Wompi API v1 | `Checkout Widget`| Pasarela certificada para Colombia (Tarjetas, PSE, Nequi, Corresponsal). |

---

## 3. Arquitectura del Backend (REST API)

### 3.1. Árbol de Carpetas del Backend (`FashionStyleBackEnd`)

```text
FashionStyleBackEnd/
├── app/
│   ├── Events/
│   │   └── DatosActualizados.php           # Evento Reverb transmitido al canal público 'cambios'
│   ├── Http/
│   │   ├── Controllers/api/
│   │   │   ├── AuthController.php          # Login, Registro, Google Auth, 2FA y Reset Clave
│   │   │   ├── CalculoProduccionController.php # Simulador interactivo de costeo de prendas
│   │   │   ├── CarritoController.php       # Gestión de bolsa sincronizada en base de datos
│   │   │   ├── CatalogoController.php      # Colecciones y temporadas de moda
│   │   │   ├── CategoriaController.php     # Clasificación textil (Superior, Inferior, etc.)
│   │   │   ├── CheckoutController.php      # Creación de checkout Wompi y gestión de reservas
│   │   │   ├── CiudadController.php        # Búsqueda normalizada de municipios de Colombia
│   │   │   ├── ClienteController.php       # Perfil del comprador y direcciones de despacho
│   │   │   ├── DetalleCarritoController.php# Manipulación de ítems y cantidades en el carrito
│   │   │   ├── FacturaController.php       # Emisión de facturas A4 y carga masiva Excel
│   │   │   ├── FavoritoController.php      # Lista de deseos sincronizada por usuario
│   │   │   ├── FotoPerfilController.php    # Carga y almacenamiento en disco de avatar
│   │   │   ├── FormulaProduccionController.php # Lista de materiales e insumos (BOM)
│   │   │   ├── InventarioController.php    # Movimientos de kárdex, alertas y stock crítico
│   │   │   ├── MateriaPrimaController.php  # CRUD de telas, hilos y forros
│   │   │   ├── OrdenProduccionController.php# Órdenes de confección en taller
│   │   │   ├── PagoController.php          # Conciliación paralela y verificación Wompi
│   │   │   ├── PedidoController.php        # Gestión de pedidos e-commerce y transportadoras
│   │   │   ├── ProductoController.php      # Catálogo, variantes (talla/color) e imágenes
│   │   │   ├── PromocionController.php     # Descuentos porcentuales y por fecha
│   │   │   ├── ProveedorController.php     # Suministradores textiles
│   │   │   ├── TerminosController.php      # Términos y condiciones legales vigentes
│   │   │   ├── UnidadMedidaController.php  # Metros, yardas, unidades, conos, gramos
│   │   │   ├── UsuarioController.php       # Gestión de colaboradores y seguridad
│   │   │   └── VentaController.php         # Caja POS física y ventas de mostrador
│   │   └── Middleware/
│   │       ├── ActiveUser.php              # Comprobación de estado activo en la cuenta
│   │       ├── EnsureEmailIsVerified.php   # Validación de verificación por código OTP
│   │       └── NotificarCambios.php        # Hook automático que emite a Reverb tras mutaciones
│   ├── Models/                             # 28 Modelos Eloquent con relaciones y scopes
│   ├── Services/
│   │   ├── ReservaPedidoService.php        # Bloqueo transaccional de 15 min en checkout
│   │   └── WompiService.php                # Criptografía SHA256 e integración Wompi
│   └── Console/Commands/
│       └── LiberarReservasVencidas.php     # Cron job que restituye stock de carritos caducados
├── config/
│   ├── auth.php                            # Drivers Sanctum y proveedores de usuarios
│   ├── cors.php                            # Orígenes permitidos (Web, Móvil y Localhost)
│   └── reverb.php                          # Configuración de puertos y credenciales WebSockets
├── database/
│   ├── migrations/                         # 38 migraciones ordenadas cronológicamente
│   └── seeders/                            # Seeders maestros (Roles, SuperAdmin, Ciudades)
└── routes/
    └── api.php                             # Definición de 77 endpoints RESTful segmentados
```

### 3.2. Especificación Detallada de Endpoints Principales

#### 1. Autenticación — Inicio de Sesión
* **Método:** `POST`
* **Ruta:** `/api/login`
* **Acceso:** Público
* **Payload Request:**
```json
{
  "email": "cliente.demo@fashionstyle.com",
  "password": "Password123*"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "access_token": "42|1a8b9c...token_sanctum_seguro",
  "token_type": "Bearer",
  "user": {
    "id": 15,
    "nombre": "Valentina Ospina",
    "email": "cliente.demo@fashionstyle.com",
    "telefono": "3004567890",
    "foto_perfil": "https://fashionstyle.api.adsocidm.com/storage/perfiles/avatar15.png",
    "email_verified_at": "2026-11-01T14:30:00.000000Z"
  },
  "roles": ["cliente"]
}
```

#### 2. Catálogo — Listado Paginado de Prendas con Variantes
* **Método:** `GET`
* **Ruta:** `/api/productos?categoria_id=2&buscar=vestido&page=1`
* **Acceso:** Público
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 8,
        "nombre": "Vestido Lino Silvestre",
        "slug": "vestido-lino-silvestre",
        "descripcion": "Vestido largo confeccionado en lino 100% transpirable con escote cruzado.",
        "precio_base": "180000.00",
        "precio_venta": "153000.00",
        "porcentaje_descuento": 15,
        "categoria": {
          "id": 2,
          "nombre": "Vestidos de Temporada"
        },
        "imagenes": [
          {
            "id": 24,
            "url": "productos/vestido_lino_frontal.jpg",
            "es_principal": true
          }
        ],
        "variantes": [
          {
            "id": 31,
            "talla": "S",
            "color": "Arena",
            "color_hex": "#ECE5DA",
            "stock": 12,
            "sku": "VES-LINO-S-ARE"
          },
          {
            "id": 32,
            "talla": "M",
            "color": "Arena",
            "color_hex": "#ECE5DA",
            "stock": 8,
            "sku": "VES-LINO-M-ARE"
          }
        ]
      }
    ],
    "last_page": 4,
    "total": 38
  }
}
```

#### 3. Carrito & Checkout — Creación de Reserva Transaccional
* **Método:** `POST`
* **Ruta:** `/api/checkout`
* **Acceso:** Autenticado (`Bearer Token`)
* **Payload Request:**
```json
{
  "direccion_envio": "Carrera 43A # 18 Sur - 45, Edificio San Lucas, Apto 502",
  "ciudad": "Medellín",
  "departamento": "Antioquia",
  "telefono": "3004567890",
  "metodo_pago": "wompi",
  "items": [
    {
      "variante_id": 31,
      "cantidad": 2,
      "precio_unitario": 153000.00
    }
  ]
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Reserva de stock creada por 15 minutos",
  "data": {
    "referencia": "FS-ORD-20261104-8921",
    "total": 306000.00,
    "moneda": "COP",
    "tiempo_expiracion": "2026-11-04T10:45:00.000000Z",
    "wompi": {
      "public_key": "pub_prod_X78yUI...wompi_key",
      "signature": "3c98f9a2b5e...firma_sha256_integridad",
      "redirect_url": "https://fashionstylegrupo3.github.io/FashionStyleDist/#/perfil?seccion=pedidos"
    }
  }
}
```

#### 4. Punto de Venta (POS) — Registro de Venta Presencial
* **Método:** `POST`
* **Ruta:** `/api/ventas`
* **Acceso:** Requiere rol `admin` o `empleado`
* **Payload Request:**
```json
{
  "cliente_id": 15,
  "metodo_pago_id": 1,
  "tipo_comprobante": "ticket_pos",
  "efectivo_recibido": 200000.00,
  "detalles": [
    {
      "variante_id": 31,
      "cantidad": 1,
      "precio_unitario": 153000.00,
      "descuento": 0.00
    }
  ]
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Venta POS registrada y stock descontado satisfactoriamente",
  "venta": {
    "id": 104,
    "numero_comprobante": "POS-000104",
    "subtotal": 128571.43,
    "iva": 24428.57,
    "total": 153000.00,
    "cambio_entregado": 47000.00,
    "created_at": "2026-11-04T10:30:00.000000Z"
  }
}
```

#### 5. Producción Textil — Cálculo de Ficha Técnica & Costeo de Lote
* **Método:** `POST`
* **Ruta:** `/api/calculos-produccion`
* **Acceso:** Requiere rol `admin` o `empleado`
* **Payload Request:**
```json
{
  "producto_id": 8,
  "tamano_lote": 50,
  "minutos_confeccion_por_unidad": 45,
  "costo_minuto_mano_obra": 450.00,
  "porcentaje_margen_esperado": 40.0
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "calculo": {
    "costo_materia_prima_unidad": 48200.00,
    "costo_mano_obra_unidad": 20250.00,
    "merma_ponderada_unidad": 4820.00,
    "costo_total_unitario": 73270.00,
    "costo_lote_completo": 3663500.00,
    "precio_sugerido_sin_iva": 122116.67,
    "precio_sugerido_con_iva": 145318.84,
    "factibilidad_inventario": {
      "insumos_suficientes": true,
      "materias_primas_faltantes": []
    }
  }
}
```

---

## 4. Arquitectura del Frontend Web y App Móvil

### 4.1. Estructura de Carpetas del Frontend Web (`VersionMobile FashionStyle/web`)

```text
web/
├── index.html                      # Punto de entrada HTML5 con fuentes tipográficas
├── package.json                    # 14 dependencias productivas (Vue 3, Pinia, Axios, etc.)
├── vite.config.js                  # Configuración de base path, plugins y aliases @ -> src
├── tailwind.config.js              # Paleta cromática corporativa y breakpoints
└── src/
    ├── main.js                     # Inicialización de Vue, Pinia, Router y Directivas
    ├── style.css                   # Importaciones de Tailwind y reglas tipográficas
    ├── assets/                     # Logotipos vectoriales, imágenes y texturas
    ├── layouts/
    │   ├── DisenoPublico.vue       # Header con badge de bolsa, buscador y footer boutique
    │   ├── DisenoAdmin.vue         # Barra superior, sidebar con permisos por rol y alertas
    │   └── DisenoAutenticacion.vue # Layout minimalista centrado para login y registro
    ├── router/
    │   └── index.js                # Definición de rutas, lazy loading y navigation guards
    ├── stores/
    │   ├── autenticacion.js        # Estado de sesión (token, usuario, roles Spatie)
    │   ├── carrito.js              # Bolsa local sincronizada con API y validación de stock
    │   ├── favoritos.js            # Colección de prendas deseadas del usuario
    │   └── filtros.js              # Filtros facetados de catálogo (color, talla, precio)
    ├── services/
    │   ├── clienteApi.js           # Instancia Axios con interceptores y sanitización
    │   ├── tiempoReal.js           # Cliente Laravel Echo conectado al Reverb WebSocket
    │   ├── wompiServicio.js        # Integración con el modal widget de pasarela Wompi
    │   └── [11 servicios de negocio]# Mapeo de llamadas a la API RESTful
    ├── views/
    │   ├── publico/                # VistaInicio, Catalogo, DetallePrenda, Carrito, Perfil
    │   ├── autenticacion/          # Login, Registro, 2FA, VerificarCorreo, OlvidePassword
    │   └── admin/                  # Dashboard, Inventario, Prendas, POS, Facturas, Producción
    └── components/                 # Componentes reutilizables, modales y tablas de datos
```

### 4.2. Estructura de Carpetas de la App Móvil (`VersionMobile FashionStyle/mobile`)

```text
mobile/
├── pubspec.yaml                    # Dependencias nativas (Riverpod, Dio, GoRouter, Pdf)
├── assets/images/                  # Recursos de imagen, logotipos e iconos locales
└── lib/
    ├── main.dart                   # Inicialización de Flutter, ProviderScope y App Widget
    ├── core/
    │   ├── network/
    │   │   ├── api_client.dart     # Singleton Dio con interceptor Bearer y BaseURL dinámica
    │   │   ├── api_response_parser.dart # Parseador defensivo de tipos (JsonParser safe)
    │   │   └── change_bus.dart     # Bus reactivo desacoplado de eventos locales
    │   ├── realtime/
    │   │   └── reverb_service.dart # Conexión nativa WebSocket a Laravel Reverb
    │   ├── router/
    │   │   └── app_router.dart     # GoRouter con redirecciones y guardas de sesión
    │   ├── theme/
    │   │   └── fashion_theme.dart  # FashionColors, Playfair Display y Material Theme
    │   ├── utils/
    │   │   ├── currency_formatter.dart # Formato de pesos colombianos ($ 153.000 COP)
    │   │   ├── image_url_resolver.dart # Normalización de URLs de almacenamiento CDN
    │   │   └── invoice_pdf_generator.dart # Generador de tirillas POS y facturas A4
    │   └── validators/
    │       ├── garment_and_field_validators.dart # Expresiones regulares y textos
    │       └── password_validator.dart # Reglas de complejidad de contraseña (8+ chars)
    ├── data/
    │   ├── models/
    │   │   └── product_models.dart # Modelos de prendas, variantes, promociones y filtros
    │   └── services/               # 8 servicios Dio fuertemente tipados
    └── presentation/
        ├── providers/              # 4 providers Riverpod (auth, cart, favorites, filters)
        ├── layouts/                # PublicShellLayout y AdminShellLayout
        ├── widgets/                # StorefrontWidgets y WompiCheckoutModal
        └── screens/
            ├── publico/            # HomeScreen, CatalogScreen, ProductDetailScreen, etc.
            ├── autenticacion/      # AuthScreens (Login, Register, OTP, ForgotPassword)
            └── admin/              # Dashboard, Inventory, Garments, POS, Production
```

### 4.3. Gestión de Estado, Interceptores HTTP y Sesión
1. **Frontend Web:** Utiliza **Pinia** con `pinia-plugin-persistedstate`. La clave `fs_token` guarda el token Bearer en `localStorage`. El interceptor de `clienteApi.js` inyecta automáticamente la cabecera `Authorization: Bearer <token>` y el `X-Socket-ID` asignado por Laravel Echo para que Reverb no ecoe eventos al mismo cliente originador.
2. **App Móvil:** Utiliza **Riverpod** (`StateNotifierProvider`). La persistencia se delega en `SharedPreferences`. El interceptor de `api_client.dart` agrega el token antes de cada llamada, intercepta respuestas HTTP 401 para limpiar la sesión y redirigir al login mediante `app_router.dart`, y sanitiza cualquier volcado de error SQL con `patronDatosSensibles`.

---

## 5. Modelo de Datos Relacional

El modelo de datos está normalizado en 3NF y compuesto por **38 tablas relacionales** en MySQL 8.0 InnoDB. A continuación se presenta el diagrama de las entidades principales de negocio:

```text
+-----------------------+          +-----------------------+          +-----------------------+
|        ROLES          |          |       USUARIOS        |          |       CLIENTES        |
+-----------------------+          +-----------------------+          +-----------------------+
| PK id                 |          | PK id                 |          | PK id                 |
|    name               | 1      N |    nombre             | 1      1 | FK usuario_id         |
|    guard_name         +----------+    email              +----------+    tipo_documento     |
+-----------------------+          |    password           |          |    numero_documento   |
                                   |    telefono           |          |    direccion          |
                                   |    foto_perfil        |          | FK ciudad_id          |
                                   +-----------+-----------+          +-----------+-----------+
                                               | 1                                | 1
                                               |                                  |
                                               | N                                | N
+-----------------------+          +-----------v-----------+          +-----------v-----------+
|      FAVORITOS        |          |   CARRITO_DE_COMPRAS  |          |        PEDIDOS        |
+-----------------------+          +-----------------------+          +-----------------------+
| PK id                 |          | PK id                 |          | PK id                 |
| FK usuario_id         |          | FK usuario_id         |          | FK cliente_id         |
| FK producto_id        |          |    estado             |          |    codigo_pedido (UQ) |
+-----------------------+          +-----------+-----------+          |    estado_pedido      |
                                               | 1                        |    total              |
                                               | N                        +-----------+-----------+
                                   +-----------v-----------+                          | 1
                                   |    DETALLE_CARRITO    |                          |
                                   +-----------------------+                          | N
                                   | PK id                 |                          |
                                   | FK carrito_id         |                          |
                                   | FK variante_id        |                          |
                                   |    cantidad           |                          |
                                   +-----------------------+                          |
                                                                                      |
+-----------------------+          +-----------------------+                          |
|      CATALOGOS        |          |      PRODUCTOS        |                          |
+-----------------------+          +-----------------------+                          |
| PK id                 | 1      N | PK id                 |                          |
|    nombre             +--------->| FK catalogo_id        |                          |
+-----------------------+          | FK categoria_id       |                          |
                                   |    nombre             |                          |
+-----------------------+          |    slug (UQ)          |                          |
|      CATEGORIAS       | 1      N |    precio_base        |                          |
+-----------------------+--------->|    activo             |                          |
| PK id                 |          +-----------+-----------+                          |
|    nombre             |                      | 1                                    |
+-----------------------+                      |                                      |
                                               +-------------------+                  |
                                               | 1                 | 1                |
                                               v N                 v N                |
                                   +-----------+-----------+ +-----+---------------+  |
                                   |  PRODUCTOS_IMAGENES   | | PRODUCTOS_VARIANTES |  |
                                   +-----------------------+ +---------------------+  |
                                   | PK id                 | | PK id               |  |
                                   | FK producto_id        | | FK producto_id      |  |
                                   |    url                | |    talla            |  |
                                   |    es_principal       | |    color            |  |
                                   +-----------------------+ |    color_hex        |  |
                                                             |    sku (UQ)         |  |
                                                             |    stock            |  |
                                                             +----+----+-----------+  |
                                                                  |    |              |
                                               +------------------+    |              |
                                               | 1                     |              |
                                               v N                     |              |
+-----------------------+          +-----------+-----------+           |              |
|     INVENTARIOS       |          |    DETALLE_PEDIDO     |<----------+--------------+
+-----------------------+          +-----------------------+           |
| PK id                 |          | PK id                 |           |
| FK variante_id        |          | FK pedido_id          |           |
|    tipo_movimiento    |          | FK variante_id        |           |
|    cantidad           |          |    cantidad           |           |
|    saldo_anterior     |          |    precio_unitario    |           |
|    saldo_nuevo        |          +-----------------------+           |
+-----------------------+                                              |
                                                                       |
+-----------------------+          +-----------------------+           |
|        VENTAS         | 1      N |     DETALLE_VENTA     |           |
+-----------------------+--------->+-----------------------+           |
| PK id                 |          | PK id                 |           |
|    numero_comprobante |          | FK venta_id           |           |
| FK cliente_id         |          | FK variante_id        |<----------+
| FK usuario_id         |          |    cantidad           |
|    total              |          |    precio_unitario    |
+-----------+-----------+          +-----------------------+
            | 1
            | 1
+-----------v-----------+          +-----------------------+
|       FACTURAS        | 1      N |    DETALLE_FACTURA    |
+-----------------------+--------->+-----------------------+
| PK id                 |          | PK id                 |
|    numero_factura(UQ) |          | FK factura_id         |
| FK factura_origen_id  |          |    concepto           |
|    total              |          |    monto              |
+-----------------------+          +-----------------------+
            | 1
            | 1
+-----------v-----------+
|    FACTURA_ORIGEN     |
+-----------------------+
| PK id                 |
| FK venta_id (nullable)|
| FK pedido_id(nullable)|
+-----------------------+
```

### 5.1. Módulo de Manufactura y Producción Textil (BOM)

```text
+-----------------------+          +-----------------------+          +-----------------------+
|    UNIDADES_MEDIDA    |          |    MATERIAS_PRIMAS    |          |      PROVEEDORS       |
+-----------------------+          +-----------------------+          +-----------------------+
| PK id                 | 1      N | PK id                 | N      1 | PK id                 |
|    nombre             +--------->| FK unidad_medida_id   |<---------+    razon_social       |
|    abreviatura        |          | FK proveedor_id       |          |    nit                |
+-----------------------+          |    nombre             |          +-----------------------+
                                   |    costo_unitario     |
                                   |    stock_disponible   |
                                   +-----------+-----------+
                                               | 1
                                               v N
+-----------------------+          +-----------+-----------+          +-----------------------+
|      PRODUCTOS        | 1      N |  FORMULAS_PRODUCCION  | N      1 |  ORDENES_PRODUCCION   |
+-----------------------+--------->+-----------------------+<---------+-----------------------+
| PK id                 |          | PK id                 |          | PK id                 |
|    nombre             |          | FK producto_id        |          | FK producto_id        |
+-----------------------+          | FK materia_prima_id   |          |    numero_orden       |
                                   |    cantidad_requerida |          |    cantidad_a_producir|
                                   |    porcentaje_merma   |          |    estado             |
                                   +-----------------------+          +-----------------------+
```

---

## 6. Seguridad y Buenas Prácticas

### 6.1. Autenticación y Autorización
* **Tokens Bearer con Expiración:** Autenticación a través de **Laravel Sanctum**. Los tokens emitidos cuentan con alcances específicos (`abilities`) y son revocados inmediatamente al ejecutar `/api/logout`.
* **Cifrado Criptográfico de Contraseñas:** Algoritmo **bcrypt** con factor de costo `cost: 12`. Las contraseñas se validan reactivamente con políticas de complejidad: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un dígito numérico y un carácter especial (`@$!%*?&#`).
* **Verificación en Dos Pasos (2FA) y OTP:** Envío de código de confirmación de 6 dígitos para la activación de cuentas y cambio de correo electrónico, con tiempo de expiración fijado en 15 minutos.
* **Integración OAuth 2.0:** Validación segura de tokens ID emitidos por Google Identity Services en el endpoint `/api/auth/google`.

### 6.2. Protección contra Vulnerabilidades OWASP
* **Inyección SQL:** Mitigada al 100% mediante el uso exclusivo de sentencias preparadas y vinculación de parámetros con PDO en el ORM Eloquent.
* **Fuga de Información en Errores:** Tanto en el backend como en los clientes Web y Móvil se encuentra activo el patrón `patronDatosSensibles` que detecta y censura trazas de bases de datos, nombres de tablas, puertos o queries SQL en respuestas HTTP 500, entregando un mensaje genérico seguro.
* **Cross-Origin Resource Sharing (CORS):** Política restrictiva en `config/cors.php` que autoriza únicamente peticiones desde la URL del dominio de producción (`https://fashionstylegrupo3.github.io`) y localhost durante desarrollo.
* **Rate Limiting / Mitigación de Fuerza Bruta:** Limitación estricta de llamadas por minuto usando el middleware `throttle`:
  - Login y Recuperación de clave: máximo 5 solicitudes por minuto.
  - Registro de usuarios: máximo 10 solicitudes por minuto.
  - Consultas de catálogo / geografía: máximo 60 solicitudes por minuto.

### 6.3. Integridad en Pasarela de Pagos (Wompi)
* **Firmas Criptográficas de Integridad:** Cada transacción generada hacia Wompi incluye un hash calculado mediante `SHA-256` combinando la referencia de pago, el monto en centavos, la divisa (`COP`) y el secreto de integridad privado de la tienda.
* **Webhooks Firmados:** Las notificaciones entrantes de Wompi se validan comprobando el checksum de cabecera antes de actualizar el estado del pedido a `aprobado` y facturar.
* **Reserva Transaccional de Stock:** Durante el proceso de pago, el stock se decrementa provisionalmente por 15 minutos (`ReservaPedidoService`). Si la transacción es rechazada o vence el temporizador, el stock se restituye automáticamente.

---

## 7. Despliegue y Entornos de Producción

### 7.1. Arquitectura de Despliegue en Servidores Públicos
* **Backend REST API:** Alojado en el servidor de aplicaciones **Adsocidm** (`https://fashionstyle.api.adsocidm.com`), corriendo bajo Nginx como Reverse Proxy hacia PHP-FPM 8.3, con certificado SSL/TLS de Let's Encrypt y espejo secundario preparado en **Render**.
* **Frontend Web:** Desplegado mediante pipeline automatizado de **GitHub Actions** hacia **GitHub Pages** en la URL `https://fashionstylegrupo3.github.io/FashionStyleDist/`.
* **Servidor WebSockets Reverb:** Proceso daemonizado gestionado con **Supervisor** en el puerto 8080 con túnel seguro SSL (`wss://fashionstyle.api.adsocidm.com/app`).

### 7.2. Variables de Entorno de Producción (`.env`)

#### Backend (`FashionStyleBackEnd/.env`)
```ini
APP_NAME="Fashion Style"
APP_ENV=production
APP_KEY=base64:XyZ1234567890abcdefghijklmnopqrstuvwxyz=
APP_DEBUG=false
APP_URL=https://fashionstyle.api.adsocidm.com

LOG_CHANNEL=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fashion_style_prod
DB_USERNAME=fashion_admin
DB_PASSWORD="PasswordSeguroProd2026*"

BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=database

REVERB_APP_ID=fashionstyle_reverb_id
REVERB_APP_KEY=fashionstyle_reverb_key
REVERB_APP_SECRET=fashionstyle_reverb_secret
REVERB_HOST=fashionstyle.api.adsocidm.com
REVERB_PORT=8080
REVERB_SCHEME=https

WOMPI_PUBLIC_KEY=pub_prod_X78yUI...
WOMPI_PRIVATE_KEY=prv_prod_AB12cd...
WOMPI_INTEGRITY_SECRET=prod_integrity_987654...
WOMPI_SANDBOX=false

SANCTUM_STATEFUL_DOMAINS=fashionstylegrupo3.github.io
SESSION_DOMAIN=.adsocidm.com
```

#### Frontend Web (`web/.env.production`)
```ini
VITE_API_BASE_URL=https://fashionstyle.api.adsocidm.com/public/api
VITE_STORAGE_BASE_URL=https://fashionstyle.api.adsocidm.com/storage
VITE_REVERB_APP_KEY=fashionstyle_reverb_key
VITE_REVERB_HOST=fashionstyle.api.adsocidm.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

---

## 8. Pasos para la Puesta en Marcha Local

### 8.1. Requisitos Previos del Sistema Operativo
* **Git:** Versión 2.40 o superior.
* **PHP:** Versión 8.2 o 8.3 con extensiones `pdo_mysql`, `mbstring`, `bcmath`, `curl`, `openssl`, `gd`.
* **Composer:** Versión 2.6 o superior.
* **Node.js:** Versión 18.x o 20.x LTS y gestor `npm`.
* **MySQL:** Servidor MySQL 8.0 o MariaDB 10.5+.
* **Flutter SDK:** Versión 3.19.0 o superior con Android SDK instalado (para la app móvil).

---

### 8.2. Paso 1: Configurar y Levantar el Backend (Laravel)
```bash
# 1. Acceder al directorio del backend
cd F:\FashionStyle\FashionStyleBackEnd

# 2. Instalar dependencias de PHP
composer install

# 3. Crear el archivo de entorno y generar la llave criptográfica
copy .env.example .env
php artisan key:generate

# 4. Configurar las credenciales de base de datos en el archivo .env
# (Asegurarse de crear la base de datos 'fashion_style' en MySQL)

# 5. Ejecutar migraciones y poblar datos semilla maestros
php artisan migrate:fresh --seed

# 6. Crear el enlace simbólico para imágenes de productos y perfiles
php artisan storage:link

# 7. Iniciar el servidor REST API
php artisan serve --port=8000
# El backend estará escuchando en http://localhost:8000

# 8. (Opcional - En otra terminal) Iniciar el servidor de WebSockets Reverb
php artisan reverb:start --port=8080
```

---

### 8.3. Paso 2: Configurar y Levantar el Frontend Web (Vue 3)
```bash
# 1. Acceder al directorio del frontend web
cd "F:\FashionStyle\VersionMobile FashionStyle\web"

# 2. Instalar dependencias de Node
npm install

# 3. Crear archivo de variables de entorno local
copy .env.example .env

# 4. Iniciar el servidor de desarrollo Vite con Hot Module Replacement
npm run dev
# La aplicación web estará accesible en http://localhost:3000 o http://localhost:5173
```

---

### 8.4. Paso 3: Configurar y Levantar la App Móvil (Flutter)
```bash
# 1. Acceder al directorio móvil
cd "F:\FashionStyle\VersionMobile FashionStyle\mobile"

# 2. Generar el andamiaje de plataformas nativas Android e iOS si no existen
flutter create . --project-name fashion_style_mobile --org com.fashionstyle

# 3. Descargar e instalar las dependencias de pubspec.yaml
flutter pub get

# 4. Ejecutar el análisis estático de código para verificar cero errores
flutter analyze

# 5. Ejecutar la app en un emulador Android o dispositivo físico conectado
flutter run --dart-define=API_BASE_URL=https://fashionstyle.api.adsocidm.com/public/api

# 6. Compilar el archivo instalador APK Release para Android
flutter build apk --release --dart-define=API_BASE_URL=https://fashionstyle.api.adsocidm.com/public/api
# El instalador final quedará generado en:
# mobile/build/app/outputs/flutter-apk/app-release.apk
```
