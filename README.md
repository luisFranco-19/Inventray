# 🚀 Inventray | Mobile POS & Business Manager

**Inventray** es un sistema de Punto de Venta (POS) inteligente y minimalista diseñado para transformar la gestión de pequeños y medianos negocios. Enfocado en la velocidad, el diseño visual premium y la precisión de los datos.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-55-000020?logo=expo&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)

## ✨ Características Principales

- 📊 **Dashboard Bento:** Resumen visual de ventas, tickets y metas del día con animaciones fluidas.
- 🛍️ **POS Optimizado:** Realiza ventas en segundos con soporte para diversos métodos de pago (Efectivo, Tarjeta, Transferencia).
- 📦 **Control de Inventario:** Gestión de variantes, seguimiento de stock y alertas automáticas de resurtido.
- 👥 **Clientes y Deudas:** Panel dedicado para la gestión de cartera y cuentas por cobrar.
- 💸 **Control de Gastos:** Registro detallado de egresos para un balance real de beneficios.
- 📈 **Reportería Avanzada:** Análisis de productos más vendidos y desempeño por periodos.
- 🌓 **Tema Dinámico:** Soporte completo para Modo Oscuro y Claro con estética Minimalista.

## 🛠️ Stack Tecnológico

- **Frontend:** React Native + Expo (SDK 55)
- **Navegación:** Expo Router (File-based routing)
- **Base de Datos:** Supabase (Sincronización Real-time) + Expo SQLite (Persistencia local)
- **Animaciones:** React Native Reanimated & Layout Animations
- **Estilos:** Sistema de diseño centralizado con soporte para múltiples densidades de pantalla (iPhone, iPad, Android).

## 🚀 Estructura del Proyecto

### Base de Datos (`database/`)
- `types.ts`: Definiciones de tipos e interfaces (Cliente, Variante, etc.)
- `database.ts`: Conexión a BD, inicialización y esquemas
- `clientesDB.ts`: Funciones CRUD para clientes
- `variantesDB.ts`: Funciones para variantes de productos e inventario
- `ventasDB.ts`: Funciones para ventas y reportes
- `index.ts`: Exporta todo desde un punto

### Aplicación (`src/`)
- `app/`: Pantallas principales (dashboard, clientes, inventario, etc.)
- `utils/`: Utilidades comunes (helpers, colores, etc.)

## 📖 Cómo Ejecutar
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/luisFranco-19/Inventray.git
   ```
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno (`.env`) con tus credenciales de Supabase.
4. Iniciar: `npx expo start`

## ⚙️ Sistema de Migraciones (SQLite)

Este proyecto utiliza un sistema de migraciones para gestionar cambios en el esquema de la base de datos SQLite de manera controlada y versionada.

### Cómo Funciona

- Las migraciones se almacenan en `database/migrations.ts`
- Cada migración tiene una versión numérica, descripción y SQL a ejecutar
- El sistema automáticamente aplica migraciones pendientes al inicializar la app
- Se mantiene un registro de migraciones aplicadas en la tabla `_migraciones`

### Agregar una Nueva Migración

1. Abre `database/migrations.ts`
2. Agrega un nuevo objeto al array `MIGRACIONES` con:
   - `version`: Número incremental (última versión + 1)
   - `description`: Descripción clara del cambio
   - `sql`: El SQL a ejecutar

Ejemplo:
```typescript
{
  version: 2,
  description: 'Agregar columna telefono a clientes',
  sql: `
    ALTER TABLE cliente ADD COLUMN telefono TEXT;
  `,
}
```

3. Reinicia la app - la migración se aplicará automáticamente

Desarrollado para mejorar la productividad de los emprendedores.
