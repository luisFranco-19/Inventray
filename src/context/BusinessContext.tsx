import React, { createContext, useContext, useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import * as Device from 'expo-device';
import { Alert } from 'react-native';
// Ya no usamos la DB local para config
// import { obtenerTodasConfiguraciones, guardarConfiguracion, ... } from '../../database/configuracionDB';

// ─── Tipos de negocio soportados ──────────────────────────────────────────────

export type TipoNegocio = 'ropa' | 'tecnologia' | 'belleza' | 'pintura' | 'alimentos' | 'general';

export interface MetodoPagoOpcion {
  id: string;
  label: string;
  icon: string;
}

export const METODOS_PAGO_OPCIONES: MetodoPagoOpcion[] = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta (Débito/Crédito)', icon: '💳' },
  { id: 'transferencia', label: 'Transferencia / SPEI', icon: '🏦' },
  { id: 'qr', label: 'Pago con QR', icon: '📱' },
  { id: 'sinpe', label: 'SINPE Móvil', icon: '📲' },
  { id: 'credito', label: 'Crédito / Fiado', icon: '📝' },
];


export interface SubTipoNegocio {
  id: string;
  nombre: string;
  labelAtributo1: string;
  labelAtributo2: string;
  placeholderProducto: string;
  placeholderAtributo1: string;
  placeholderAtributo2: string;
  categoriasDefault: string[];
}

export interface NegocioConfig {
  tipo: TipoNegocio;
  subtipoNombre?: string;
  nombre: string;
  icono: string;
  customIcono?: string;
  labelAtributo1: string;
  labelAtributo2: string;
  placeholderProducto: string;
  placeholderAtributo1: string;
  placeholderAtributo2: string;
  gradiente: [string, string];
  customGradiente?: [string, string];
  categoriasDefault: string[];
  metodosPago: string[];
  ownerName?: string;
}

export interface Dispositivo {
  id: string;
  tenant_id: string;
  nombre: string;
  rol: 'admin' | 'empleado';
  ultimo_acceso: string;
  activo: boolean;
  permisos: string[];
}

export interface TipoNegocioConfig extends Omit<NegocioConfig, 'nombre' | 'subtipoNombre' | 'customIcono' | 'customGradiente' | 'metodosPago'> {
  subtipos: SubTipoNegocio[];
}

// ─── Configuraciones por tipo ─────────────────────────────────────────────────

