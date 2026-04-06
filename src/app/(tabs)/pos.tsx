import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Platform, View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView, useWindowDimensions, StatusBar, Modal, Animated as RNAnimated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { obtenerVariantes, type Variante } from '../../../database/variantesDB';
import { obtenerClientes, type Cliente } from '../../../database/clientesDB';
import { registrarVenta, type ItemCarrito } from '../../../database/ventasDB';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness, METODOS_PAGO_OPCIONES } from '../../context/BusinessContext';
import { usePayMethodSync } from '../../hooks/usePayMethodSync';
import { sizes } from '../../theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../lib/supabase';
import { GuiaAyuda } from '../../components/GuiaAyuda';
import { compartirReciboWhatsApp } from '../../utils/whatsappUtils';
import { useResponsive } from '../../hooks/useResponsive';


export default function PuntoDeVenta() {
  const { colors: c, isDark } = useTheme();
  const { config: biz, tenantId, isLoading, realtimeEnabled } = useBusiness();
  const router = useRouter();
  const params = useLocalSearchParams<{ clienteId?: string }>();
  const [busqueda, setBusqueda]     = useState('');
  const [carrito, setCarrito]       = useState<ItemCarrito[]>([]);
  const [descuento, setDescuento]   = useState('');
  const [variantes, setVariantes]   = useState<Variante[]>([]);
  const [metodoPago, setMetodoPago] = useState<string>('efectivo');
  usePayMethodSync(metodoPago, setMetodoPago);
  const [procesando, setProcesando] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const { isTablet, isLargeTablet, contentPadding } = useResponsive();

  const PASOS_GUIA = [
    { titulo: 'Catálogo de Ventas', desc: 'Toca cualquier artículo de la lista para añadirlo al carrito. Los productos sin stock aparecerán deshabilitados.', icono: '🛍️', color: c.info },
    { titulo: 'Cobro con Cámara', desc: 'Usa el botón de la cámara arriba a la derecha para escanear códigos de barras y añadir productos al instante.', icono: '📷', color: c.accent },
    { titulo: 'Gestión del Ticket', desc: 'En el resumen puedes ver lo que llevas cobrado, cambiar cantidades (+/-) y aplicar descuentos.', icono: '🧾', color: c.warning },
    { titulo: 'Pagar y Descontar', desc: 'Selecciona el método de pago y presiona el botón azul para registrar el dinero y actualizar el inventario.', icono: '✅', color: c.accent },
  ];

  // Escáner State
  const [permission, requestPermission] = useCameraPermissions();
  const [modalScan, setModalScan] = useState(false);

  useEffect(() => {
    if (params.clienteId) {
      setClienteSeleccionado(parseInt(params.clienteId, 10));
    }
  }, [params.clienteId]);

  const [tabMobile, setTabMobile] = useState<'catalogo' | 'ticket'>('catalogo');

  // Sincronizar método de pago inicial y cambio dinámico en config centralizada
  useEffect(() => {
    if (!isLoading && biz?.metodosPago?.length > 0) {
      // Mantener selección si la opción sigue vigente.
      if (!biz.metodosPago.includes(metodoPago)) {
        setMetodoPago(biz.metodosPago[0]);
      }
    }
  }, [isLoading, metodoPago, biz?.metodosPago]);

  // Alternativa reusable con hook externo (se puede usar en más pantallas si se desea):
  // usePayMethodSync(metodoPago, setMetodoPago);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const cargarCatalogo = useCallback(async () => {
    if (!tenantId || isLoading) return;
    try {
      setVariantes(await obtenerVariantes());
      setClientes(await obtenerClientes());
    } catch (e: any) {
      console.error('Error cargando catálogo:', e);
      Alert.alert('Error de conexión', e?.message || 'No se pudo cargar el catálogo o clientes. Revisa tu red.');
    }
  }, [tenantId, isLoading]);

  useFocusEffect(
    useCallback(() => {
      cargarCatalogo();
    }, [cargarCatalogo])
  );

  useEffect(() => {
    if (!tenantId) return;

    // Polling condicional: menos frecuente si solo hay 1 dispositivo
    const pollingInterval = realtimeEnabled ? 3000 : 15000;
    const interval = setInterval(() => {
      console.log('[Polling PV] Refrescando catálogo...');
      cargarCatalogo();
    }, pollingInterval);

    // 2. REALTIME
    let channel: any = null;
    if (realtimeEnabled) {
      channel = supabase
        .channel(`punto_venta_realtime_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'variante', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Realtime PV] Cambio en inventario, recargando catálogo...');
          cargarCatalogo();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cliente', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Realtime PV] Cambio en clientes, recargando...');
          cargarCatalogo();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categoria', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Realtime PV] Cambio en categorias, recargando...');
          cargarCatalogo();
        }
      )
      .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, cargarCatalogo, realtimeEnabled]);

  const productosFiltrados = variantes.filter(v =>
    v.productoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.codigoBarras?.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.color.toLowerCase().includes(busqueda.toLowerCase())
  );

  const agregarAlCarrito = (v: Variante) => {
    if (v.stock === 0) { Alert.alert('Sin stock', 'Variante sin unidades.'); return; }
    setCarrito(prev => {
      const existe = prev.find(i => i.varianteId === v.id);
      if (existe) {
        if (existe.cantidad >= v.stock) { Alert.alert('Stock insuficiente', `Solo hay ${v.stock} uds.`); return prev; }
        return prev.map(i => i.varianteId === v.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { varianteId: v.id, productoNombre: v.productoNombre, talla: v.talla, color: v.color, precio: v.precio, cantidad: 1 }];
    });
  };

  const quitarDelCarrito = (id: number) =>
    setCarrito(prev => {
      const item = prev.find(i => i.varianteId === id);
      if (!item) return prev;
      if (item.cantidad === 1) return prev.filter(i => i.varianteId !== id);
      return prev.map(i => i.varianteId === id ? { ...i, cantidad: i.cantidad - 1 } : i);
    });

  const subtotal       = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const descuentoNum   = parseFloat(descuento) || 0;
  const descuentoMonto = subtotal * (descuentoNum / 100);
  const total          = subtotal - descuentoMonto;

  const procesarVenta = async () => {
    if (procesando) return;
    const itemsParaRecibo = [...carrito]; 
    setProcesando(true);
    try {
      const vId = await registrarVenta(carrito, subtotal, descuentoMonto, total, metodoPago, clienteSeleccionado ?? undefined);
      const cli = clientes.find(c => c.id === clienteSeleccionado);
      Alert.alert(
        'Venta completada', 
        'Registrada correctamente.',
        [
          { 
            text: 'Compartir Recibo', 
            onPress: () => compartirReciboWhatsApp(biz.nombre, vId, itemsParaRecibo, total, metodoPago, cli?.telefono) 
          },
          { text: 'Listo', style: 'cancel' }
        ]
      );
      setCarrito([]); setDescuento(''); setClienteSeleccionado(null);
      setTabMobile('catalogo');
      setVariantes(await obtenerVariantes());
    } catch (e: any) {
      const message = e?.message || 'No se pudo registrar la venta. Revisa tu conexión e inténtalo nuevamente.';
      Alert.alert('Error de venta', message);
    } finally {
      setProcesando(false);
    }
  };

  const confirmarVenta = () => {
    if (carrito.length === 0) { Alert.alert('Carrito vacío', 'Agrega productos antes de confirmar.'); return; }
    const mensaje = `Total: $${total.toFixed(2)}\nMétodo: ${metodoPago}\n¿Confirmar?`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(mensaje)) procesarVenta();
      return;
    }
    Alert.alert('Confirmar venta', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: procesarVenta },
    ]);
  };

  const abrirEscaner = async () => {
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) { 
        Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara para escanear productos.'); 
        return; 
      }
    }
    setModalScan(true);
  };

  const procesarEscaneo = ({ data }: { data: string }) => {
    setModalScan(false);
    const encontrado = variantes.find(v => v.codigoBarras === data);
    if (encontrado) {
      agregarAlCarrito(encontrado);
      Alert.alert('Agregado', `1x ${encontrado.productoNombre} añadido al carrito.`);
    } else {
      Alert.alert('Código No Encontrado', `El código ${data} no pertenece a ningún producto registrado en Inventario.`);
    }
  };

  const pulseAnim = React.useRef(new RNAnimated.Value(1)).current;

  React.useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      
      <View style={[s.header, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity style={[s.btnBack, { backgroundColor: c.surfaceAlt }]} onPress={goBack}>
          <Text style={{fontSize: 20}}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={[s.headerTitle, { color: c.text }]}>Punto de Venta</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
             <RNAnimated.View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50', transform: [{ scale: pulseAnim }]}} />
             <Text style={{fontSize: 10, color: c.textTer, fontWeight: '700', letterSpacing: 0.5}}>EN VIVO</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[s.btnScan, { backgroundColor: c.surfaceAlt, marginRight: 8 }]} 
          onPress={() => setMostrarGuia(true)} 
          activeOpacity={0.8}
        >
          <Text style={{fontSize: 20, color: c.info}}>ℹ️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnScan, { backgroundColor: c.accent }]} onPress={abrirEscaner} activeOpacity={0.8}>
          <Text style={{fontSize: 20}}>📷</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.body, { flexDirection: isTablet ? 'row' : 'column' }]}>
        
        {!isTablet && (
          <View style={[s.mobileTabs, { backgroundColor: c.surface, marginHorizontal: contentPadding, borderRadius: sizes.radiusLg }]}>
            <TouchableOpacity style={[s.mobileTabBtn, tabMobile === 'catalogo' && { backgroundColor: c.surfaceAlt, borderRadius: sizes.radiusLg }]} onPress={() => setTabMobile('catalogo')}>
              <Text style={[s.mobileTabText, { color: tabMobile === 'catalogo' ? c.text : c.textTer }]}>Catálogo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.mobileTabBtn, tabMobile === 'ticket' && { backgroundColor: c.surfaceAlt, borderRadius: sizes.radiusLg }]} onPress={() => setTabMobile('ticket')}>
              <Text style={[s.mobileTabText, { color: tabMobile === 'ticket' ? c.text : c.textTer }]}>
                Ticket <Text style={{color: c.accent}}>{carrito.length > 0 ? `(${carrito.length})` : ''}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(isTablet || tabMobile === 'catalogo') && (
          <View style={[s.panelCatalogo, { flex: isLargeTablet ? 1.5 : 1.2, backgroundColor: c.bg }]}>
            <View style={[s.searchContainer, { paddingHorizontal: contentPadding }]}>
               <TextInput 
                 style={[s.buscador, { backgroundColor: c.surface, borderColor: isDark ? c.surfaceAlt : c.border, color: c.text }]} 
                 placeholder="Buscar por nombre, código..." 
                 placeholderTextColor={c.textSec} 
                 value={busqueda} 
                 onChangeText={setBusqueda} 
               />
            </View>
            <FlatList
              data={productosFiltrados}
              keyExtractor={item => item.id.toString()}
              key={isLargeTablet ? '3col' : isTablet ? '2col' : '1col'}
              numColumns={isLargeTablet ? 3 : isTablet ? 2 : 1}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: contentPadding, paddingBottom: 24, gap: 12 }}
              columnWrapperStyle={isTablet ? { gap: 12 } : undefined}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    s.productoModernRow, 
                    { 
                      backgroundColor: c.surface, 
                      opacity: item.stock === 0 ? 0.4 : 1, 
                      flexDirection: isTablet ? 'column' : 'row', 
                      alignItems: isTablet ? 'flex-start' : 'center', 
                      flex: isTablet ? 1 : 0,
                      borderWidth: 0,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      elevation: 3,
                      borderRadius: sizes.radiusLg,
                      marginBottom: 4,
                    }
                  ]} 
                  onPress={() => {
                    if (item.stock > 0) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      agregarAlCarrito(item);
                    }
                  }} 
                  activeOpacity={0.85}
                >
                  <View style={[s.productoIconWrap, { backgroundColor: c.surfaceAlt, marginBottom: isTablet ? 10 : 0, alignSelf: isTablet ? 'center' : 'auto' }]}>
                     <Text style={{fontSize: 20}}>🛍️</Text>
                  </View>
                  <View style={s.productoInfo}>
                    <Text style={[s.productoNombre, { color: c.text, textAlign: isTablet ? 'center' : 'left' }]} numberOfLines={isTablet ? 2 : 1}>{item.productoNombre}</Text>
                    <View style={[s.productoDetalles, { justifyContent: isTablet ? 'center' : 'flex-start' }]}>
                       <View style={{ backgroundColor: c.softBlue, paddingHorizontal: 6, borderRadius: 6, marginRight: 4 }}>
                          <Text style={[s.badgeText, { color: c.textSec }]}>{item.talla}</Text>
                       </View>
                       <View style={{ backgroundColor: c.softOrange, paddingHorizontal: 6, borderRadius: 6 }}>
                          <Text style={[s.badgeText, { color: c.textSec }]}>{item.color}</Text>
                       </View>
                    </View>
                    {isTablet && (
                      <Text style={{fontSize: 10, color: item.stock > 0 ? c.textTer : c.danger, textAlign: 'center', marginTop: 4, fontWeight: '700'}}>{item.stock} UDS.</Text>
                    )}
                  </View>
                  <Text style={[s.productoPrecio, { color: c.text, marginTop: isTablet ? 6 : 0, alignSelf: isTablet ? 'center' : 'auto', fontWeight: '800' }]}>${item.precio.toFixed(2)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {(isTablet || tabMobile === 'ticket') && (
          <View style={[s.panelCarrito, { flex: 1, borderLeftWidth: isTablet ? 1 : 0, borderColor: c.border, backgroundColor: c.bg, paddingHorizontal: contentPadding }]}>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
               
               <View style={s.clienteSeccion}>
                  <View style={s.clienteRowTop}>
                     <Text style={[s.clienteLabel, { color: c.textSec }]}>CLIENTE</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
                     <TouchableOpacity 
                        style={[s.clienteChip, { backgroundColor: clienteSeleccionado === null ? c.accent : c.surface }]} 
                        onPress={() => setClienteSeleccionado(null)}
                     >
                        <Text style={[s.clienteChipText, { color: clienteSeleccionado === null ? '#fff' : c.textSec }]}>Consumidor Final</Text>
                     </TouchableOpacity>
                     {clientes.map(cl => (
                        <TouchableOpacity 
                           key={cl.id} 
                           style={[s.clienteChip, { backgroundColor: clienteSeleccionado === cl.id ? c.accent : c.surface }]} 
                           onPress={() => setClienteSeleccionado(cl.id)}
                        >
                           <Text style={[s.clienteChipText, { color: clienteSeleccionado === cl.id ? '#fff' : c.textSec }]}>{cl.nombre}</Text>
                        </TouchableOpacity>
                     ))}
                  </ScrollView>
               </View>

               <Text style={[s.ticketSubtitle, { color: c.textSec }]}>RESUMEN DE ORDEN</Text>
               <View style={[s.ticketContainer, { backgroundColor: c.surface }]}>
                  {carrito.length === 0 ? (
                     <View style={s.carritoVacio}>
                        <Text style={[s.carritoVacioTexto, { color: c.textTer }]}>No hay productos</Text>
                     </View>
                  ) : (
                     carrito.map((item, i) => (
                        <View key={item.varianteId} style={[s.carritoItemModern, i !== carrito.length -1 && { borderBottomWidth: 1, borderBottomColor: c.surfaceAlt }]}>
                           <View style={s.carritoItemInfoFlex}>
                              <Text style={[s.carritoItemNombre, { color: c.text }]} numberOfLines={1}>{item.productoNombre}</Text>
                              <Text style={[s.carritoItemMeta, { color: c.textTer }]}>{biz.labelAtributo1}: {item.talla} • {biz.labelAtributo2}: {item.color} • ${item.precio}</Text>
                           </View>
                           
                           <View style={s.controlCantidadRow}>
                              <TouchableOpacity style={[s.btnCantModern, { backgroundColor: c.surfaceAlt }]} onPress={() => quitarDelCarrito(item.varianteId)}>
                                 <Text style={{color: c.text, fontSize: 16}}>–</Text>
                              </TouchableOpacity>
                              <Text style={[s.cantNumModern, { color: c.text }]}>{item.cantidad}</Text>
                              <TouchableOpacity style={[s.btnCantModern, { backgroundColor: c.surfaceAlt }]} onPress={() => { const v = variantes.find(x => x.id === item.varianteId); if (v) agregarAlCarrito(v); }}>
                                 <Text style={{color: c.text, fontSize: 16}}>+</Text>
                              </TouchableOpacity>
                           </View>

                           <Text style={[s.carritoItemTotalRow, { color: c.text }]}>${(item.precio * item.cantidad).toFixed(2)}</Text>
                        </View>
                     ))
                  )}
               </View>

               <Text style={[s.ticketSubtitle, { color: c.textSec, marginTop: 24 }]}>PAGO Y CHECKOUT</Text>
               <View style={[s.checkoutContainer, { backgroundColor: c.surface }]}>
                  
                  <View style={s.metodoGrid}>
                      {(biz?.metodosPago || []).map((m: string) => {
                         const opt = METODOS_PAGO_OPCIONES.find(o => o.id === m.toLowerCase());
                         const isSelected = metodoPago === m;
                         return (
                          <TouchableOpacity 
                             key={m} 
                             activeOpacity={0.8}
                             style={[
                                s.metodBtnModern, 
                                { 
                                   backgroundColor: isSelected ? c.accent : c.surfaceAlt,
                                   borderColor: isSelected ? c.accent : 'transparent',
                                   borderWidth: 1.5,
                                   flexDirection: 'row',
                                   paddingHorizontal: 12,
                                   paddingVertical: 10,
                                }
                             ]} 
                             onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setMetodoPago(m);
                             }}
                          >
                             <Text style={{ fontSize: 18, marginRight: 8 }}>{opt?.icon || '💰'}</Text>
                             <Text style={[s.metodBtnTextP, { color: isSelected ? '#fff' : c.textSec, fontWeight: isSelected ? '800' : '600' }]}>
                                {opt?.label.split(' ')[0] || m}
                             </Text>
                          </TouchableOpacity>
                         );
                      })}
                  </View>


                  <View style={s.descRowArea}>
                     <Text style={[s.descLabelP, { color: c.textSec }]}>% Opcional Descuento</Text>
                     <TextInput 
                        style={[s.descInputP, { backgroundColor: c.surfaceAlt, color: c.text }]} 
                        placeholder="0" placeholderTextColor={c.textTer} keyboardType="numeric" value={descuento} onChangeText={setDescuento} 
                     />
                  </View>

                  <View style={s.dividerC} />
                  
                  <View style={s.totalsLine}>
                     <Text style={[s.totalSubLabel, { color: c.textTer }]}>Subtotal</Text>
                     <Text style={[s.totalSubValue, { color: c.textSec }]}>${subtotal.toFixed(2)}</Text>
                  </View>
                  {descuentoMonto > 0 && (
                     <View style={s.totalsLine}>
                        <Text style={[s.totalSubLabel, { color: c.textTer }]}>Descuento ({descuento}%)</Text>
                        <Text style={[s.totalSubValue, { color: c.danger }]}>–${descuentoMonto.toFixed(2)}</Text>
                     </View>
                  )}
                  
                  <View style={s.grandTotalLine}>
                     <Text style={[s.grandTotalText, { color: c.text }]}>Total a Pagar</Text>
                     <Text style={[s.grandTotalAmount, { color: c.text }]}>${total.toFixed(2)}</Text>
                  </View>

               </View>

               <TouchableOpacity style={[s.btnConfirmarGo, { backgroundColor: c.accent }]} onPress={confirmarVenta} activeOpacity={0.8}>
                  <Text style={s.btnConfirmarGoTxt}>Proceder al Pago</Text>
               </TouchableOpacity>

            </ScrollView>
          </View>
        )}
      </View>

      <Modal visible={modalScan} animationType="slide" transparent onRequestClose={() => setModalScan(false)}>
        <View style={s.scannerOverlay}>
          <View style={s.scannerHeader}>
             <Text style={s.scannerTitle}>Caja: Captura de Código</Text>
             <TouchableOpacity style={s.scannerClose} onPress={() => setModalScan(false)}>
                <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>Volver a Caja</Text>
             </TouchableOpacity>
          </View>
          <View style={s.scannerBox}>
             <CameraView 
                style={StyleSheet.absoluteFillObject} 
                facing="back" 
                onBarcodeScanned={procesarEscaneo} 
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
             />
             <View style={s.scannerTarget} />
          </View>
          <View style={s.scannerFooter}>
             <Text style={s.scannerFooterText}>Apunta el lente lateralmente al código de tu etiqueta. Se procesará automáticamente hacia tu carrito de cobro.</Text>
          </View>
        </View>
      </Modal>

      <GuiaAyuda 
        visible={mostrarGuia} 
        onClose={() => setMostrarGuia(false)}
        titulo="Punto de Venta"
        pasos={[
          'Busca productos por nombre o escanea su código de barras con la cámara.',
          'Toca un artículo para añadirlo al carrito de ventas.',
          'Selecciona un cliente para llevar un registro de su historial.',
          'Elige el método de pago y confirma para generar el recibo digital.'
        ]}
        tips={[
          'Puedes aplicar descuentos porcentuales a la venta total.',
          'Comparte el recibo por WhatsApp para ahorrar papel y ser más ecológico.',
          'Los productos sin stock aparecerán opacos y no podrán venderse.'
        ]}
        color={c.accent}
      />

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16 },
  btnBack: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: sizes.fontXl, fontWeight: '700' },
  btnScan: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  mobileTabs: { flexDirection: 'row', padding: 4, marginVertical: 10, marginBottom: 16 },
  mobileTabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  mobileTabText: { fontSize: sizes.fontMd, fontWeight: '600' },
  panelCatalogo: { flex: 1 },
  searchContainer: { paddingBottom: 16 },
  buscador: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: sizes.radiusLg, borderWidth: 1, fontSize: sizes.fontBase },
  productoModernRow: { padding: 16, borderRadius: sizes.radiusXl },
  productoIconWrap: { width: 48, height: 48, borderRadius: sizes.radiusLg, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  productoInfo: { flex: 1, justifyContent: 'center' },
  productoNombre: { fontSize: sizes.fontLg, fontWeight: '600', marginBottom: 6 },
  productoDetalles: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeText: { fontSize: sizes.fontXs, fontWeight: '600' },
  productoPrecio: { fontSize: sizes.fontLg, fontWeight: '800' },
  panelCarrito: { flex: 1 },
  clienteSeccion: { },
  clienteRowTop: { marginBottom: 10 },
  clienteLabel: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1 },
  clienteChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: sizes.radiusFull, marginRight: 10 },
  clienteChipText: { fontSize: sizes.fontSm, fontWeight: '600' },
  ticketSubtitle: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  ticketContainer: { borderRadius: sizes.radiusXl, padding: 8, marginBottom: 20 },
  carritoVacio: { padding: 40, alignItems: 'center' },
  carritoVacioTexto: { fontSize: sizes.fontMd, fontWeight: '500' },
  carritoItemModern: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  carritoItemInfoFlex: { flex: 1, paddingRight: 10 },
  carritoItemNombre: { fontSize: sizes.fontBase, fontWeight: '700', marginBottom: 4 },
  carritoItemMeta: { fontSize: sizes.fontXs },
  controlCantidadRow: { flexDirection: 'row', alignItems: 'center', borderRadius: sizes.radiusLg, padding: 4 },
  btnCantModern: { width: 32, height: 32, borderRadius: sizes.radiusSm, alignItems: 'center', justifyContent: 'center' },
  cantNumModern: { width: 32, textAlign: 'center', fontSize: sizes.fontBase, fontWeight: '700' },
  carritoItemTotalRow: { width: 70, textAlign: 'right', fontSize: sizes.fontLg, fontWeight: '800' },
  checkoutContainer: { borderRadius: sizes.radiusXl, padding: 20 },
  metodoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  metodBtnModern: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: sizes.radiusLg, alignItems: 'center', minWidth: '30%' },
  metodBtnTextP: { fontSize: sizes.fontSm, fontWeight: '600' },
  descRowArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  descLabelP: { fontSize: sizes.fontMd, fontWeight: '500' },
  descInputP: { width: 80, paddingVertical: 10, paddingHorizontal: 14, borderRadius: sizes.radiusLg, textAlign: 'right', fontSize: sizes.fontBase, fontWeight: '600' },
  dividerC: { height: 1, backgroundColor: 'rgba(128,128,128,0.2)', marginBottom: 16 },
  totalsLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalSubLabel: { fontSize: sizes.fontMd },
  totalSubValue: { fontSize: sizes.fontMd, fontWeight: '600' },
  grandTotalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  grandTotalText: { fontSize: sizes.fontXl, fontWeight: '800' },
  grandTotalAmount: { fontSize: sizes.font4xl, fontWeight: '800', letterSpacing: -1 },
  btnConfirmarGo: { paddingVertical: 18, borderRadius: sizes.radiusXl, alignItems: 'center', marginTop: 16 },
  btnConfirmarGoTxt: { color: '#fff', fontSize: sizes.fontLg, fontWeight: '800' },
  scannerOverlay: { flex: 1, backgroundColor: '#000' },
  scannerHeader: { flexDirection: 'row', padding: 24, paddingTop: 50, justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  scannerTitle: { color: '#fff', fontSize: sizes.fontLg, fontWeight: '700' },
  scannerClose: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: sizes.radiusFull },
  scannerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  scannerTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#fff', borderRadius: sizes.radiusLg, backgroundColor: 'rgba(255,255,255,0.2)' },
  scannerFooter: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  scannerFooterText: { color: '#fff', fontSize: sizes.fontSm, textAlign: 'center', lineHeight: 22 }
});
