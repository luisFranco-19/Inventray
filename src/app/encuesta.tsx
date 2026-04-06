import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Animated, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useBusiness, NEGOCIOS, type TipoNegocio, type SubTipoNegocio, METODOS_PAGO_OPCIONES } from '../context/BusinessContext';
import { LinearGradient } from 'expo-linear-gradient';
import { sizes } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

// ─── Opciones de negocio ──────────────────────────────────────────────────────

const OPCIONES: { tipo: TipoNegocio; titulo: string; desc: string; icono: string; gradiente: [string, string] }[] = [
  { tipo: 'ropa',       titulo: 'Ropa y Moda',   desc: 'Tallas, colores, temporadas',   icono: '👗', gradiente: ['#8E2DE2', '#4A00E0'] },
  { tipo: 'tecnologia', titulo: 'Tecnología',     desc: 'Gadgets, accesorios, cómputo',  icono: '💻', gradiente: ['#1D4ED8', '#3B82F6'] },
  { tipo: 'belleza',    titulo: 'Belleza',        desc: 'Cosméticos, skincare, cabello',  icono: '💄', gradiente: ['#E91E8C', '#F472B6'] },
  { tipo: 'pintura',    titulo: 'Pintura',        desc: 'Litros, acabados, colores',      icono: '🎨', gradiente: ['#FF6B35', '#F59E0B'] },
  { tipo: 'alimentos',  titulo: 'Alimentos',      desc: 'Peso, presentación, perecederos',icono: '🍞', gradiente: ['#16A34A', '#22C55E'] },
  { tipo: 'general',    titulo: 'Otro / General',  desc: 'Configura a tu medida',          icono: '📦', gradiente: ['#6B7280', '#9CA3AF'] },
];