export const NEGOCIOS: Record<TipoNegocio, TipoNegocioConfig> = {
  ropa: {
    tipo: 'ropa',
    icono: '👗',
    ...{
        labelAtributo1: 'Talla', labelAtributo2: 'Color',
        placeholderProducto: 'Camisa polo, Zapatos...',
        placeholderAtributo1: 'M, L, 42...', placeholderAtributo2: 'Negro, Azul...',
        categoriasDefault: ['Camisas', 'Pantalones', 'Zapatos', 'Accesorios']
    },
    gradiente: ['#8E2DE2', '#4A00E0'],
    subtipos: [
      { id: 'general', nombre: 'Ropa en General', labelAtributo1: 'Talla', labelAtributo2: 'Color', placeholderProducto: 'Camisa...', placeholderAtributo1: 'M, L...', placeholderAtributo2: 'Negro...', categoriasDefault: ['Camisas', 'Pantalones'] },
      { id: 'boutique', nombre: 'Boutique / Tienda de Ropa', labelAtributo1: 'Talla', labelAtributo2: 'Color/Estilo', placeholderProducto: 'Blusa importada...', placeholderAtributo1: 'S, M, L...', placeholderAtributo2: 'Rosa, Estampado...', categoriasDefault: ['Damas', 'Caballeros', 'Niños'] },
      { id: 'zapateria', nombre: 'Zapatería y Calzado', labelAtributo1: 'Número', labelAtributo2: 'Material', placeholderProducto: 'Tenis, Botas...', placeholderAtributo1: '38, 42...', placeholderAtributo2: 'Cuero, Sintético...', categoriasDefault: ['Tenis', 'Botas', 'Sandalias'] },
      { id: 'deportes', nombre: 'Ropa Deportiva', labelAtributo1: 'Talla', labelAtributo2: 'Disciplina', placeholderProducto: 'Pantalón yoga...', placeholderAtributo1: 'S, M...', placeholderAtributo2: 'Yoga, Running...', categoriasDefault: ['Playeras', 'Shorts', 'Calzado Deportivo'] },
    ]
  },
  tecnologia: {
    tipo: 'tecnologia',
    icono: '💻',
    ...{
        labelAtributo1: 'Capacidad', labelAtributo2: 'Color',
        placeholderProducto: 'iPhone 16, Laptop...',
        placeholderAtributo1: '128GB, 1TB...', placeholderAtributo2: 'Negro, Plata...',
        categoriasDefault: ['Celulares', 'Laptops', 'Accesorios']
    },
    gradiente: ['#1D4ED8', '#3B82F6'],
    subtipos: [
      { id: 'celulares', nombre: 'Celulares y Accesorios', labelAtributo1: 'Capacidad', labelAtributo2: 'Modelo', placeholderProducto: 'iPhone 16...', placeholderAtributo1: '128GB...', placeholderAtributo2: 'Pro, Normal...', categoriasDefault: ['Celulares', 'Fundas', 'Cargadores'] },
      { id: 'electro', nombre: 'Electrodomésticos y Hogar', labelAtributo1: 'Marca', labelAtributo2: 'Garantía', placeholderProducto: 'Refrigeradora, TV...', placeholderAtributo1: 'Samsung, Mabe...', placeholderAtributo2: '1 año, 6 meses...', categoriasDefault: ['Línea Blanca', 'Televisores', 'Cocina'] },
      { id: 'repuestos', nombre: 'Repuestos Motos y Vehículos', labelAtributo1: 'Vehículo/Año', labelAtributo2: 'Marca/Origen', placeholderProducto: 'Bujía, Aceite...', placeholderAtributo1: 'Pulsar 200, Toyota...', placeholderAtributo2: 'Genuino, Genérico...', categoriasDefault: ['Motor', 'Frenos', 'Accesorios'] },
      { id: 'PC', nombre: 'Computadoras / Reparación', labelAtributo1: 'Marca', labelAtributo2: 'Condición', placeholderProducto: 'Laptop Dell...', placeholderAtributo1: 'Lenovo, HP...', placeholderAtributo2: 'Nuevo, Usado...', categoriasDefault: ['Laptops', 'Escritorio', 'Componentes'] },
      { id: 'general', nombre: 'Tecnología General', labelAtributo1: 'Capacidad', labelAtributo2: 'Color', placeholderProducto: 'Tablet...', placeholderAtributo1: '64GB...', placeholderAtributo2: 'Gris...', categoriasDefault: ['Gadgets', 'Accesorios'] },
    ]
  },
  belleza: {
    tipo: 'belleza',
    icono: '💄',
    ...{
        labelAtributo1: 'Volumen', labelAtributo2: 'Tono',
        placeholderProducto: 'Base líquida, Shampoo...',
        placeholderAtributo1: '30ml...', placeholderAtributo2: 'Natural...',
        categoriasDefault: ['Maquillaje', 'Skincare', 'Cabello']
    },
    gradiente: ['#E91E8C', '#F472B6'],
    subtipos: [
      { id: 'cosmeticos', nombre: 'Tienda de Cosméticos', labelAtributo1: 'Volumen', labelAtributo2: 'Tono/Color', placeholderProducto: 'Labial...', placeholderAtributo1: '15ml...', placeholderAtributo2: 'Rojo, Nude...', categoriasDefault: ['Maquillaje', 'Skincare', 'Ojos'] },
      { id: 'barberia', nombre: 'Barbería / Peluquería', labelAtributo1: 'Presentación', labelAtributo2: 'Fijación', placeholderProducto: 'Cera para cabello...', placeholderAtributo1: '100g, 200g...', placeholderAtributo2: 'Fuerte, Media...', categoriasDefault: ['Ceras', 'Aceites', 'Herramientas'] },
      { id: 'general', nombre: 'Belleza General', labelAtributo1: 'Volumen', labelAtributo2: 'Tipo', placeholderProducto: 'Crema hidratante...', placeholderAtributo1: '250ml...', placeholderAtributo2: 'Piel seca...', categoriasDefault: ['Corporal', 'Facial'] },
    ]
  },
  pintura: {
    tipo: 'pintura',
    icono: '🎨',
    ...{
        labelAtributo1: 'Litros', labelAtributo2: 'Acabado',
        placeholderProducto: 'Pintura Vinil...',
        placeholderAtributo1: '4L, 19L...', placeholderAtributo2: 'Mate...',
        categoriasDefault: ['Interior', 'Exterior']
    },
    gradiente: ['#FF6B35', '#F59E0B'],
    subtipos: [
      { id: 'general', nombre: 'Tienda de Pinturas', labelAtributo1: 'Litros', labelAtributo2: 'Acabado', placeholderProducto: 'Vinimex...', placeholderAtributo1: '4L, 19L...', placeholderAtributo2: 'Mate, Satinado...', categoriasDefault: ['Interior', 'Exterior', 'Impermeabilizantes'] },
      { id: 'ferreteria', nombre: 'Ferretería General', labelAtributo1: 'Medida/Peso', labelAtributo2: 'Marca', placeholderProducto: 'Martillo, Clavos...', placeholderAtributo1: '1kg, 2 pulgadas...', placeholderAtributo2: 'Truper, Urrea...', categoriasDefault: ['Herramientas', 'Construcción', 'Plomería'] },
    ]
  },
  alimentos: {
    tipo: 'alimentos',
    icono: '🍞',
    ...{
        labelAtributo1: 'Peso/Medida', labelAtributo2: 'Presentación',
        placeholderProducto: 'Pan, Leche...',
        placeholderAtributo1: '1kg, 1L...', placeholderAtributo2: 'Bolsa...',
        categoriasDefault: ['Básicos', 'Lácteos', 'Bebidas']
    },
    gradiente: ['#16A34A', '#22C55E'],
    subtipos: [
      { id: 'pulperia', nombre: 'Pulpería / Mini Súper', labelAtributo1: 'Marca', labelAtributo2: 'Presentación', placeholderProducto: 'Arroz, Leche...', placeholderAtributo1: 'Faisán, Lala...', placeholderAtributo2: 'Libra, Litro...', categoriasDefault: ['Abarrotes', 'Lácteos', 'Bebidas', 'Snacks'] },
      { id: 'comedor', nombre: 'Comedor / Fritanga', labelAtributo1: 'Tamaño/Porción', labelAtributo2: 'Acompañamiento', placeholderProducto: 'Gallo Pinto, Carne Asada...', placeholderAtributo1: 'Completo, Medio...', placeholderAtributo2: 'Tajadas, Ensalada...', categoriasDefault: ['Platos Fuertes', 'Bebidas', 'Extras'] },
      { id: 'panaderia', nombre: 'Panadería / Pastelería', labelAtributo1: 'Tipo', labelAtributo2: 'Relleno/Sabor', placeholderProducto: 'Cojinillo, Pastel...', placeholderAtributo1: 'Salado, Dulce...', placeholderAtributo2: 'Dulce de leche, Piña...', categoriasDefault: ['Pan Dulce', 'Pan Salado', 'Pasteles'] },
      { id: 'carniceria', nombre: 'Carnicería / Frutería', labelAtributo1: 'Peso/Kilos', labelAtributo2: 'Corte/Tipo', placeholderProducto: 'Lomo, Sandía...', placeholderAtributo1: '1 kg, 500g...', placeholderAtributo2: 'Res, Cerdo...', categoriasDefault: ['Carnes', 'Verduras', 'Frutas'] },
      { id: 'licoreria', nombre: 'Licorería', labelAtributo1: 'Mililitros', labelAtributo2: 'Tipo/Cepa', placeholderProducto: 'Ron, Cerveza...', placeholderAtributo1: '750ml, 12oz...', placeholderAtributo2: 'Añejo, Lager...', categoriasDefault: ['Rones', 'Cervezas', 'Vinos'] },
    ]
  },
  general: {
    tipo: 'general',
    icono: '📦',
    ...{
        labelAtributo1: 'Variante', labelAtributo2: 'Tipo',
        placeholderProducto: 'Artículo A...',
        placeholderAtributo1: 'Estándar...', placeholderAtributo2: 'Premium...',
        categoriasDefault: ['General']
    },
    gradiente: ['#6B7280', '#9CA3AF'],
    subtipos: [
      { id: 'farmacia', nombre: 'Farmacia / Botica', labelAtributo1: 'Laboratorio', labelAtributo2: 'Presentación', placeholderProducto: 'Paracetamol...', placeholderAtributo1: 'Bayer, MK...', placeholderAtributo2: 'Tabletas, Jarabe...', categoriasDefault: ['Medicamentos', 'Cuidado Personal', 'Infantil'] },
      { id: 'agro', nombre: 'Agroservicio (Ventas Agrícolas/Vet)', labelAtributo1: 'Marca', labelAtributo2: 'Peso/Volumen', placeholderProducto: 'Semillas, Fertilizante...', placeholderAtributo1: 'Monsanto, Yara...', placeholderAtributo2: 'Quintal, Litro...', categoriasDefault: ['Insumos', 'Herramientas', 'Veterinaria'] },
      { id: 'papeleria', nombre: 'Librería / Papelería', labelAtributo1: 'Marca', labelAtributo2: 'Color/Tipo', placeholderProducto: 'Cuaderno, Mochila...', placeholderAtributo1: 'Scribe, Norma...', placeholderAtributo2: 'Espiral, Cocido...', categoriasDefault: ['Útiles Escolares', 'Oficina', 'Regalos'] },
      { id: 'mascotas', nombre: 'Mascotas', labelAtributo1: 'Peso', labelAtributo2: 'Raza/Edad', placeholderProducto: 'Alimento Perro...', placeholderAtributo1: '2 kg...', placeholderAtributo2: 'Cachorro...', categoriasDefault: ['Alimento', 'Accesorios'] },
      { id: 'general', nombre: 'Otro Negocio General', labelAtributo1: 'Variante', labelAtributo2: 'Tipo', placeholderProducto: 'Artículo...', placeholderAtributo1: 'Opción 1...', placeholderAtributo2: 'Opción 2...', categoriasDefault: ['General'] },
    ]
  },
};

