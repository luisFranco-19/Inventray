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
- 🤝 **Gestión de Proveedores:** Base de datos de proveedores con persistencia, conexión directa por WhatsApp y control ágil de contactos.
- 💸 **Control de Gastos:** Registro detallado de egresos para un balance real de beneficios.
- 📈 **Reportería Avanzada:** Análisis de productos más vendidos y desempeño por periodos.
- 🌓 **Tema Dinámico:** Soporte completo para Modo Oscuro y Claro con estética Minimalista.
- 📱 **Diseño Responsivo:** Interfaz adaptable fluidamente a móviles y tablets.

## 🛠️ Stack Tecnológico

- **Frontend:** React Native + Expo (SDK 55)
- **Navegación:** Expo Router (File-based routing)
- **Base de Datos:** PostgreSQL vía Supabase (Sincronización Real-time y Almacenamiento Centralizado)
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

## ⚙️ Arquitectura de Datos y Migraciones (Supabase)

Hemos transformado la infraestructura de datos para adoptar **Supabase (PostgreSQL)** como nuestra única fuente de verdad, abandonando los esquemas locales con SQLite. Esta arquitectura provee sincronización robusta en tiempo real, unificación centralizada y altas capacidades de integración.

### 🏛️ Principios de Diseño
- **PostgreSQL en el Core:** Toda el modelo de negocio se apoya sobre el motor relacional de Supabase garantizando integridad (Foreign Keys, Constraints de validación).
- **Sincronización Real-Time:** Las modificaciones de stock durante la operación de caja impactan instantáneamente en todas las instancias concurrentes conectadas utilizando suscripciones WebSockets seguras.
- **Acceso Directo y Controlado:** Interactuamos directamente desde el lado cliente optimizando tiempos de desarrollo gracias al uso de Row-Level Security (RLS) para preservar la seguridad de los datos.

### 📖 Guía de Implementación Paso a Paso

Si eres un nuevo miembro del equipo de ingeniería o necesitas levantar el ambiente en un endpoint distinto, sigue cuidadosamente este procedimiento:

#### 1. Aprovisionamiento del Proyecto (Supabase Cloud)
1. Accede a tu consola corporativa/personal en [Supabase](https://supabase.com) y crea o ubica tu proyecto.
2. Dirígete la sección de `Project Settings > API` para obtener la **URL del Proyecto** y la **Clave Pública (Anon Key)**.

#### 2. Enlace de Variables de Seguridad Local
Crea un archivo de configuración `.env` firmemente colocado en el root del proyecto. El aislamiento de estas credenciales previene errores de deployment; no olvides que tu `.gitignore` debe proteger este archivo.

```env
EXPO_PUBLIC_SUPABASE_URL=https://[TU-ID].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[TU-ANON-KEY-AQUI]
```

#### 3. Despliegue de Esquemas y Políticas
El control de cambios y migraciones en tablas ahora se maneja contra nuestro entorno Cloud. Ya no necesitas preocuparte de que los triggers de app recreen tablas locales.

1. Ingresa al **SQL Editor** a través del dashboard de Supabase (o bien, desde el Supabase CLI).
2. **Setup Base**: Ejecuta los scripts DDL o queries para definir los buckets iniciales de datos:
   - Crear tablas pilar: `clientes`, `proveedores`, `variantes`, y `ventas`.
   - Si habilitas control estricto: `ALTER TABLE {tu_tabla} ENABLE ROW LEVEL SECURITY;`
3. **Manejo RLS**: Crea políticas precisas. Para un scope abierto (fase pre-productiva agresiva) puedes habilitar RLS para todos y solo restringir por key.

```sql
-- Ejemplo de política permisiva habilitada para operaciones de backend rápido
CREATE POLICY "Actividad Abierta Auth" ON clientes FOR ALL USING (true);
```

#### 4. Instanciación Arquitectónica del Cliente (SDK)
Al inicio de la aplicación en memoria (generalmente exportado desde tu root o `src/lib/supabase.ts`), levantamos un cliente singleton emparejado a Storage nativo para garantizar auto-regeneración de tokens y una excelente UX sin pedir login constante:

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 💡 Mejores Prácticas del Core Team
- **Extrayendo el Estado Reactivamente:** Suscríbete siempre al canal de actualización (`supabase.channel('public:...').on(...)`) cuando manejes la visualización en vivo de transacciones altas como inventarios. 
- **Veracidad por Interfaces Tipadas:** Toda consulta al cliente es genéricamente estricta. Actualiza las interfaces TypeScript (`database/types.ts`) de acuerdo a configuraciones definidas en PostgreSQL.

## 🤖 Instalación Asistida por IA (Prompt para Agentes)

Si cuentas con un asistente o agente de IA (como Antigravity, un agente CLI o Cursor Workspace) y prefieres delegar la configuración, copia y pega el siguiente mensaje directo en su chat:

> **Prompt rápido para tu Agente:**
> "Actúa como mi Lead Engineer. Quiero que instales y configures este proyecto ('Inventray') en mi entorno local. Por favor, ejecuta lo siguiente paso a paso y detenme si necesitas mi input:
> 1. Clona el repositorio desde `https://github.com/luisFranco-19/Inventray.git` o verifica que ya estamos en él.
> 2. Asegúrate de ejecutar `npm install` para levantar todas las dependencias.
> 3. Crea un archivo `.env` en la raíz (asegúrate de que esté en el `.gitignore`) y solicítame explícitamente mis llaves `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
> 4. Revisa la sección *Arquitectura de Datos y Migraciones* del `README.md` y ayúdame, explicándomelo simple, a montar los queries en mi SQL Editor de Supabase.
> 5. Al terminar, levanta el proyecto con `npx expo start` y confírmame que todo está corriendo adecuadamente."

Desarrollado con metodologías orientadas a escalar y automatizar procesos de negocio.
