import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Dimensions, StatusBar, Modal, Animated as RNAnimated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
// Eliminamos Reanimated para usar Animated estándar
import {
  obtenerVentasHoy, obtenerVentasPorPeriodo,
  obtenerProductosTop, obtenerVentasPorMetodo,
  type VentaResumen, type ProductoTop,
} from '../../database/ventasDB';
import { obtenerVariantes } from '../../database/variantesDB';
import { useTheme } from '../context/ThemeContext';
import { useBusiness, METODOS_PAGO_OPCIONES } from '../context/BusinessContext';
import { sizes } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

function BarraProgreso({ valor, maximo, color, isDark }: { valor: number; maximo: number; color: string, isDark: boolean }) {
  const pct = Math.min(maximo > 0 ? (valor / maximo) * 100 : 0, 100);
  return (
    <View style={{ height: 6, backgroundColor: isDark ? '#333333' : '#E2DFDA', borderRadius: 6, overflow: 'hidden', marginTop: 8 }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 6 }} />
    </View>
  );
}

function BentoCard({ children, delay = 0, style }: { children: React.ReactNode, delay?: number, style?: any }) {
  const opacity = React.useRef(new RNAnimated.Value(0)).current;
  const translateY = React.useRef(new RNAnimated.Value(15)).current;

  React.useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      RNAnimated.spring(translateY, { toValue: 0, tension: 40, friction: 8, delay, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <RNAnimated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </RNAnimated.View>
  );
}

export default function Dashboard() {
  const { colors: c, isDark } = useTheme();
  const { config: biz, tenantId, isLoading, realtimeEnabled } = useBusiness();
  const [periodo, setPeriodo]           = useState<'hoy' | 'semana' | 'mes'>('hoy');
  const [ventasHoy, setVentasHoy]       = useState<VentaResumen[]>([]);
  const [productosTop, setProductosTop] = useState<ProductoTop[]>([]);
  const [metricas, setMetricas]         = useState({ total: 0, tickets: 0 });
  const [porMetodo, setPorMetodo]       = useState<Record<string, number>>({ efectivo: 0, tarjeta: 0, transferencia: 0 });
  const [totalStock, setTotalStock]     = useState(0);
  
  // Sistema de Notificaciones Interactivos
  const [todasAlertas, setTodasAlertas]           = useState<{id: string, tipo: string, mensaje: string, color: string, ruta: string}[]>([]);
  const [alertasIgnoradas, setAlertasIgnoradas]   = useState<string[]>([]); // IDS Ocultos en esta sesion
  const { isTablet, contentPadding, width: screenWidth } = useResponsive();

  // Derivamos solo lo que se debe mostrar en pantalla basado en el filtro
  const alertas = todasAlertas.filter(a => !alertasIgnoradas.includes(a.id));

  useFocusEffect(
    useCallback(() => {
      if (!tenantId || isLoading) return;

      const load = async () => {
        try {
          const vHoy = await obtenerVentasHoy();
          const pTop = await obtenerProductosTop();
          const methods = await obtenerVentasPorMetodo();
          const mPeriodo = await obtenerVentasPorPeriodo(periodo); // Extraemos dinámicamente según el Tab
          const vars = await obtenerVariantes();

          setVentasHoy(vHoy);
          setProductosTop(pTop);
          setPorMetodo(methods);
          setMetricas(mPeriodo);
          setTotalStock(vars.reduce((s, v) => s + (v.stock || 0), 0));

          // Generación automática de alertas interactivas
          const agotados = vars.filter(x => x.stock === 0);
          const bajos = vars.filter(x => x.stock > 0 && x.stock <= x.stockMinimo);
          const nuevasAlertas = [];

          let umbralBajo = 500;
          let pLabel = 'hoy';
          if (periodo === 'semana') { umbralBajo = 3000; pLabel = 'en la semana'; }
          if (periodo === 'mes') { umbralBajo = 12000; pLabel = 'en el mes'; }

          if (agotados.length > 0) {
            nuevasAlertas.push({ id: 'agotados', tipo: 'Inventario', mensaje: `Hay ${agotados.length} productos agotados. Resurtir urgente.`, color: c.danger, ruta: '/stock' });
          }
          if (bajos.length > 0) {
            nuevasAlertas.push({ id: 'bajos', tipo: 'Sugerencia', mensaje: `Existen ${bajos.length} variantes con stock mínimo.`, color: c.warning, ruta: '/stock' });
          }
          if (mPeriodo.total < umbralBajo) {
            nuevasAlertas.push({ id: `ventas_${periodo}`, tipo: 'Desempeño', mensaje: `Balance bajo ($${mPeriodo.total.toFixed(2)}) detectado ${pLabel}. Sugerimos incentivar ventas.`, color: c.info, ruta: '/pos' });
          }
          
          setTodasAlertas(nuevasAlertas);

        } catch {}
      };
      load();
    }, [periodo])
  );

  const cambiarPeriodo = async (p: 'hoy' | 'semana' | 'mes') => {
    setPeriodo(p);
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

  React.useEffect(() => {
    if (!tenantId || isLoading) return;

    const loadSync = async () => {
      try {
        const vHoy = await obtenerVentasHoy();
        const pTop = await obtenerProductosTop();
        const methods = await obtenerVentasPorMetodo();
        const mPeriodo = await obtenerVentasPorPeriodo(periodo);
        const vars = await obtenerVariantes();

        setVentasHoy(vHoy);
        setProductosTop(pTop);
        setPorMetodo(methods);
        setMetricas(mPeriodo);
        setTotalStock(vars.reduce((s, v) => s + (v.stock || 0), 0));

        const agotados = vars.filter(x => x.stock === 0);
        const bajos = vars.filter(x => x.stock > 0 && x.stock <= x.stockMinimo);
        const nuevasAlertas = [];

        let umbralBajo = 500;
        let pLabel = 'hoy';
        if (periodo === 'semana') { umbralBajo = 3000; pLabel = 'en la semana'; }
        if (periodo === 'mes') { umbralBajo = 12000; pLabel = 'en el mes'; }

        if (agotados.length > 0) {
          nuevasAlertas.push({ id: 'agotados', tipo: 'Inventario', mensaje: `Hay ${agotados.length} productos agotados. Resurtir urgente.`, color: c.danger, ruta: '/stock' });
        }
        if (bajos.length > 0) {
          nuevasAlertas.push({ id: 'bajos', tipo: 'Sugerencia', mensaje: `Existen ${bajos.length} variantes con stock mínimo.`, color: c.warning, ruta: '/stock' });
        }
        if (mPeriodo.total < umbralBajo) {
          nuevasAlertas.push({ id: `ventas_${periodo}`, tipo: 'Desempeño', mensaje: `Balance bajo ($${mPeriodo.total.toFixed(2)}) detectado ${pLabel}. Sugerimos incentivar ventas.`, color: c.info, ruta: '/pos' });
        }
        setTodasAlertas(nuevasAlertas);
      } catch {}
    };

    // Polling condicional: menos frecuente si solo hay 1 dispositivo
    const pollingInterval = realtimeEnabled ? 3000 : 15000; // 3s con realtime, 15s sin realtime
    const interval = setInterval(() => {
      loadSync();
    }, pollingInterval);

    let channel: any = null;
    if (realtimeEnabled) {
      channel = supabase.channel(`dashboard_realtime_${tenantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'venta', filter: `negocio_id=eq.${tenantId}` }, () => loadSync())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'variante', filter: `negocio_id=eq.${tenantId}` }, () => loadSync())
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, isLoading, periodo, realtimeEnabled]);
  const META_DIA     = periodo === 'mes' ? 150000 : periodo === 'semana' ? 35000 : 5000;
  const ticketProm   = metricas.tickets > 0 ? metricas.total / metricas.tickets : 0;
  const pctMeta      = Math.min((metricas.total / META_DIA) * 100, 100);

  const coloresMeto: Record<string, string> = {
    efectivo: c.info, tarjeta: c.warning, transferencia: c.purple, qr: '#34C759', credito: c.danger
  };
  const getMetodoColor = (m: string, i: number) => {
    if (coloresMeto[m]) return coloresMeto[m];
    const pall = [c.info, c.warning, c.purple, '#34C759', c.danger, c.accent];
    return pall[i % pall.length];
  };

  const totalMetodo = Object.values(porMetodo).reduce((s, v) => s + v, 0);

  const descartarAlerta = (id: string, e?: any) => {
    if (e) e.stopPropagation();
    setAlertasIgnoradas(prev => [...prev, id]);
  };

  const procesarAccionNotificacion = (ruta: string) => {
    router.push(ruta as any);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      
      {/* HEADER TIPO PERFIL */}
      <View style={[s.header, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity style={[s.btnAvatar, { backgroundColor: c.surfaceAlt }]} onPress={goBack}>
           <Text style={{fontSize: 20}}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={[s.headerTitulo, { color: c.text }]}>{biz.nombre}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
             <RNAnimated.View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50', transform: [{ scale: pulseAnim }]}} />
             <Text style={{fontSize: 10, color: c.textTer, fontWeight: '700', letterSpacing: 0.5}}>EN VIVO</Text>
          </View>
        </View>
        <View style={s.headerIcons}>
           <TouchableOpacity style={[s.iconBtn, { backgroundColor: c.surface }]} onPress={() => router.push('/ajustes')}>
              <Text style={{fontSize: 20}}>⚙️</Text>
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* BALANCE Y ACCIONES (Similar a Img 1) */}
        <View style={[s.balanceSeccion, { paddingHorizontal: contentPadding }]}>
          <Text style={[s.balanceLabel, { color: c.textSec }]}>VENTAS TOTALES ({periodo.toUpperCase()})</Text>
          <View style={s.balanceRow}>
            <Text 
               style={[s.balanceValor, { color: c.text }]} 
               numberOfLines={1} 
               adjustsFontSizeToFit 
            >
               ${metricas.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}
            </Text>
            <TouchableOpacity style={[s.btnVentaNew, { backgroundColor: c.accent }]} onPress={() => router.push('/pos')}>
              <Text style={s.btnVentaText}>Vender</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={[s.metaBadge, { backgroundColor: c.surfaceAlt }]} activeOpacity={1}>
            <Text style={{fontSize: 16}}>🎯</Text>
            <Text style={[s.metaBadgeText, { color: c.textSec }]}> ${META_DIA.toLocaleString()} meta {periodo === 'hoy' ? 'diaria' : periodo === 'mes' ? 'del mes' : 'semanal'}</Text>
            <Text style={{color: c.textSec, marginLeft: 6}}>{pctMeta.toFixed(0)}%</Text>
          </TouchableOpacity>
        </View>

        {/* ACCESOS RÁPIDOS CONSOLIDADOS */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: contentPadding, gap: 12, marginBottom: 20 }}
        >
          <TouchableOpacity 
            style={[s.quickBtn, { backgroundColor: c.surface }]}
            onPress={() => router.push('/pos')}
          >
            <View style={[s.quickIcon, { backgroundColor: c.softGreen + '30' }]}>
              <Text style={{fontSize: 20}}>🛍️</Text>
            </View>
            <Text style={[s.quickText, { color: c.textSec }]}>Vender</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.quickBtn, { backgroundColor: c.surface }]}
            onPress={() => router.push('/stock')}
          >
            <View style={[s.quickIcon, { backgroundColor: c.softOrange + '30' }]}>
              <Text style={{fontSize: 20}}>📦</Text>
            </View>
            <Text style={[s.quickText, { color: c.textSec }]}>Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.quickBtn, { backgroundColor: c.surface }]}
            onPress={() => router.push('/clientes')}
          >
            <View style={[s.quickIcon, { backgroundColor: c.softBlue + '30' }]}>
              <Text style={{fontSize: 20}}>👥</Text>
            </View>
            <Text style={[s.quickText, { color: c.textSec }]}>Clientes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.quickBtn, { backgroundColor: c.surface }]}
            onPress={() => router.push('/reportes')}
          >
            <View style={[s.quickIcon, { backgroundColor: c.softPurple + '30' }]}>
              <Text style={{fontSize: 20}}>📊</Text>
            </View>
            <Text style={[s.quickText, { color: c.textSec }]}>Reportes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.quickBtn, { backgroundColor: c.surface }]}
            onPress={() => router.push('/gastos')}
          >
            <View style={[s.quickIcon, { backgroundColor: c.softPink + '30' }]}>
              <Text style={{fontSize: 20}}>💸</Text>
            </View>
            <Text style={[s.quickText, { color: c.textSec }]}>Gastos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.quickBtn, { backgroundColor: c.surface }]}
            onPress={() => router.push('/catalogo')}
          >
            <View style={[s.quickIcon, { backgroundColor: c.softPurple + '30' }]}>
              <Text style={{fontSize: 20}}>📖</Text>
            </View>
            <Text style={[s.quickText, { color: c.textSec }]}>Catálogo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.quickBtn, { backgroundColor: c.surface }]}
            onPress={() => router.push('/deudas')}
          >
            <View style={[s.quickIcon, { backgroundColor: c.softOrange + '30' }]}>
              <Text style={{fontSize: 20}}>🤝</Text>
            </View>
            <Text style={[s.quickText, { color: c.textSec }]}>Deudas</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* TABS DE PERIODO */}
        <View style={[s.periodTabsContainer, { backgroundColor: c.surface, marginHorizontal: contentPadding }]}>
          {(['hoy', 'semana', 'mes'] as const).map(p => (
            <TouchableOpacity 
              key={p} 
              style={[s.periodTab, periodo === p && { backgroundColor: c.surfaceAlt, borderRadius: sizes.radiusLg }]} 
              onPress={() => cambiarPeriodo(p)}
            >
              <Text style={[s.periodTabText, { color: c.textSec }, periodo === p && { color: c.text, fontWeight: '700' }]}>
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CENTRO DE TAREAS (SWIPE TO DELETE) EN MENU PRINCIPAL */}
        {alertas.length > 0 && (
          <View style={[s.seccionPad, { marginTop: 16, paddingHorizontal: contentPadding }]}>
            <Text style={[s.seccionTitulo, { color: c.textSec }]}>TAREAS PENDIENTES ({alertas.length})</Text>
            <View style={{ gap: 12 }}>
              {alertas.map((a) => (
                <Swipeable
                  key={a.id}
                  renderRightActions={(progress, dragX) => {
                    const trans = dragX.interpolate({
                      inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp'
                    });
                    return (
                      <TouchableOpacity 
                        style={[s.swipeDeleteBtn, { backgroundColor: c.danger }]}
                        onPress={() => descartarAlerta(a.id)}
                      >
                         <RNAnimated.Text style={[s.swipeDeleteTxt, { transform: [{ scale: trans }] }]}>🗑️ Borrar</RNAnimated.Text>
                      </TouchableOpacity>
                    );
                  }}
                  onSwipeableOpen={(dir) => { if (dir === 'right') descartarAlerta(a.id) }}
                >
                  <TouchableOpacity 
                    style={[s.notiRow, { backgroundColor: c.surface }]}
                    onPress={() => procesarAccionNotificacion(a.ruta)}
                    activeOpacity={0.9}
                  >
                     <View style={[s.notiIconWrap, { backgroundColor: a.color + '15' }]}>
                        <View style={[s.notiDot, { backgroundColor: a.color }]} />
                     </View>
                     <View style={s.notiInfo}>
                        <Text style={[s.notiTipo, { color: a.color }]}>{a.tipo}</Text>
                        <Text style={[s.notiMensaje, { color: c.text }]}>{a.mensaje}</Text>
                     </View>
                     <Text style={{color: c.textTer, fontSize: 18}}>⬅️</Text>
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </View>
          </View>
        )}

        {/* DASHBOARD CARDS (Estadísticas al estilo Bento con Colores Suaves) */}
        <View style={{ paddingHorizontal: contentPadding, marginTop: 16 }}>
          <Text style={[s.seccionTitulo, { color: c.textSec, marginBottom: 12 }]}>RESUMEN DE OPERACIONES</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
             
             {/* Card grande: Tickets */}
             <BentoCard delay={100} style={{ width: '100%' }}>
               <TouchableOpacity 
                  style={[s.bentoCardLarge, { backgroundColor: c.softPink }]}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                  activeOpacity={0.9}
               >
                 <View style={s.bentoCardHeader}>
                    <View style={[s.bentoIconCover, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
                       <Text style={{fontSize: 24}}>🧾</Text>
                    </View>
                    <View>
                       <Text style={[s.bentoValue, { color: c.text }]}>{metricas.tickets}</Text>
                       <Text style={[s.bentoLabel, { color: c.textSec }]}>TICKETS EMITIDOS</Text>
                    </View>
                 </View>
                 <View style={s.bentoFooter}>
                    <Text style={{color: c.textTer, fontSize: 12, fontWeight: '600'}}>+12% vs anterior</Text>
                 </View>
               </TouchableOpacity>
             </BentoCard>

             {/* Cards medianas: Promedio e Inventario */}
             <BentoCard delay={200} style={{ width: (screenWidth - contentPadding * 2 - 12) / 2 }}>
               <TouchableOpacity 
                  style={[s.bentoCardMedium, { backgroundColor: c.softBlue }]}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  activeOpacity={0.9}
               >
                  <Text style={{fontSize: 22}}>⭐</Text>
                  <View>
                    <Text style={[s.bentoValueSmall, { color: c.text }]}>${ticketProm.toFixed(2)}</Text>
                    <Text style={[s.bentoLabelSmall, { color: c.textSec }]}>PROMEDIO</Text>
                  </View>
               </TouchableOpacity>
             </BentoCard>

             <BentoCard delay={300} style={{ width: (screenWidth - contentPadding * 2 - 12) / 2 }}>
               <TouchableOpacity 
                  style={[s.bentoCardMedium, { backgroundColor: c.softPurple }]}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  activeOpacity={0.9}
               >
                  <Text style={{fontSize: 22}}>📦</Text>
                  <View>
                    <Text style={[s.bentoValueSmall, { color: c.text }]}>{totalStock}</Text>
                    <Text style={[s.bentoLabelSmall, { color: c.textSec }]}>EN STOCK</Text>
                  </View>
               </TouchableOpacity>
             </BentoCard>

          </View>
        </View>

        {/* MÉTODOS DE PAGO Y ÚLTIMAS VENTAS - LAYOUT COMPACTO */}
        <View style={[s.twoColSeccion, { paddingHorizontal: contentPadding }]}>
          <Text style={[s.seccionTitulo, { color: c.textSec }]}>MÉTODO DE PAGO</Text>
          <View style={[s.metodosContainer, { backgroundColor: c.surface }]}>
            {Object.keys(porMetodo).length > 0 ? Object.keys(porMetodo).sort((a,b) => porMetodo[b] - porMetodo[a]).map((m, index) => {
               const opt = METODOS_PAGO_OPCIONES.find(o => o.id === m);
               const labelCorto = opt ? (opt.id === 'transferencia' ? 'Transf.' : opt.id === 'efectivo' ? 'Efectivo' : opt.id === 'tarjeta' ? 'Tarjeta' : opt.id === 'qr' ? 'QR' : 'Crédito') : m.charAt(0).toUpperCase() + m.slice(1);
               const colorM = getMetodoColor(m, index);
               return (
               <View key={m} style={s.metodRow}>
                 <View style={s.metodLeft}>
                   <View style={[s.metodDot, { backgroundColor: colorM }]} />
                   <Text style={[s.metodNombre, { color: c.textSec }]}>{labelCorto}</Text>
                 </View>
                 <View style={s.metodCentro}>
                    <BarraProgreso valor={porMetodo[m] ?? 0} maximo={totalMetodo || 1} color={colorM} isDark={isDark} />
                 </View>
                 <Text style={[s.metodTotal, { color: c.text }]}>${(porMetodo[m] ?? 0).toFixed(0)}</Text>
               </View>
             )}) : (
               <Text style={{color: c.textTer, textAlign: 'center', marginTop: 10}}>Aún no hay métodos registrados</Text>
             )}
          </View>
        </View>

        {/* TOP PRODUCTOS */}
        <View style={[s.seccionPad, { paddingHorizontal: contentPadding }]}>
          <View style={s.seccionHeader}>
            <Text style={[s.seccionTitulo, { color: c.textSec }]}>TOP PRODUCTOS</Text>
            <TouchableOpacity onPress={() => router.push('/stock')}><Text style={{color: c.accent, fontSize: sizes.fontMd}}>Ver inventario {'>'}</Text></TouchableOpacity>
          </View>
          
          {productosTop.length === 0 ? (
             <View style={[s.emptyState, { backgroundColor: c.surface }]}><Text style={{color: c.textTer}}>Sin productos vendidos este período</Text></View>
          ) : (
            <View style={{ gap: 12 }}>
              {productosTop.slice(0, 3).map((p, i) => (
                <View key={i} style={[s.productoModernRow, { backgroundColor: c.surface }]}>
                  <View style={[s.productoModernRank, { backgroundColor: i === 0 ? c.accent : c.surfaceAlt }]}>
                    <Text style={{color: i === 0 ? '#fff' : c.textSec, fontWeight: '700'}}>{i + 1}</Text>
                  </View>
                  <View style={s.productoInfo}>
                    <Text style={[s.productoNombre, { color: c.text }]} numberOfLines={1}>{p.nombre}</Text>
                    <Text style={[s.productoMeta, { color: c.textTer }]}>{p.vendidos} ud. • {p.talla || 'N/A'}</Text>
                  </View>
                  <Text style={[s.productoIngreso, { color: c.text }]}>+${p.ingreso}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* HISTORIAL */}
        <View style={[s.seccionPad, { paddingHorizontal: contentPadding }]}>
          <Text style={[s.seccionTitulo, { color: c.textSec }]}>ÚLTIMAS VENTAS (HOY)</Text>
          <View style={[s.historicoContainer, { backgroundColor: c.surface }]}>
            {ventasHoy.length === 0 ? (
              <Text style={{color: c.textTer, textAlign:'center', padding: 20}}>Sin operaciones el día de hoy.</Text>
            ) : (
              ventasHoy.slice(0, 5).map((v, i) => (
                <View key={v.id} style={[s.ventaRowModern, i !== ventasHoy.length -1 && i !== 4 && {borderBottomWidth: 1, borderBottomColor: c.surfaceAlt}]}>
                  <View style={[s.ventaIconWrap, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={{fontSize: 20}}>🛒</Text>
                  </View>
                  <View style={s.ventaInfo}>
                    <Text style={[s.ventaCliente, { color: c.text }]}>{v.clienteNombre}</Text>
                    <Text style={[s.ventaMeta, { color: c.textTer }]}>{v.hora} • {v.metodoPago}</Text>
                  </View>
                  <Text style={[s.ventaTotal, { color: c.text }]}>${v.total.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, paddingBottom: 16,
  },
  btnAvatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'
  },
  headerTitulo: { fontSize: sizes.fontXl, fontWeight: '700' },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badgeNoti: { position: 'absolute', top: 5, right: 5, backgroundColor: '#E62137', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  badgeNotiTxt: { color: '#fff', fontSize: 8, fontWeight: '800' },

  balanceSeccion: { paddingTop: 10, paddingBottom: 20 },
  balanceLabel: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  balanceValor: { fontSize: sizes.font4xl, fontWeight: '800', letterSpacing: -1, flexShrink: 1 },
  btnVentaNew: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: sizes.radiusFull, flexShrink: 0 },
  btnVentaText: { color: '#fff', fontSize: sizes.fontLg, fontWeight: '700' },
  
  metaBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: sizes.radiusFull, marginTop: 12 },
  metaBadgeText: { fontSize: sizes.fontSm, fontWeight: '600' },

  quickBtn: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 10, paddingRight: 16, borderRadius: sizes.radiusLg,
    gap: 12
  },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: sizes.fontSm, fontWeight: '700' },

  periodTabsContainer: {
    flexDirection: 'row', padding: 4, borderRadius: sizes.radiusLg,
    marginVertical: 10
  },
  periodTab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  periodTabText: { fontSize: sizes.fontMd, fontWeight: '600' },

  cardsScroll: { paddingVertical: 16, gap: 16 },
  gradientCard: { 
    height: 160, borderRadius: sizes.radiusXl, padding: 20, 
    justifyContent: 'space-between'
  },
  gradientCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  gradientCardTitle: { fontSize: sizes.fontXs, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1 },
  gradientCardValue: { fontSize: sizes.font3xl, color: '#fff', fontWeight: '800' },
  gradientCardSub: { fontSize: sizes.fontSm, color: 'rgba(255,255,255,0.8)', marginTop: -6 },

  serviciosSeccion: {
    padding: 20, borderRadius: sizes.radiusXl, marginVertical: 16,
  },
  seccionTituloDark: { fontSize: sizes.fontMd, fontWeight: '700', letterSpacing: 1, marginBottom: 20 },
  serviciosGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 24, justifyContent: 'space-between', paddingHorizontal: 10 },
  servicioItem: { alignItems: 'center' },
  servicioIconWrap: { width: 56, height: 56, borderRadius: sizes.radiusLg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  servicioLabel: { fontSize: sizes.fontXs, fontWeight: '600', textAlign: 'center' },

  twoColSeccion: { marginBottom: 24 },
  seccionTitulo: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  metodosContainer: { borderRadius: sizes.radiusXl, padding: 20, paddingBottom: 10 },
  metodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  metodLeft: { flexDirection: 'row', alignItems: 'center', width: 75 },
  metodDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  metodNombre: { fontSize: sizes.fontSm, fontWeight: '600' },
  metodCentro: { flex: 1, marginHorizontal: 16, marginTop: -8 },
  metodTotal: { fontSize: sizes.fontMd, fontWeight: '700', width: 60, textAlign: 'right' },

  seccionPad: { marginBottom: 24 },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emptyState: { padding: 30, borderRadius: sizes.radiusXl, alignItems: 'center' },
  
  productoModernRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: sizes.radiusLg },
  productoModernRank: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  productoInfo: { flex: 1, justifyContent: 'center' },
  productoNombre: { fontSize: sizes.fontBase, fontWeight: '600', marginBottom: 4 },
  productoMeta: { fontSize: sizes.fontXs },
  productoIngreso: { fontSize: sizes.fontBase, fontWeight: '700' },

  historicoContainer: { borderRadius: sizes.radiusXl, overflow: 'hidden' },
  ventaRowModern: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  ventaIconWrap: { width: 42, height: 42, borderRadius: sizes.radiusFull, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  ventaInfo: { flex: 1 },
  ventaCliente: { fontSize: sizes.fontBase, fontWeight: '600', marginBottom: 2 },
  ventaMeta: { fontSize: sizes.fontXs, textTransform: 'capitalize' },
  ventaTotal: { fontSize: sizes.fontLg, fontWeight: '700' },

  notiRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: sizes.radiusXl },
  notiIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  notiDot: { width: 14, height: 14, borderRadius: 7 },
  notiInfo: { flex: 1, paddingRight: 8 },
  notiTipo: { fontSize: sizes.fontXs, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  notiMensaje: { fontSize: sizes.fontSm, fontWeight: '600', lineHeight: 20 },
  swipeDeleteBtn: { justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 24, borderRadius: sizes.radiusXl, marginBottom: 0, marginLeft: 10 },
  swipeDeleteTxt: { color: '#fff', fontWeight: '800', fontSize: sizes.fontSm },

  // Estilos Bento
  bentoCardLarge: {
    padding: 24, borderRadius: 36, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05, shadowRadius: 20, elevation: 4
  },
  bentoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bentoIconCover: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bentoValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  bentoLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.6 },
  bentoFooter: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
  
  bentoCardMedium: {
    padding: 20, borderRadius: 32, height: 140,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 15, elevation: 3
  },
  bentoValueSmall: { fontSize: 18, fontWeight: '800' },
  bentoLabelSmall: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', opacity: 0.5 }
});