// ─── Tipo del contexto ────────────────────────────────────────────────────────

interface BusinessContextType {
  tenantId: string | null;  // NUEVO: El UUID del negocio
  tenantLlave: string | null; // NUEVO: La llave corta para compartir a empleados
  isConfigured: boolean;
  isLoading: boolean;
  config: NegocioConfig;
  configurarNegocio: (tipo: TipoNegocio, subtipoId: string, nombre: string, metodosPago: string[], ownerName: string, adminPin: string, email?: string) => Promise<void>;
  vincularLlave: (llave: string) => Promise<void>; // NUEVO: Para empleados
  reclamarAdmin: (llave: string, pin: string) => Promise<void>; // NUEVO: Para dueños
  actualizarNegocio: (updates: Partial<NegocioConfig>) => Promise<void>;
  recargar: () => Promise<void>;
  isAdmin: boolean;
  hasSeenGuide: boolean;
  completarGuia: () => Promise<void>;
  resetearGuiaContext: () => Promise<void>;
  borrarNegocio: () => Promise<void>; // NUEVO: Borrado global
  deviceId: string | null;
  dispositivos: Dispositivo[];
  realtimeEnabled: boolean;
  userPermisos: string[];
  cambiarRolDispositivo: (id: string, nuevoRol: 'admin' | 'empleado') => Promise<void>;
  actualizarPermisosDispositivo: (id: string, nuevosPermisos: string[]) => Promise<void>;
  eliminarDispositivo: (id: string) => Promise<void>;
}

