import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, Alert, ScrollView, StatusBar, Platform, KeyboardAvoidingView,
  Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { obtenerVariantes, ajustarStock, crearVariante, eliminarVariante, actualizarVariante, type Variante } from '../../../database/variantesDB';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { supabase } from '../../lib/supabase';
import { sizes } from '../../theme';

const PremiumSpinner = ({ isDark }: { isDark: boolean }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true
      })
    ).start();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg']
  });

  return (
    <View style={st.spinnerContainer}>
      <Animated.View style={[st.spinner, { transform: [{ rotate: spin }], borderColor: isDark ? '#fff' : '#000', borderTopColor: 'transparent' }]} />
      <Text style={[st.spinnerText, { color: isDark ? '#fff' : '#000' }]}>Sincronizando...</Text>
    </View>
  );
};
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { GuiaAyuda } from '../../components/GuiaAyuda';
import { useResponsive } from '../../hooks/useResponsive';

type Filtro = 'todos' | 'bajo' | 'agotado';

function BarraProgreso({ valor, maximo, color, isDark }: { valor: number; maximo: number; color: string, isDark: boolean }) {
  const pct = maximo > 0 ? Math.min((valor / maximo) * 100, 100) : 0;
  return (
    <View style={{ height: 6, backgroundColor: isDark ? '#333333' : '#E2DFDA', borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 6 }} />
    </View>
  );
}

import * as Haptics from 'expo-haptics';


