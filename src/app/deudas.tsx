import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Alert, Modal, ScrollView, StatusBar, Linking, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { obtenerDeudasPendientes, registrarAbono, obtenerHistorialAbonos } from '../../database/deudasDB';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { usePayMethodSync } from '../hooks/usePayMethodSync';
import { supabase } from '../lib/supabase';
import { sizes, commonStyles } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GuiaAyuda } from '../components/GuiaAyuda';
import { useResponsive } from '../hooks/useResponsive';

export default function Deudas() {
  const { colors: c, isDark } = useTheme();
  const { config: biz, tenantId, isLoading, realtimeEnabled } = useBusiness();
  const cs = commonStyles(c);
  const router = useRouter();

  const [deudas, setDeudas] = useState<any[]>([]);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<any>(null);
  const [historialAbonos, setHistorialAbonos] = useState<any[]>([]);
  
  const [modalAbono, setModalAbono] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  
  // Abono State
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [procesando, setProcesando] = useState(false);

  usePayMethodSync(metodoPago, setMetodoPago);
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
      const data = await obtenerDeudasPendientes();
      setDeudas(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (tenantId && !isLoading) {
      loadData();
    }
  }, [loadData, tenantId, isLoading]));

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
        .channel(`deudas_realtime_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venta', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Deudas Realtime] Cambio en ventas, sincronizando...');
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pago_venta' }, 
        () => {
          console.log('[Deudas Realtime] Cambio en pagos, sincronizando...');
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

  const handleAbonar = async () => {
    if (!montoAbono || parseFloat(montoAbono) <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a 0.');
      return;
    }

    if (parseFloat(montoAbono) > deudaSeleccionada.saldo) {
      Alert.alert('Monto excedido', 'El abono no puede ser mayor al saldo pendiente.');
      return;
    }

    setProcesando(true);
    try {
      await registrarAbono(deudaSeleccionada.ventaId, parseFloat(montoAbono), metodoPago);
      setModalAbono(false);
      setMontoAbono('');
      loadData();
      Alert.alert('Abono registrado', 'Se ha actualizado el saldo del cliente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el abono.');
    } finally {
      setProcesando(false);
    }
  };

  const verDetalle = async (deuda: any) => {
    setDeudaSeleccionada(deuda);
    const abonos = await obtenerHistorialAbonos(deuda.ventaId);
    setHistorialAbonos(abonos);
    setModalDetalle(true);
  };

  const recordarPorWhatsApp = (deuda: any) => {
    const telefono = deuda.clienteTelefono.replace(/[^0-9]/g, '');
    if (!telefono) {
      Alert.alert('Sin teléfono', 'Este cliente no tiene un teléfono registrado para WhatsApp.');
      return;
    }

    const mensaje = `Hola *${deuda.clienteNombre}*, te escribo de *${biz.nombre}* para saludarte y recordarte que tienes un saldo pendiente de *$${deuda.saldo.toFixed(2)}* de tu compra del ${deuda.fechaVenta}. ¡Que tengas un excelente día!`;
    const url = `whatsapp://send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const webUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
        Linking.openURL(webUrl);
      }
    });
  };

  const totalDeuda = deudas.reduce((acc, d) => acc + d.saldo, 0);

  return (
    <SafeAreaView style={cs.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      
      {/* Header */}
      <View style={[s.header, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity style={s.btnBack} onPress={goBack}>
          <Text style={{ fontSize: 20 }}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={[s.headerTitle, { color: c.text }]}>Cuentas por Cobrar</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
             <Animated.View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50', transform: [{ scale: pulseAnim }]}} />
             <Text style={{fontSize: 10, color: c.textTer, fontWeight: '700', letterSpacing: 0.5}}>EN VIVO</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[s.btnHelp, { backgroundColor: c.surfaceAlt }]} 
          onPress={() => setMostrarGuia(true)}
        >
          <Text style={{ fontSize: 18, color: c.info }}>ℹ️</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen Hero */}
      <View style={[s.resumenArea, { paddingHorizontal: contentPadding }]}>
        <LinearGradient colors={['#4facfe', '#00f2fe']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
          <View>
            <Text style={s.heroLabel}>POR COBRAR TOTAL</Text>
            <Text style={s.heroValor}>${totalDeuda.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={s.heroIcon}>
            <Text style={{ fontSize: 32 }}>🤝</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Lista de Deudas */}
      <FlatList
        data={deudas}
        keyExtractor={item => item.ventaId.toString()}
        key={isTablet ? 'grid' : 'list'}
        numColumns={isTablet ? 2 : 1}
        contentContainerStyle={{ paddingHorizontal: contentPadding, paddingBottom: 40, gap: isTablet ? 16 : 0 }}
        columnWrapperStyle={isTablet ? { gap: 16 } : undefined}
        ListEmptyComponent={
          <View style={cs.vacio}>
             <Text style={cs.vacioTitulo}>¡Sin deudas pendientes!</Text>
             <Text style={cs.vacioSub}>Todas tus ventas a crédito han sido pagadas por completo.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[s.itemCard, { backgroundColor: c.surface, borderColor: c.border, flex: isTablet ? 1 : 0, marginBottom: isTablet ? 0 : 12 }]}
            onPress={() => verDetalle(item)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[s.itemName, { color: c.text }]}>{item.clienteNombre}</Text>
              <Text style={{ fontSize: 11, color: c.textTer }}>Venta #{item.ventaId} • {item.fechaVenta}</Text>
              
              <View style={s.progressBarArea}>
                 <View style={[s.progressBarBg, { backgroundColor: c.surfaceAlt }]}>
                    <View style={[s.progressBarFill, { width: `${(item.pagado / item.totalVenta) * 100}%`, backgroundColor: c.accent }]} />
                 </View>
                 <Text style={{ fontSize: 10, color: c.textTer }}>{Math.round((item.pagado / item.totalVenta) * 100)}% pagado</Text>
              </View>
            </View>
            
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
               <Text style={[s.itemSaldo, { color: c.text }]}>${item.saldo.toFixed(2)}</Text>
               <Text style={{ fontSize: 10, color: c.textTer }}>SALDO</Text>
               
               <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={[s.btnAction, { backgroundColor: c.surfaceAlt }]} onPress={() => recordarPorWhatsApp(item)}>
                     <Text style={{fontSize: 14}}>💬</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btnAction, { backgroundColor: c.accent }]} onPress={() => { setDeudaSeleccionada(item); setModalAbono(true); }}>
                     <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 12}}>ABONAR</Text>
                  </TouchableOpacity>
               </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal Abonar */}
      <Modal visible={modalAbono} animationType="slide" transparent>
        <View style={cs.modalOverlay}>
          <View style={cs.modalCard}>
            <Text style={cs.modalTitulo}>Registrar Abono</Text>
            {deudaSeleccionada && (
              <Text style={cs.modalSub}>Saldo pendiente: ${deudaSeleccionada.saldo.toFixed(2)}</Text>
            )}

            <Text style={cs.modalLabel}>Monto del Abono</Text>
            <TextInput 
              style={cs.modalInput} 
              keyboardType="numeric" 
              placeholder="0.00" 
              placeholderTextColor={c.textTer}
              value={montoAbono}
              onChangeText={setMontoAbono}
              autoFocus
            />

            <Text style={cs.modalLabel}>Método de Pago</Text>
            <View style={s.metodoGrid}>
               {['efectivo', 'tarjeta', 'transferencia'].map(m => (
                  <TouchableOpacity 
                    key={m} 
                    style={[s.metodoChip, { backgroundColor: metodoPago === m ? c.accent : c.surfaceAlt }]} 
                    onPress={() => setMetodoPago(m)}
                  >
                    <Text style={[s.metodoText, { color: metodoPago === m ? '#fff' : c.textSec }]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
               ))}
            </View>

            <View style={[cs.modalBtns, { marginTop: 30, marginBottom: 20 }]}>
               <TouchableOpacity style={cs.modalBtnCancelar} onPress={() => setModalAbono(false)}>
                  <Text style={cs.modalBtnCancelarText}>Cancelar</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={[cs.modalBtnConfirmar, { opacity: procesando ? 0.6 : 1 }]} 
                 onPress={handleAbonar}
                 disabled={procesando}
               >
                  <Text style={cs.modalBtnConfirmarText}>{procesando ? 'Procesando...' : 'Confirmar Abono'}</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detalle Historial */}
      <Modal visible={modalDetalle} animationType="fade" transparent>
         <View style={[cs.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
            <View style={[cs.modalCard, { borderRadius: sizes.radiusXl, maxHeight: '80%' }]}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={cs.modalTitulo}>Detalle de Cuenta</Text>
                  <TouchableOpacity onPress={() => setModalDetalle(false)}>
                     <Text style={{ fontSize: 18, color: c.textTer }}>✕</Text>
                  </TouchableOpacity>
               </View>

               {deudaSeleccionada && (
                  <View style={s.detalleInfo}>
                     <View style={s.detalleRow}>
                        <Text style={{ color: c.textTer }}>Venta Total:</Text>
                        <Text style={{ color: c.text, fontWeight: '700' }}>${deudaSeleccionada.totalVenta.toFixed(2)}</Text>
                     </View>
                     <View style={s.detalleRow}>
                        <Text style={{ color: c.textTer }}>Total Pagado:</Text>
                        <Text style={{ color: c.accent, fontWeight: '700' }}>${deudaSeleccionada.pagado.toFixed(2)}</Text>
                     </View>
                     <View style={[s.detalleRow, { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, marginTop: 4 }]}>
                        <Text style={{ color: c.text, fontWeight: '800' }}>Saldo Pendiente:</Text>
                        <Text style={{ color: c.danger, fontWeight: '800', fontSize: 18 }}>${deudaSeleccionada.saldo.toFixed(2)}</Text>
                     </View>
                  </View>
               )}

               <Text style={[cs.modalLabel, { marginTop: 20 }]}>Historial de Abonos</Text>
               <ScrollView style={{ marginTop: 10 }}>
                  {historialAbonos.length === 0 ? (
                     <Text style={{ color: c.textTer, textAlign: 'center', marginVertical: 20, fontSize: 13 }}>Aún no hay abonos registrados para esta venta.</Text>
                  ) : (
                     historialAbonos.map(a => (
                        <View key={a.id} style={[s.abonoRow, { borderBottomColor: c.border }]}>
                           <View>
                              <Text style={{ color: c.text, fontWeight: '600' }}>+${a.monto.toFixed(2)}</Text>
                              <Text style={{ color: c.textTer, fontSize: 11 }}>{a.metodoPago} • {a.fecha}</Text>
                           </View>
                           <Text style={{ fontSize: 18 }}>✅</Text>
                        </View>
                     ))
                  )}
               </ScrollView>

               <TouchableOpacity style={[cs.modalBtnConfirmar, { marginTop: 20 }]} onPress={() => setModalDetalle(false)}>
                  <Text style={cs.modalBtnConfirmarText}>Cerrar</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

      {/* Guía de Ayuda Contextual */}
      <GuiaAyuda 
        visible={mostrarGuia}
        onClose={() => setMostrarGuia(false)}
        titulo="Cuentas por Cobrar"
        pasos={[
          'Aquí aparecen todas las ventas marcadas como "A Crédito".',
          'Toca una deuda para ver el historial de abonos y el saldo restante.',
          'Usa el botón "ABONAR" para registrar un pago parcial o total.',
          'Usa el ícono de WhatsApp (💬) para enviar un recordatorio de pago automático al cliente.'
        ]}
        tips={[
          'Mantener las deudas actualizadas mejora tu flujo de caja.',
          'Los recordatorios por WhatsApp son discretos y ayudan a cobrar más rápido.',
          'Una vez que el saldo llega a $0, la deuda desaparecerá de esta lista.'
        ]}
        color={c.purple}
      />

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  btnBack: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.1)' },
  btnHelp: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: sizes.fontXl, fontWeight: '700' },
  
  resumenArea: { marginBottom: 20 },
  heroCard: { padding: 24, borderRadius: sizes.radius2xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  heroValor: { fontSize: sizes.font4xl, fontWeight: '800', color: '#fff', marginTop: 4 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  
  itemCard: { flexDirection: 'row', padding: 16, borderRadius: sizes.radiusXl, borderWidth: 1 },
  itemName: { fontSize: sizes.fontBase, fontWeight: '700', marginBottom: 2 },
  itemSaldo: { fontSize: sizes.fontLg, fontWeight: '800' },
  
  progressBarArea: { marginTop: 12, gap: 4 },
  progressBarBg: { height: 6, borderRadius: 3, width: '80%', overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  
  btnAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  
  metodoGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metodoChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  metodoText: { fontSize: 11, fontWeight: '700' },
  
  detalleInfo: { padding: 16, backgroundColor: 'rgba(128,128,128,0.05)', borderRadius: 12, gap: 6 },
  detalleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  abonoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
});
