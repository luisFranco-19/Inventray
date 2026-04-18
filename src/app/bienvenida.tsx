import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Dimensions, TextInput, ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { sizes } from '../theme';
import { GuiaAyuda } from '../components/GuiaAyuda';
import { useResponsive } from '../hooks/useResponsive';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icono: 'cash-register', titulo: 'Punto de Venta', desc: 'Cobra, genera tickets y gestiona pagos en segundos.' },
  { icono: 'package-variant-closed', titulo: 'Inventario Inteligente', desc: 'Controla stock, escanea códigos y recibe alertas.' },
  { icono: 'chart-bar', titulo: 'Reportes y Métricas', desc: 'Visualiza ventas, productos top y rendimiento.' },
];

export default function Bienvenida() {
  const { colors: c, isDark } = useTheme();
  const { vincularLlave, reclamarAdmin } = useBusiness();
  const [fontsLoaded] = useFonts({ Poppins_700Bold });

  const [modoAdmin, setModoAdmin] = React.useState(false);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [llaveInput, setLlaveInput] = React.useState('');
  const [pinInput, setPinInput] = React.useState('');
  const [loadingLlave, setLoadingLlave] = React.useState(false);
  const [mostrarGuia, setMostrarGuia] = React.useState(false);
  const { isTablet, contentPadding, width: screenWidth } = useResponsive();

  // Animaciones
  const logoScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslateY = useRef(new Animated.Value(40)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(featuresOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(featuresTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(btnTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[st.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

      <TouchableOpacity
        style={[st.btnGuia, { backgroundColor: c.surface }]}
        onPress={() => setMostrarGuia(true)}
      >
        <MaterialCommunityIcons name="lightbulb-on" size={24} color={isDark ? '#F59E0B' : '#F59E0B'} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={[st.scrollContainer, { paddingHorizontal: contentPadding }]}>
        <View style={[st.content, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>

          {/* Logo animado */}
          <Animated.View style={[st.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <LinearGradient
              colors={['#8E2DE2', '#4A00E0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={st.logoBlob}
            >
              <Text style={st.logoText}>IN</Text>
            </LinearGradient>
          </Animated.View>

          {/* Título y subtítulo */}
          <Animated.View style={[st.titleBlock, { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]}>
            <Text style={[st.appName, { color: c.text, fontFamily: fontsLoaded ? 'Poppins_700Bold' : 'System' }]}>
              Inventray
            </Text>
            <Text style={[st.subtitle, { color: c.textSec }]}>
              Tu sistema de gestión todo en uno
            </Text>
            <Text style={[st.subtitleSmall, { color: c.textTer }]}>
              Para cualquier tipo de negocio
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View style={[st.featuresBlock, { opacity: featuresOpacity, transform: [{ translateY: featuresTranslateY }] }]}>
            {FEATURES.map((f, i) => (
              <View key={i} style={[st.featureRow, { backgroundColor: c.surface }]}>
                <View style={[st.featureIcon, { backgroundColor: isDark ? c.surfaceAlt : '#F0EEFF' }]}>
                  <MaterialCommunityIcons name={f.icono as any} size={28} color={c.accent} />
                </View>
                <View style={st.featureInfo}>
                  <Text style={[st.featureTitle, { color: c.text }]}>{f.titulo}</Text>
                  <Text style={[st.featureDesc, { color: c.textSec }]}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

        </View>

        {/* Botón Comenzar y Vincular */}
        <Animated.View style={[st.btnContainer, { opacity: btnOpacity, transform: [{ translateY: btnTranslateY }], paddingHorizontal: isTablet ? 0 : 24 }, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/encuesta')}
            style={{ marginBottom: 12 }}
          >
            <LinearGradient
              colors={['#8E2DE2', '#4A00E0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={st.btnGradient}
            >
              <Text style={st.btnText}>Crear Nuevo Negocio</Text>
              <Text style={st.btnArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.btnVincular, { backgroundColor: isDark ? c.surfaceAlt : '#F0EEFF' }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={[st.btnVincularText, { color: c.accent }]}>Soy Empleado (Vincular Llave)</Text>
          </TouchableOpacity>

          <Text style={[st.footerText, { color: c.textTer }]}>
            Todos tus dispositivos sincronizados en tiempo real
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Modal para ingresar Llave */}
      {modalVisible && (
        <View style={st.modalOverlay}>
          <View style={[st.modalCard, { backgroundColor: c.surface }, isTablet && { maxWidth: 500 }]}>
            <TouchableOpacity style={st.closeModalBtn} onPress={() => setModalVisible(false)}><Text style={{ fontSize: 20, color: c.textTer }}>✕</Text></TouchableOpacity>
            <Text style={[st.modalTitle, { color: c.text }]}>
              {modoAdmin ? 'Recuperar como Dueño' : 'Vincular Dispositivo'}
            </Text>
            <Text style={[st.modalSub, { color: c.textSec }]}>
              {modoAdmin
                ? 'Ingresa el Nombre del Dueño (con el que te registraste) y tu PIN de 4 dígitos.'
                : 'Pide la llave de sincronización al administrador (dueño) de tu negocio.'}
            </Text>

            <View style={[st.inputWrapper, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Text style={{ fontSize: 20, marginRight: 10 }}>{modoAdmin ? '👤' : '🔑'}</Text>
              <TextInput
                style={[st.input, { color: c.text, letterSpacing: modoAdmin ? 0 : 2 }]}
                placeholder={modoAdmin ? 'Nombre del Dueño' : 'Ej: MB-A1B2C3'}
                placeholderTextColor={c.textTer}
                autoCapitalize={modoAdmin ? 'words' : 'characters'}
                value={llaveInput}
                onChangeText={setLlaveInput}
                textContentType={modoAdmin ? 'username' : 'none'}
                autoComplete={modoAdmin ? 'username' : 'off'}
              />
            </View>

            {modoAdmin && (
              <View style={[st.inputWrapper, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>🔒</Text>
                <TextInput
                  style={[st.input, { color: c.text, letterSpacing: 8 }]}
                  placeholder="PIN"
                  placeholderTextColor={c.textTer}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  value={pinInput}
                  onChangeText={setPinInput}
                  textContentType="password"
                  autoComplete="current-password"
                />
              </View>
            )}

            <TouchableOpacity
              style={[st.btnSubmitModal, { backgroundColor: modoAdmin ? c.accent : c.accent, opacity: loadingLlave ? 0.7 : 1 }]}
              disabled={loadingLlave || llaveInput.length < 5 || (modoAdmin && pinInput.length !== 4)}
              onPress={async () => {
                setLoadingLlave(true);
                try {
                  if (modoAdmin) {
                    await reclamarAdmin(llaveInput.trim(), pinInput);
                  } else {
                    await vincularLlave(llaveInput.trim());
                  }
                  setModalVisible(false);
                  router.replace('/');
                } catch (e: any) {
                  alert(e.message || 'Datos incorrectos o negocio no encontrado.');
                } finally {
                  setLoadingLlave(false);
                }
              }}
            >
              <Text style={st.btnSubmitModalText}>
                {loadingLlave ? 'Validando...' : modoAdmin ? 'Reclamar Acceso' : 'Conectar Servidor'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 20, alignItems: 'center' }}
              onPress={() => setModoAdmin(!modoAdmin)}
            >
              <Text style={{ color: c.textTer, fontSize: 13, textDecorationLine: 'underline' }}>
                {modoAdmin ? 'Volver a Vincular como Empleado' : '¿Eres el dueño? Recuperar con PIN'}
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      )}

      <GuiaAyuda
        visible={mostrarGuia}
        onClose={() => setMostrarGuia(false)}
        titulo="Comenzando con Inventray"
        color="#10B981"
        pasos={[
          '¿Eres dueño?: Presiona "Crear Nuevo Negocio" para iniciar tu punto de venta desde cero.',
          '¿Eres empleado?: Presiona el botón de "Vincular Llave" e introduce el código secreto que te dé tu jefe.',
          'Dispositivos: Cualquier tableta, iPad o celular puede funcionar como punto de venta secundario.'
        ]}
        tips={[ // max 3
          'La Llave de Vinculación se genera automáticamente y la puedes ver en "Ajustes", nunca caduca.',
          'El PIN Maestro es exclusivamente para "Reclamar Acceso" en caso de perder tu cuenta, consérvalo.',
          'No es necesario pagar para sincronizar tus equipos.'
        ]}
      />

    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingTop: 8, paddingBottom: 40 },
  content: { paddingHorizontal: 24, justifyContent: 'center' },
  btnGuia: { position: 'absolute', top: 20, right: 20, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', zIndex: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },

  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoBlob: {
    width: 90, height: 90, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8E2DE2', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  logoText: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },

  titleBlock: { alignItems: 'center', marginBottom: 40 },
  appName: { fontSize: 42, letterSpacing: -2, marginBottom: 8 },
  subtitle: { fontSize: sizes.fontLg, fontWeight: '600', marginBottom: 4 },
  subtitleSmall: { fontSize: sizes.fontMd, fontWeight: '500' },

  featuresBlock: { gap: 14, marginBottom: 20 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 18, borderRadius: sizes.radiusXl,
  },
  featureIcon: {
    width: 52, height: 52, borderRadius: sizes.radiusLg,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  featureInfo: { flex: 1 },
  featureTitle: { fontSize: sizes.fontBase, fontWeight: '700', marginBottom: 4 },
  featureDesc: { fontSize: sizes.fontSm, lineHeight: 18 },

  btnContainer: { paddingBottom: 32, marginTop: 10 },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: sizes.radiusXl, gap: 10,
  },
  btnText: { color: '#fff', fontSize: sizes.fontLg, fontWeight: '800' },
  btnArrow: { color: '#fff', fontSize: 22, fontWeight: '700' },
  btnVincular: { paddingVertical: 18, borderRadius: sizes.radiusXl, alignItems: 'center' },
  btnVincularText: { fontSize: sizes.fontBase, fontWeight: '700' },
  footerText: { fontSize: sizes.fontSm, textAlign: 'center', marginTop: 16, fontWeight: '500' },

  modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalCard: { width: '85%', borderRadius: sizes.radius2xl, padding: 24, position: 'relative' },
  closeModalBtn: { position: 'absolute', top: 16, right: 16, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: sizes.fontXl, fontWeight: '800', marginBottom: 8, marginTop: 10 },
  modalSub: { fontSize: sizes.fontSm, marginBottom: 24, lineHeight: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: sizes.radiusLg, borderWidth: 1, marginBottom: 24 },
  input: { flex: 1, fontSize: sizes.fontBase, fontWeight: '600', letterSpacing: 2 },
  btnSubmitModal: { paddingVertical: 16, borderRadius: sizes.radiusXl, alignItems: 'center' },
  btnSubmitModalText: { color: '#fff', fontSize: sizes.fontBase, fontWeight: '800' }
});
