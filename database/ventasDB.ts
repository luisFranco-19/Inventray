import { supabase, getTenantId } from '../src/lib/supabase';
import { ajustarStock } from './variantesDB';
import type { ItemCarrito, VentaResumen, ProductoTop } from './types';

export type { ItemCarrito, VentaResumen, ProductoTop };

export async function registrarVenta(
  items: ItemCarrito[],
  subtotal: number,
  descuentoMonto: number,
  total: number,
  metodoPago: string,
  clienteId?: number,
  descuentoId?: number
): Promise<number> {
  const tenantId = await getTenantId();

  try {
    // 1. Crear Venta
    const { data: vData, error: vErr } = await supabase
      .from('venta')
      .insert([{
      negocio_id: tenantId,
      cliente_id: clienteId || null,
      descuento_id: descuentoId || null,
      subtotal,
      descuento_monto: descuentoMonto,
      total,
      metodo_pago: metodoPago,
      estado: 'completada'
    }])
    .select('id').single();

  if (vErr) throw vErr;
  const ventaId = vData.id;

  // 2. Insertar Detalles y Actualizar Stock (Secuencial para simplificar RPC en Supabase)
  for (const item of items) {
    // Congelar el costo actual de la variante
    const { data: varData, error: varErr } = await supabase
      .from('variante')
      .select('costo')
      .eq('id', item.varianteId)
      .single();
    if (varErr) throw varErr;
    const costoActual = varData?.costo ?? 0;

    const { error: detalleErr } = await supabase
      .from('detalle_venta')
      .insert([{
        negocio_id: tenantId,
        venta_id: ventaId,
        variante_id: item.varianteId,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        costo_unitario: costoActual,
        subtotal: item.precio * item.cantidad
      }]);

    if (detalleErr) {
      await supabase.from('detalle_venta').delete().eq('venta_id', ventaId);
      await supabase.from('venta').delete().eq('id', ventaId);
      throw detalleErr;
    }

    await ajustarStock(item.varianteId, 'salida', 'venta', item.cantidad, ventaId);
  }

  return ventaId;
  } catch (err: any) {
    console.error('[VentasDB] registrarVenta falló:', err);

    if (err?.message?.includes('Network request failed')) {
      throw new Error('No hay conexión. Verifica tu internet e intenta de nuevo.');
    }

    throw err;
  }
}

export async function obtenerVentasHoy(): Promise<VentaResumen[]> {
  const tenantId = await getTenantId();
  
  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  const { data, error } = await supabase
    .from('venta')
    .select('id, fecha, total, metodo_pago, estado, cliente ( nombre ), detalle_venta ( id )')
    .eq('negocio_id', tenantId)
    .eq('estado', 'completada')
    .gte('fecha', hoy.toISOString())
    .order('fecha', { ascending: false });

  if (error) throw error;

  return (data || []).map((v: any) => {
    const f = v.fecha ? new Date(v.fecha) : new Date();
    return {
      id: v.id,
      fecha: v.fecha ? v.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      hora: `${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')}`,
      clienteNombre: v.cliente?.nombre || 'Sin nombre',
      total: v.total || 0,
      metodoPago: v.metodo_pago,
      estado: v.estado,
      totalItems: v.detalle_venta?.length || 0
    };
  });
}

function getFiltoRango(periodo: 'hoy' | 'semana' | 'mes'): Date {
  const date = new Date();
  if (periodo === 'semana') date.setDate(date.getDate() - 6);
  if (periodo === 'mes') date.setDate(date.getDate() - 29);
  date.setHours(0,0,0,0);
  return date;
}

export async function obtenerVentasPorPeriodo(
  periodo: 'hoy' | 'semana' | 'mes'
): Promise<{ total: number; tickets: number }> {
  const tenantId = await getTenantId();
  const limite = getFiltoRango(periodo);

  const { data, error } = await supabase
    .from('venta')
    .select('total')
    .eq('negocio_id', tenantId)
    .eq('estado', 'completada')
    .gte('fecha', limite.toISOString());

  if (error) throw error;

  return {
    total: (data || []).reduce((acc, v) => acc + (v.total || 0), 0),
    tickets: (data || []).length
  };
}

