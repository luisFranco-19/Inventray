import { supabase, getTenantId } from '../src/lib/supabase';
import type { Gasto } from './types';

export async function registrarGasto(descripcion: string, monto: number, categoria: string): Promise<number> {
  const tenantId = await getTenantId();
  const { data, error } = await supabase
    .from('gasto')
    .insert([{ negocio_id: tenantId, descripcion, monto, categoria }])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function obtenerGastosPorPeriodo(periodo: 'hoy' | 'semana' | 'mes'): Promise<Gasto[]> {
  const tenantId = await getTenantId();
  
  let fechaFiltro: Date = new Date();
  if (periodo === 'semana') fechaFiltro.setDate(fechaFiltro.getDate() - 7);
  else if (periodo === 'mes') fechaFiltro.setDate(fechaFiltro.getDate() - 30);
  else {
    // "hoy": desde medianoche
    fechaFiltro.setHours(0, 0, 0, 0);
  }

  const query = supabase
    .from('gasto')
    .select('*')
    .eq('negocio_id', tenantId)
    .gte('fecha', fechaFiltro.toISOString())
    .order('fecha', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as Gasto[];
}

export async function eliminarGasto(id: number): Promise<void> {
  const tenantId = await getTenantId();
  const { error } = await supabase
    .from('gasto')
    .delete()
    .eq('id', id)
    .eq('negocio_id', tenantId);

  if (error) throw error;
}

export async function obtenerTotalGastosEnPeriodo(periodo: 'hoy' | 'semana' | 'mes'): Promise<number> {
  const gastos = await obtenerGastosPorPeriodo(periodo);
  return gastos.reduce((acc, g) => acc + (g.monto || 0), 0);
}
