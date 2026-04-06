import { SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';
import { aplicarMigraciones, resetearMigraciones } from './migrations';

// ─── Conexión única ───────────────────────────────────────────────────────────

let db: SQLiteDatabase | null = null;

async function initDB(): Promise<void> {
  if (!db) {
    db = await openDatabaseAsync('tienda.db');
  }
}

// ─── Función principal que llamas desde index.tsx ─────────────────────────────

export async function inicializarDB(): Promise<void> {
  try {
    await initDB();
    await aplicarMigraciones();
    
    // Purga física de viejos emails (si la columna todavía existe en instalaciones viejas)
    try {
      if (db) await db.execAsync('UPDATE cliente SET email = NULL;');
    } catch {
      // Si la columna ya no existe (instalación nueva), ignoramos el error.
    }
    
    console.log('[DB] Base de datos lista.');
  } catch (e) {
    console.error('[DB] Error al inicializar:', e);
  }
}

export async function resetDB(): Promise<void> {
  try {
    await initDB();
    await resetearMigraciones();
    console.log('[DB] Base de datos reseteada.');
  } catch (e) {
    console.error('[DB] Error al resetear:', e);
  }
}

export async function getDB(): Promise<SQLiteDatabase> {
  if (!db) {
    await initDB();
  }
  return db!;
}
