# 👗 Fashion Style — Plataforma Omnicanal (Web & Mobile)

[![Deploy Web to GitHub Pages](https://github.com/FashionStyleGrupo3/FashionStyleDist/actions/workflows/deploy-web-pages.yml/badge.svg)](https://github.com/FashionStyleGrupo3/FashionStyleDist/actions/workflows/deploy-web-pages.yml)
[![Build Flutter Mobile](https://github.com/FashionStyleGrupo3/FashionStyleDist/actions/workflows/build-flutter-mobile.yml/badge.svg)](https://github.com/FashionStyleGrupo3/FashionStyleDist/actions/workflows/build-flutter-mobile.yml)
[![Flutter](https://img.shields.io/badge/Flutter-3.x%20%7C%20Dart%203-02569B?logo=flutter&logoColor=white)](https://flutter.dev)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.5%20%7C%20Vite-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org)

Plataforma integral de comercio electrónico, manufactura y gestión administrativa para **Fashion Style**. Este repositorio monorepo alberga tanto el cliente web de escritorio como la aplicación móvil nativa desarrollada en Flutter, manteniendo paridad de características 1:1 y sincronización en tiempo real.

---

## 🚀 Acceso Rápido y Despliegues

| Plataforma | Estado | Enlace / Descarga |
| :--- | :---: | :--- |
| 🌐 **Tienda Web (Vue 3)** | Producción | [**Visitar Fashion Style Web (GitHub Pages)**](https://fashionstylegrupo3.github.io/FashionStyleDist/) |
| 📱 **App Móvil (Flutter APK)** | Release CI/CD | [**Descargar APK Android (GitHub Actions Artifacts)**](https://github.com/FashionStyleGrupo3/FashionStyleDist/actions/workflows/build-flutter-mobile.yml) |
| 📂 **Código Fuente Móvil** | Sincronizado | [**Explorar directorio `mobile/`**](./mobile/) |
| 📂 **Código Fuente Web** | Sincronizado | [**Explorar directorio `web/`**](./web/) |

---

## 🏛️ Estructura del Repositorio (Monorepo)

```text
FashionStyle/
├── .github/
│   └── workflows/
│       ├── deploy-web-pages.yml      # Despliega automáticamente la versión Web a GitHub Pages
│       └── build-flutter-mobile.yml  # Analiza y compila el APK Android y bundle Web de Flutter
├── web/                              # Aplicación Web SPA (Vue 3, Vite, Pinia, Tailwind CSS)
│   ├── public/                       # Activos estáticos, 404.html para routing SPA en Pages
│   └── src/                          # Vistas, componentes, servicios y stores Pinia
└── mobile/                           # Aplicación Móvil Nativa (Flutter 3, Riverpod, GoRouter, Dio)
    ├── assets/images/                # Recursos gráficos locales
    ├── lib/
    │   ├── core/                     # Red (Dio), tema, enrutador (GoRouter), WebSockets (Reverb)
    │   ├── data/                     # Modelos fuertemente tipados y servicios API
    │   └── presentation/             # Pantallas (Admin y Públicas), providers Riverpod y widgets
    └── pubspec.yaml                  # Dependencias y manifiesto de Flutter
```

---

## 📱 Módulos de la Aplicación Móvil (Flutter)

La app móvil en `mobile/` replica el 100% de la lógica de negocio y flujos del frontend web, adaptada a una experiencia táctil intuitiva:

1. **Escaparate y Catálogo**:
   - Carrusel de novedades y productos destacados.
   - Catálogo interactivo con filtrado facetado por categoría, talla, color, ordenación y rango de precios.
   - Vista de detalle de prenda con selector de variantes, cálculo dinámico de descuentos y guía interactiva de medidas.
2. **Bolsa y Pasarela de Pagos**:
   - Carrito persistente con validación de stock en tiempo real.
   - Integración nativa con la pasarela de pagos **Wompi** (Tarjetas, Nequi, PSE y Efectivo con polling automático de estado).
3. **Autenticación y Perfil**:
   - Flujos completos de Registro, Inicio de sesión, Verificación de correo por código y Recuperación/Restablecimiento de contraseña con validación defensiva.
   - Historial de pedidos del cliente con detalles de envío, transportadora y guía de rastreo.
4. **Panel de Control Administrativo (Solo roles autorizados)**:
   - **Dashboard**: Métricas en vivo (ventas de hoy, pedidos pendientes, productos agotados, alertas de stock mínimo).
   - **Inventario / Kárdex**: Consulta de existencias por variante y exportación de movimientos en formato CSV.
   - **Gestión de Prendas**: Creación/edición de prendas con variantes, asignación masiva de promociones y subida de imágenes.
   - **Punto de Venta (POS)**: Registro ágil de ventas presenciales, selector de métodos de pago y generación de tickets térmicos roll-80.
   - **Pedidos Online y Facturación**: Control de despachos, validación de guías de envío e importación masiva de facturas DIAN.
   - **Producción y Simulador de Costos**: Módulo de 5 pestañas (simulador de costos con validación de factibilidad de inventario, materias primas, fichas técnicas, órdenes de producción y proveedores).
   - **Seguridad, Usuarios y Bitácora**: Gestión de clientes y personal administrativo, visor de auditoría con diff de cambios y tiempo relativo.
   - **Generador Nativo de Facturas PDF**: Emisión de facturas A4 bajo estándar DIAN y tirillas POS de 80mm usando `pdf` y `printing`.
   - **WebSockets en Tiempo Real**: Notificaciones instantáneas de stock y pedidos mediante Laravel Reverb / Pusher.

---

## 💻 Guía de Inicio Local

### Requisitos Previos
- **Para la Web**: Node.js 18+ y npm.
- **Para la App Móvil**: Flutter SDK 3.19+ y Android Studio / Xcode.

### Ejecutar la Aplicación Web (Vue 3)
```bash
cd web
npm install
npm run dev
# Acceder en http://localhost:3000
```

### Ejecutar la Aplicación Móvil (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

### Compilar APK de Producción para Android
```bash
cd mobile
flutter build apk --release --dart-define=API_BASE_URL=https://fashionstyle.api.adsocidm.com/public/api
# El APK generado se ubica en:
# mobile/build/app/outputs/flutter-apk/app-release.apk
```

---

## 🔄 Automatización CI/CD (GitHub Actions)

El repositorio cuenta con dos canales automatizados:
1. **Despliegue Continuo Web**: Cada `push` a la rama `main` en la carpeta `web/` compila el frontend con Vite y lo despliega automáticamente a GitHub Pages en `https://fashionstylegrupo3.github.io/FashionStyleDist/`.
2. **Compilación Continua Móvil**: Cada cambio en `mobile/` ejecuta `flutter analyze`, compila el APK firmado para Android y genera el paquete Flutter Web, dejándolos disponibles como artefactos de descarga en la pestaña [Actions](https://github.com/FashionStyleGrupo3/FashionStyleDist/actions).

---

## 👥 Equipo de Desarrollo

Desarrollado con dedicación por el Grupo 3 para **Fashion Style**.
Para soporte o reporte de incidencias, por favor abrir un Issue en este repositorio.