export async function obtenerProductosTop(): Promise<ProductoTop[]> {
  const tenantId = await getTenantId();

  // En Supabase PostgREST no podemos hacer top agregados fácilmente sin RPC, 
  // descargamos las ventas completadas y agregamos en memoria (asumiendo que TOP 5 es ligero).
  const { data, error } = await supabase
    .from('detalle_venta')
    .select('cantidad, subtotal, costo_unitario, venta!inner(estado), variante!inner(id, talla, color, producto!inner(nombre))')
    .eq('negocio_id', tenantId)
    .eq('venta.estado', 'completada');

  if (error) throw error;

  const stats: Record<number, ProductoTop & { varianteId: number }> = {};

  data.forEach((d: any) => {
    const vId = d.variante.id;
    if (!stats[vId]) {
      stats[vId] = {
        varianteId: vId,
        nombre: d.variante.producto.nombre,
        talla: d.variante.talla,
        color: d.variante.color,
        vendidos: 0,
        ingreso: 0,
        ganancia: 0
      };
    }
    stats[vId].vendidos += d.cantidad;
    stats[vId].ingreso += d.subtotal;
    stats[vId].ganancia += d.subtotal - (d.cantidad * d.costo_unitario);
  });

  return Object.values(stats)
    .sort((a, b) => b.vendidos - a.vendidos)
    .slice(0, 5);
}

export async function obtenerVentasPorMetodo(): Promise<Record<string, number>> {
  const tenantId = await getTenantId();
  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  const { data, error } = await supabase
    .from('venta')
    .select('metodo_pago, total')
    .eq('negocio_id', tenantId)
    .eq('estado', 'completada')
    .gte('fecha', hoy.toISOString());

  if (error) throw error;

  const result: Record<string, number> = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  data.forEach((v: any) => {
    if (result[v.metodo_pago] !== undefined) {
      result[v.metodo_pago] += v.total;
    } else {
      result[v.metodo_pago] = v.total;
    }
  });
  return result;
}

export async function varianteTieneVentas(varianteId: number): Promise<boolean> {
  const tenantId = await getTenantId();
  const { data, error } = await supabase
    .from('detalle_venta')
    .select('id')
    .eq('negocio_id', tenantId)
    .eq('variante_id', varianteId)
    .limit(1);

  if (error) return false;
  return data.length > 0;
}

export async function obtenerMetricasFinancieras(periodo: 'hoy' | 'semana' | 'mes') {
  const tenantId = await getTenantId();
  const limite = getFiltoRango(periodo);

  // 1. Ingresos y Costos de Ventas
  // Seleccionamos directamente de venta para obtener el total real (con descuentos) 
  // y sumamos los costos de los detalles.
  const { data: vData } = await supabase
    .from('venta')
    .select('total, detalle_venta ( cantidad, costo_unitario )')
    .eq('negocio_id', tenantId)
    .eq('estado', 'completada')
    .gte('fecha', limite.toISOString());

  let ingresos = 0;
  let costoVentas = 0;
  
  if (vData) {
    vData.forEach((v: any) => {
      ingresos += (v.total || 0);
      (v.detalle_venta || []).forEach((d: any) => {
        costoVentas += (d.cantidad || 0) * (d.costo_unitario || 0);
      });
    });
  }

  // 2. Pérdida por Merma
  const { data: mData } = await supabase
    .from('movimiento_inventario')
    .select('cantidad, variante!inner(costo)')
    .eq('negocio_id', tenantId)
    .eq('tipo', 'salida')
    .eq('motivo', 'perdida')
    .gte('fecha', limite.toISOString());

  let perdidaMerma = 0;
  if (mData) {
    mData.forEach((m: any) => {
      perdidaMerma += (m.cantidad || 0) * (m.variante?.costo || 0);
    });
  }

  const gananciaBruta = ingresos - costoVentas;

  return {
    ingresos,
    costoVentas,
    gananciaBruta,
    perdidaMerma,
    gananciaNeta: gananciaBruta - perdidaMerma
  };
}