export default function Inventario() {
  const { colors: c, isDark } = useTheme();
  const { config: biz, tenantId, realtimeEnabled } = useBusiness();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [modalAjuste, setModalAjuste] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Variante | null>(null);
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [tipoAjuste, setTipoAjuste] = useState<'entrada' | 'salida'>('entrada');
  const [motivoAjuste, setMotivoAjuste] = useState<'compra' | 'ajuste' | 'perdida' | 'devolucion'>('compra');
  const [datos, setDatos] = useState<Variante[]>([]);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const { isTablet, isLargeTablet, contentPadding, columnWidth } = useResponsive();

  const PASOS_GUIA = [
    { titulo: 'Gestión de Productos', desc: 'Aquí puedes ver, buscar y filtrar toda tu mercancía en tiempo real.', icono: '📦', color: c.info },
    { titulo: 'Nuevo Producto', desc: `Toca el botón '+' arriba a la derecha para añadir un nuevo artículo al catálogo con su ${biz.labelAtributo1}/${biz.labelAtributo2}.`, icono: '➕', color: c.accent },
    { titulo: 'Ajustes de Stock', desc: 'Usa el botón "Ajustar" en cada producto para registrar Compras (entrada), Devoluciones o Pérdidas (salida).', icono: '🔄', color: c.warning },
    { titulo: 'Alertas de Stock', desc: 'Los colores te indican el estado: Verde (Suficiente), Naranja (Bajo) y Rojo (Agotado).', icono: '⚠️', color: c.danger },
  ];

  const router = useRouter();


  
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };
  
  // Variables form Nuevo
  const [formNombre, setFormNombre] = useState('');
  const [formTalla, setFormTalla] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formStockMin, setFormStockMin] = useState('2');
  const [formPrecio, setFormPrecio] = useState('');
  const [formCosto, setFormCosto] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formImagen, setFormImagen] = useState<string | null>(null);

  // Variables form Editar
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editCosto, setEditCosto] = useState('');
  const [editStockMin, setEditStockMin] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editImagen, setEditImagen] = useState<string | null>(null);

  // Variables Scanner de Cámara
  const [permission, requestPermission] = useCameraPermissions();
  const [modalScan, setModalScan] = useState(false);
  const [scanTarget, setScanTarget] = useState<'nuevo' | 'editar' | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!tenantId) return;
    setIsSyncing(true);
    try {
      setDatos(await obtenerVariantes());
    } catch (e: any) {
      console.error('Error cargando inventario:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [tenantId]);

  useFocusEffect(useCallback(() => {
    cargarDatos();
  }, [cargarDatos]));

  useEffect(() => {
    if (!tenantId) return;

    // Polling condicional: menos frecuente si solo hay 1 dispositivo
    const pollingInterval = realtimeEnabled ? 3000 : 15000;
    const interval = setInterval(() => {
      console.log('[Polling] Refrescando datos de inventario...');
      cargarDatos();
    }, pollingInterval);

    // 2. REALTIME (Instantáneo)
    let channel: any = null;
    if (realtimeEnabled) {
      channel = supabase
        .channel(`inventario_realtime_${tenantId}`)
        .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'variante', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Realtime] Cambio detectado en inventario, recargando...');
          cargarDatos();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'producto', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Realtime] Cambio detectado en productos, recargando...');
          cargarDatos();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categoria', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Realtime] Cambio detectado en categorias, recargando...');
          cargarDatos();
        }
      )
      .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, cargarDatos, realtimeEnabled]);

  const seleccionarImagen = async (target: 'nuevo' | 'editar') => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (target === 'nuevo') setFormImagen(result.assets[0].uri);
      else setEditImagen(result.assets[0].uri);
    }
  };

  const variantesFiltradas = datos.filter(v => {
    const okB =
      v.productoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (v.codigoBarras ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      v.color.toLowerCase().includes(busqueda.toLowerCase());
    const okF =
      filtro === 'todos' ? true :
        filtro === 'bajo' ? (v.stock > 0 && v.stock <= v.stockMinimo) :
          v.stock === 0;
    return okB && okF;
  });

  const totalVariantes = variantesFiltradas.length;
  const agotadas = variantesFiltradas.filter(v => v.stock === 0).length;
  const stockBajo = variantesFiltradas.filter(v => v.stock > 0 && v.stock <= v.stockMinimo).length;
  const valorInventario = variantesFiltradas.reduce((s, v) => s + v.stock * v.costo, 0);

  const abrirAjuste = (v: Variante) => {
    setVarianteSeleccionada(v); setCantidadAjuste(''); setTipoAjuste('entrada'); setMotivoAjuste('compra'); setModalAjuste(true);
  };

  const confirmarAjuste = async () => {
    const cant = parseInt(cantidadAjuste);
    if (!cant || cant <= 0) { Alert.alert('Cantidad inválida', 'Ingresa una cantidad mayor a cero.'); return; }
    if (!varianteSeleccionada) return;
    try {
      await ajustarStock(varianteSeleccionada.id, tipoAjuste, motivoAjuste, cant);
      setModalAjuste(false); 
      await cargarDatos();
      Alert.alert('Listo', 'Stock actualizado correctamente.');
    } catch (e: any) { Alert.alert('Error', e.message ?? 'No se pudo realizar el ajuste.'); }
  };

  const abrirNuevo = () => {
    setFormNombre(''); setFormTalla(''); setFormColor(''); setFormPrecio(''); setFormCosto(''); setFormStock(''); setFormStockMin('2'); setFormCodigo(''); setFormImagen(null); setModalNuevo(true);
  };

  const guardarNuevo = async () => {
    if (!formNombre.trim()) { Alert.alert('Requerido', 'Ingresa el nombre del producto.'); return; }
    if (!formTalla.trim()) { Alert.alert('Requerido', 'Ingresa la talla.'); return; }
    if (!formColor.trim()) { Alert.alert('Requerido', 'Ingresa el color.'); return; }
    const precio = parseFloat(formPrecio);
    if (!precio || precio <= 0) { Alert.alert('Requerido', 'Ingresa un precio válido.'); return; }
    const costo = parseFloat(formCosto) || 0;
    const stock = parseInt(formStock) || 0;
    const stockMin = parseInt(formStockMin) || 2;

    const ejecutar = async () => {
      try {
        await crearVariante(formNombre, formTalla, formColor, precio, costo, stock, stockMin, formCodigo.trim() ? formCodigo.trim() : undefined, formImagen || undefined);
        Alert.alert('Guardado', `${formNombre} (${formTalla} / ${formColor}) agregado.`);
        setModalNuevo(false); await cargarDatos();
      } catch (e: any) {
        if (e.message?.includes('UNIQUE') && e.message?.includes('codigo_barras')) {
          Alert.alert('Código Duplicado', 'Este código de barras ya está registrado en otro producto.');
        } else {
          Alert.alert('Error', e.message ?? 'No se pudo guardar.');
        }
      }
    };

    if (costo > precio) {
      Alert.alert(
        'Validación de Costo',
        `El costo unitario ($${costo}) es mayor al precio de venta ($${precio}). ¿Deseas continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', style: 'destructive', onPress: ejecutar }
        ]
      );
    } else {
      ejecutar();
    }
  };

  const abrirEditar = (v: Variante) => {
    setVarianteSeleccionada(v); setEditNombre(v.productoNombre); setEditPrecio(v.precio.toString()); setEditCosto(v.costo.toString()); setEditStockMin(v.stockMinimo.toString()); setEditCodigo(v.codigoBarras ?? ''); setEditImagen(v.imagenUrl ?? null); setModalEditar(true);
  };

  const guardarEditar = async () => {
    if (!varianteSeleccionada) return;
    const precio = parseFloat(editPrecio);
    if (!precio || precio <= 0) { Alert.alert('Requerido', 'Ingresa un precio válido.'); return; }
    const costo = parseFloat(editCosto) || 0;
    const stockMin = parseInt(editStockMin);
    if (isNaN(stockMin) || stockMin < 0) { Alert.alert('Requerido', 'Ingresa stock mínimo válido.'); return; }

    const ejecutar = async () => {
      try {
        await actualizarVariante(varianteSeleccionada.id, editNombre, precio, costo, stockMin, editCodigo.trim() ? editCodigo.trim() : undefined, editImagen || undefined);
        setModalEditar(false); await cargarDatos();
        Alert.alert('Actualizado', 'Producto actualizado correctamente.');
      } catch (e: any) {
        if (e.message?.includes('UNIQUE') && e.message?.includes('codigo_barras')) {
          Alert.alert('Código Duplicado', 'Este código de barras ya está registrado en otro producto.');
        } else {
          Alert.alert('Error', e.message ?? 'No se pudo actualizar.');
        }
      }
    };

    if (costo > precio) {
      Alert.alert(
        'Validación de Costo',
        `El costo unitario ($${costo}) es mayor al precio de venta ($${precio}). ¿Deseas continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', style: 'destructive', onPress: ejecutar }
        ]
      );
    } else {
      ejecutar();
    }
  };

  const confirmarEliminar = (variante: Variante) => {
    const mensaje = variante.stock === 0
      ? `La variante ${variante.productoNombre} está agotada. ¿Deseas eliminarla?`
      : `La variante ${variante.productoNombre} tiene stock ${variante.stock}. ¿Deseas eliminarla de todos modos?`;

    const ejecutarEliminar = async () => {
      try { await eliminarVariante(variante.id); await cargarDatos(); Alert.alert('Eliminado', 'Producto eliminado correctamente.'); }
      catch (e: any) { Alert.alert('Error', e.message ?? 'No se pudo eliminar.'); }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(mensaje)) ejecutarEliminar();
      return;
    }

    Alert.alert('Eliminar', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: ejecutarEliminar },
    ]);
  };

  const iniciarEscaneo = async (target: 'nuevo' | 'editar') => {
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) { Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para escanear.'); return; }
    }
    setScanTarget(target);
    setModalScan(true);
  };

  const manejarEscaneo = ({ data }: { data: string }) => {
    if (scanTarget === 'nuevo') setFormCodigo(data);
    if (scanTarget === 'editar') setEditCodigo(data);
    setModalScan(false);
  };

  const VERDE = c.info, NARANJA = c.warning, ROJO = c.danger;
  const colorStock = (v: Variante) => v.stock === 0 ? ROJO : v.stock <= v.stockMinimo ? NARANJA : VERDE;
  const etiquetaStock = (v: Variante) => v.stock === 0 ? 'AGOTADO' : v.stock <= v.stockMinimo ? 'BAJO' : 'STOCK FULL';

  const motivosPorTipo = tipoAjuste === 'entrada'
    ? [{ k: 'compra', l: 'Compra' }, { k: 'devolucion', l: 'Devolución' }, { k: 'ajuste', l: 'Ajuste' }]
    : [{ k: 'ajuste', l: 'Ajuste' }, { k: 'perdida', l: 'Pérdida' }];

  const renderMargen = (precioStr: string, costoStr: string) => {
    const p = parseFloat(precioStr) || 0;
    const co = parseFloat(costoStr) || 0;
    if (p > 0 && co >= 0) {
      const ganancia = p - co;
      const margen = p > 0 ? (ganancia / p) * 100 : 0;
      const isLoss = ganancia <= 0;
      const colorTexto = isLoss ? c.danger : '#10B981'; // Un verde brillante para ganancia
      return (
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4, backgroundColor: colorTexto + '1A', paddingVertical: 6, borderRadius: 6}}>
           <Text style={{fontSize: 13, color: colorTexto, fontWeight: '700'}}>
               💡 {isLoss ? 'Pérdida / Sin Ganancia' : `Ganancia: $${ganancia.toFixed(2)}`}
           </Text>
           <Text style={{fontSize: 13, color: colorTexto, fontWeight: '800'}}>
               Margen: {margen.toFixed(1)}%
           </Text>
        </View>
      );
    }
    return null;
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[st.root, { backgroundColor: c.bg }]}>
    <SafeAreaView style={[st.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      {isSyncing && <PremiumSpinner isDark={isDark} />}
      
      {/* HEADER TIPO PERFIL */}
      <View style={[st.header, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity style={[st.btnAvatar, { backgroundColor: c.surfaceAlt }]} onPress={goBack}>
           <Text style={{fontSize: 20}}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={[st.headerTitulo, { color: c.text }]}>Inventario</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
             <Animated.View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50', transform: [{ scale: pulseAnim }]}} />
             <Text style={{fontSize: 10, color: c.textTer, fontWeight: '700', letterSpacing: 0.5}}>EN VIVO</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[st.iconBtn, { backgroundColor: c.surfaceAlt, marginRight: 8 }]} 
          onPress={() => setMostrarGuia(true)}
        >
          <Text style={{fontSize: 20, color: c.info}}>ℹ️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.iconBtn, { backgroundColor: c.accent }]} onPress={abrirNuevo}>
           <Text style={{fontSize: 20, color: '#fff', fontWeight: 'bold'}}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={[st.searchContainer, { paddingHorizontal: contentPadding }]}>
        <TextInput 
           style={[st.buscador, { backgroundColor: c.surface, borderColor: isDark ? c.surfaceAlt : c.border, color: c.text }]} 
           placeholder="Buscar variantes..." 
           placeholderTextColor={c.textSec} 
           value={busqueda} 
           onChangeText={setBusqueda} 
        />
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={st.resumenScroll} 
        contentContainerStyle={[st.resumenContainer, { paddingHorizontal: contentPadding }]}
      >
        
        <LinearGradient colors={isDark ? ['#8E2DE2', '#4A00E0'] : ['#6A11CB', '#2575FC']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={st.tarjetaGradient}>
           <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={st.tarjetaLabelGrad}>VALOR ACTUAL</Text>
              <Text style={{fontSize: 16}}>💰</Text>
           </View>
           <Text style={st.tarjetaNumGrad} numberOfLines={1}>${valorInventario.toLocaleString()}</Text>
        </LinearGradient>
        
        <View style={[st.tarjetaFlat, { backgroundColor: c.surface, borderColor: c.border, borderWidth: isDark ? 0 : 1 }]}>
           <View style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
              <Text style={{fontSize: 14}}>📦</Text>
              <Text style={[st.tarjetaLabelFlat, { color: c.textTer }]}>Vistas</Text>
           </View>
           <Text style={[st.tarjetaNumFlat, { color: c.text }]}>{totalVariantes}</Text>
        </View>

        <View style={[st.tarjetaFlat, { backgroundColor: c.surface, borderColor: c.border, borderWidth: isDark ? 0 : 1 }]}>
           <View style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
              <Text style={{fontSize: 14}}>⚠️</Text>
              <Text style={[st.tarjetaLabelFlat, { color: NARANJA }]}>Bajas</Text>
           </View>
           <Text style={[st.tarjetaNumFlat, { color: NARANJA }]}>{stockBajo}</Text>
        </View>

        <View style={[st.tarjetaFlat, { backgroundColor: c.surface, borderColor: c.border, borderWidth: isDark ? 0 : 1 }]}>
           <View style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
              <Text style={{fontSize: 14}}>❌</Text>
              <Text style={[st.tarjetaLabelFlat, { color: ROJO }]}>Agotadas</Text>
           </View>
           <Text style={[st.tarjetaNumFlat, { color: ROJO }]}>{agotadas}</Text>
        </View>
      </ScrollView>

      <View style={[st.filtrosContainer, { backgroundColor: c.bg, paddingHorizontal: contentPadding }]}>
        {(['todos', 'bajo', 'agotado'] as Filtro[]).map(f => (
          <TouchableOpacity 
             key={f} 
             style={[st.filtroBtn, { backgroundColor: filtro === f ? c.text : c.surfaceAlt }]} 
             onPress={() => setFiltro(f)}
          >
            <Text style={[st.filtroBtnText, { color: filtro === f ? c.bg : c.textSec }]}>
              {f === 'todos' ? 'Todos' : f === 'bajo' ? 'Stock bajo' : 'Agotados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={variantesFiltradas}
        keyExtractor={item => item.id.toString()}
        key={isTablet ? 'grid' : 'list'}
        numColumns={isLargeTablet ? 3 : isTablet ? 2 : 1}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 40, paddingHorizontal: contentPadding, gap: 16 }}
        columnWrapperStyle={isTablet ? { gap: 16 } : undefined}
        ListEmptyComponent={
          <View style={st.vacio}>
            <Text style={[st.vacioTitulo, { color: c.textTer }]}>Sin productos aún</Text>
            <Text style={[st.vacioSub, { color: c.textTer }]}>Toca el "+" para agregar tu primer producto</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = colorStock(item);
          const maxBarra = Math.max(item.stock, item.stockMinimo * 4, 1);
          return (
            <View style={[st.cardModern, { backgroundColor: c.surface, flex: isTablet ? 1 : 0 }]}>
               <View style={st.cardModernHeader}>
                  {item.imagenUrl ? (
                    <Image source={{ uri: item.imagenUrl }} style={st.cardImage} />
                  ) : (
                    <View style={[st.cardImagePlaceholder, { backgroundColor: c.surfaceAlt }]}>
                       <Text style={{fontSize: 24, color: c.textTer}}>📦</Text>
                    </View>
                  )}
                  <View style={{flex: 1, paddingRight: 10, justifyContent: 'center'}}>
                     <Text style={[st.cardModernTitle, { color: c.text }]} numberOfLines={1}>{item.productoNombre}</Text>
                     <Text style={[st.cardModernSku, { color: c.textTer }]} numberOfLines={1}>
                        {item.codigoBarras ? `${item.codigoBarras} • ` : ''} {item.talla} / {item.color}
                     </Text>
                  </View>
                  <View style={[{ alignItems: 'flex-end', flexShrink: 0 }]}>
                     <Text style={[st.cardModernPrice, { color: c.text, fontSize: isTablet ? sizes.fontLg : sizes.fontXl }]}>${item.precio.toLocaleString('es-MX', {minimumFractionDigits: 2})}</Text>
                     <Text style={[{ fontSize: sizes.fontXs, color: c.textTer, textAlign: 'right' }]}>Costo: ${item.costo.toFixed(1)}</Text>
                  </View>
               </View>
               
               <View style={st.cardModernStockBlock}>
                  <View style={{flex: 1, paddingRight: 20}}>
                     <Text style={[{ fontSize: sizes.fontLg, fontWeight: '800', color }]}>{item.stock} uds</Text>
                     <Text style={[{ fontSize: sizes.fontXs, color: c.textSec }]}>Mínimo sugerido: {item.stockMinimo}</Text>
                     <BarraProgreso valor={item.stock} maximo={maxBarra} color={color} isDark={isDark} />
                  </View>
                  <View style={st.cardModernActions}>
                     <TouchableOpacity style={[st.actionBtnRound, { backgroundColor: c.surfaceAlt }]} onPress={() => abrirEditar(item)}>
                        <Text style={{fontSize: 18}}>✏️</Text>
                     </TouchableOpacity>
                     {!isTablet && (
                       <TouchableOpacity style={[st.actionBtnRound, { backgroundColor: c.surfaceAlt }]} onPress={() => confirmarEliminar(item)}>
                          <Text style={{fontSize: 18}}>🗑️</Text>
                       </TouchableOpacity>
                     )}
                     <TouchableOpacity style={[st.actionBtnPrimary, { backgroundColor: c.text }]} onPress={() => abrirAjuste(item)}>
                        <Text style={[st.actionBtnPrimaryText, { color: c.bg }]}>{isTablet ? 'Stock' : 'Ajustar'}</Text>
                     </TouchableOpacity>
                  </View>
               </View>
            </View>
          );
        }}
      />

      {/* Modal Ajuste */}
      <Modal visible={modalAjuste} animationType="fade" transparent onRequestClose={() => setModalAjuste(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalOverlay}>
          <View style={[st.modalCard, { backgroundColor: c.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={[st.modalTitulo, { color: c.text }]}>Ajuste de inventario</Text>
              {varianteSeleccionada && (
                <Text style={[st.modalSub, { color: c.textTer }]}>{varianteSeleccionada.productoNombre} · {varianteSeleccionada.talla} · {varianteSeleccionada.color}</Text>
              )}
              
              <Text style={[st.modalLabel, { color: c.textSec }]}>Acción</Text>
              <View style={st.opcionesRow}>
                {(['entrada', 'salida'] as const).map(t => (
                  <TouchableOpacity 
                     key={t} 
                     style={[st.opcionBtn, { backgroundColor: tipoAjuste === t ? c.accent : c.surfaceAlt }]}
                     onPress={() => { setTipoAjuste(t); setMotivoAjuste(t === 'entrada' ? 'compra' : 'ajuste'); }}>
                    <Text style={[st.opcionBtnText, { color: tipoAjuste === t ? '#fff' : c.textSec }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={[st.modalLabel, { color: c.textSec }]}>Especifica el motivo</Text>
              <View style={st.opcionesRow}>
                {motivosPorTipo.map(m => (
                  <TouchableOpacity 
                     key={m.k} 
                     style={[st.opcionBtn, { backgroundColor: motivoAjuste === m.k ? c.text : c.surfaceAlt }]} 
                     onPress={() => setMotivoAjuste(m.k as any)}>
                    <Text style={[st.opcionBtnText, { color: motivoAjuste === m.k ? c.bg : c.textSec }]}>{m.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[st.modalLabel, { color: c.textSec }]}>Cantidad de uds.</Text>
              <TextInput 
                 style={[st.modalInputGrande, { backgroundColor: c.surfaceAlt, color: c.text }]} 
                 placeholder="0" placeholderTextColor={c.textTer} keyboardType="numeric" value={cantidadAjuste} onChangeText={setCantidadAjuste} 
              />
              <Text style={[st.modalStockActual, { color: c.textTer }]}>Actualmente en existencia: {varianteSeleccionada?.stock ?? 0} unidades</Text>
              
              <View style={st.modalBtns}>
                <TouchableOpacity style={[st.modalBtnCancelar, { backgroundColor: c.surfaceAlt }]} onPress={() => setModalAjuste(false)}>
                  <Text style={[st.modalBtnCancelarText, { color: c.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.modalBtnConfirmar, { backgroundColor: c.accent }]} onPress={confirmarAjuste}>
                  <Text style={st.modalBtnConfirmarText}>Ejecutar Cambio</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Editar */}
      <Modal visible={modalEditar} animationType="slide" transparent onRequestClose={() => setModalEditar(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalOverlay}>
          <View style={[st.modalCard, { backgroundColor: c.surface, height: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20}}>
                 <View>
                   <Text style={[st.modalTitulo, { color: c.text, marginBottom: 0 }]}>Propiedades</Text>
                   {varianteSeleccionada && (
                     <Text style={[st.modalSub, { color: c.textTer, marginBottom: 0 }]}>Modificando {varianteSeleccionada.talla} · {varianteSeleccionada.color}</Text>
                   )}
                 </View>
                 <TouchableOpacity onPress={() => setModalEditar(false)}><Text style={{fontSize: 24, color: c.textTer}}>✕</Text></TouchableOpacity>
              </View>
              
              
              <Text style={[st.modalLabel, { color: c.textSec, marginTop: 0 }]}>Foto del Producto</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                 {editImagen ? (
                   <Image source={{uri: editImagen}} style={st.miniImgPreview} />
                 ) : (
                   <View style={[st.miniImgPreview, { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
                     <Text style={{fontSize: 24}}>📷</Text>
                   </View>
                 )}
                 <TouchableOpacity style={[st.chipInfo, { backgroundColor: c.accent, marginLeft: 16 }]} onPress={() => seleccionarImagen('editar')}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cambiar Foto</Text>
                 </TouchableOpacity>
                 {editImagen && (
                    <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => setEditImagen(null)}>
                       <Text style={{ color: c.danger, fontWeight: 'bold' }}>Quitar</Text>
                    </TouchableOpacity>
                 )}
              </View>

              <Text style={[st.modalLabel, { color: c.textSec }]}>Propiedades</Text>
              <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="Nombre..." placeholderTextColor={c.textTer} value={editNombre} onChangeText={setEditNombre} />
              
              <Text style={[st.modalLabel, { color: c.textSec }]}>Código de Barras / QR (Opcional)</Text>
              <View style={st.inputRow}>
                 <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text, flex: 1, paddingRight: 60 }]} placeholder="Escanea o escribe..." placeholderTextColor={c.textTer} value={editCodigo} onChangeText={setEditCodigo} />
                 <TouchableOpacity style={[st.btnScanInside, { backgroundColor: c.accent }]} onPress={() => iniciarEscaneo('editar')}>
                    <Text style={{fontSize: 20}}>📷</Text>
                 </TouchableOpacity>
              </View>
              
              <Text style={[st.modalLabel, { color: c.textSec }]}>Precio Venta ($)</Text>
              <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="0.00" placeholderTextColor={c.textTer} keyboardType="numeric" value={editPrecio} onChangeText={setEditPrecio} />
              
              <Text style={[st.modalLabel, { color: c.textSec }]}>Costo de Compra ($)</Text>
              <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="0.00" placeholderTextColor={c.textTer} keyboardType="numeric" value={editCosto} onChangeText={setEditCosto} />
              
              {renderMargen(editPrecio, editCosto)}
              
              <Text style={[st.modalLabel, { color: c.textSec }]}>Alerta mínima de stock</Text>
              <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="2" placeholderTextColor={c.textTer} keyboardType="numeric" value={editStockMin} onChangeText={setEditStockMin} />
              
              <View style={[st.modalBtns, { marginTop: 20 }]}>
                 <TouchableOpacity style={[st.btnConfirmarGo, { backgroundColor: c.accent, flex: 1 }]} onPress={guardarEditar} activeOpacity={0.8}>
                    <Text style={st.btnConfirmarGoTxt}>Guardar Cambios</Text>
                 </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Nuevo */}
      <Modal visible={modalNuevo} animationType="slide" transparent onRequestClose={() => setModalNuevo(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalOverlay}>
          <View style={[st.modalCard, { backgroundColor: c.surface, height: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20}}>
                 <Text style={[st.modalTitulo, { color: c.text, marginBottom: 0 }]}>Nuevo Ingreso</Text>
                 <TouchableOpacity onPress={() => setModalNuevo(false)}><Text style={{fontSize: 24, color: c.textTer}}>✕</Text></TouchableOpacity>
              </View>
              
              <Text style={[st.modalLabel, { color: c.textSec, marginTop: 0 }]}>Foto del Producto</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                 {formImagen ? (
                   <Image source={{uri: formImagen}} style={st.miniImgPreview} />
                 ) : (
                   <View style={[st.miniImgPreview, { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
                     <Text style={{fontSize: 24}}>📷</Text>
                   </View>
                 )}
                 <TouchableOpacity style={[st.chipInfo, { backgroundColor: c.accent, marginLeft: 16 }]} onPress={() => seleccionarImagen('nuevo')}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Seleccionar Foto</Text>
                 </TouchableOpacity>
                 {formImagen && (
                    <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => setFormImagen(null)}>
                       <Text style={{ color: c.danger, fontWeight: 'bold' }}>Quitar</Text>
                    </TouchableOpacity>
                 )}
              </View>

              <Text style={[st.modalLabel, { color: c.textSec }]}>Nombre del producto</Text>
              <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder={biz.placeholderProducto} placeholderTextColor={c.textTer} value={formNombre} onChangeText={setFormNombre} />
              
              <Text style={[st.modalLabel, { color: c.textSec }]}>Código de Barras / QR (Opcional)</Text>
              <View style={st.inputRow}>
                 <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text, flex: 1, paddingRight: 60 }]} placeholder="Escanea o escribe..." placeholderTextColor={c.textTer} value={formCodigo} onChangeText={setFormCodigo} />
                 <TouchableOpacity style={[st.btnScanInside, { backgroundColor: c.accent }]} onPress={() => iniciarEscaneo('nuevo')}>
                    <Text style={{fontSize: 20}}>📷</Text>
                 </TouchableOpacity>
              </View>

              <View style={{flexDirection: 'row', gap: 12}}>
                 <View style={{flex: 1}}>
                    <Text style={[st.modalLabel, { color: c.textSec }]}>{biz.labelAtributo1}</Text>
                    <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder={biz.placeholderAtributo1} placeholderTextColor={c.textTer} value={formTalla} onChangeText={setFormTalla} />
                 </View>
                 <View style={{flex: 1}}>
                    <Text style={[st.modalLabel, { color: c.textSec }]}>{biz.labelAtributo2}</Text>
                    <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder={biz.placeholderAtributo2} placeholderTextColor={c.textTer} value={formColor} onChangeText={setFormColor} />
                 </View>
              </View>

              <View style={{flexDirection: 'row', gap: 12}}>
                 <View style={{flex: 1}}>
                    <Text style={[st.modalLabel, { color: c.textSec }]}>Precio Venta ($)</Text>
                    <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="0.00" placeholderTextColor={c.textTer} keyboardType="numeric" value={formPrecio} onChangeText={setFormPrecio} />
                 </View>
                 <View style={{flex: 1}}>
                    <Text style={[st.modalLabel, { color: c.textSec }]}>Costo Unitario ($)</Text>
                    <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="0.00" placeholderTextColor={c.textTer} keyboardType="numeric" value={formCosto} onChangeText={setFormCosto} />
                 </View>
              </View>
              
              {renderMargen(formPrecio, formCosto)}
              
              <View style={{flexDirection: 'row', gap: 12}}>
                 <View style={{flex: 1}}>
                    <Text style={[st.modalLabel, { color: c.textSec }]}>Existencia actual</Text>
                    <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="0" placeholderTextColor={c.textTer} keyboardType="numeric" value={formStock} onChangeText={setFormStock} />
                 </View>
                 <View style={{flex: 1}}>
                    <Text style={[st.modalLabel, { color: c.textSec }]}>Aviso mínimo</Text>
                    <TextInput style={[st.modalInputForm, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="2" placeholderTextColor={c.textTer} keyboardType="numeric" value={formStockMin} onChangeText={setFormStockMin} />
                 </View>
              </View>

              <TouchableOpacity style={[st.btnConfirmarGo, { backgroundColor: c.accent }]} onPress={guardarNuevo} activeOpacity={0.8}>
                 <Text style={st.btnConfirmarGoTxt}>Añadir al Catálogo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Lector Scanner */}
      <Modal visible={modalScan} animationType="slide" transparent onRequestClose={() => setModalScan(false)}>
        <View style={st.scannerOverlay}>
          <View style={st.scannerHeader}>
             <Text style={st.scannerTitle}>Escaneando Código...</Text>
             <TouchableOpacity style={st.scannerClose} onPress={() => setModalScan(false)}>
                <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>Cerrar</Text>
             </TouchableOpacity>
          </View>
          <View style={st.scannerBox}>
             <CameraView 
                style={StyleSheet.absoluteFillObject} 
                facing="back" 
                onBarcodeScanned={manejarEscaneo} 
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
             />
             {/* Reticula guia visual */}
             <View style={st.scannerTarget} />
          </View>
          <View style={st.scannerFooter}>
             <Text style={st.scannerFooterText}>Apunta la cámara hacia la etiqueta del producto</Text>
          </View>
        </View>
      </Modal>

      {/* Guía de Ayuda Contextual */}
      <GuiaAyuda 
        visible={mostrarGuia} 
        onClose={() => setMostrarGuia(false)}
        titulo="Control de Inventario"
        pasos={[
          'Agrega nuevos productos con el botón (+) especificando nombre, precio y stock.',
          'Usa el botón "Ajustar" para registrar entradas (compras) o salidas (pérdidas).',
          'Escanea el código de barras con la cámara para identificar productos rápido.',
          'Filtra por "Stock bajo" para saber qué productos necesitas resurtir pronto.'
        ]}
        tips={[
          'Configura el "Aviso mínimo" para que el sistema te alerte antes de que se agote un producto.',
          'Mantener el "Costo Unitario" actualizado te permite ver reportes de ganancia real.',
          'Puedes eliminar productos deslizando o usando el botón de basura si ya no los vendes.'
        ]}
        color={c.accent}
      />

    </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 16 },
  btnAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { fontSize: sizes.fontXl, fontWeight: '700' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  
  searchContainer: { paddingBottom: 8 },
  buscador: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: sizes.radiusLg, borderWidth: 1, fontSize: sizes.fontBase },
  
  resumenScroll: { height: 150, flexGrow: 0 },
  resumenContainer: { paddingVertical: 10, gap: 12, alignItems: 'center' },
  tarjetaGradient: { width: 160, height: 110, borderRadius: sizes.radiusXl, padding: 20, justifyContent: 'space-between', elevation: 8, shadowColor: '#4A00E0', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  tarjetaLabelGrad: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tarjetaNumGrad: { color: '#fff', fontSize: sizes.font3xl, fontWeight: '900', letterSpacing: -1 },
  
  tarjetaFlat: { width: 130, height: 110, borderRadius: sizes.radiusXl, padding: 20, justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tarjetaLabelFlat: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  tarjetaNumFlat: { fontSize: sizes.font2xl, fontWeight: '900' },

  filtrosContainer: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingBottom: 4, paddingTop: 5, zIndex: 10 },
  filtroBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: sizes.radiusFull },
  filtroBtnText: { fontSize: sizes.fontSm, fontWeight: '700' },

  cardModern: { borderRadius: sizes.radiusXl, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardModernHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  cardImage: { width: 50, height: 50, borderRadius: sizes.radiusMd, marginRight: 12 },
  cardImagePlaceholder: { width: 50, height: 50, borderRadius: sizes.radiusMd, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  cardModernTitle: { fontSize: sizes.fontLg, fontWeight: '700', marginBottom: 4 },
  cardModernSku: { fontSize: sizes.fontXs, textTransform: 'uppercase', letterSpacing: 1 },
  cardModernBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: sizes.radiusSm },
  chipInfo: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexShrink: 1 },
  
  cardModernPrice: { fontSize: sizes.fontXl, fontWeight: '800' },
  
  cardModernStockBlock: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.1)', paddingTop: 16 },
  cardModernActions: { flexDirection: 'row', gap: 8 },
  actionBtnRound: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary: { height: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimaryText: { fontSize: sizes.fontSm, fontWeight: '700' },

  vacio: { paddingTop: 60, alignItems: 'center' },
  vacioTitulo: { fontSize: sizes.fontLg, fontWeight: '700', marginBottom: 8 },
  vacioSub: { fontSize: sizes.fontSm, textAlign: 'center', lineHeight: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: sizes.radius2xl, borderTopRightRadius: sizes.radius2xl, padding: 24, maxHeight: '90%' },
  modalTitulo: { fontSize: sizes.font2xl, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  modalSub: { fontSize: sizes.fontSm, marginBottom: 20 },
  modalLabel: { fontSize: sizes.fontSm, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  
  opcionesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  opcionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: sizes.radiusLg },
  opcionBtnText: { fontSize: sizes.fontSm, fontWeight: '600' },
  
  miniImgPreview: { width: 60, height: 60, borderRadius: sizes.radiusLg },
  
  modalInputGrande: { borderRadius: sizes.radiusXl, paddingHorizontal: 16, paddingVertical: 18, fontSize: sizes.font3xl, marginTop: 8, textAlign: 'center', fontWeight: '800' },
  modalInputForm: { borderRadius: sizes.radiusLg, paddingHorizontal: 16, paddingVertical: 14, fontSize: sizes.fontBase, fontWeight: '500' },
  modalStockActual: { fontSize: sizes.fontXs, textAlign: 'center', marginTop: 12, marginBottom: 24 },
  
  inputRow: { position: 'relative', justifyContent: 'center' },
  btnScanInside: { position: 'absolute', right: 4, top: 4, bottom: 4, width: 44, borderRadius: sizes.radiusLg, alignItems: 'center', justifyContent: 'center' },
  
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalBtnCancelar: { flex: 1, paddingVertical: 16, borderRadius: sizes.radiusXl, alignItems: 'center' },
  modalBtnCancelarText: { fontSize: sizes.fontBase, fontWeight: '700' },
  modalBtnConfirmar: { flex: 1, paddingVertical: 16, borderRadius: sizes.radiusXl, alignItems: 'center' },
  modalBtnConfirmarText: { fontSize: sizes.fontBase, fontWeight: '800', color: '#fff' },

  btnConfirmarGo: { paddingVertical: 18, borderRadius: sizes.radiusXl, alignItems: 'center', marginTop: 24 },
  btnConfirmarGoTxt: { color: '#fff', fontSize: sizes.fontLg, fontWeight: '800' },

  scannerOverlay: { flex: 1, backgroundColor: '#000' },
  scannerHeader: { flexDirection: 'row', padding: 24, paddingTop: 50, justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  scannerTitle: { color: '#fff', fontSize: sizes.fontLg, fontWeight: '700' },
  scannerClose: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: sizes.radiusFull },
  scannerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  scannerTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#fff', borderRadius: sizes.radiusLg, backgroundColor: 'rgba(255,255,255,0.1)' },
  scannerFooter: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  scannerFooterText: { color: '#fff', fontSize: sizes.fontSm, textAlign: 'center' },
  
  spinnerContainer: {
    position: 'absolute', top: 60, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, zIndex: 100
  },
  spinner: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2,
  },
  spinnerText: { fontSize: 10, fontWeight: '700' }
});
