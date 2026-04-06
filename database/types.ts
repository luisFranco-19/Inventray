export interface Variante {
  id: number;
  productoId: number;
  productoNombre: string;
  categoria: string;
  talla: string;
  color: string;
  stock: number;
  stockMinimo: number;
  precio: number;
  costo: number;
  codigoBarras: string;
  imagenUrl: string | null;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  totalCompras: number;
  numCompras: number;
  ultimaCompra: string;
  activo: boolean;
  saldoPendiente: number;
}

export interface ItemCarrito {
  varianteId: number;
  productoNombre: string;
  talla: string;
  color: string;
  precio: number;
  cantidad: number;
}

export interface VentaResumen {
  id: number;
  fecha: string;
  hora: string;
  clienteNombre: string;
  total: number;
  totalItems: number;
  metodoPago: string;
  estado: string;
}

export interface Gasto {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
  categoria: string;
}

export interface PagoVenta {
  id: number;
  ventaId: number;
  monto: number;
  fecha: string;
  metodoPago: string;
}

export interface Deuda {
  ventaId: number;
  clienteNombre: string;
  clienteTelefono: string;
  fechaVenta: string;
  totalVenta: number;
  pagado: number;
  saldo: number;
}

export interface ProductoTop {
  nombre: string;
  talla: string;
  color: string;
  vendidos: number;
  ingreso: number;
  ganancia: number;
}