export async function obtenerHistoricoMetricas(periodo: 'hoy' | 'semana' | 'mes'): Promise<any[]> {
  const tenantId = await getTenantId();
  const limite = getFiltoRango(periodo);

  const { data: vData } = await supabase
    .from('venta')
    .select('fecha, total, detalle_venta ( subtotal, cantidad, costo_unitario )')
    .eq('negocio_id', tenantId)
    .eq('estado', 'completada')
    .gte('fecha', limite.toISOString());

  const { data: mData } = await supabase
    .from('movimiento_inventario')
    .select('fecha, cantidad, variante!inner(costo)')
    .eq('negocio_id', tenantId)
    .eq('tipo', 'salida')
    .eq('motivo', 'perdida')
    .gte('fecha', limite.toISOString());

  const ventas = vData || [];
  const mermas = mData || [];

  if (periodo === 'hoy') {
    const timeline: Record<number, any> = {};
    for (let i = 0; i <= 23; i++) {
       timeline[i] = { etiqueta: `${String(i).padStart(2,'0')}:00`, ingresos: 0, mermas: 0, utilidad: 0 };
    }

    ventas.forEach((v: any) => {
       const d = new Date(v.fecha);
       const h = d.getHours(); // Local hour
       if (timeline[h]) {
         timeline[h].ingresos += (v.total || 0);
         const costo = (v.detalle_venta || []).reduce((acc: number, dv: any) => acc + (dv.cantidad * (dv.costo_unitario || 0)), 0);
         timeline[h].utilidad += ((v.total || 0) - costo);
       }
    });

    mermas.forEach((m: any) => {
      const d = new Date(m.fecha);
      const h = d.getHours();
      if (timeline[h]) {
        timeline[h].mermas += (m.cantidad || 0) * (m.variante?.costo || 0);
        timeline[h].utilidad -= (m.cantidad || 0) * (m.variante?.costo || 0);
      }
    });

    return Object.values(timeline);
  } else {
    const timeline: Record<string, any> = {};
    
    // Rellenar días en blanco de forma robusta
    const diasTotal = periodo === 'semana' ? 6 : 29;
    for (let i = diasTotal; i >= 0; i--) {
       const d = new Date();
       d.setDate(d.getDate() - i);
       const m = String(d.getMonth() + 1).padStart(2,'0');
       const day = String(d.getDate()).padStart(2,'0');
       const k = `${d.getFullYear()}-${m}-${day}`;
       timeline[k] = { etiqueta: `${day}/${m}`, ingresos: 0, mermas: 0, utilidad: 0, rawKey: k };
    }

    ventas.forEach((v: any) => {
       if (!v.fecha) return;
       const d = new Date(v.fecha);
       const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
       
       if (timeline[k]) {
          timeline[k].ingresos += (v.total || 0);
          const costo = (v.detalle_venta || []).reduce((acc: number, dv: any) => acc + (dv.cantidad * (dv.costo_unitario || 0)), 0);
          timeline[k].utilidad += ((v.total || 0) - costo);
       }
    });

    mermas.forEach((m: any) => {
       if (!m.fecha) return;
       const d = new Date(m.fecha);
       const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
       
       if (timeline[k]) {
          const loss = (m.cantidad || 0) * (m.variante?.costo || 0);
          timeline[k].mermas += loss;
          timeline[k].utilidad -= loss;
       }
    });

    return Object.values(timeline).sort((a,b) => (a as any).rawKey.localeCompare((b as any).rawKey));
  }
}