export default function Encuesta() {
  const { colors: c, isDark } = useTheme();
  const { configurarNegocio } = useBusiness();
  const { isTablet, contentPadding, width: screenWidth } = useResponsive();
  
  // Determinar número de columnas basadas en el ancho del dispositivo (Tablet vs Phone)
  const numColumns = isTablet ? 3 : 2;
  const gap = 14;
  const cardWidth = (screenWidth - contentPadding * 2 - (gap * (numColumns - 1))) / numColumns;

  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoNegocio | null>(null);
  const [subtipoSeleccionado, setSubtipoSeleccionado] = useState<string | null>(null);
  const [metodosSeleccionados, setMetodosSeleccionados] = useState<string[]>(['efectivo']);
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Animación de transición entre pasos
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animarTransicion = (siguientePaso: 1 | 2 | 3 | 4 | 5, isAtras: boolean = false) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: isAtras ? 30 : -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setPaso(siguientePaso);
      slideAnim.setValue(isAtras ? -30 : 30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const irAlSiguiente = () => {
    if (paso === 1) {
      if (!tipoSeleccionado) { Alert.alert('Selecciona un tipo', 'Elige la categoría principal.'); return; }
      animarTransicion(2);
    } else if (paso === 2) {
      if (!subtipoSeleccionado) { Alert.alert('Selecciona un rubro', 'Elige el rubro específico de tu tienda.'); return; }
      animarTransicion(3);
    } else if (paso === 3) {
      if (metodosSeleccionados.length === 0) { Alert.alert('Selecciona un método', 'Debes elegir al menos un método de pago.'); return; }
      animarTransicion(4);
    } else if (paso === 4) {
      if (!nombreNegocio.trim()) { Alert.alert('Nombre requerido', 'Dale un nombre a tu negocio.'); return; }
      animarTransicion(5);
    }
  };

  const irAlAnterior = () => {
    if (paso === 5) animarTransicion(4, true);
    if (paso === 4) animarTransicion(3, true);
    if (paso === 3) animarTransicion(2, true);
    if (paso === 2) animarTransicion(1, true);
  };

  const finalizar = async () => {
    if (!tipoSeleccionado || !subtipoSeleccionado) return;
    if (adminPin.length !== 4) {
      Alert.alert('Datos incompletos', 'Por favor ingresa un PIN de 4 dígitos para tu seguridad.');
      return;
    }
    const nombre = nombreNegocio.trim() || 'Mi Negocio';
    setGuardando(true);
    try {
      await configurarNegocio(tipoSeleccionado, subtipoSeleccionado, nombre, metodosSeleccionados, ownerName, adminPin, adminEmail);
      // Navegar al inicio reemplazando el stack para que no pueda volver atrás
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo guardar la configuración. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const opcionSeleccionada = tipoSeleccionado ? OPCIONES.find(o => o.tipo === tipoSeleccionado) : null;
  const negocioInfo = tipoSeleccionado ? NEGOCIOS[tipoSeleccionado] : null;

  return (
    <SafeAreaView style={[st.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

      {/* Progress Bar */}
      <View style={[st.progressContainer, { paddingHorizontal: contentPadding }]}>
        <View style={[st.progressTrack, { backgroundColor: c.surfaceAlt }]}>
          <View style={[st.progressFill, { width: 
              paso === 1 ? '20%' : 
              paso === 2 ? '40%' : 
              paso === 3 ? '60%' : 
              paso === 4 ? '80%' : '100%', 
              backgroundColor: tipoSeleccionado ? opcionSeleccionada?.gradiente[0] : c.accent 
            }]} 
          />
        </View>
        <Text style={[st.progressLabel, { color: c.textTer }]}>Paso {paso} de 5</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <Animated.View style={[st.animatedContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {paso === 1 ? (
            /* ─── PASO 1: Tipo de Negocio ──────────────────────── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.scrollContent, { paddingHorizontal: contentPadding }]}>
              <View style={[st.headerBlock, isTablet && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}>
                <Text style={[st.stepTitle, { color: c.text }]}>¿Qué tipo de negocio tienes?</Text>
                <Text style={[st.stepDesc, { color: c.textSec }]}>
                  Selecciona la categoría que mejor represente tu tienda. Esto personalizará toda la experiencia.
                </Text>
              </View>

              <View style={[st.grid, isTablet && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}>
                {OPCIONES.map((op) => {
                  const isSelected = tipoSeleccionado === op.tipo;
                  return (
                    <TouchableOpacity
                      key={op.tipo}
                      style={[
                        st.opcionCard,
                        {
                          width: cardWidth,
                          backgroundColor: c.surface,
                          borderColor: isSelected ? op.gradiente[0] : 'transparent',
                          borderWidth: 2
                        },
                      ]}
                      onPress={() => {
                        setTipoSeleccionado(op.tipo);
                        setSubtipoSeleccionado(null);
                      }}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <LinearGradient
                          colors={op.gradiente}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={st.selectedIndicator}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                        </LinearGradient>
                      )}
                      <View style={[st.opcionIconWrap, { backgroundColor: op.gradiente[0] + '15' }]}>
                        <Text style={{ fontSize: 32 }}>{op.icono}</Text>
                      </View>
                      <Text style={[st.opcionTitulo, { color: c.text }]}>{op.titulo}</Text>
                      <Text style={[st.opcionDesc, { color: c.textTer }]}>{op.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : paso === 2 ? (
            /* ─── PASO 2: Sub-tipo de Negocio ──────────────────────── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.scrollContent, { paddingHorizontal: contentPadding }]}>
              <View style={[st.headerBlock, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                <Text style={[st.stepTitle, { color: c.text }]}>¿A qué nicho en específico te dedicas?</Text>
                <Text style={[st.stepDesc, { color: c.textSec }]}>
                  Adaptaremos los perfiles, campos e inventarios para que coincidan con cómo manejas tu mercancía.
                </Text>
              </View>
              {negocioInfo && (
                <View style={[isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }, { gap: 14 }]}>
                  {negocioInfo.subtipos.map((s: SubTipoNegocio) => {
                    const isSel = subtipoSeleccionado === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          st.subOpcionCard,
                          {
                            backgroundColor: c.surface,
                            borderColor: isSel ? opcionSeleccionada?.gradiente[0] : (isDark ? c.surfaceAlt : c.border),
                            borderWidth: isSel ? 2 : 1
                          }
                        ]}
                        onPress={() => setSubtipoSeleccionado(s.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[st.subOpcionTitulo, { color: c.text }]}>{s.nombre}</Text>
                          <View style={st.subOpcionChipsRow}>
                            <Text style={[st.subOpcionChip, { backgroundColor: c.surfaceAlt, color: c.textSec }]}>📝 {s.labelAtributo1}</Text>
                            <Text style={[st.subOpcionChip, { backgroundColor: c.surfaceAlt, color: c.textSec }]}>🏷️ {s.labelAtributo2}</Text>
                          </View>
                        </View>
                        {isSel && (
                          <View style={[st.subIconoCircle, { backgroundColor: opcionSeleccionada?.gradiente[0] }]}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          ) : paso === 3 ? (
            /* ─── PASO 3: Métodos de Pago ──────────────────── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.scrollContent, { paddingHorizontal: contentPadding }]}>
              <View style={[st.headerBlock, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                <Text style={[st.stepTitle, { color: c.text }]}>¿Cómo prefieres cobrar?</Text>
                <Text style={[st.stepDesc, { color: c.textSec }]}>
                  Selecciona los métodos de pago que aceptas. Podrás cambiarlos luego en los ajustes.
                </Text>
              </View>

              <View style={[isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }, { gap: 12 }]}>
                {METODOS_PAGO_OPCIONES.map((metodo) => {
                  const seleccionado = metodosSeleccionados.includes(metodo.id);
                  return (
                    <TouchableOpacity
                      key={metodo.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (seleccionado) {
                          setMetodosSeleccionados(prev => prev.filter(p => p !== metodo.id));
                        } else {
                          setMetodosSeleccionados(prev => [...prev, metodo.id]);
                        }
                      }}
                      style={[
                        st.subOpcionCard,
                        {
                          borderColor: seleccionado ? opcionSeleccionada?.gradiente[0] : (isDark ? c.surfaceAlt : c.border),
                          borderWidth: seleccionado ? 2 : 1,
                          backgroundColor: c.surface
                        }
                      ]}
                    >
                      <Text style={{ fontSize: 24, marginRight: 16 }}>{metodo.icon}</Text>
                      <Text style={[st.subOpcionTitulo, { color: c.text, flex: 1, marginBottom: 0 }]}>{metodo.label}</Text>
                      {seleccionado && (
                        <View style={[st.subIconoCircle, { backgroundColor: opcionSeleccionada?.gradiente[0] }]}>
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : paso === 4 ? (
            /* ─── PASO 4: Nombre del Negocio ──────────────────── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.scrollContent, { paddingHorizontal: contentPadding }]}>
              <View style={[st.headerBlock, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                <Text style={[st.stepTitle, { color: c.text }]}>Nombre del Negocio</Text>
                <Text style={[st.stepDesc, { color: c.textSec }]}>¿Cómo se llama tu tienda? Este nombre aparecerá en tus tickets y reportes.</Text>
              </View>
              <View style={[isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                <TextInput
                  style={[st.inputGrande, { backgroundColor: c.surfaceAlt, color: c.text }]}
                  placeholder="Ej: Tienda 'La Bendición'"
                  placeholderTextColor={c.textTer}
                  value={nombreNegocio}
                  onChangeText={setNombreNegocio}
                  autoFocus
                />
              </View>
            </ScrollView>
          ) : (
            /* ─── PASO 5: Seguridad y Dueño ──────────────────── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.scrollContent, { paddingHorizontal: contentPadding }]}>
              <View style={[st.headerBlock, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                <Text style={[st.stepTitle, { color: c.text }]}>Seguridad y Dueño</Text>
                <Text style={[st.stepDesc, { color: c.textSec }]}>Define quién es el dueño y un PIN de 4 dígitos para recuperar el acceso administrativo.</Text>
              </View>
              
              <View style={[isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                <Text style={[st.label, { color: c.textTer }]}>NOMBRE DEL DUEÑO (OPCIONAL)</Text>
                <TextInput
                  style={[st.inputGrande, { backgroundColor: c.surfaceAlt, color: c.text, marginBottom: 20 }]}
                  placeholder="Tu nombre completo"
                  placeholderTextColor={c.textTer}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  textContentType="username"
                  autoComplete="username"
                />

                <Text style={[st.label, { color: c.textTer }]}>CORREO ELECTRÓNICO (OPCIONAL, PARA RECUPERACIÓN)</Text>
                <TextInput
                  style={[st.inputGrande, { backgroundColor: c.surfaceAlt, color: c.text, marginBottom: 20 }]}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor={c.textTer}
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textContentType="emailAddress"
                  autoComplete="email"
                />

                <Text style={[st.label, { color: c.textTer }]}>PIN DE ADMINISTRADOR (4 DÍGITOS)</Text>
                <TextInput
                  style={[st.inputGrande, { backgroundColor: c.surfaceAlt, color: c.text, textAlign: 'center', fontSize: 32, letterSpacing: 10 }]}
                  placeholder="1234"
                  placeholderTextColor={c.textTer}
                  value={adminPin}
                  onChangeText={setAdminPin}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password-new"
                />
                <Text style={{ color: c.textTer, fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                  🔒 Este PIN te permitirá recuperar el control del negocio si inicias sesión en otro dispositivo.
                </Text>
              </View>
            </ScrollView>
          )}

        </Animated.View>

      </KeyboardAvoidingView>

      {/* Botones de Acción */}
      <View style={[st.actionsContainer, { paddingHorizontal: contentPadding }]}>
        <View style={isTablet && { maxWidth: 800, alignSelf: 'center', width: '100%' }}>
          {(paso < 5) ? (
            <View style={st.actionsRow}>
              {paso === 1 ? (
                <TouchableOpacity style={[st.btnBack, { backgroundColor: c.surfaceAlt }]} onPress={() => router.back()}>
                  <Text style={[st.btnBackText, { color: c.text }]}>← Volver</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[st.btnBack, { backgroundColor: c.surfaceAlt }]} onPress={irAlAnterior}>
                  <Text style={[st.btnBackText, { color: c.text }]}>← Atrás</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={irAlSiguiente}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={(
                    paso === 1 ? tipoSeleccionado : 
                    paso === 2 ? subtipoSeleccionado : 
                    paso === 3 ? metodosSeleccionados.length > 0 :
                    paso === 4 ? nombreNegocio.trim().length > 0 : true
                  ) ? (opcionSeleccionada?.gradiente ?? ['#8E2DE2', '#4A00E0']) : [c.surfaceAlt, c.surfaceAlt]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={st.btnNext}
                >
                  <Text style={[st.btnNextText, { color: (paso === 1 ? tipoSeleccionado : paso === 2 ? subtipoSeleccionado : metodosSeleccionados.length > 0) ? '#fff' : c.textTer }]}>
                    Siguiente →
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={st.actionsRow}>
              <TouchableOpacity
                style={[st.btnBack, { backgroundColor: c.surfaceAlt }]}
                onPress={irAlAnterior}
              >
                <Text style={[st.btnBackText, { color: c.text }]}>← Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={finalizar}
                disabled={guardando}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={opcionSeleccionada?.gradiente ?? ['#8E2DE2', '#4A00E0']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[st.btnNext, guardando && { opacity: 0.6 }]}
                >
                  <Text style={st.btnNextText}>
                    {guardando ? 'Guardando...' : '✨ Finalizar Configuración'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  progressContainer: { paddingTop: 16, paddingBottom: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: sizes.fontXs, fontWeight: '600', textAlign: 'right' },
  
  animatedContainer: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  
  headerBlock: { paddingTop: 16, paddingBottom: 24 },
  stepTitle: { fontSize: sizes.font2xl, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  stepDesc: { fontSize: sizes.fontMd, lineHeight: 22, fontWeight: '500' },
  
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 14,
  },
  opcionCard: {
    padding: 20, borderRadius: sizes.radiusXl,
    alignItems: 'center', position: 'relative',
  },
  selectedIndicator: {
    position: 'absolute', top: 10, right: 10,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  opcionIconWrap: {
    width: 64, height: 64, borderRadius: sizes.radiusLg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  opcionTitulo: { fontSize: sizes.fontBase, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  opcionDesc: { fontSize: sizes.fontXs, textAlign: 'center', lineHeight: 15 },
  
  label: { fontSize: sizes.fontXs, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  inputGrande: { height: 60, borderRadius: sizes.radiusLg, paddingHorizontal: 20, fontSize: sizes.fontLg, fontWeight: '600' },
  
  previewCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: sizes.radiusXl, marginBottom: 24,
  },
  previewGradient: {
    width: 56, height: 56, borderRadius: sizes.radiusLg,
    alignItems: 'center', justifyContent: 'center',
  },
  previewInfo: { flex: 1, paddingHorizontal: 14 },
  previewTipo: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  previewTitulo: { fontSize: sizes.fontLg, fontWeight: '700' },
  
  inputBlock: { marginBottom: 24 },
  inputLabel: { fontSize: sizes.fontMd, fontWeight: '600', marginBottom: 10 },
  inputField: {
    borderWidth: 1, borderRadius: sizes.radiusLg,
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: sizes.fontLg, fontWeight: '600',
  },
  inputHint: { fontSize: sizes.fontXs, marginTop: 6, textAlign: 'right' },
  
  appPreview: { borderRadius: sizes.radiusXl, padding: 20 },
  previewLabel: { fontSize: sizes.fontXs, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16 },
  appPreviewContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  miniLogo: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  labelsPreview: { flexDirection: 'row', gap: 10 },
  labelChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: sizes.radiusFull },
  labelChipText: { fontSize: sizes.fontSm, fontWeight: '600' },
  
  actionsContainer: { paddingBottom: 28, paddingTop: 12 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  btnBack: { paddingHorizontal: 20, paddingVertical: 16, borderRadius: sizes.radiusXl, justifyContent: 'center' },
  btnBackText: { fontSize: sizes.fontBase, fontWeight: '600' },
  btnNext: { paddingVertical: 18, borderRadius: sizes.radiusXl, alignItems: 'center' },
  btnNextText: { color: '#fff', fontSize: sizes.fontBase, fontWeight: '800' },
  
  subOpcionCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: sizes.radiusLg },
  subOpcionTitulo: { fontSize: sizes.fontBase, fontWeight: '700', marginBottom: 6 },
  subOpcionChipsRow: { flexDirection: 'row', gap: 8 },
  subOpcionChip: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontWeight: '600' },
  subIconoCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
});
