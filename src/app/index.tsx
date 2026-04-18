import React, { useEffect, useState, useCallback } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  View, Text, TouchableOpacity,
  StatusBar, StyleSheet, Animated as RNAnimated, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { sizes } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_700Bold, Poppins_600SemiBold, Poppins_400Regular } from '@expo-google-fonts/poppins';
import { useResponsive } from '../hooks/useResponsive';
import * as Haptics from 'expo-haptics';
import { GuiaModulo } from '../components/GuiaModulo';

// --- Database & Logic ---
import { obtenerVentasPorPeriodo } from '../../database/ventasDB';
import { obtenerVariantes } from '../../database/variantesDB';

const { width } = Dimensions.get('window');

// ─── Componentes de UI Premium (Estilo Bento Imagen) ─────────────────────────

const BentoCard = ({ titulo, subtitulo, valor, icono, color, gradient, fullWidth, onPress, delay, isDark }: any) => {
  const { colors: c } = useTheme();
  const { gridColumnWidth, getFontSize, moderateScale } = useResponsive();
  const animatedScale = React.useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.spring(animatedScale, {
      toValue: 1, friction: 8, tension: 40, delay, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <RNAnimated.View style={[{ transform: [{ scale: animatedScale }], width: fullWidth ? '100%' : gridColumnWidth }]}>
      <TouchableOpacity 
        activeOpacity={0.85}
        onPress={onPress}
        style={[
          styles.bentoCard, 
          { 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF', 
            shadowColor: color,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            borderWidth: 1.5,
          }
        ]}
      >
        <View style={fullWidth ? styles.bentoContentFull : styles.bentoContentHalf}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.bentoTitulo, { color: isDark ? '#FFFFFF' : '#1E293B', fontSize: getFontSize(17) }]}>{titulo}</Text>
            {subtitulo && <Text style={[styles.bentoSubtitulo, { color: isDark ? 'rgba(255,255,255,0.4)' : '#64748B', fontSize: getFontSize(11) }]} numberOfLines={1}>{subtitulo}</Text>}
            {valor && <Text style={[styles.bentoValor, { color, fontSize: getFontSize(14), fontWeight: '900' }]}>{valor}</Text>}
          </View>
          
          <View style={[
            styles.glassIconContainer, 
            { 
              backgroundColor: color + (isDark ? '25' : '15'),
              width: moderateScale(46),
              height: moderateScale(46),
              borderRadius: moderateScale(14),
            }
          ]}>
             <MaterialCommunityIcons name={icono} size={moderateScale(24)} color={color} />
          </View>
        </View>
      </TouchableOpacity>
    </RNAnimated.View>
  );
};