const DEFAULT_CONFIG: NegocioConfig = {
  ...NEGOCIOS.general,
  subtipoNombre: 'General',
  nombre: 'Mi Negocio',
  metodosPago: ['efectivo', 'tarjeta', 'transferencia'],
};

// ─── Contexto ─────────────────────────────────────────────────────────────────

const BusinessContext = createContext<BusinessContextType>({
  tenantId: null,
  tenantLlave: null,
  isConfigured: false,
  isLoading: true,
  config: DEFAULT_CONFIG,
  configurarNegocio: async () => {},
  vincularLlave: async () => {},
  actualizarNegocio: async () => {},
  recargar: async () => {},
  hasSeenGuide: false,
  isAdmin: false,
  completarGuia: async () => {},
  resetearGuiaContext: async () => {},
  borrarNegocio: async () => {},
  reclamarAdmin: async () => {},
  deviceId: null,
  dispositivos: [],
  realtimeEnabled: false,
  userPermisos: [],
  cambiarRolDispositivo: async () => {},
  actualizarPermisosDispositivo: async () => {},
  eliminarDispositivo: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BusinessProvider({ children }: { children?: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantLlave, setTenantLlave] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPermisos, setUserPermisos] = useState<string[]>([]);
  const [hasSeenGuide, setHasSeenGuide] = useState(false); 
  const [config, setConfig] = useState<NegocioConfig>(DEFAULT_CONFIG);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const activeCount = dispositivos.length;
    setRealtimeEnabled(activeCount >= 2);
  }, [dispositivos]);

  const getDeviceName = () => {
    const brand = Device.brand || '';
    const model = Device.modelName || Device.designName || 'Dispositivo Desconocido';
    return `${brand} ${model}`.trim();
  };

  const syncDispositivo = async (tId: string, dId: string) => {
    try {
      const nombre = getDeviceName();
      const { data, error } = await supabase
        .from('dispositivo')
        .upsert({ 
          id: dId, 
          tenant_id: tId, 
          nombre: nombre,
          ultimo_acceso: new Date().toISOString()
        }, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        console.warn('[Business] No se pudo sincronizar el dispositivo (posible RLS):', error.message);
      }
      return data;
    } catch (e) {
      console.warn('[Business] Excepción al sincronizar dispositivo:', e);
      return null;
    }
  };

  useEffect(() => {
    if (!tenantId || !deviceId) return;

    channelRef.current = supabase
      .channel(`db-sync-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispositivo',
          filter: `tenant_id=eq.${tenantId}`
        },
        async (payload) => {
          console.log('[Business] Cambio en dispositivos detectado:', payload.eventType, 'ID:', (payload.old as any)?.id || (payload.new as any)?.id);

          // 1. Recargar lista completa
          const { data } = await supabase
            .from('dispositivo')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('ultimo_acceso', { ascending: false });
          if (data) {
            console.log('[Business] Lista actualizada de dispositivos:', data.length);
            setDispositivos(data);
          }

          // 2. Si el cambio afecta a ESTE dispositivo, actualizar isAdmin o permisos
          if (payload.new && (payload.new as any).id === deviceId && payload.eventType !== 'DELETE') {
            setIsAdmin((payload.new as any).rol === 'admin');
            setUserPermisos((payload.new as any).permisos || []);
            await AsyncStorage.setItem('@mbpos_is_admin', (payload.new as any).rol === 'admin' ? 'true' : 'false');
          }

          // 3. Si es DELETE y NO es este dispositivo, solo actualizar lista (ya se hizo arriba)
          if (payload.eventType === 'DELETE' && payload.old && (payload.old as any).id !== deviceId) {
            console.log('[Business] Otro dispositivo eliminado, lista actualizada');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'negocio',
          filter: `id=eq.${tenantId}`
        },
        async (payload) => {
           console.log('[Business] Cambio en configuración global:', payload.new.nombre);
           if (payload.new) {
              const newName = (payload.new as any).nombre;
              const newOwner = (payload.new as any).owner_name;
              const newMetodos = (payload.new as any).metodos_pago;
              console.log('[Business] SYNC RECEIVED - Business Name:', newName);
              
              setConfig(prev => ({ 
                 ...prev, 
                 nombre: newName || prev.nombre,
                 ownerName: newOwner || prev.ownerName,
                 metodosPago: newMetodos || prev.metodosPago
              }));
              
              // Actualizar cache local
              const cached = await AsyncStorage.getItem('@mbpos_local_config');
              if (cached) {
                 try {
                    const parsed = JSON.parse(cached);
                    await AsyncStorage.setItem('@mbpos_local_config', JSON.stringify({ 
                       ...parsed, 
                       nombre: newName || parsed.nombre,
                       ownerName: newOwner || parsed.ownerName,
                       metodosPago: newMetodos || parsed.metodosPago
                    }));
                 } catch {}
              }
           }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'dispositivo',
          filter: `id=eq.${deviceId}`
        },
        async (payload) => {
          console.log('[Business] ESTE dispositivo fue expulsado. Esperando 500ms para que otros listeners procesen...');
          // Dar tiempo para que el listener general actualice la lista antes de desconectar
          setTimeout(async () => {
            console.log('[Business] Expulsado en tiempo real. Redirigiendo...');
            Alert.alert('Sesión Finalizada', 'Este dispositivo ha sido desconectado por el administrador.');
            setTenantId(null);
            setIsConfigured(false);
            setIsAdmin(false);
            await AsyncStorage.multiRemove(['@mbpos_tenant_id', '@mbpos_is_admin', '@mbpos_local_config']);
            router.replace('/bienvenida');
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'negocio',
          filter: `id=eq.${tenantId}`
        },
        async (payload) => {
          console.log('[Business] Negocio eliminado en tiempo real. Desconectando todos los clientes...');
          Alert.alert('Negocio Eliminado', 'El dueño ha cerrado este negocio o eliminado los datos permanentemente.');
          setTenantId(null);
          setIsConfigured(false);
          setIsAdmin(false);
          await AsyncStorage.multiRemove(['@mbpos_tenant_id', '@mbpos_is_admin', '@mbpos_local_config']);
          router.replace('/bienvenida');
        }
      )
      .on(
        'broadcast',
        { event: 'config_updated' },
        (payload: any) => {
          console.log('[Business] Config updated broadcast received:', payload);
          setConfig(prev => ({ ...prev, ...payload }));
          // Actualizar cache local
          AsyncStorage.getItem('@mbpos_local_config').then(cached => {
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                AsyncStorage.setItem('@mbpos_local_config', JSON.stringify({ ...parsed, ...payload }));
              } catch {}
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelRef.current);
    };
  }, [tenantId, deviceId]);

  const cargarConfiguracion = async () => {
    try {
      // 1. Obtener o crear ID de dispositivo
      let dId = await AsyncStorage.getItem('@mbpos_device_id');
      if (!dId) {
        dId = 'DEV-' + Math.random().toString(36).substring(2, 12).toUpperCase();
        await AsyncStorage.setItem('@mbpos_device_id', dId);
      }
      setDeviceId(dId);

      const storedTenant = await AsyncStorage.getItem('@mbpos_tenant_id');
      if (storedTenant) {
        setTenantId(storedTenant);
        
        // 2. Sincronizar dispositivo y obtener ROL real
        let dispData = null;
        try {
          dispData = await syncDispositivo(storedTenant, dId);
        } catch (e) {
          console.warn('[Business] Error en syncDispositivo, continuando con datos locales.');
        }

        if (dispData) {
          setIsAdmin(dispData.rol === 'admin');
          setUserPermisos(dispData.permisos || []);
        } else {
          // Fallback al storage si falla la red, pero el dueño es la verdad
          const storedRole = await AsyncStorage.getItem('@mbpos_is_admin');
          setIsAdmin(storedRole === 'true');
          // No hay cache local de permisos por simplicidad, los pedimos en cada inicio o dejamos []
        }
        
        // Cargar config desde Supabase (o usar default si no existe tabla config detallada aún)
        const { data: negocio, error } = await supabase
          .from('negocio')
          .select('*')
          .eq('id', storedTenant)
          .single();

        if (negocio) {
          const nombre = negocio.nombre;
          const oName = negocio.owner_name;
          const metodos = negocio.metodos_pago;

          const cachedConfig = await AsyncStorage.getItem('@mbpos_local_config');
          if (cachedConfig) {
             try {
                const parsed = JSON.parse(cachedConfig);
                // El nombre y métodos de Supabase SIEMPRE ganan sobre el guardado localmente
                setConfig({ ...parsed, nombre, ownerName: oName, metodosPago: metodos || parsed.metodosPago }); 
             } catch {
                setConfig({ ...DEFAULT_CONFIG, nombre, ownerName: oName, metodosPago: metodos || DEFAULT_CONFIG.metodosPago });
             }
          } else {
             // Si no hay cache (ej: empleado nuevo), crear config base con el nombre real
             setConfig({ ...DEFAULT_CONFIG, nombre, ownerName: oName, metodosPago: metodos || DEFAULT_CONFIG.metodosPago });
          }
        }
        setIsConfigured(true);

        const vista = await AsyncStorage.getItem('@mbpos_guia_vista');
        setHasSeenGuide(vista === 'true');
        setTenantLlave(negocio.llave || null);

        // 3. Cargar lista de dispositivos (necesario para activar / desactivar realtime)
        const { data: dispList } = await supabase
          .from('dispositivo')
          .select('*')
          .eq('tenant_id', storedTenant)
          .order('ultimo_acceso', { ascending: false });
        if (dispList) setDispositivos(dispList);
      } else {
        setIsConfigured(false);
        setHasSeenGuide(false);
        setTenantLlave(null);
      }
    } catch (e) {
      console.error('[Business] Error cargando config Supabase:', e);
      // Fallback
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  // El listener de negocio se ha consolidado en el useEffect principal arriba (líneas 286-395)
  // para evitar duplicidad de canales y alertas innecesarias.

  const configurarNegocio = async (tipo: TipoNegocio, subtipoId: string, nombre: string, metodosPago: string[], ownerName: string, adminPin: string, email: string = '') => {
    try {
      // 1. Crear el Negocio en Supabase
      const llaveSecreta = 'MB-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from('negocio')
        .insert([{ 
          nombre, 
          llave: llaveSecreta, 
          owner_name: ownerName?.trim() ? ownerName.trim() : 'Dueño', 
          admin_pin: adminPin,
          metodos_pago: metodosPago,
          ...(email?.trim() ? { email: email.trim() } : {})
        }])
        .select('id')
        .single();

      if (error) throw error;

      const nuevoTenantId = data.id;
      
      // 2. Registrar este dispositivo como ADMIN inicial
      if (deviceId) {
        await supabase.from('dispositivo').upsert({
          id: deviceId,
          tenant_id: nuevoTenantId,
          nombre: getDeviceName(),
          rol: 'admin',
          ultimo_acceso: new Date().toISOString()
        });
      }
      
      // 2. Guardar el Tenant ID localmente para auto-login
      await AsyncStorage.setItem('@mbpos_tenant_id', nuevoTenantId);
      await AsyncStorage.setItem('@mbpos_is_admin', 'true'); // Dueño es Admin
      setTenantLlave(llaveSecreta);
      setTenantId(nuevoTenantId);
      setIsAdmin(true);

      const negocioBase = NEGOCIOS[tipo] ?? NEGOCIOS.general;
      const subtipoData = negocioBase.subtipos.find((s: SubTipoNegocio) => s.id === subtipoId) ?? negocioBase.subtipos[0];

      const newConfig: NegocioConfig = {
           ...negocioBase, 
           subtipoNombre: subtipoData.nombre,
           labelAtributo1: subtipoData.labelAtributo1,
           labelAtributo2: subtipoData.labelAtributo2,
           placeholderProducto: subtipoData.placeholderProducto,
           placeholderAtributo1: subtipoData.placeholderAtributo1,
           placeholderAtributo2: subtipoData.placeholderAtributo2,
           categoriasDefault: subtipoData.categoriasDefault,
           nombre,
           metodosPago
      };
      
      setConfig(newConfig);
      await AsyncStorage.setItem('@mbpos_local_config', JSON.stringify(newConfig));
      setIsConfigured(true);

      // (Las categorías default ahora se insertarán refactorizando la capa Supabase después)
    } catch (e) {
      console.error('[Business] Error configurando en Supabase:', e);
      throw e;
    }
  };

  const vincularLlave = async (llave: string) => {
    try {
      const { data, error } = await supabase
        .from('negocio')
        .select('id, nombre, llave')
        .eq('llave', llave.toUpperCase())
        .single();
        
      if (error || !data) throw new Error('No se encontró un negocio con esa Llave.');
      
      // 2. Registrar este dispositivo como EMPLEADO
      if (deviceId) {
        await supabase.from('dispositivo').upsert({
          id: deviceId,
          tenant_id: data.id,
          nombre: getDeviceName(),
          rol: 'empleado',
          ultimo_acceso: new Date().toISOString()
        });
      }

      await AsyncStorage.setItem('@mbpos_tenant_id', data.id);
      await AsyncStorage.setItem('@mbpos_is_admin', 'false'); // Empleado NO es admin
      setTenantId(data.id);
      setIsAdmin(false);
      setIsConfigured(true);
      setTenantLlave(data.llave);
      
      // IMPORTANTE: Actualizar el nombre en el estado global inmediatamente
      const newConfig = { ...DEFAULT_CONFIG, nombre: data.nombre };
      setConfig(newConfig);
      await AsyncStorage.setItem('@mbpos_local_config', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Error vinculando llave:', e);
      throw e;
    }
  };

  const reclamarAdmin = async (identificador: string, pin: string) => {
    try {
      if (!identificador.trim() || pin.length !== 4) {
        throw new Error('Por favor ingresa un nombre y un PIN de 4 dígitos.');
      }

      console.log('[BusinessContext] Reclamando Admin con Id:', identificador, 'y PIN:', pin);
      
      // Intentamos buscar por Nombre del Dueño O Nombre del Negocio
      let query = supabase.from('negocio').select('id, nombre, llave, admin_pin, owner_name').eq('admin_pin', pin);
      
      if (tenantId) {
        // En ajustes/dashboard (ya vinculado)
        query = query.eq('id', tenantId);
      } else {
        // En bienvenida (recuperando acceso) - Búsqueda flexible en dueño o negocio
        query = query.or(`owner_name.ilike."*${identificador.trim()}*",nombre.ilike."*${identificador.trim()}*"`);
      }

      const { data, error } = await query.single();
        
      if (error || !data) {
        // Si hay error (como 0 filas), solo lanzamos el error lógico para la UI, sin console.error (evita RedBox)
        console.warn('[BusinessContext] Intento de recuperación fallido:', error?.message);
        throw new Error('Nombre o PIN incorrectos. No se pudo validar tu identidad como dueño.');
      }
      
      console.log('[BusinessContext] Dueño validado:', data.nombre);
      
      await AsyncStorage.setItem('@mbpos_tenant_id', data.id);
      await AsyncStorage.setItem('@mbpos_is_admin', 'true');
      setTenantId(data.id);
      setIsAdmin(true);
      setIsConfigured(true);
      setTenantLlave(data.llave);
      
      // Actualizar rol en DB para este dispositivo
      if (deviceId) {
        await supabase.from('dispositivo').update({ rol: 'admin' }).eq('id', deviceId);
      }
      
      setConfig(prev => ({ ...prev, nombre: data.nombre }));
    } catch (e) {
      console.error('Error reclamando admin:', e);
      throw e;
    }
  };

  const actualizarNegocio = async (updates: Partial<NegocioConfig>) => {
    try {
      if (!tenantId) throw new Error('No hay sesión activa para actualizar configuración.');

      // Update DB
      const dbUpdates: any = {};
      if (updates.nombre) dbUpdates.nombre = updates.nombre;
      if (updates.ownerName) dbUpdates.owner_name = updates.ownerName;
      if (updates.metodosPago) dbUpdates.metodos_pago = updates.metodosPago;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('negocio').update(dbUpdates).eq('id', tenantId);
      }
      
      const newConf = { ...config, ...updates };
      setConfig(newConf);
      await AsyncStorage.setItem('@mbpos_local_config', JSON.stringify(newConf));
      
      // Notificar a otros dispositivos via broadcast
      channelRef.current?.send('config_updated', updates);
    } catch (e) {
      console.error('[Business] Error actualizando negocio:', e);
      throw e;
    }
  };

  const cambiarRolDispositivo = async (id: string, nuevoRol: 'admin' | 'empleado') => {
    try {
      const { error } = await supabase
        .from('dispositivo')
        .update({ rol: nuevoRol })
        .eq('id', id);
      if (error) throw error;
      
      // Recargar lista local
      setDispositivos(prev => prev.map(d => d.id === id ? { ...d, rol: nuevoRol } : d));
      
      // Si el equipo editado es el actual, reflejar cambio (aunque esto lo hace el dueño a otros)
      if (id === deviceId) setIsAdmin(nuevoRol === 'admin');
    } catch (e) {
      console.error('Error cambiando rol:', e);
      throw e;
    }
  };

  const actualizarPermisosDispositivo = async (id: string, nuevosPermisos: string[]) => {
    try {
      const { error } = await supabase
        .from('dispositivo')
        .update({ permisos: nuevosPermisos })
        .eq('id', id);
      if (error) throw error;
      
      setDispositivos(prev => prev.map(d => d.id === id ? { ...d, permisos: nuevosPermisos } : d));
      if (id === deviceId) setUserPermisos(nuevosPermisos);
    } catch (e) {
      console.error('Error actualizando permisos:', e);
      throw e;
    }
  };

  const eliminarDispositivo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dispositivo')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      setDispositivos(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error('Error eliminando dispositivo:', e);
      throw e;
    }
  };

  const completarGuia = async () => {
    try {
      await AsyncStorage.setItem('@mbpos_guia_vista', 'true');
      setHasSeenGuide(true);
    } catch (e) {
      console.error('[Business] Error marcando guia:', e);
    }
  };

  const resetearGuiaContext = async () => {
    try {
      await AsyncStorage.removeItem('@mbpos_guia_vista');
      setHasSeenGuide(false);
    } catch (e) {
      console.error('[Business] Error reseteando guia:', e);
    }
  };

  const borrarNegocio = async () => {
    try {
      if (!tenantId) return;
      if (!isAdmin) throw new Error('Solo el dueño puede eliminar el negocio permanentemente.');

      // 1. ELIMINAR EN CLOUD (Supabase)
      // Nota: Si configuraste FK con CASCADE en Supabase, esto borrará todo.
      const { error } = await supabase.from('negocio').delete().eq('id', tenantId);
      if (error) throw error;

      // 2. LIMPIEZA LOCAL
      await AsyncStorage.multiRemove(['@mbpos_tenant_id', '@mbpos_is_admin', '@mbpos_local_config']);
      setTenantId(null);
      setIsConfigured(false);
      setIsAdmin(false);
    } catch (e) {
      console.error('[Business] Error en borrado global:', e);
      throw e;
    }
  };

  const value = useMemo<BusinessContextType>(
    () => ({
      tenantId,
      tenantLlave,
      isConfigured,
      isLoading,
      isAdmin,
      config,
      configurarNegocio,
      vincularLlave,
      actualizarNegocio,
      recargar: cargarConfiguracion,
      hasSeenGuide,
      completarGuia,
      resetearGuiaContext,
      borrarNegocio,
      reclamarAdmin,
      deviceId,
      dispositivos,
      userPermisos,
      realtimeEnabled,
      cambiarRolDispositivo,
      actualizarPermisosDispositivo,
      eliminarDispositivo,
    }),
    [tenantId, isConfigured, isLoading, config, hasSeenGuide, isAdmin, tenantLlave, deviceId, dispositivos, userPermisos, realtimeEnabled]
  );

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBusiness(): BusinessContextType {
  return useContext(BusinessContext);
}
