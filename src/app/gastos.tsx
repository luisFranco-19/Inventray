import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Alert, Modal, ScrollView, StatusBar, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { registrarGasto, obtenerGastosPorPeriodo, eliminarGasto, obtenerTotalGastosEnPeriodo } from '../../database/gastosDB';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';
import { sizes, commonStyles } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GuiaAyuda } from '../components/GuiaAyuda';
import { useResponsive } from '../hooks/useResponsive';

const CATEGORIAS_PREDEFINIDAS = ['Renta', 'Servicios', 'Sueldos', 'Mercancía', 'Otros'];

export default function Gastos() {
  const { colors: c, isDark } = useTheme();
  const cs = commonStyles(c);
  const router = useRouter();
  
  const [gastos, setGastos] = useState<any[]>([]);
  const [totalPeriodo, setTotalPeriodo] = useState(0);
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes'>('mes');
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('Servicios');
  const [otraCategoria, setOtraCategoria] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const { isTablet, contentPadding } = useResponsive();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const loadData = useCallback(async () => {
    try {
      const data = await obtenerGastosPorPeriodo(periodo);
      const total = await obtenerTotalGastosEnPeriodo(periodo);
      setGastos(data);
      setTotalPeriodo(total);
    } catch (error) {
      console.error(error);
    }
  }, [periodo]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const { tenantId, realtimeEnabled } = useBusiness();

  // Sincronización Doble (Realtime + Polling)
  useEffect(() => {
    if (!tenantId) return;

    // Polling condicional: menos frecuente si solo hay 1 dispositivo
    const pollingInterval = realtimeEnabled ? 3000 : 15000;
    const interval = setInterval(() => {
      loadData();
    }, pollingInterval);

    // 2. Realtime
    let channel: any = null;
    if (realtimeEnabled) {
      channel = supabase
        .channel(`gastos_realtime_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gasto', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Gastos Realtime] Cambio detectado, sincronizando...');
          loadData();
        }
      )
      .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, loadData, realtimeEnabled]);

  const handleGuardar = async () => {
    if (!descripcion || !monto || parseFloat(monto) <= 0) {
      Alert.alert('Datos incompletos', 'Por favor ingresa una descripción y un monto válido.');
      return;
    }

    setProcesando(true);
    try {
      const catFinal = categoria === 'Otros' ? (otraCategoria || 'Otros') : categoria;
      await registrarGasto(descripcion, parseFloat(monto), catFinal);
      setModalVisible(false);
      setDescripcion('');
      setMonto('');
      setOtraCategoria('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el gasto.');
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminar = (id: number) => {
    Alert.alert('Eliminar gasto', '¿Estás seguro de que deseas eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await eliminarGasto(id);
        loadData();
      }}
    ]);
  };

  const formatFecha = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const dia = d.getDate();
      const mes = d.getMonth() + 1;
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${dia}/${mes} ${h}:${m}`;
    } catch { return iso; }
  };

  return (
    <SafeAreaView style={cs.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      
      {/* Header */}
      <View style={[s.header, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity style={s.btnBack} onPress={goBack}>
          <Text style={{ fontSize: 20 }}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={[s.headerTitle, { color: c.text }]}>Gastos del Negocio</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
             <Animated.View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50', transform: [{ scale: pulseAnim }]}} />
             <Text style={{fontSize: 10, color: c.textTer, fontWeight: '700', letterSpacing: 0.5}}>EN VIVO</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[s.btnHelp, { backgroundColor: c.surfaceAlt, marginRight: 10 }]} 
          onPress={() => setMostrarGuia(true)}
        >
          <Text style={{ fontSize: 18, color: c.info }}>ℹ️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnAdd, { backgroundColor: c.accent }]} onPress={() => setModalVisible(true)}>
          <Text style={{ color: '#fff', fontSize: 24 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen Card */}
      <View style={[s.resumenArea, { paddingHorizontal: contentPadding }]}>
        <LinearGradient colors={['#FF4B2B', '#FF416C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
          <View>
            <Text style={s.heroLabel}>TOTAL GASTOS ({periodo.toUpperCase()})</Text>
            <Text style={s.heroValor}>{totalPeriodo === 0 ? '$0.00' : `-${totalPeriodo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</Text>
          </View>
          <View style={s.heroIcon}>
            <Text style={{ fontSize: 32 }}>📉</Text>
          </View>
        </LinearGradient>

        <View style={s.tabsContainer}>
          {(['hoy', 'semana', 'mes'] as const).map(p => (
            <TouchableOpacity 
              key={p} 
              style={[s.tabBtn, periodo === p && { backgroundColor: c.surfaceAlt, borderColor: c.accent }]} 
              onPress={() => setPeriodo(p)}
            >
              <Text style={[s.tabText, { color: periodo === p ? c.accent : c.textTer }]}>
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lista */}
      <FlatList
        data={gastos}
        keyExtractor={item => item.id.toString()}
        key={isTablet ? 'grid' : 'list'}
        numColumns={isTablet ? 2 : 1}
        contentContainerStyle={{ paddingHorizontal: contentPadding, paddingBottom: 40, gap: isTablet ? 16 : 0 }}
        columnWrapperStyle={isTablet ? { gap: 16 } : undefined}
        ListEmptyComponent={
          <View style={cs.vacio}>
             <Text style={cs.vacioTitulo}>Sin gastos registrados</Text>
             <Text style={cs.vacioSub}>Usa el botón + para registrar un nuevo gasto como renta, luz o suministros.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.itemCard, { backgroundColor: c.surface, borderColor: c.border, flex: isTablet ? 1 : 0, marginBottom: isTablet ? 0 : 12 }]}>
            <View style={[s.itemIcon, { backgroundColor: c.surfaceAlt }]}>
               <Text style={{fontSize: 18}}>💸</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={[s.itemName, { color: c.text }]} numberOfLines={1}>{item.descripcion}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <View style={[s.badgeCat, { backgroundColor: c.surfaceAlt }]}>
                   <Text style={[s.badgeText, { color: c.textSec }]}>{item.categoria}</Text>
                </View>
                <Text style={{ fontSize: 10, color: c.textTer }} numberOfLines={1}>{formatFecha(item.fecha)}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
              <Text style={[s.itemMonto, { color: c.danger }]}>-${item.monto.toFixed(2)}</Text>
              <TouchableOpacity onPress={() => handleEliminar(item.id)} hitSlop={15} style={{ marginTop: 6, paddingVertical: 2, paddingHorizontal: 4 }}>
                 <Text style={{ fontSize: 9, color: c.textTer, fontWeight: '700' }}>ELIMINAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal Nuevo Gasto */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={cs.modalOverlay}>
          <View style={[cs.modalCard, { paddingBottom: 40 }]}>
            <Text style={cs.modalTitulo}>Nuevo Gasto</Text>
            <Text style={cs.modalSub}>Los gastos se restarán de tu utilidad neta en reportes.</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={cs.modalLabel}>Descripción</Text>
              <TextInput 
                style={cs.modalInput} 
                placeholder="Ej: Pago de renta local" 
                placeholderTextColor={c.textTer}
                value={descripcion}
                onChangeText={setDescripcion}
              />

              <Text style={cs.modalLabel}>Monto ($)</Text>
              <TextInput 
                style={cs.modalInput} 
                keyboardType="numeric" 
                placeholder="0.00" 
                placeholderTextColor={c.textTer}
                value={monto}
                onChangeText={setMonto}
              />

              <Text style={cs.modalLabel}>Categoría</Text>
              <View style={s.catGrid}>
                {CATEGORIAS_PREDEFINIDAS.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[s.catChip, { backgroundColor: categoria === cat ? c.accent : c.surfaceAlt }]} 
                    onPress={() => setCategoria(cat)}
                  >
                    <Text style={[s.catChipText, { color: categoria === cat ? '#fff' : c.textSec }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {categoria === 'Otros' && (
                <>
                  <Text style={cs.modalLabel}>Categoría Personalizada</Text>
                  <TextInput 
                    style={cs.modalInput} 
                    placeholder="Ej: Mantenimiento" 
                    placeholderTextColor={c.textTer}
                    value={otraCategoria}
                    onChangeText={setOtraCategoria}
                  />
                </>
              )}

              <View style={[cs.modalBtns, { marginTop: 30 }]}>
                <TouchableOpacity style={cs.modalBtnCancelar} onPress={() => setModalVisible(false)}>
                  <Text style={cs.modalBtnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[cs.modalBtnConfirmar, { opacity: procesando ? 0.6 : 1 }]} 
                  onPress={handleGuardar}
                  disabled={procesando}
                >
                  <Text style={cs.modalBtnConfirmarText}>{procesando ? 'Guardando...' : 'Guardar Gasto'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Guía de Ayuda Contextual */}
      <GuiaAyuda 
        visible={mostrarGuia}
        onClose={() => setMostrarGuia(false)}
        titulo="Gestión de Gastos"
        pasos={[
          'Usa el botón (+) para registrar egresos como renta, luz o pago a proveedores.',
          'Selecciona una categoría para clasificar el tipo de gasto.',
          'Filtra por día, semana o mes para ver el historial de egresos.',
          'Los gastos registrados se restan automáticamente de tu utilidad neta en los reportes.'
        ]}
        tips={[
          'Categorizar tus gastos te ayuda a identificar en qué se está yendo tu dinero.',
          'No olvides registrar los gastos pequeños ("gastos hormiga") para un reporte financiero exacto.'
        ]}
        color={c.danger}
      />

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  btnBack: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.1)' },
  btnHelp: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: sizes.fontXl, fontWeight: '700' },
  btnAdd: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  
  resumenArea: { marginBottom: 20 },
  heroCard: { padding: 24, borderRadius: sizes.radius2xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heroLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  heroValor: { fontSize: sizes.font4xl, fontWeight: '800', color: '#fff', marginTop: 4 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  
  tabsContainer: { flexDirection: 'row', gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: sizes.radiusFull, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700' },
  
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: sizes.radiusXl, marginBottom: 12, borderWidth: 1 },
  itemIcon: { width: 48, height: 48, borderRadius: sizes.radiusLg, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: sizes.fontBase, fontWeight: '700', marginBottom: 4 },
  itemMonto: { fontSize: sizes.fontLg, fontWeight: '800' },
  badgeCat: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: sizes.radiusFull },
  catChipText: { fontSize: 12, fontWeight: '700' },
});
