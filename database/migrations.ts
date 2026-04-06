import { getDB } from './database';

// ─── Tabla para rastrear migraciones aplicadas ───────────────────────────────

async function crearTablaMigraciones(): Promise<void> {
  const db = await getDB();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      version   TEXT    NOT NULL UNIQUE,
      aplicada_en TEXT  NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ─── Lista de migraciones ─────────────────────────────────────────────────────
// Cada migración es un objeto con versión y script SQL a ejecutar.

const MIGRACIONES = [
  {
    version: 'v1.0.0',
    sql: `
      -- Migración inicial: Crear todas las tablas
      CREATE TABLE IF NOT EXISTS _seed (
        clave TEXT PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS categoria (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre      TEXT    NOT NULL UNIQUE,
        descripcion TEXT,
        activo      INTEGER NOT NULL DEFAULT 1,
        creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS producto (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
        nombre       TEXT    NOT NULL,
        descripcion  TEXT,
        precio_base  REAL    NOT NULL CHECK (precio_base >= 0),
        imagen_url   TEXT,
        activo       INTEGER NOT NULL DEFAULT 1,
        creado_en    TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS variante (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id   INTEGER NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
        talla         TEXT    NOT NULL,
        color         TEXT    NOT NULL,
        stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        stock_minimo  INTEGER NOT NULL DEFAULT 2,
        precio        REAL,
        codigo_barras TEXT    UNIQUE,
        activo        INTEGER NOT NULL DEFAULT 1,
        creado_en     TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (producto_id, talla, color)
      );

      CREATE TABLE IF NOT EXISTS cliente (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre         TEXT    NOT NULL,
        telefono       TEXT,
        fecha_registro TEXT    NOT NULL DEFAULT (datetime('now')),
        activo         INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS descuento (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre       TEXT    NOT NULL,
        tipo         TEXT    NOT NULL CHECK (tipo IN ('porcentaje','monto')),
        valor        REAL    NOT NULL CHECK (valor > 0),
        fecha_inicio TEXT    NOT NULL,
        fecha_fin    TEXT    NOT NULL,
        activo       INTEGER NOT NULL DEFAULT 1,
        creado_en    TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS venta (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id      INTEGER REFERENCES cliente(id)   ON DELETE SET NULL,
        descuento_id    INTEGER REFERENCES descuento(id) ON DELETE SET NULL,
        fecha           TEXT    NOT NULL DEFAULT (datetime('now')),
        subtotal        REAL    NOT NULL DEFAULT 0,
        descuento_monto REAL    NOT NULL DEFAULT 0,
        total           REAL    NOT NULL DEFAULT 0,
        metodo_pago     TEXT    NOT NULL DEFAULT 'efectivo',
        estado          TEXT    NOT NULL DEFAULT 'completada'
                        CHECK (estado IN ('completada','anulada')),
        notas           TEXT,
        creado_en       TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS detalle_venta (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id        INTEGER NOT NULL REFERENCES venta(id)    ON DELETE CASCADE,
        variante_id     INTEGER NOT NULL REFERENCES variante(id) ON DELETE RESTRICT,
        cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
        precio_unitario REAL    NOT NULL CHECK (precio_unitario >= 0),
        subtotal        REAL    NOT NULL CHECK (subtotal >= 0)
      );

      CREATE TABLE IF NOT EXISTS movimiento_inventario (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        variante_id   INTEGER NOT NULL REFERENCES variante(id) ON DELETE RESTRICT,
        venta_id      INTEGER REFERENCES venta(id) ON DELETE SET NULL,
        tipo          TEXT    NOT NULL CHECK (tipo IN ('entrada','salida')),
        motivo        TEXT    NOT NULL CHECK (motivo IN ('compra','venta','devolucion','ajuste','perdida')),
        cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
        stock_antes   INTEGER NOT NULL,
        stock_despues INTEGER NOT NULL,
        notas         TEXT,
        fecha         TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    version: 'v1.1.0',
    sql: `
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
    `,
  },
  {
    version: 'v1.2.0',
    sql: `
      PRAGMA foreign_keys=off;
      
      CREATE TABLE IF NOT EXISTS venta_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id      INTEGER REFERENCES cliente(id)   ON DELETE SET NULL,
        descuento_id    INTEGER REFERENCES descuento(id) ON DELETE SET NULL,
        fecha           TEXT    NOT NULL DEFAULT (datetime('now')),
        subtotal        REAL    NOT NULL DEFAULT 0,
        descuento_monto REAL    NOT NULL DEFAULT 0,
        total           REAL    NOT NULL DEFAULT 0,
        metodo_pago     TEXT    NOT NULL DEFAULT 'efectivo',
        estado          TEXT    NOT NULL DEFAULT 'completada'
                        CHECK (estado IN ('completada','anulada')),
        notas           TEXT,
        creado_en       TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      
      INSERT INTO venta_new SELECT * FROM venta;
      DROP TABLE venta;
      ALTER TABLE venta_new RENAME TO venta;
      
      PRAGMA foreign_keys=on;
    `,
  },
  {
    version: 'v1.3.0',
    sql: `
      ALTER TABLE variante ADD COLUMN costo REAL NOT NULL DEFAULT 0;
      ALTER TABLE detalle_venta ADD COLUMN costo_unitario REAL NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 'v1.4.0',
    sql: `
      CREATE TABLE IF NOT EXISTS gasto (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        descripcion TEXT    NOT NULL,
        monto       REAL    NOT NULL CHECK (monto >= 0),
        fecha       TEXT    NOT NULL DEFAULT (datetime('now')),
        categoria   TEXT    DEFAULT 'Otros'
      );

      CREATE TABLE IF NOT EXISTS pago_venta (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id  INTEGER NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
        monto     REAL    NOT NULL CHECK (monto >= 0),
        fecha     TEXT    NOT NULL DEFAULT (datetime('now')),
        metodo_pago TEXT  NOT NULL DEFAULT 'efectivo'
      );
    `,
  },
];

// ─── Función para aplicar migraciones ─────────────────────────────────────────

export async function aplicarMigraciones(): Promise<void> {
  try {
    await crearTablaMigraciones();

    const db = await getDB();

    // Obtener migraciones ya aplicadas
    const aplicadas = await db.getAllAsync<{ version: string }>(`SELECT version FROM migraciones`);
    const versionesAplicadas = new Set(aplicadas.map(m => m.version));

    // Aplicar migraciones pendientes
    for (const migracion of MIGRACIONES) {
      if (!versionesAplicadas.has(migracion.version)) {
        console.log(`[MIGRACIÓN] Intentando aplicar ${migracion.version}...`);
        
        try {
          await db.execAsync(migracion.sql);
          await db.runAsync(`INSERT INTO migraciones (version) VALUES (?)`, [migracion.version]);
          console.log(`[MIGRACIÓN] ${migracion.version} aplicada con éxito.`);
        } catch (error: any) {
          // Si el error es porque la columna ya existe, marcamos como aplicada para no bloquear el inicio
          if (error?.message?.includes('duplicate column name')) {
             console.warn(`[MIGRACIÓN] ${migracion.version} reportó columnas duplicadas. Marcando como aplicada para continuar.`);
             await db.runAsync(`INSERT INTO migraciones (version) VALUES (?)`, [migracion.version]);
          } else {
             // Si es otro tipo de error, lanzamos para que se vea en el catch principal
             console.error(`[MIGRACIÓN] Error crítico en ${migracion.version}:`, error);
             throw error; 
          }
        }
      }
    }

    console.log('[MIGRACIÓN] Todas las migraciones procesadas.');
  } catch (e) {
    console.error('[MIGRACIÓN] Excepción general:', e);
    throw e; // Lanzar para que la UI capture el error si es un fallo real
  }
}

// ─── Función para resetear migraciones (útil para desarrollo) ───────────────

export async function resetearMigraciones(): Promise<void> {
  try {
    const db = await getDB();

    // Borrar todas las tablas
    await db.execAsync(`DROP TABLE IF EXISTS pago_venta;`);
    await db.execAsync(`DROP TABLE IF EXISTS gasto;`);
    await db.execAsync(`DROP TABLE IF EXISTS configuracion;`);
    await db.execAsync(`DROP TABLE IF EXISTS movimiento_inventario;`);
    await db.execAsync(`DROP TABLE IF EXISTS detalle_venta;`);
    await db.execAsync(`DROP TABLE IF EXISTS venta;`);
    await db.execAsync(`DROP TABLE IF EXISTS variante;`);
    await db.execAsync(`DROP TABLE IF EXISTS producto;`);
    await db.execAsync(`DROP TABLE IF EXISTS cliente;`);
    await db.execAsync(`DROP TABLE IF EXISTS descuento;`);
    await db.execAsync(`DROP TABLE IF EXISTS categoria;`);
    await db.execAsync(`DROP TABLE IF EXISTS _seed;`);
    await db.execAsync(`DROP TABLE IF EXISTS migraciones;`);
    console.log('[MIGRACIÓN] Migraciones reseteadas.');
  } catch (e) {
    console.error('[MIGRACIÓN] Error al resetear migraciones:', e);
  }
}