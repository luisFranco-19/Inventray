import { supabase, getTenantId } from '../src/lib/supabase';
import type { Variante } from './types';

export type { Variante };

export async function obtenerVariantes(): Promise<Variante[]> {
  const tenantId = await getTenantId();
  
  const { data, error } = await supabase
    .from('variante')
    .select('id, talla, color, stock, stock_minimo, precio, costo, codigo_barras, producto!inner(id, nombre, precio_base, imagen_url, categoria!inner(nombre))')
    .eq('negocio_id', tenantId)
    .eq('activo', 1);

  if (error) throw error;
  
  // Filtrar en cliente si el producto está inactivo (aunque se podría con !inner y eq)
  // Mapear al formato esperado por la app
  return data.map((v: any) => ({
    id: v.id,
    productoId: v.producto.id,
    productoNombre: v.producto.nombre,
    categoria: v.producto.categoria.nombre,
    talla: v.talla,
    color: v.color,
    stock: v.stock,
    stockMinimo: v.stock_minimo,
    precio: v.precio ?? v.producto.precio_base,
    costo: v.costo,
    codigoBarras: v.codigo_barras,
    imagenUrl: v.producto.imagen_url
  })).sort((a, b) => {
    if (a.productoNombre !== b.productoNombre) return a.productoNombre.localeCompare(b.productoNombre);
    if (a.talla !== b.talla) return a.talla.localeCompare(b.talla);
    return a.color.localeCompare(b.color);
  });
}

export async function ajustarStock(
  varianteId: number,
  tipo: 'entrada' | 'salida',
  motivo: 'compra' | 'venta' | 'devolucion' | 'ajuste' | 'perdida',
  cantidad: number,
  ventaId?: number
): Promise<void> {
  const tenantId = await getTenantId();
  
  // 1. Obtener stock actual
  const { data: vParams, error: e1 } = await supabase
    .from('variante')
    .select('stock')
    .eq('id', varianteId)
    .eq('negocio_id', tenantId)
    .single();
    
  if (e1 || !vParams) throw new Error('Variante no encontrada');

  const stockAntes = vParams.stock;
  const stockDespues = tipo === 'entrada' ? stockAntes + cantidad : stockAntes - cantidad;
  if (stockDespues < 0) throw new Error('Stock insuficiente para esta operación.');

  // 2. Actualizar Variante
  const { error: e2 } = await supabase
    .from('variante')
    .update({ stock: stockDespues })
    .eq('id', varianteId)
    .eq('negocio_id', tenantId);
    
  if (e2) throw e2;

  // 3. Registrar Movimiento
  const { error: e3 } = await supabase
    .from('movimiento_inventario')
    .insert([{
      negocio_id: tenantId,
      variante_id: varianteId,
      venta_id: ventaId || null,
      tipo,
      motivo,
      cantidad,
      stock_antes: stockAntes,
      stock_despues: stockDespues
    }]);
    
  if (e3) throw e3;
}

export async function crearVariante(
  productoNombre: string, talla: string, color: string, 
  precio: number, costo: number, stock: number, 
  stockMinimo: number, codigoBarras?: string, imagenUrl?: string
): Promise<number> {
  const tenantId = await getTenantId();

  // 1. Buscar o crear Categoria 'General'
  let categoriaId: number;
  const { data: catData } = await supabase
    .from('categoria')
    .select('id')
    .eq('nombre', 'General')
    .eq('negocio_id', tenantId)
    .single();

  if (catData) {
    categoriaId = catData.id;
  } else {
    const { data: newCat, error: catErr } = await supabase
      .from('categoria')
      .insert([{ negocio_id: tenantId, nombre: 'General' }])
      .select('id').single();
    if (catErr) throw catErr;
    categoriaId = newCat.id;
  }

  // 2. Buscar o crear Producto
  let productoId: number;
  const { data: prodData } = await supabase
    .from('producto')
    .select('id')
    .eq('nombre', productoNombre)
    .eq('negocio_id', tenantId)
    .single();

  if (prodData) {
    productoId = prodData.id;
    if (imagenUrl) {
      // Actualizar imagen si se mandó nueva
      await supabase.from('producto').update({ imagen_url: imagenUrl }).eq('id', productoId);
    }
  } else {
    const { data: newProd, error: prodErr } = await supabase
      .from('producto')
      .insert([{
        negocio_id: tenantId, 
        categoria_id: categoriaId,
        nombre: productoNombre,
        precio_base: precio,
        imagen_url: imagenUrl || null
      }])
      .select('id').single();
    if (prodErr) throw prodErr;
    productoId = newProd.id;
  }

  // 3. Crear Variante
  const { data: newVar, error: varErr } = await supabase
    .from('variante')
    .insert([{
      negocio_id: tenantId,
      producto_id: productoId,
      talla,
      color,
      stock,
      stock_minimo: stockMinimo,
      precio,
      costo,
      codigo_barras: codigoBarras || null
    }])
    .select('id').single();

  if (varErr) throw varErr;
  return newVar.id;
}

export async function eliminarVariante(id: number): Promise<void> {
  const tenantId = await getTenantId();
  const { error } = await supabase
    .from('variante')
    .update({ activo: 0 })
    .eq('id', id)
    .eq('negocio_id', tenantId);

  if (error) throw error;
}

export async function actualizarVariante(
  id: number, productoNombre?: string, precio?: number, 
  costo?: number, stockMinimo?: number, codigoBarras?: string, imagenUrl?: string
): Promise<void> {
  const tenantId = await getTenantId();

  // Buscar el producto_id atado a esta variante
  const { data: vData, error: vErr } = await supabase
    .from('variante')
    .select('producto_id')
    .eq('id', id)
    .eq('negocio_id', tenantId)
    .single();

  if (vErr || !vData) throw new Error('Variante no encontrada');

  // Actualizar Producto si aplica
  if (productoNombre !== undefined || imagenUrl !== undefined) {
    const pUpdates: any = {};
    if (productoNombre !== undefined) pUpdates.nombre = productoNombre;
    if (imagenUrl !== undefined) pUpdates.imagen_url = imagenUrl;
    
    await supabase.from('producto')
      .update(pUpdates)
      .eq('id', vData.producto_id)
      .eq('negocio_id', tenantId);
  }

  // Actualizar Variante
  const vUpdates: any = {};
  if (precio !== undefined) vUpdates.precio = precio;
  if (costo !== undefined) vUpdates.costo = costo;
  if (stockMinimo !== undefined) vUpdates.stock_minimo = stockMinimo;
  if (codigoBarras !== undefined) vUpdates.codigo_barras = codigoBarras || null;

  if (Object.keys(vUpdates).length > 0) {
    const { error: updErr } = await supabase
      .from('variante')
      .update(vUpdates)
      .eq('id', id)
      .eq('negocio_id', tenantId);

    if (updErr) throw updErr;
  }
}