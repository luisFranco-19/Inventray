import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  obtenerClientes, crearCliente, actualizarCliente,
  eliminarCliente as eliminarClienteDB, obtenerHistorialCliente,
  type Cliente, type PeriodoClientes,
} from '../../database/clientesDB';
import { iniciales, colorAvatar, FORM_VACIO } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';
import { sizes } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '../hooks/useResponsive';

const PERIODOS: { key: PeriodoClientes; label: string }[] = [
  { key: 'todos',  label: 'Todos' },
  { key: 'hoy',   label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',   label: 'Mes' },
];

export default function Clientes() {
  const { colors: c, isDark } = useTheme();
  const { tenantId, isLoading, realtimeEnabled } = useBusiness();
  const [busqueda, setBusqueda]           = useState('');
  const [periodo, setPeriodo]             = useState<PeriodoClientes>('todos');
  const [clientes, setClientes]           = useState<Cliente[]>([]);
  const [modalForm, setModalForm]         = useState(false);
  const [modalDetalle, setModalDetalle]   = useState(false);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [editando, setEditando]           = useState(false);
  const [form, setForm]                   = useState<typeof FORM_VACIO>(FORM_VACIO);
  const router = useRouter();
  const [historial, setHistorial] = useState<{ fecha: string; total: number; items: number; detalles: string }[]>([]);
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

  const cargarClientes = async () => {
    try { setClientes(await obtenerClientes(periodo)); }
    catch { Alert.alert('Error', 'No se pudo cargar los clientes.'); }
  };

  // Carga inicial y cuando cambia el período
  useFocusEffect(useCallback(() => {
    if (tenantId && !isLoading) cargarClientes();
  }, [tenantId, isLoading, periodo, cargarClientes]));

  // Sincronización Doble (Realtime + Polling)
  useEffect(() => {
    if (!tenantId) return;

    // Polling condicional: menos frecuente si solo hay 1 dispositivo
    const pollingInterval = realtimeEnabled ? 3000 : 15000;
    const interval = setInterval(() => {
      cargarClientes();
    }, pollingInterval);

    // 2. Realtime Channel
    let channel: any = null;
    if (realtimeEnabled) {
      channel = supabase
        .channel(`clientes_realtime_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cliente', filter: `negocio_id=eq.${tenantId}` },
        () => {
          console.log('[Clientes Realtime] Cambio detectado, sincronizando...');
          cargarClientes();
        }
      )
      .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, cargarClientes, realtimeEnabled]);

  const clientesFiltrados = clientes.filter(cl =>
    cl.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    cl.telefono?.includes(busqueda)
  );

  const verDetalle = async (cliente: Cliente) => {
    setClienteActivo(cliente);
    try { setHistorial(await obtenerHistorialCliente(cliente.id)); }
    catch { setHistorial([]); }
    setModalDetalle(true);
  };

  const abrirNuevo = () => { 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setForm(FORM_VACIO); setEditando(false); setModalForm(true); 
  };

  const abrirEditar = (cliente: Cliente) => {
    setForm({ nombre: cliente.nombre, telefono: cliente.telefono });
    setClienteActivo(cliente); setEditando(true); setModalDetalle(false); setModalForm(true);
  };

  const guardarCliente = async () => {
    if (!form.nombre.trim()) { Alert.alert('Campo requerido', 'El nombre es obligatorio.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (editando && clienteActivo) {
        await actualizarCliente(clienteActivo.id, form.nombre.trim(), form.telefono.trim());
        Alert.alert('Guardado', 'Cliente actualizado.');
      } else {
        await crearCliente(form.nombre.trim(), form.telefono.trim());
        Alert.alert('Guardado', 'Cliente registrado.');
      }
      setModalForm(false); await cargarClientes();
    } catch (e: any) { Alert.alert('Error', e.message ?? 'No se pudo guardar.'); }
  };

  const eliminarCliente = (cliente: Cliente) => {
    setModalDetalle(false); 
    
    const ejecutarEliminar = async () => {
      try { 
        await eliminarClienteDB(cliente.id); 
        await cargarClientes(); 
      }
      catch (e: any) { 
        Alert.alert('Error', e.message ?? 'No se pudo eliminar.'); 
        setModalDetalle(true);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`¿Deseas eliminar a ${cliente.nombre}?`)) {
        ejecutarEliminar();
      } else {
        setModalDetalle(true);
      }
      return;
    }

    setTimeout(() => {
      Alert.alert('Eliminar cliente', `¿Deseas eliminar a ${cliente.nombre}?`, [
        { text: 'Cancelar', style: 'cancel', onPress: () => setModalDetalle(true) },
        { text: 'Eliminar', style: 'destructive', onPress: ejecutarEliminar },
      ]);
    }, 150);
  };

  const labelPeriodo = PERIODOS.find(p => p.key === periodo)?.label ?? 'Todos';

  return (
    <SafeAreaView style={[st.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      
      {/* HEADER */}
      <View style={[st.header, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity style={[st.btnAvatar, { backgroundColor: c.surfaceAlt }]} onPress={goBack}>
           <Text style={{fontSize: 20}}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={[st.headerTitulo, { color: c.text }]}>Directorio</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
             <Animated.View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50', transform: [{ scale: pulseAnim }]}} />
             <Text style={{fontSize: 10, color: c.textTer, fontWeight: '700', letterSpacing: 0.5}}>EN VIVO</Text>
          </View>
        </View>
        <TouchableOpacity style={[st.iconBtn, { backgroundColor: c.accent }]} onPress={abrirNuevo}>
           <Text style={{fontSize: 20, color: '#fff', fontWeight: 'bold'}}>+</Text>
        </TouchableOpacity>
      </View>

      {/* BUSCADOR */}
      <View style={[st.searchContainer, { paddingHorizontal: contentPadding }]}>
        <TextInput 
           style={[st.buscador, { backgroundColor: c.surface, borderColor: isDark ? c.surfaceAlt : c.border, color: c.text }]} 
           placeholder="Buscar por nombre o celular..." 
           placeholderTextColor={c.textSec} 
           value={busqueda} 
           onChangeText={setBusqueda} 
        />
      </View>

      {/* TABS DE PERIODO */}
      <View style={[st.periodTabsContainer, { backgroundColor: c.surface, marginHorizontal: contentPadding }]}>
        {PERIODOS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[st.periodTab, periodo === p.key && { backgroundColor: c.surfaceAlt, borderRadius: sizes.radiusLg }]}
            onPress={() => setPeriodo(p.key)}
          >
            <Text style={[st.periodTabText, { color: c.textSec }, periodo === p.key && { color: c.text, fontWeight: '700' }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LISTA */}
      <FlatList
        data={clientesFiltrados}
        keyExtractor={item => item.id.toString()}
        key={isTablet ? 'grid' : 'list'}
        numColumns={isTablet ? 2 : 1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: contentPadding, paddingTop: 12, gap: 16 }}
        columnWrapperStyle={isTablet ? { gap: 16 } : undefined}
        renderItem={({ item }) => (
          <TouchableOpacity style={[st.cardModern, { backgroundColor: c.surface, flex: isTablet ? 1 : 0 }]} onPress={() => verDetalle(item)} activeOpacity={0.8}>
            <View style={[st.avatarModern, { backgroundColor: colorAvatar(item.id) + '20' }]}>
              <Text style={[st.avatarModernText, { color: colorAvatar(item.id) }]}>{iniciales(item.nombre)}</Text>
            </View>
            <View style={st.cardInfo}>
              <Text style={[st.cardNombre, { color: c.text }]} numberOfLines={1}>{item.nombre}</Text>
              <Text style={[st.cardMeta, { color: c.textSec }]} numberOfLines={1}>{item.telefono || 'Sin información de contacto'}</Text>
              <Text style={[st.cardUltima, { color: c.textTer }]}>Última visita: {item.ultimaCompra === '—' ? 'Nunca' : item.ultimaCompra}</Text>
            </View>
            <View style={st.cardTotales}>
              {Number(item.saldoPendiente) > 0 && (
                <View style={[st.chipDeuda, { backgroundColor: c.danger + '15' }]}>
                   <Text style={[st.deudaTexto, { color: c.danger }]}>DEBE: ${Number(item.saldoPendiente).toFixed(0)}</Text>
                </View>
              )}
              <Text style={[st.cardTotalValor, { color: c.text }]}>${Number(item.totalCompras).toFixed(0)}</Text>
              <View style={[st.chipCompras, { backgroundColor: c.surfaceAlt }]}>
                 <Text style={[st.cardTotalLabel, { color: c.textSec }]}>{item.numCompras} ventas</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={st.vacio}>
            <Text style={{fontSize: 40, marginBottom: 12}}>
              {periodo === 'hoy' ? '🌅' : periodo === 'semana' ? '📅' : periodo === 'mes' ? '🗓️' : '👥'}
            </Text>
            <Text style={[st.vacioTexto, { color: c.textTer }]}>
              {periodo === 'todos' ? 'Aún no hay clientes' : `Sin compras este ${labelPeriodo.toLowerCase()}`}
            </Text>
            <Text style={[st.vacioSub, { color: c.textTer }]}>
              {periodo === 'todos' 
                ? 'Comienza añadiendo un contacto al directorio'
                : 'Cambia el filtro para ver todos los clientes registrados'
              }
            </Text>
          </View>
        }
      />

      {/* Modal detalle */}
      <Modal visible={modalDetalle} animationType="fade" transparent onRequestClose={() => setModalDetalle(false)}>
        <View style={[st.modalOverlay, isTablet && { justifyContent: 'center', padding: 40 }]}>
          <View style={[st.modalCard, { backgroundColor: c.surface }, isTablet && { borderRadius: sizes.radius2xl, maxWidth: 500, alignSelf: 'center' }]}>
            {clienteActivo && (
              <ScrollView showsVerticalScrollIndicator={false}>
                
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10}}>
                   <TouchableOpacity onPress={() => setModalDetalle(false)} style={[st.modalBtnActionRound, { backgroundColor: c.surfaceAlt, width: 44, height: 44, borderRadius: 22 }]}>
                     <Text style={{fontSize: 24, color: c.text, lineHeight: 28}}>←</Text>
                   </TouchableOpacity>
                   <View style={{flexDirection: 'row', gap: 10}}>
                      <TouchableOpacity style={[st.modalBtnActionRound, { backgroundColor: c.info + '15', width: 44, height: 44, borderRadius: 22 }]} onPress={() => abrirEditar(clienteActivo)}><Text style={{fontSize: 16}}>✏️</Text></TouchableOpacity>
                      <TouchableOpacity style={[st.modalBtnActionRound, { backgroundColor: c.danger + '15', width: 44, height: 44, borderRadius: 22 }]} onPress={() => eliminarCliente(clienteActivo)}><Text style={{fontSize: 16}}>🗑️</Text></TouchableOpacity>
                   </View>
                </View>

                <View style={st.perfilHeader}>
                  <View style={[st.avatarSolido, { backgroundColor: colorAvatar(clienteActivo.id) }]}>
                     <Text style={st.avatarGrandeText}>{iniciales(clienteActivo.nombre)}</Text>
                  </View>
                  <Text style={[st.perfilNombre, { color: c.text }]} numberOfLines={2}>{clienteActivo.nombre}</Text>
                  {clienteActivo.telefono && <View style={[st.perfilChip, { backgroundColor: c.surfaceAlt }]}><Text style={[{ color: c.textSec, fontSize: sizes.fontSm }]}>📞 {clienteActivo.telefono}</Text></View>}
                </View>

                <View style={{flexDirection: 'row', gap: 10, marginBottom: 30}}>
                   <View style={[st.statBoxSmall, { backgroundColor: c.surfaceAlt, flex: 1, alignItems: 'center' }]}>
                      <Text style={[st.statLabel, { color: c.textTer }]}>Frecuencia</Text>
                      <Text style={[st.statValorSmall, { color: c.text }]}>{clienteActivo.numCompras} tickets</Text>
                   </View>
                   <View style={[st.statBoxSmall, { backgroundColor: c.surfaceAlt, flex: 1, alignItems: 'center' }]}>
                      <Text style={[st.statLabel, { color: c.textTer }]}>Ticket Medio</Text>
                      <Text style={[st.statValorSmall, { color: c.text }]}>${clienteActivo.numCompras > 0 ? (Number(clienteActivo.totalCompras) / clienteActivo.numCompras).toFixed(0) : '0'}</Text>
                   </View>
                </View>

                <TouchableOpacity style={[st.btnComprarGo, { backgroundColor: c.accent }]} onPress={() => { setModalDetalle(false); router.push({ pathname: '/pos', params: { clienteId: clienteActivo.id } }); }}>
                  <Text style={st.btnComprarGoTxt}>Realizar nueva venta</Text>
                </TouchableOpacity>



              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal formulario */}
      <Modal visible={modalForm} animationType="slide" transparent onRequestClose={() => setModalForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[st.modalOverlay, isTablet && { justifyContent: 'center', padding: 40 }]}>
            <View style={[st.modalCard, { backgroundColor: c.surface }, isTablet && { borderRadius: sizes.radius2xl, maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20}}>
                   <Text style={[st.modalTituloForm, { color: c.text }]}>{editando ? 'Ajustes del Perfil' : 'Alta de Cliente'}</Text>
                   <TouchableOpacity onPress={() => setModalForm(false)}><Text style={{fontSize: 24, color: c.textTer}}>✕</Text></TouchableOpacity>
                </View>

                <Text style={[st.formLabel, { color: c.textSec }]}>Nombre Legal / Razón Social</Text>
                <TextInput style={[st.formInput, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="Juan Pérez" placeholderTextColor={c.textTer} value={form.nombre} onChangeText={v => setForm((prev: typeof FORM_VACIO) => ({ ...prev, nombre: v }))} />
                
                <Text style={[st.formLabel, { color: c.textSec }]}>Móvil (Opcional)</Text>
                <TextInput style={[st.formInput, { backgroundColor: c.surfaceAlt, color: c.text }]} placeholder="Dejar en blanco si no se provee" placeholderTextColor={c.textTer} keyboardType="phone-pad" value={form.telefono} onChangeText={v => setForm((prev: typeof FORM_VACIO) => ({ ...prev, telefono: v }))} />
                
                <TouchableOpacity style={[st.btnConfirmarGo, { backgroundColor: c.accent, marginTop: 32 }]} onPress={guardarCliente}>
                   <Text style={[st.btnConfirmarGoTxt]}>{editando ? 'Actualizar Ficha' : 'Dar de Alta'}</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 16 },
  btnAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { fontSize: sizes.fontXl, fontWeight: '700' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  
  searchContainer: { paddingBottom: 12 },
  buscador: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: sizes.radiusLg, borderWidth: 1, fontSize: sizes.fontBase },
  
  periodTabsContainer: { flexDirection: 'row', padding: 4, borderRadius: sizes.radiusLg, marginBottom: 4 },
  periodTab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  periodTabText: { fontSize: sizes.fontSm, fontWeight: '600' },

  cardModern: { flexDirection: 'row', alignItems: 'center', borderRadius: sizes.radiusXl, padding: 20 },
  avatarModern: { width: 56, height: 56, borderRadius: sizes.radiusLg, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarModernText: { fontSize: sizes.fontXl, fontWeight: '800' },
  cardInfo: { flex: 1 },
  cardNombre: { fontSize: sizes.fontLg, fontWeight: '700', marginBottom: 4 },
  cardMeta: { fontSize: sizes.fontXs },
  cardUltima: { fontSize: sizes.fontXs, marginTop: 4 },
  
  cardTotales: { alignItems: 'flex-end', justifyContent: 'center' },
  cardTotalValor: { fontSize: sizes.fontXl, fontWeight: '800', marginBottom: 4 },
  chipCompras: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: sizes.radiusSm },
  cardTotalLabel: { fontSize: 10, fontWeight: '700' },

  chipDeuda: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  deudaTexto: { fontSize: 9, fontWeight: '900' },

  vacio: { paddingTop: 60, alignItems: 'center' },
  vacioTexto: { fontSize: sizes.fontLg, fontWeight: '700', marginBottom: 8 },
  vacioSub: { fontSize: sizes.fontSm, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: sizes.radius2xl, borderTopRightRadius: sizes.radius2xl, padding: 24, maxHeight: '92%' },
  
  perfilHeader: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  avatarSolido: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarGrandeText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  perfilNombre: { fontSize: sizes.font2xl, fontWeight: '800', textAlign: 'center' },
  perfilChip: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 6, borderRadius: sizes.radiusFull },

  statsGridModern: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  statBoxModern: { flex: 1, borderRadius: sizes.radiusXl, padding: 20, justifyContent: 'center' },
  statValorModern: { fontSize: sizes.font3xl, fontWeight: '800', marginTop: 8 },
  statBoxSmall: { borderRadius: sizes.radiusLg, padding: 14, flex: 1, justifyContent: 'center' },
  statValorSmall: { fontSize: sizes.fontLg, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: sizes.fontXs, fontWeight: '600', letterSpacing: 0.5 },

  historialTitulo: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  timelineCard: { borderRadius: sizes.radiusXl, padding: 16, marginBottom: 24 },
  sinHistorial: { fontSize: sizes.fontSm, textAlign: 'center', paddingVertical: 16 },
  historialRowModern: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  historialDotModern: { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
  historialInfo: { flex: 1 },
  historialFechaModern: { fontSize: sizes.fontSm, fontWeight: '700' },
  historialItems: { fontSize: sizes.fontXs, marginTop: 2 },
  historialDetalles: { fontSize: 11, marginTop: 4, lineHeight: 14, paddingRight: 8 },
  historialTotalModern: { fontSize: sizes.fontLg, fontWeight: '800' },

  btnComprarGo: { paddingVertical: 18, borderRadius: sizes.radiusXl, alignItems: 'center', marginBottom: 20 },
  btnComprarGoTxt: { fontSize: sizes.fontLg, fontWeight: '800', color: '#fff' },

  modalAccionesRow: { flexDirection: 'row', gap: 10 },
  modalBtnActionRound: { width: 56, height: 56, borderRadius: sizes.radiusLg, alignItems: 'center', justifyContent: 'center' },

  modalTituloForm: { fontSize: sizes.font2xl, fontWeight: '800' },
  formLabel: { fontSize: sizes.fontSm, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  formInput: { borderRadius: sizes.radiusLg, paddingHorizontal: 16, paddingVertical: 16, fontSize: sizes.fontBase, fontWeight: '500' },

  btnConfirmarGo: { paddingVertical: 18, borderRadius: sizes.radiusXl, alignItems: 'center' },
  btnConfirmarGoTxt: { color: '#fff', fontSize: sizes.fontLg, fontWeight: '800' },
});
