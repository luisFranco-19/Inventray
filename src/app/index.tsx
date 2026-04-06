import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StatusBar, StyleSheet, Animated as RNAnimated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { sizes } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { GuiaOnboarding } from '../components/GuiaOnboarding';
import { GuiaAyuda } from '../components/GuiaAyuda';
import { useResponsive } from '../hooks/useResponsive';
import * as Haptics from 'expo-haptics';

// ─── Componentes Auxiliares ───────────────────────────────────────────────────

const MenuItemRGB = ({ titulo, subtitulo, icono, colors, onPress, delay, isTablet, index, scrollY, isAdmin }: any) => {
  const { isDark } = useTheme();
  const animatedScale = React.useRef(new RNAnimated.Value(0)).current;
  const pressScale = React.useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    RNAnimated.spring(animatedScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    RNAnimated.spring(pressScale, { toValue: 0.96, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const handlePressOut = () => {
    RNAnimated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const textOnCard = '#FFFFFF';
  // Ajuste de Alturas para el Stack
  const ITEM_HEIGHT = 155;
  const BANNER_HEIGHT = isAdmin ? 280 : 100;
  const cardOffset = BANNER_HEIGHT + (index * ITEM_HEIGHT);

  // Animación de 'Esconderse' arriba (Stacking) sin Transparencia
  // Movimiento suave hacia arriba cuando ya está cerca del tope
  const parallaxTranslateY = scrollY ? scrollY.interpolate({
    inputRange: [cardOffset - 400, cardOffset, cardOffset + 500],
    outputRange: [0, 0, -420], // Se desliza hacia arriba mientras escala
    extrapolate: 'clamp'
  }) : 0;

  const stackScale = scrollY ? scrollY.interpolate({
    inputRange: [cardOffset - 200, cardOffset, cardOffset + 400],
    outputRange: [1, 1, 0.85], // Escala ligeramente hacia abajo al salir
    extrapolate: 'clamp'
  }) : 1;

  // IMPORTANTE: Mantener opacidad a 1 para evitar "ghosting" del fondo
  // Solo se desvanece al final extremo si es necesario
  const stackOpacity = scrollY ? scrollY.interpolate({
    inputRange: [cardOffset + 400, cardOffset + 600],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  }) : 1;

  return (
    <RNAnimated.View style={{
      transform: [
        { scale: animatedScale },
        { scale: pressScale },
        { scale: stackScale },
        { translateY: parallaxTranslateY }
      ],
      opacity: stackOpacity,
      width: '100%',
      zIndex: 100 - index,
      marginBottom: -15, // Efecto tarjeta apilada
      backgroundColor: isDark ? '#121212' : '#FFFFFF', // Fondo sólido antipantalla fantasma
      borderRadius: 40,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    }}>
      <TouchableOpacity
        onPress={onPress} activeOpacity={0.9}
        onPressIn={handlePressIn} onPressOut={handlePressOut}
        style={[
          styles.menuItemRGB,
          { overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.rgbTopRow}>
          <View style={[styles.rgbIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={{ fontSize: isTablet ? 32 : 26 }}>{icono}</Text>
          </View>
          <Text style={[styles.rgbSubtitulo, { color: textOnCard, opacity: 0.85 }]}>{subtitulo}</Text>
        </View>

        <View style={styles.rgbBottomArea}>
          <Text numberOfLines={2} style={[styles.rgbTitulo, { color: textOnCard, fontFamily: 'Poppins_700Bold' }]}>{titulo}</Text>
        </View>

        <View style={styles.rgbActionIcon}>
          <Text style={{ color: textOnCard, fontSize: 18, opacity: 0.5, fontWeight: '900' }}>↗</Text>
        </View>
      </TouchableOpacity>
    </RNAnimated.View>
  );
};

const HeaderBanner = ({ config, day, colors: c, padding }: any) => {
  const currentGradiente = config.customGradiente || config.gradiente || ['#4A00E0', '#8E2DE2'];
  const currentIcono = config.customIcono || config.icono || '🏪';

  return (
    <View style={{ paddingHorizontal: padding, marginTop: 10, marginBottom: 25 }}>
      <LinearGradient
        colors={currentGradiente}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.headerBannerCard}
      >
        <View style={styles.bannerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>{config.tipo?.toUpperCase() || 'NEGOCIO'}</Text>
            </View>
            <Text style={styles.bannerNombre}>{config.nombre}</Text>
            <Text style={styles.bannerDia}>{day}</Text>

            <View style={styles.tagStrip}>
              {config.labelAtributo1 && (
                <View style={styles.tagItem}>
                  <Text style={styles.tagText}>{config.labelAtributo1}</Text>
                </View>
              )}
              {config.labelAtributo2 && (
                <View style={styles.tagItem}>
                  <Text style={styles.tagText}>{config.labelAtributo2}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.bannerIconBox}>
            <Text style={{ fontSize: 40 }}>{currentIcono}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function Index() {
  const { colors: c, isDark } = useTheme();
  const { isConfigured, isLoading, config, recargar, userPermisos, isAdmin } = useBusiness();
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const { isTablet, contentPadding } = useResponsive();

  const [fontsLoaded] = useFonts({ Poppins_700Bold });
  const [splashOpacity] = useState(new RNAnimated.Value(1));
  const [mostrarSplash, setMostrarSplash] = useState(true);

  const scrollY = React.useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const init = async () => {
      try {
        await recargar();
        setListo(true);
      } catch (e: any) {
        setError('No se pudo inicializar la aplicación. Verifique su conexión y llaves.');
        console.error('[App] Error Server/Auth:', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (listo && fontsLoaded && !isLoading) {
      if (!isConfigured) {
        router.replace('/bienvenida');
        return;
      }

      setTimeout(() => {
        RNAnimated.timing(splashOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          setMostrarSplash(false);
        });
      }, 1500);
    }
  }, [listo, fontsLoaded, isLoading, isConfigured]);

  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (error) {
    return (
      <SafeAreaView style={[styles.cargando, { backgroundColor: c.bg }]}>
        <Text style={[styles.errorTexto, { color: c.danger }]}>Error al iniciar</Text>
        <Text style={[styles.errorSub, { color: c.textTer }]}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

        <View style={[styles.appHeader, { paddingHorizontal: contentPadding }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandingRow}>
              <LinearGradient
                colors={['#8E2DE2', '#4A00E0']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.brandLogoBox}
              >
                <Text style={styles.brandLogoText}>IN</Text>
              </LinearGradient>
              <Text style={[styles.brandingText, { color: c.textTer }]}>INVENTRAY</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.btnHelpHeader, { backgroundColor: c.surfaceAlt }]}
            onPress={() => setMostrarGuia(true)}
          >
            <Text style={{ fontSize: 18, color: c.info }}>ℹ️</Text>
          </TouchableOpacity>
        </View>

        <RNAnimated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          onScroll={RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        >
          {isAdmin && <HeaderBanner config={config} day={fecha} colors={c} padding={contentPadding} />}

          <View style={[styles.menu, { paddingHorizontal: contentPadding }]}>
            <Text style={[styles.menuTitulo, { color: c.textTer }]}>MIS HERRAMIENTAS</Text>

            <View style={styles.verticalStack}>
              {(() => {
                let availableItems = [
                  (isAdmin || userPermisos.includes('ventas')) && { titulo: "Punto de Venta", subtitulo: "- Cobros rápidos", icono: "🛍️", colors: ['#FFCA28', '#FF8F00'], route: '/pos', delay: 100 },
                  (isAdmin || userPermisos.includes('inventario')) && { titulo: "Control de Stock", subtitulo: "- Inventario Real", icono: "📦", colors: ['#FF7043', '#D84315'], route: '/stock', delay: 150 },
                  (isAdmin || userPermisos.includes('catalogo')) && { titulo: "Catálogo", subtitulo: "- Ver productos", icono: "📖", colors: ['#42A5F5', '#1565C0'], route: '/catalogo', delay: 200 },
                  (isAdmin || userPermisos.includes('dashboard')) && { titulo: "Métricas", subtitulo: "- Análisis", icono: "📊", colors: ['#66BB6A', '#2E7D32'], route: '/dashboard', delay: 250 },
                  (isAdmin || userPermisos.includes('clientes')) && { titulo: "Clientes", subtitulo: "- Base de datos", icono: "👥", colors: ['#AB47BC', '#6A1B9A'], route: '/clientes', delay: 300 },
                  (isAdmin || userPermisos.includes('gastos')) && { titulo: "Gastos", subtitulo: "- Flujo de caja", icono: "📉", colors: ['#EF5350', '#C62828'], route: '/gastos', delay: 350 },
                  (isAdmin || userPermisos.includes('deudas')) && { titulo: "Cuentas x Cobrar", subtitulo: "- Créditos", icono: "🤝", colors: ['#00D4FF', '#3a7bd5'], route: '/deudas', delay: 400 },
                  (isAdmin || userPermisos.includes('reportes')) && { titulo: "Reportes", subtitulo: "- Informes", icono: "📈", colors: ['#7986CB', '#283593'], route: '/reportes', delay: 450 },
                  (isAdmin || userPermisos.includes('ajustes')) && { titulo: "Ajustes", subtitulo: "- Configuración", icono: "⚙️", colors: ['#78909C', '#37474F'], route: '/ajustes', delay: 500 }
                ].filter(Boolean);

                return (availableItems as any).map((item: any, index: number) => (
                  <MenuItemRGB
                    key={item.titulo}
                    titulo={item.titulo} subtitulo={item.subtitulo}
                    icono={item.icono} colors={item.colors}
                    onPress={() => router.push(item.route)}
                    delay={item.delay} isTablet={isTablet}
                    index={index} scrollY={scrollY}
                    isAdmin={isAdmin}
                  />
                ));
              })()}
            </View>
          </View>

          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.info }} />
              <Text style={[styles.footerTexto, { color: c.textTer }]}>Premium Edition Active</Text>
            </View>
            <Text style={[styles.footerTextoSmall, { color: c.textTer, marginTop: 4 }]}>Inventray Versión 1.1.0</Text>
          </View>

        </RNAnimated.ScrollView>
      </SafeAreaView>

      {mostrarSplash && (
        <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#080808' : '#F5F5F5', opacity: splashOpacity, justifyContent: 'center', alignItems: 'center', zIndex: 999 }]}>
          <LinearGradient
            colors={['#8E2DE2', '#4A00E0']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.splashBlob, { justifyContent: 'center', alignItems: 'center' }]}
          >
            <Text style={{ color: '#fff', fontSize: 80, fontWeight: '900', letterSpacing: -5 }}>IN</Text>
          </LinearGradient>
          <Text style={[{ fontFamily: fontsLoaded ? 'Poppins_700Bold' : 'System', fontSize: 50, color: isDark ? '#FFFFFF' : '#111111', letterSpacing: -2, marginTop: 20 }]}>Inventray</Text>
          <Text style={[{ fontSize: 13, color: isDark ? '#666666' : '#999999', marginTop: 5, letterSpacing: 4, textTransform: 'uppercase' }]}>Starting System...</Text>
        </RNAnimated.View>
      )}

      {!mostrarSplash && <GuiaOnboarding />}

      <GuiaAyuda
        visible={mostrarGuia}
        onClose={() => setMostrarGuia(false)}
        titulo="Panel Principal"
        pasos={[
          'Consulta el "Dashboard" para ver un resumen de tu desempeño.',
          'Usa el "Punto de Venta" para realizar cobros rápidos.',
          'Controla tu "Inventario" para no quedarte sin mercancía.',
          'Gestiona tus "Ajustes" para cambiar el nombre o icono del negocio.'
        ]}
        tips={[
          'Las tarjetas se apilan suavemente mientras navegas.',
          'Puedes alternar el modo oscuro en el menú de Ajustes.',
          'Usa el acceso rápido para navegar entre todas las herramientas.'
        ]}
        color={c.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorTexto: { fontSize: 20, fontWeight: '700' },
  errorSub: { fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
  root: { flex: 1 },
  appHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 20, paddingBottom: 15 },
  brandingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  brandLogoBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: -1 },
  brandingText: { fontSize: 13, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  headerGreeting: { fontSize: sizes.fontXs, fontWeight: '800', letterSpacing: 3, opacity: 0.5 },
  headerNombre: { fontSize: 28, fontWeight: '900', marginTop: -2 },
  btnHelpHeader: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fechaActual: { fontSize: sizes.fontMd, fontWeight: '600', opacity: 0.8 },
  menu: { paddingTop: 10 },
  menuTitulo: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1.5, marginBottom: 20 },
  verticalStack: { gap: 0, marginTop: 10, borderRadius: 40 },
  menuItemRGB: {
    height: 140,
    width: '100%',
    padding: 24,
    borderRadius: 40,
    justifyContent: 'space-between'
  },
  rgbTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rgbIconContainer: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  rgbSubtitulo: { fontSize: 13, fontWeight: '600' },
  rgbBottomArea: { marginTop: 10 },
  rgbTitulo: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  rgbActionIcon: { position: 'absolute', bottom: 20, right: 24 },
  footer: { marginTop: 40, alignItems: 'center', paddingBottom: 20 },
  footerTexto: { fontSize: sizes.fontXs, letterSpacing: 0.5, fontWeight: '700', textTransform: 'uppercase' },
  footerTextoSmall: { fontSize: 10, fontWeight: '500' },
  splashBlob: { width: 180, height: 180, borderRadius: 50, elevation: 20, shadowColor: '#4A00E0', shadowOpacity: 0.5, shadowRadius: 30 },
  headerBannerCard: {
    padding: 24,
    borderRadius: 32,
    minHeight: 180,
    justifyContent: 'center',
  },
  bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  bannerNombre: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  bannerDia: { color: '#fff', fontSize: 15, opacity: 0.8, marginTop: 2, fontWeight: '500' },
  tagStrip: { flexDirection: 'row', gap: 8, marginTop: 15 },
  tagItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bannerIconBox: { width: 80, height: 80, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
