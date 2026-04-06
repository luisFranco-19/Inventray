import { getDB } from './database';

// ─── Leer un valor de configuración ──────────────────────────────────────────

export async function obtenerConfiguracion(clave: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ valor: string }>(
    `SELECT valor FROM configuracion WHERE clave = ?`, [clave]
  );
  return row?.valor ?? null;
}

// ─── Guardar un valor de configuración ───────────────────────────────────────

export async function guardarConfiguracion(clave: string, valor: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)`,
    [clave, valor]
  );
}

// ─── Leer todas las configuraciones como objeto ──────────────────────────────

export async function obtenerTodasConfiguraciones(): Promise<Record<string, string>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ clave: string; valor: string }>(
    `SELECT clave, valor FROM configuracion`
  );
  const result: Record<string, string> = {};
  for (const r of rows) result[r.clave] = r.valor;
  return result;
}

// ─── Verificar si el onboarding fue completado ──────────────────────────────

export async function estaConfigurado(): Promise<boolean> {
  const val = await obtenerConfiguracion('onboarding_completo');
  return val === '1';
}

// ─── Marcar onboarding como completado ──────────────────────────────────────

export async function marcarConfigurado(): Promise<void> {
  await guardarConfiguracion('onboarding_completo', '1');
}

// ─── Verificar si la guía de funciones fue vista ──────────────────────────────

export async function haVistoGuia(): Promise<boolean> {
  const val = await obtenerConfiguracion('guia_inicial_vista');
  return val === '1';
}

// ─── Marcar guía de funciones como vista ──────────────────────────────────────

export async function marcarGuiaVista(): Promise<void> {
  await guardarConfiguracion('guia_inicial_vista', '1');
}

// ─── Reiniciar guía de funciones (para pruebas/settings) ──────────────────────

export async function reiniciarGuia(): Promise<void> {
  await guardarConfiguracion('guia_inicial_vista', '0');
}
