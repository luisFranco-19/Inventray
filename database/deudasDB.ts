import { supabase, getTenantId } from '../src/lib/supabase';
import type { Deuda, PagoVenta } from './types';

export async function obtenerDeudasPendientes(): Promise<Deuda[]> {
  const tenantId = await getTenantId();
  
  const { data, error } = await supabase
    .from('venta')
    .select('id, total, fecha, cliente ( nombre, telefono ), pago_venta ( monto )')
    .eq('negocio_id', tenantId)
    .eq('metodo_pago', 'credito')
    .eq('estado', 'completada')
    .order('fecha', { ascending: true });

  if (error) throw error;

  return data
    .map((r: any) => {
       const pagado = (r.pago_venta || []).reduce((acc: number, p: any) => acc + (p.monto || 0), 0);
       return {
         ventaId: r.id,
         clienteNombre: r.cliente?.nombre || 'Desconocido',
         clienteTelefono: r.cliente?.telefono,
         fechaVenta: r.fecha.split('T')[0],
         totalVenta: r.total,
         pagado,
         saldo: r.total - pagado
       };
    })
    .filter((r: any) => r.saldo > 0.01);
}

export async function registrarAbono(ventaId: number, monto: number, metodoPago: string = 'efectivo'): Promise<void> {
  const tenantId = await getTenantId();
  const { error } = await supabase
    .from('pago_venta')
    .insert([{ negocio_id: tenantId, venta_id: ventaId, monto, metodo_pago: metodoPago }]);

  if (error) throw error;
}

export async function obtenerSaldosPorCliente(): Promise<{clienteId: number, nombre: string, saldoTotal: number}[]> {
  const tenantId = await getTenantId();
  
  const { data, error } = await supabase
    .from('venta')
    .select('id, total, cliente_id, cliente ( nombre ), pago_venta ( monto )')
    .eq('negocio_id', tenantId)
    .eq('metodo_pago', 'credito')
    .eq('estado', 'completada');

  if (error) throw error;

  const saldos: Record<number, {clienteId: number, nombre: string, saldoTotal: number}> = {};

  data.forEach((r: any) => {
    const pagado = (r.pago_venta || []).reduce((acc: number, p: any) => acc + (p.monto || 0), 0);
    const saldoVenta = r.total - pagado;
    
    if (saldoVenta > 0.01 && r.cliente_id) {
      if (!saldos[r.cliente_id]) {
        saldos[r.cliente_id] = { clienteId: r.cliente_id, nombre: r.cliente?.nombre || 'Desconocido', saldoTotal: 0 };
      }
      saldos[r.cliente_id].saldoTotal += saldoVenta;
    }
  });

  return Object.values(saldos).sort((a, b) => b.saldoTotal - a.saldoTotal);
}

export async function obtenerHistorialAbonos(ventaId: number): Promise<PagoVenta[]> {
  const tenantId = await getTenantId();
  const { data, error } = await supabase
    .from('pago_venta')
    .select('id, venta_id, monto, fecha, metodo_pago')
    .eq('negocio_id', tenantId)
    .eq('venta_id', ventaId)
    .order('fecha', { ascending: false });

  if (error) throw error;

  return data.map((r: any) => ({
    id: r.id,
    ventaId: r.venta_id,
    monto: r.monto,
    fecha: r.fecha.split('T')[0],
    metodoPago: r.metodo_pago
  }));
}
