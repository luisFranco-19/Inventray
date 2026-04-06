# MBPos - Sistema de Punto de Venta

## Estructura del Proyecto

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

### Archivos de Configuración
- `package.json`: Dependencias
- `tsconfig.json`: Configuración TypeScript
- `expo-env.d.ts`: Tipos Expo
- `app.json`: Configuración Expo

## Cómo Ejecutar
1. Instalar dependencias: `npm install`
2. Iniciar: `npx expo start`

## Sistema de Migraciones de Base de Datos

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

### Funciones Disponibles

- `aplicarMigraciones()`: Aplica todas las migraciones pendientes
- `resetearMigraciones()`: Borra todas las tablas y reinicia las migraciones desde cero

### Consideraciones

- Las migraciones son irreversibles una vez aplicadas
- Siempre prueba las migraciones en desarrollo antes de producción
- Mantén versiones incrementales sin saltos
- Usa transacciones para cambios complejos si es necesario