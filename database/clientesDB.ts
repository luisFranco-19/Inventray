import { supabase, getTenantId } from '../src/lib/supabase';
import type { Cliente } from './types';

export type { Cliente };

export type PeriodoClientes = 'todos' | 'hoy' | 'semana' | 'mes';

export async function obtenerClientes(periodo: PeriodoClientes = 'todos'): Promise<Cliente[]> {
  const tenantId = await getTenantId();

  // Obtenemos los clientes y sus ventas relacionadas
  const { data: clientesData, error } = await supabase
    .from('cliente')
    .select(`
      id,
      nombre,
      telefono,
      activo,
      venta (
        id, fecha, total, metodo_pago, estado,
        pago_venta ( monto )
      )
    `)
    .eq('negocio_id', tenantId)
    .eq('activo', 1);

  if (error) throw error;

  let fechaLimite = new Date(0);
  if (periodo === 'hoy') {
    fechaLimite = new Date();
    fechaLimite.setHours(0, 0, 0, 0);
  } else if (periodo === 'semana') {
    fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 6);
    fechaLimite.setHours(0, 0, 0, 0);
  } else if (periodo === 'mes') {
    fechaLimite = new Date();
    fechaLimite.setDate(1); // Inicio de mes
    fechaLimite.setHours(0, 0, 0, 0);
  }

  // Procesar aggregations en JS (Supabase devuelve la data plana jerárquica)
  const clientesProcesados = clientesData.map((c: any) => {
    let totalCompras = 0;
    let numCompras = 0;
    let ultimaCompra = '—';
    let saldoPendiente = 0;
    
    let ultimaFecha = 0;

    const ventas = c.venta || [];

    for (const v of ventas) {
      if (v.estado === 'completada') {
        const fVenta = new Date(v.fecha);
        const dentroDelPeriodo = periodo === 'todos' || fVenta >= fechaLimite;

        // Si hay un periodo elegido, solo sumamos lo que entra en ese periodo
        if (dentroDelPeriodo) {
          totalCompras += v.total;
          numCompras += 1;
        }

        if (fVenta.getTime() > ultimaFecha) {
           ultimaFecha = fVenta.getTime();
           ultimaCompra = v.fecha.split('T')[0];
        }

        // Calcular deudas (crédito) independientemente del periodo elegido (para que siempre sepa cuánto debe)
        if (v.metodo_pago === 'credito') {
          const pagosAbonados = (v.pago_venta || []).reduce((acc: number, p: any) => acc + (p.monto || 0), 0);
          saldoPendiente += (v.total - pagosAbonados);
        }
      }
    }

    return {
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      activo: c.activo,
      totalCompras,
      numCompras,
      ultimaCompra,
      saldoPendiente
    } as any;
  });

  // Si no es "todos", filtramos los que no compraron en la fecha
  const clientesFiltrados = periodo === 'todos' 
    ? clientesProcesados 
    : clientesProcesados.filter(c => c.numCompras > 0);

  // Ordenar: Saldo pendiente desc, luego total compras
  return clientesFiltrados.sort((a, b) => {
    if (b.saldoPendiente !== a.saldoPendiente) return b.saldoPendiente - a.saldoPendiente;
    if (b.totalCompras !== a.totalCompras) return b.totalCompras - a.totalCompras;
    return a.nombre.localeCompare(b.nombre);
  });
}

export async function crearCliente(nombre: string, telefono: string): Promise<number> {
  const tenantId = await getTenantId();
  const { data, error } = await supabase
    .from('cliente')
    .insert([{ negocio_id: tenantId, nombre, telefono }])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function actualizarCliente(id: number, nombre: string, telefono: string): Promise<void> {
  const tenantId = await getTenantId();
  const { error } = await supabase
    .from('cliente')
    .update({ nombre, telefono })
    .eq('id', id)
    .eq('negocio_id', tenantId);

  if (error) throw error;
}

export async function eliminarCliente(id: number): Promise<void> {
  const tenantId = await getTenantId();
  const { error } = await supabase
    .from('cliente')
    .update({ activo: 0 })
    .eq('id', id)
    .eq('negocio_id', tenantId);

  if (error) throw error;
}

export async function obtenerHistorialCliente(clienteId: number) {
  const tenantId = await getTenantId();
  const { data, error } = await supabase
    .from('venta')
    .select(`
      fecha, total, id,
      detalle_venta (
        cantidad,
        variante ( producto ( nombre ) )
      )
    `)
    .eq('negocio_id', tenantId)
    .eq('cliente_id', clienteId)
    .eq('estado', 'completada')
    .order('fecha', { ascending: false })
    .limit(10);

  if (error) throw error;

  return data.map((v: any) => {
    let itemsVenta = 0;
    const detallesArr: string[] = [];

    const detalles = v.detalle_venta || [];
    for (const d of detalles) {
       itemsVenta += d.cantidad;
       const nombreProd = d.variante?.producto?.nombre || 'Producto';
       detallesArr.push(`${nombreProd} (x${d.cantidad})`);
    }

    return {
      fecha: v.fecha.split('T')[0],
      total: v.total,
      items: itemsVenta,
      detalles: detallesArr.join(', ')
    };
  });
}