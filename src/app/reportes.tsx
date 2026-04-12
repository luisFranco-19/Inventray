import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
   obtenerVentasHoy, obtenerVentasPorPeriodo, obtenerProductosTop,
   obtenerVentasPorMetodo, obtenerMetricasFinancieras, obtenerHistoricoMetricas
} from '../../database/ventasDB';
import { obtenerVariantes } from '../../database/variantesDB';
import { obtenerTotalGastosEnPeriodo } from '../../database/gastosDB';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';
import { sizes } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GraficaLineal } from '../components/GraficaLineal';
import { GuiaAyuda } from '../components/GuiaAyuda';
import { useResponsive } from '../hooks/useResponsive';

export default function Reportes() {
   const { colors: c, isDark } = useTheme();
   const { tenantId, isLoading, realtimeEnabled } = useBusiness();
   const [ventasHoy, setVentasHoy] = useState<any[]>([]);
   const [ventasPeriodo, setVentasPeriodo] = useState({ hoy: { total: 0, tickets: 0 }, semana: { total: 0, tickets: 0 }, mes: { total: 0, tickets: 0 } });
   const [productosTop, setProductosTop] = useState<any[]>([]);
   const [ventasMetodo, setVentasMetodo] = useState<Record<string, number>>({});
   const router = useRouter();
   const goBack = () => {
      if (router.canGoBack()) {
         router.back();
      } else {
         router.replace('/');
      }
   };
   const [stockTotal, setStockTotal] = useState(0);
   const [valorInventario, setValorInventario] = useState(0);
   const [metricasFin, setMetricasFin] = useState({
      hoy: { ingresos: 0, costoVentas: 0, gananciaBruta: 0, perdidaMerma: 0, gastos: 0, gananciaNeta: 0 },
      semana: { ingresos: 0, costoVentas: 0, gananciaBruta: 0, perdidaMerma: 0, gastos: 0, gananciaNeta: 0 },
      mes: { ingresos: 0, costoVentas: 0, gananciaBruta: 0, perdidaMerma: 0, gastos: 0, gananciaNeta: 0 }
   });

   const [periodoGlobal, setPeriodoGlobal] = useState<'hoy' | 'semana' | 'mes'>('semana');
   const [modalAnalytics, setModalAnalytics] = useState(false);
   const [periodoGrafica, setPeriodoGrafica] = useState<'hoy' | 'semana' | 'mes'>('semana');
   const [datosGrafica, setDatosGrafica] = useState<any[]>([]);
   const [cargandoGrafica, setCargandoGrafica] = useState(false);
   const [mostrarGuia, setMostrarGuia] = useState(false);
   const [cargando, setCargando] = useState(true);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);
   const { isTablet, contentPadding } = useResponsive();

   const cargarGrafica = async (p: 'hoy' | 'semana' | 'mes') => {
      setPeriodoGrafica(p);
      setCargandoGrafica(true);
      try {
         setDatosGrafica(await obtenerHistoricoMetricas(p));
      } finally {
         setCargandoGrafica(false);
      }
   };

   const abrirAnalytics = async () => {
      setModalAnalytics(true);
      await cargarGrafica('semana');
   };

   const cargarReportes = useCallback(async () => {
      if (!tenantId || isLoading) return;
      setCargando(true);
      setErrorMsg(null);
      try {
         const [
            vHoy, vPHoy, vPSemana, vPMes, vTop, vMet, 
            mHoy, gHoy, mSemana, gSemana, mMes, gMes, 
            variantes
         ] = await Promise.all([
            obtenerVentasHoy(),
            obtenerVentasPorPeriodo('hoy'),
            obtenerVentasPorPeriodo('semana'),
            obtenerVentasPorPeriodo('mes'),
            obtenerProductosTop(),
            obtenerVentasPorMetodo(),
            obtenerMetricasFinancieras('hoy'),
            obtenerTotalGastosEnPeriodo('hoy'),
            obtenerMetricasFinancieras('semana'),
            obtenerTotalGastosEnPeriodo('semana'),
            obtenerMetricasFinancieras('mes'),
            obtenerTotalGastosEnPeriodo('mes'),
            obtenerVariantes()
         ]);

         setVentasHoy(vHoy);
         setVentasPeriodo({ hoy: vPHoy, semana: vPSemana, mes: vPMes });
         setProductosTop(vTop);
         setVentasMetodo(vMet);
         
         setMetricasFin({
            hoy: { ...mHoy, gastos: gHoy, gananciaNeta: (mHoy?.gananciaNeta || 0) - gHoy },
            semana: { ...mSemana, gastos: gSemana, gananciaNeta: (mSemana?.gananciaNeta || 0) - gSemana },
            mes: { ...mMes, gastos: gMes, gananciaNeta: (mMes?.gananciaNeta || 0) - gMes },
         });
         
         setStockTotal(variantes.reduce((s, v) => s + (v.stock || 0), 0));
         setValorInventario(variantes.reduce((s, v) => s + (v.stock || 0) * (v.costo || 0), 0));
      } catch (e: any) {
         console.error("Error cargando reportes:", e);
         setErrorMsg(e.message || "Error al conectar con la base de datos");
         Alert.alert('Error de conexión', e?.message || 'No se pudo cargar reportes. Revisa tu red.');
      } finally {
         setCargando(false);
      }
   }, [tenantId, isLoading, realtimeEnabled]);

   useFocusEffect(useCallback(() => {
      cargarReportes();
   }, [cargarReportes]));

   useEffect(() => {
      if (!tenantId) return;

      let channel: any = null;
      if (realtimeEnabled) {
         channel = supabase.channel(`reportes_realtime_${tenantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'variante', filter: `negocio_id=eq.${tenantId}` }, () => cargarReportes())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'venta', filter: `negocio_id=eq.${tenantId}` }, () => cargarReportes())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gasto', filter: `negocio_id=eq.${tenantId}` }, () => cargarReportes())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'movimiento_inventario', filter: `negocio_id=eq.${tenantId}` }, () => cargarReportes())
            .subscribe();
      }

      return () => {
         if (channel) supabase.removeChannel(channel);
      };
   }, [tenantId, cargarReportes]);

   return (
      <View style={[st.root, { backgroundColor: c.bg }]}>
      <SafeAreaView style={[st.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
         <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

         {/* HEADER */}
         <View style={[st.header, { paddingHorizontal: contentPadding }]}>
            <TouchableOpacity style={[st.btnAvatar, { backgroundColor: c.surfaceAlt }]} onPress={goBack}>
               <MaterialCommunityIcons name="arrow-left" size={24} color={c.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, paddingLeft: 12 }}>
               <Text style={[st.headerTitulo, { color: c.text }]}>Inteligencia de Negocio</Text>
               <Text style={[{ fontSize: sizes.fontXs, color: c.textTer }]}>Reportes financieros y rendimiento</Text>
            </View>
            <TouchableOpacity 
          style={[st.iconBtn, { backgroundColor: c.surfaceAlt, marginRight: 8 }]} 
          onPress={() => setMostrarGuia(true)}
        >
          <MaterialCommunityIcons name="information-outline" size={24} color={c.info} />
        </TouchableOpacity>
            <TouchableOpacity
               style={[st.btnAnalytics, { backgroundColor: c.accent }]}
               onPress={abrirAnalytics}
            >
               <MaterialCommunityIcons name="chart-line" size={24} color="#fff" />
            </TouchableOpacity>
         </View>

         <ScrollView style={st.contenido} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {cargando ? (
               <View style={{ height: 400, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={c.accent} />
                  <Text style={{ marginTop: 16, color: c.textTer, fontWeight: '600' }}>Sincronizando reportes...</Text>
               </View>
            ) : (
               <>
                  {/* FILTRO GLOBAL */}
                  <View style={[st.tabsContainer, { backgroundColor: c.surface, borderColor: c.border, marginBottom: 20, marginHorizontal: contentPadding }]}>
                     {(['hoy', 'semana', 'mes'] as const).map(p => (
                        <TouchableOpacity
                           key={p}
                           style={[st.tabBtn, periodoGlobal === p && { backgroundColor: c.accent }]}
                           onPress={() => setPeriodoGlobal(p)}
                        >
                           <Text style={[st.tabText, { color: periodoGlobal === p ? '#fff' : c.textSec }]}>
                              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta Semana' : 'Este Mes'}
                           </Text>
                        </TouchableOpacity>
                     ))}
                  </View>

                  {/* RESUMEN DE VENTAS */}
                  <View style={st.seccion}>
                     <Text style={[st.seccionTitulo, { color: c.textSec, paddingHorizontal: contentPadding }]}>INGRESOS TOTALES</Text>
                     <LinearGradient colors={['#8E2DE2', '#4A00E0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.tarjetaHero, { marginBottom: 0, marginHorizontal: contentPadding }]}>
                        <View>
                           <Text style={st.heroLabel}>{periodoGlobal.toUpperCase()}</Text>
                           <Text style={st.heroValor}>${(ventasPeriodo[periodoGlobal]?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                           <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginTop: 8 }}>
                              GANANCIA NETA: ${(metricasFin[periodoGlobal]?.gananciaNeta || 0).toLocaleString()}
                           </Text>
                        </View>
                        <View style={st.heroBadge}>
                           <Text style={st.heroBadgeText}>{ventasPeriodo[periodoGlobal].tickets} TICKETS</Text>
                        </View>
                     </LinearGradient>
                  </View>

                  {/* ANALISIS DE RENTABILIDAD */}
                  <View style={st.seccion}>
                     <Text style={[st.seccionTitulo, { color: c.textSec, paddingHorizontal: contentPadding }]}>ANÁLISIS DE RENTABILIDAD ({periodoGlobal.toUpperCase()})</Text>
                     <View style={[st.rentabilidadContainer, { backgroundColor: c.surface, marginHorizontal: contentPadding }]}>
                        <View style={st.rentRow}>
                           <Text style={[st.rentLabel, { color: c.textSec }]}>Ingresos Totales</Text>
                           <Text style={[st.rentValue, { color: c.text }]}>${metricasFin[periodoGlobal].ingresos.toLocaleString()}</Text>
                        </View>
                        <View style={st.rentRow}>
                           <Text style={[st.rentLabel, { color: c.textSec }]}>Costo de lo vendido</Text>
                           <Text style={[st.rentValue, { color: c.danger }]}>-${metricasFin[periodoGlobal].costoVentas.toLocaleString()}</Text>
                        </View>
                        <View style={st.rentRow}>
                           <Text style={[st.rentLabel, { color: c.textSec }]}>Pérdida por Merma</Text>
                           <Text style={[st.rentValue, { color: c.warning }]}>-${metricasFin[periodoGlobal].perdidaMerma.toLocaleString()}</Text>
                        </View>
                        <View style={st.rentRow}>
                           <Text style={[st.rentLabel, { color: c.textSec }]}>Gastos Operativos</Text>
                           <Text style={[st.rentValue, { color: c.danger }]}>-${metricasFin[periodoGlobal].gastos.toLocaleString()}</Text>
                        </View>
                        <View style={[st.rentDivider, { backgroundColor: c.surfaceAlt }]} />
                        <View style={st.rentRow}>
                           <Text style={[st.rentLabelFinal, { color: c.text }]}>UTILIDAD NETA</Text>
                           <Text style={[st.rentValueFinal, { color: '#34C759' }]}>${(metricasFin[periodoGlobal]?.gananciaNeta || 0).toLocaleString()}</Text>
                        </View>
                     </View>
                  </View>

                  {/* TOP PRODUCTOS Y METODOS */}
                  <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: contentPadding, marginBottom: 24 }}>
                     <View style={{ flex: 1 }}>
                        <Text style={[st.seccionTitulo, { color: c.textSec, paddingHorizontal: 0 }]}>TOP VENTAS</Text>
                        <View style={[st.panelCard, { backgroundColor: c.surface }]}>
                           {productosTop.length > 0 ? productosTop.slice(0, 3).map((p, i) => (
                              <View key={i} style={[st.itemModern, i !== 2 && { borderBottomWidth: 1, borderBottomColor: c.surfaceAlt }]}>
                                 <View style={{ flex: 1 }}>
                                    <Text style={[st.itemModNombre, { color: c.text }]} numberOfLines={1}>{p.nombre}</Text>
                                    <Text style={{ fontSize: 10, color: c.textTer }}>{p.vendidos} uds</Text>
                                 </View>
                                 <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[st.itemModMetrica, { color: '#34C759' }]}>+${p.ganancia.toFixed(0)}</Text>
                                 </View>
                              </View>
                           )) : <Text style={[st.textoVacio, { color: c.textSec }]}>No hay data.</Text>}
                        </View>
                     </View>

                      <View style={{ flex: 1 }}>
                         <Text style={[st.seccionTitulo, { color: c.textSec, paddingHorizontal: 0 }]}>COBROS HOY</Text>
                         <View style={[st.panelCard, { backgroundColor: c.surface }]}>
                            {Object.keys(ventasMetodo).length > 0 ? Object.entries(ventasMetodo).map(([m, v], i) => (
                               <View key={m} style={[st.itemModern, i !== Object.entries(ventasMetodo).length - 1 && { borderBottomWidth: 1, borderBottomColor: c.surfaceAlt }]}>
                                  <Text style={[st.itemModNombre, { color: c.text }]} numberOfLines={1}>{m}</Text>
                                  <Text style={[st.itemModMetrica, { color: c.info }]}>{((v / Math.max(ventasPeriodo.hoy.total, 1)) * 100).toFixed(0)}%</Text>
                               </View>
                            )) : <Text style={[st.textoVacio, { color: c.textSec }]}>No hay cobros registrados hoy.</Text>}
                         </View>
                      </View>
                  </View>

                  {/* INVENTARIO */}
                  <View style={st.seccion}>
                     <Text style={[st.seccionTitulo, { color: c.textSec, paddingHorizontal: contentPadding }]}>ESTADO DEL INVENTARIO</Text>
                     <View style={[st.inventarioCard, { backgroundColor: c.surface, marginHorizontal: contentPadding }]}>
                        <View style={st.invBlock}>
                           <Text style={[st.invLabel, { color: c.textTer }]}>Unidades Totales</Text>
                           <Text style={[st.invValNum, { color: c.text }]}>{stockTotal.toLocaleString()}</Text>
                        </View>
                        <View style={[st.invDivider, { backgroundColor: c.surfaceAlt }]} />
                        <View style={st.invBlock}>
                           <Text style={[st.invLabel, { color: c.textTer }]}>Valor (P. Venta)</Text>
                           <Text style={[st.invValCash, { color: c.warning }]}>${valorInventario.toLocaleString()}</Text>
                        </View>
                     </View>
                  </View>

                  {/* TICKETS RECIENTES */}
                  <View style={st.seccion}>
                     <Text style={[st.seccionTitulo, { color: c.textSec, paddingHorizontal: contentPadding }]}>ÚLTIMOS MOVIMIENTOS HOY</Text>
                     <View style={[st.listaCard, { backgroundColor: c.surface, marginHorizontal: contentPadding }]}>
                        {ventasHoy.length > 0 ? ventasHoy.slice(0, 5).map((v, i) => (
                           <View key={v.id} style={[st.ticketRow, i !== Math.min(ventasHoy.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: c.surfaceAlt }]}>
                              <View style={{ flex: 1 }}>
                                 <Text style={[st.ticketCliente, { color: c.text }]} numberOfLines={1}>{v.clienteNombre}</Text>
                                 <Text style={[st.ticketMeta, { color: c.textTer }]}>{v.hora} • {v.totalItems} art.</Text>
                              </View>
                              <Text style={[st.ticketValor, { color: c.text }]}>+${v.total.toLocaleString()}</Text>
                           </View>
                        )) : (
                           <View style={{ padding: 20, alignItems: 'center' }}>
                              <Text style={[st.textoVacio, { color: c.textSec }]}>No hay transacciones hoy.</Text>
                           </View>
                        )}
                     </View>
                  </View>
               </>
            )}
         </ScrollView>

         {/* MODAL ANALYTICS */}
         <Modal visible={modalAnalytics} animationType="slide" transparent>
            <View style={[st.modalOverlay, { backgroundColor: c.bg }]}>
               <SafeAreaView style={{ flex: 1 }}>
                  <View style={st.modalHeader}>
                     <TouchableOpacity style={[st.btnCerrarDesc, { backgroundColor: c.surfaceAlt }]} onPress={() => setModalAnalytics(false)}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={c.text} />
                     </TouchableOpacity>
                     <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[st.modalTitle, { color: c.text }]}>Análisis Visual</Text>
                     </View>
                     <View style={{ width: 44 }} />
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                     <View style={[st.tabsContainer, { backgroundColor: c.surface, borderColor: c.border, marginHorizontal: contentPadding }]}>
                        {(['hoy', 'semana', 'mes'] as const).map(p => (
                           <TouchableOpacity
                              key={p}
                              style={[st.tabBtn, periodoGrafica === p && { backgroundColor: c.accent }]}
                              onPress={() => cargarGrafica(p)}
                           >
                              <Text style={[st.tabText, { color: periodoGrafica === p ? '#fff' : c.textSec }]}>{p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}</Text>
                           </TouchableOpacity>
                        ))}
                     </View>

                     <View style={[st.graficaCard, { backgroundColor: c.surface, marginHorizontal: contentPadding }]}>
                        {cargandoGrafica ? (
                           <View style={{ height: 260, justifyContent: 'center', alignItems: 'center' }}>
                              <ActivityIndicator color={c.accent} />
                           </View>
                        ) : (
                           <GraficaLineal data={datosGrafica} colors={c} isDark={isDark} />
                        )}
                     </View>

                     <View style={[st.metricaResumenGrid, { paddingHorizontal: contentPadding }]}>
                        <View style={[st.metResCard, { backgroundColor: c.surface }]}>
                           <Text style={[st.metResLabel, { color: c.textTer }]}>Ingresos Periodo</Text>
                           <Text style={[st.metResVal, { color: c.text }]}>${datosGrafica.reduce((s, d) => s + d.ingresos, 0).toLocaleString()}</Text>
                        </View>
                        <View style={[st.metResCard, { backgroundColor: c.surface }]}>
                           <Text style={[st.metResLabel, { color: c.textTer }]}>Utilidad Neta</Text>
                           <Text style={[st.metResVal, { color: '#34C759' }]}>${datosGrafica.reduce((s, d) => s + d.utilidad, 0).toLocaleString()}</Text>
                        </View>
                     </View>
                  </ScrollView>
               </SafeAreaView>
            </View>
         </Modal>

         <GuiaAyuda 
            visible={mostrarGuia}
            onClose={() => setMostrarGuia(false)}
            titulo="Reportes e Inteligencia"
            pasos={['Monitorea ingresos y gastos en tiempo real.', 'Usa Promise.all para carga asíncrona optimizada.', 'Visualiza mermas y costos operativos.']}
            tips={['Identifica productos de baja rotación.', 'La utilidad neta es tu ganancia final.']}
            color={c.info}
         />
      </SafeAreaView>
      </View>
   );
}

const st = StyleSheet.create({
   root: { flex: 1 },
   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 16 },
   btnAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
   btnHelp: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
   headerTitulo: { fontSize: sizes.fontLg, fontWeight: '800' },
   contenido: { flex: 1 },
   seccion: { marginBottom: 24 },
   seccionTitulo: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
   tarjetaHero: { padding: 24, borderRadius: sizes.radius2xl, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', elevation: 8, shadowColor: '#4A00E0', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
   heroLabel: { fontSize: sizes.fontXs, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 },
   heroValor: { fontSize: sizes.font4xl, color: '#fff', fontWeight: '800', marginTop: 4, letterSpacing: -1 },
   heroBadge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: sizes.radiusLg },
   heroBadgeText: { color: '#fff', fontSize: sizes.fontXs, fontWeight: '800' },
   panelCard: { borderRadius: sizes.radiusXl, paddingHorizontal: 16, paddingVertical: 10, minHeight: 120 },
   itemModern: { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
   itemModNombre: { flex: 1, fontSize: sizes.fontSm, fontWeight: '600', textTransform: 'capitalize' },
   itemModMetrica: { fontSize: sizes.fontSm, fontWeight: '800' },
   textoVacio: { fontSize: sizes.fontXs, fontStyle: 'italic', paddingVertical: 10 },
   inventarioCard: { borderRadius: sizes.radiusXl, flexDirection: 'row' },
   invBlock: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
   invDivider: { width: 1, marginVertical: 16 },
   invLabel: { fontSize: sizes.fontXs, fontWeight: '600', textAlign: 'center', marginBottom: 6 },
   invValNum: { fontSize: sizes.font2xl, fontWeight: '800' },
   invValCash: { fontSize: sizes.fontXl, fontWeight: '800' },
   rentabilidadContainer: { borderRadius: sizes.radiusXl, padding: 20 },
   rentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
   rentLabel: { fontSize: sizes.fontSm, fontWeight: '500' },
   rentValue: { fontSize: sizes.fontSm, fontWeight: '700' },
   rentDivider: { height: 1, marginVertical: 12 },
   rentLabelFinal: { fontSize: sizes.fontBase, fontWeight: '800' },
   rentValueFinal: { fontSize: sizes.fontLg, fontWeight: '900' },
   listaCard: { borderRadius: sizes.radiusXl, overflow: 'hidden' },
   ticketRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
   ticketCliente: { fontSize: sizes.fontBase, fontWeight: '700', marginBottom: 4 },
   ticketMeta: { fontSize: sizes.fontXs },
   ticketValor: { fontSize: sizes.fontLg, fontWeight: '800' },
   btnAnalytics: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
   modalOverlay: { flex: 1 },
   modalHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
   btnCerrarDesc: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
   modalTitle: { fontSize: sizes.fontLg, fontWeight: '800' },
   tabsContainer: { flexDirection: 'row', padding: 4, borderRadius: sizes.radiusFull, borderWidth: 1 },
   tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: sizes.radiusFull },
   tabText: { fontSize: 13, fontWeight: '700' },
   graficaCard: { marginTop: 24, borderRadius: sizes.radius2xl, padding: 20 },
   metricaResumenGrid: { flexDirection: 'row', gap: 12, marginTop: 20 },
   metResCard: { flex: 1, padding: 20, borderRadius: sizes.radiusXl },
   metResLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
   metResVal: { fontSize: sizes.fontXl, fontWeight: '800' },
   finalUtilidadCard: { marginTop: 20, padding: 24, borderRadius: sizes.radius2xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
   finalUtilLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '800', letterSpacing: 1 },
   finalUtilValue: { fontSize: 32, color: '#fff', fontWeight: '900' },
   finalUtilIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
   infoCard: { marginTop: 20, padding: 16, borderRadius: sizes.radiusLg, borderLeftWidth: 4, borderLeftColor: '#8E2DE2' },
});