const FakeSparkline = ({ color }: { color: string }) => (
  <View style={styles.sparklineContainer}>
    {[0.4, 0.7, 0.5, 0.9, 0.6, 1.0].map((h, i) => (
      <View key={i} style={[styles.sparkBar, { height: h * 20, backgroundColor: color + '40', borderTopLeftRadius: 4, borderTopRightRadius: 4 }]} />
    ))}
  </View>
);

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export default function Index() {
  const { colors: c, isDark } = useTheme();
  const { isConfigured, isLoading, config, recargar, userPermisos, isAdmin } = useBusiness();
  const { contentPadding, getFontSize, moderateScale, gap } = useResponsive();
  const [fontsLoaded] = useFonts({ Poppins_700Bold, Poppins_600SemiBold, Poppins_400Regular });
  const [metrics, setMetrics] = useState({ sales: '$0.00', tickets: '0', lowStock: '0' });
  const [splashOpacity] = useState(new RNAnimated.Value(1));
  const [mostrarSplash, setMostrarSplash] = useState(true);
  const [mostrarExtras, setMostrarExtras] = useState(false);
  const [mostrarGuia, setMostrarGuia] = useState(false);

  const loadMetrics = async () => {
    try {
      if (!isConfigured) return;
      const vHoy = await obtenerVentasPorPeriodo('hoy');
      const vars = await obtenerVariantes();
      const lowStock = vars.filter(x => (x.stock || 0) <= (x.stockMinimo || 0)).length;
      setMetrics({
        sales: `$${vHoy.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        tickets: vHoy.tickets.toString(),
        lowStock: lowStock.toString()
      });
    } catch {}
  };

  useEffect(() => {
    const init = async () => {
      try {
        await recargar();
      } catch (e) {}
    };
    init();
  }, []);

  useFocusEffect(useCallback(() => { loadMetrics(); }, [isConfigured]));

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      if (!isConfigured) {
        router.replace('/bienvenida');
        return;
      }
      setTimeout(() => {
        RNAnimated.timing(splashOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => setMostrarSplash(false));
      }, 1200);
    }
  }, [fontsLoaded, isLoading, isConfigured]);

  if (!isConfigured && !isLoading && !mostrarSplash) return null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        
        
        {/* Header Superior Moderno */}
        <View style={[styles.header, { paddingHorizontal: contentPadding, paddingVertical: moderateScale(20) }]}>
          <View style={styles.headerLeft}>
             <LinearGradient colors={['#4F46E5', '#7C3AED']} style={[styles.logoBadge, { width: moderateScale(42), height: moderateScale(42) }]}>
               <Text style={[styles.logoText, { fontSize: getFontSize(18) }]}>IN</Text>
             </LinearGradient>
             <Text style={[styles.headerBrand, { color: c.text, fontFamily: fontsLoaded ? 'Poppins_700Bold' : 'System', fontSize: getFontSize(21) }]}>Inventray</Text>
          </View>
            <TouchableOpacity 
              style={[styles.settingsBtn, { backgroundColor: c.surfaceAlt, marginRight: 10, width: moderateScale(44), height: moderateScale(44) }]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMostrarGuia(true);
              }}
            >
              <MaterialCommunityIcons name="information-outline" size={getFontSize(23)} color="#60A5FA" />
            </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: contentPadding, paddingBottom: 120 }}
        >
          {/* Tarjeta de Negocio Personalizable */}
          <LinearGradient
            colors={config.customGradiente || config.gradiente || ['#10B981', '#059669', '#065F46']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.businessCard}
          >
            <View style={styles.cardHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{config.tipo?.toUpperCase() || 'GENERAL'}</Text>
              </View>
            </View>

            <View style={styles.cardMain}>
              <View style={{ flex: 1 }}>
                <Text style={styles.businessName} numberOfLines={1}>{config.nombre}</Text>
                <Text style={styles.cardDate}>
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>

                <View style={styles.cardActions}>
                  <View style={styles.miniBtn}>
                    <Text style={styles.miniBtnText}>{config.labelAtributo1 || 'Atrib 1'}</Text>
                  </View>
                  <View style={styles.miniBtn}>
                    <Text style={styles.miniBtnText}>{config.labelAtributo2 || 'Atrib 2'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardIconBox}>
                <MaterialCommunityIcons name="storefront-outline" size={32} color="#fff" />
              </View>
            </View>
          </LinearGradient>

          {/* Top Metrics Row */}
          <View style={[styles.topGrid, { gap }]}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/dashboard');
              }}
              style={[styles.metricMainCard, { backgroundColor: isDark ? c.surfaceAlt : c.surface, padding: moderateScale(18) }]}
            >
               <View style={styles.metricRow}>
                 <Text style={[styles.metricLabel, { fontSize: getFontSize(10), color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }]}>VENTAS DE HOY</Text>
                 <View style={styles.sparkIcon}><MaterialCommunityIcons name="trending-up" size={getFontSize(14)} color="#10B981" /></View>
               </View>
               <Text style={[styles.metricValueLarge, { color: c.text, fontSize: getFontSize(24) }]}>{metrics.sales}</Text>
               <FakeSparkline color="#10B981" />
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/inventario');
              }}
              style={[styles.metricMainCard, { backgroundColor: isDark ? c.surfaceAlt : c.surface, padding: moderateScale(18) }]}
            >
               <View style={styles.metricRow}>
                 <Text style={[styles.metricLabel, { fontSize: getFontSize(10), color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }]}>ALERTAS</Text>
                 <View style={styles.alertCount}><Text style={[styles.alertCountText, { fontSize: getFontSize(10) }]}>{metrics.lowStock}</Text></View>
               </View>
               <Text style={[styles.metricValueLarge, { color: c.text, fontSize: getFontSize(24) }]}>{metrics.lowStock} items</Text>
               <View style={styles.alertIconsRow}>
                  <View style={[styles.miniAlertIcon, {backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'}]}><MaterialCommunityIcons name="archive-alert-outline" size={getFontSize(14)} color="#EF4444" /></View>
                  <View style={[styles.miniAlertIcon, {backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7'}]}><MaterialCommunityIcons name="alert-outline" size={getFontSize(14)} color="#F59E0B" /></View>
                  <View style={[styles.moreAlerts, { backgroundColor: c.border }]}><Text style={[styles.moreAlertsText, { color: c.textSec, fontSize: getFontSize(9) }]}>+1</Text></View>
               </View>
            </TouchableOpacity>
          </View>

          {/* Bento Tools Grid */}
          <View style={[styles.bentoGrid, { gap }]}>
            {(isAdmin || userPermisos.includes('ventas')) && (
              <BentoCard 
                titulo="Punto de Venta" subtitulo="Terminal de cobro" 
                icono="cash-register" color="#10B981" fullWidth 
                onPress={() => router.push('/pos')} delay={100} isDark={isDark}
              />
            )}
                        {/* Almacén */}
            {(isAdmin || userPermisos.includes('inventario')) && (
              <BentoCard
                titulo="Almacén"
                icono="warehouse"
                color="#8B5CF6"
                delay={200}
                isDark={isDark}
                onPress={() => router.push('/inventario')}
              />
            )}

            {/* Catálogo */}
            {(isAdmin || userPermisos.includes('catalogo')) && (
              <BentoCard
                titulo="Catálogo"
                icono="format-list-bulleted"
                color="#2563EB"
                delay={300}
                isDark={isDark}
                onPress={() => router.push('/catalogo')}
              />
            )}

            {/* Gastos */}
            {(isAdmin || userPermisos.includes('gastos')) && (
              <BentoCard 
                titulo="Gastos" 
                subtitulo="Registro de egresos y compras"
                icono="cash-minus" 
                color="#EF4444" 
                fullWidth 
                onPress={() => router.push('/gastos')} 
                delay={600} 
                isDark={isDark}
              />
            )}

            {/* Proveedores */}
            {(isAdmin || userPermisos.includes('proveedores')) && (
              <BentoCard 
                titulo="Proveedores" 
                subtitulo="Gestión de contactos"
                icono="truck-delivery-outline" 
                color="#0284C7" 
                fullWidth 
                onPress={() => router.push('/proveedores')} 
                delay={700} 
                isDark={isDark}
              />
            )}

            {/* Extras que se muestran al dar click en 'Más herramientas' */}
            {mostrarExtras && (
              <>
                {(isAdmin || userPermisos.includes('deudas')) && (
                  <BentoCard 
                    titulo="Deudas"
                    icono="card-account-phone-outline" 
                    color="#F59E0B" 
                    delay={100} 
                    isDark={isDark}
                    onPress={() => router.push('/deudas')}
                  />
                )}
                {(isAdmin || userPermisos.includes('clientes')) && (
                  <BentoCard 
                    titulo="Clientes" icono="account-group-outline" 
                    color="#3B82F6" delay={200} isDark={isDark}
                    onPress={() => router.push('/clientes')}
                  />
                )}
                {(isAdmin || userPermisos.includes('reportes')) && (
                  <BentoCard 
                    titulo="Reportes" 
                    subtitulo="Análisis de ventas, inventario y rendimiento"
                    icono="file-chart-outline" 
                    color="#8B5CF6" 
                    fullWidth
                    delay={300} 
                    isDark={isDark}
                    onPress={() => router.push('/reportes')}
                  />
                )}
              </>
            )}
          </View>

          {/* Action Link Button - Ahora es 'Más herramientas' */}
          <TouchableOpacity 
            style={styles.btnLinkTeam} 
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setMostrarExtras(!mostrarExtras);
            }}
          >
            <LinearGradient 
              colors={mostrarExtras ? ['#64748B', '#475569'] : ['#4F46E5', '#6366F1']} 
              start={{x:0, y:0}} end={{x:1, y:0}} 
              style={styles.btnLinkArea}
            >
              <MaterialCommunityIcons 
                name={mostrarExtras ? "chevron-up" : "chevron-down"} 
                size={24} color="#fff" 
              />
              <Text style={styles.btnLinkText}>{mostrarExtras ? "Ver menos" : "Más herramientas"}</Text>
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>

      {/* Splash Screen */}
      {mostrarSplash && (
        <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: splashOpacity, justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
           <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.splashIcon}>
             <Text style={styles.splashLogoText}>IN</Text>
           </LinearGradient>
           <Text style={[styles.splashBrand, { color: c.text }]}>Inventray</Text>
        </RNAnimated.View>
      )}

      {/* Mini Navigation Bar */}
      <View style={[styles.bottomNav, { bottom: isDark ? 20 : 30 }]}>
         <View style={[styles.navPill, { backgroundColor: c.surface, shadowColor: isDark ? '#000' : c.textSec, borderColor: c.border }]}>
            <TouchableOpacity style={[styles.navItemActive, { backgroundColor: c.accent, shadowColor: c.accent }]}>
               <MaterialCommunityIcons name="home-variant" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/catalogo')}>
               <MaterialCommunityIcons name="view-grid-outline" size={24} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/pos')}>
               <MaterialCommunityIcons name="plus-circle-outline" size={28} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
               <MaterialCommunityIcons name="chart-pie" size={24} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/ajustes')}>
               <MaterialCommunityIcons name="account-outline" size={24} color="#64748B" />
            </TouchableOpacity>
         </View>
      </View>

      {/* Guía Maestra de la App */}
      <GuiaModulo 
        visible={mostrarGuia}
        onClose={() => setMostrarGuia(false)}
        nombreModulo="Guía Maestra"
        pasos={[
          {
            titulo: "¡Bienvenido a Inventray!",
            desc: "Este es tu centro de control. Desde aquí puedes ver el resumen de tu negocio en tiempo real.",
            icono: "rocket-launch",
            color: "#10B981"
          },
          {
            titulo: "Ventas Rápidas (POS)",
            desc: "Usa el Punto de Venta para cobrar de forma ágil. ¡Todo se sincroniza al instante!",
            icono: "cash-register",
            color: "#10B981"
          },
          {
            titulo: "Control de Stock",
            desc: "Organiza tus productos, categorías y proveedores. Activa alertas de inventario bajo.",
            icono: "package-variant",
            color: "#10B981"
          },
          {
            titulo: "Clientes y Deudas",
            desc: "En el menú de 'Más herramientas', puedes gestionar tu base de clientes y las cuentas por cobrar.",
            icono: "account-group-outline",
            color: "#8B5CF6"
          },
          {
            titulo: "Control de Gastos",
            desc: "Registra tus salidas de dinero para tener un balance real de tus utilidades.",
            icono: "cash-minus",
            color: "#EF4444"
          },
          {
            titulo: "Reportes Inteligentes",
            desc: "Analiza tus ganancias, gastos y el rendimiento de tus productos con gráficas detalladas.",
            icono: "📊",
            color: "#EC4899"
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -1 },
  headerBrand: { fontSize: 21, fontWeight: '700' },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  
  topGrid: { flexDirection: 'row', gap: 14, marginBottom: 25, marginTop: 10 },
  metricMainCard: { flex: 1, padding: 20, borderRadius: 32, elevation: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metricLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  metricValueLarge: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  alertCount: { backgroundColor: '#EF4444', height: 20, minWidth: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  alertCountText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  alertIconsRow: { flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'center' },
  miniAlertIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  moreAlerts: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  moreAlertsText: { fontSize: 9, fontWeight: '800' },
  sparkIcon: { backgroundColor: '#DCFCE7', padding: 4, borderRadius: 6 },
  sparklineContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 15, height: 25 },
  sparkBar: { width: 8 },

  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 30 },
  bentoCard: { borderRadius: 24, padding: 16, elevation: 4, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 15 },
  bentoContentFull: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bentoContentHalf: { justifyContent: 'space-between', minHeight: 100 },
  bentoTitulo: { fontWeight: '800', letterSpacing: -0.5 },
  bentoSubtitulo: { fontWeight: '500', marginTop: 2 },
  bentoValor: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  glassIconContainer: { alignItems: 'center', justifyContent: 'center' },

  // Business Card Styles (Restored & Enhanced)
  businessCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    marginTop: 10,
    overflow: 'hidden',
    minHeight: 160,
    justifyContent: 'space-between',
    elevation: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  businessName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardDate: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'capitalize'
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  miniBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardIconBox: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  btnLinkTeam: { marginBottom: 30 },
  btnLinkArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 28, gap: 12, elevation: 8, shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 15 },
  btnLinkText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  
  bottomNav: { 
    position: 'absolute', bottom: 30, left: 16, right: 16, 
    alignItems: 'center', justifyContent: 'center',
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 32,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navItem: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 27,
  },
  navItemActive: {
    backgroundColor: '#10B981',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  
  splashIcon: { width: 140, height: 140, borderRadius: 45, alignItems: 'center', justifyContent: 'center', elevation: 20 },
  splashLogoText: { color: '#fff', fontSize: 60, fontWeight: '900', letterSpacing: -3 },
  splashBrand: { fontSize: 36, fontWeight: '700', marginTop: 25, letterSpacing: -1 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 20, textTransform: 'uppercase', opacity: 0.6 },
});
