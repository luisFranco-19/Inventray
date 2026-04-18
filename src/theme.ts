import { StyleSheet, Dimensions } from 'react-native';

// ─── Funciones de Responsividad ───────────────────────────────────────────────
const { width, height } = Dimensions.get('window');
// Guía base: iPhone 11 Pro / X (375x812)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const wp = (percentage: number) => (width * percentage) / 100;
export const hp = (percentage: number) => (height * percentage) / 100;
export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor = 0.3) => {
  const { width } = Dimensions.get('window');
  const scale = (size: number) => (width / guidelineBaseWidth) * size;
  return size + (scale(size) - size) * factor;
};

// ─── Breakpoints y Estado de Dispositivo ──────────────────────────────────────
const { width: currentWidth } = Dimensions.get('window');
export const isTablet = currentWidth >= 768;
export const isLargeTablet = currentWidth >= 1024;
export const isSmallPhone = currentWidth < 360;
export const isPhone = !isTablet;

// ─── Tipo de colores del tema ─────────────────────────────────────────────────

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSec: string;
  textTer: string;
  border: string;
  accent: string;
  danger: string;
  warning: string;
  info: string;
  purple: string;
  // Nuevos colores suaves para Bento Cards
  softBlue: string;
  softOrange: string;
  softGreen: string;
  softPurple: string;
  softYellow: string;
  softPink: string;
  softCyan: string;
  statusBar: 'dark-content' | 'light-content';
};

// ─── Paleta clara ─────────────────────────────────────────────────────────────

export const light: ThemeColors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#E2E8F0',
  text: '#0F172A',
  textSec: '#334155',
  textTer: '#64748B',
  border: '#E2E8F0',
  accent: '#10B981', // Verde Esmeralda dinámico
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  purple: '#8B5CF6',
  softBlue: '#E0F2FE',
  softOrange: '#FFF7ED',
  softGreen: '#F0FDF4',
  softPurple: '#F5F3FF',
  softYellow: '#FEFCE8',
  softPink: '#FDF2F8',
  softCyan: '#ECFEFF',
  statusBar: 'dark-content',
};

// ─── Paleta oscura (Premium) ──────────────────────────────────────────────────

export const dark: ThemeColors = {
  bg: '#020617',          
  surface: '#0F172A',     
  surfaceAlt: '#1E293B',  
  text: '#F8FAFC',        
  textSec: '#CBD5E1',     
  textTer: '#94A3B8',     
  border: '#1E293B',      
  accent: '#34D399', // Verde Esmeralda para oscuridad      
  danger: '#F87171',      // Soft red
  warning: '#FBBF24',
  info: '#60A5FA',        // Light blue
  purple: '#A78BFA',
  softBlue: '#0F172A',
  softOrange: '#1A1410',
  softGreen: '#0E1A11',
  softPurple: '#15111A',
  softYellow: '#1A1A10',
  softPink: '#1A1015',
  softCyan: '#0E1A1A',
  statusBar: 'light-content',
};

export const sizes = {
  // Fuentes escaladas
  fontXs: moderateScale(12),
  fontSm: moderateScale(13),
  fontMd: moderateScale(15),
  fontBase: moderateScale(16),
  fontLg: moderateScale(18),
  fontXl: moderateScale(20),
  font2xl: moderateScale(24),
  font3xl: moderateScale(28),
  font4xl: moderateScale(36),
  font5xl: moderateScale(48),

  // Espaciados escalados
  spacingXs: moderateScale(4),
  spacingSm: moderateScale(8),
  spacingMd: moderateScale(12),
  spacingLg: moderateScale(16),
  spacingXl: moderateScale(20),
  spacing2xl: moderateScale(24),

  // Radios escalados (suavecito para que no se vea picudo)
  radiusSm: moderateScale(10, 0.1),
  radiusMd: moderateScale(16, 0.1),
  radiusLg: moderateScale(28, 0.1),
  radiusXl: moderateScale(36, 0.1),
  radius2xl: moderateScale(42, 0.1),
  radiusFull: 999,

  headerPaddingH: moderateScale(20),
  headerPaddingV: moderateScale(16),

  btnBackSize: moderateScale(36),
};

// ─── Estilos comunes (generados con colores del tema) ─────────────────────────

export function commonStyles(c: ThemeColors) {
  return StyleSheet.create({
    // Raíz
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: sizes.headerPaddingH,
      paddingVertical: sizes.headerPaddingV,
    },
    headerTitle: {
      fontSize: sizes.fontXl,
      fontWeight: '700',
      color: c.text,
    },
    headerSubtitle: {
      fontSize: sizes.fontSm,
      color: c.textSec,
      marginTop: 2,
    },

    // Tarjetas y Contenedores
    card: {
      backgroundColor: c.surface,
      borderRadius: sizes.radiusMd,
      padding: sizes.spacingLg,
      marginBottom: sizes.spacingMd,
      borderWidth: 1,
      borderColor: c.border,
    },

    // Inputs
    input: {
      backgroundColor: c.surfaceAlt,
      borderRadius: sizes.radiusSm,
      padding: sizes.spacingMd,
      color: c.text,
      fontSize: sizes.fontBase,
      borderWidth: 1,
      borderColor: c.border,
    },

    // Botones
    button: {
      backgroundColor: c.accent,
      borderRadius: sizes.radiusMd,
      paddingVertical: sizes.spacingMd,
      paddingHorizontal: sizes.spacingXl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: sizes.fontBase,
      fontWeight: '600',
    },

    // Texto
    label: {
      fontSize: sizes.fontSm,
      fontWeight: '600',
      color: c.textSec,
      marginBottom: sizes.spacingXs,
    },
    value: {
      fontSize: sizes.fontBase,
      color: c.text,
      fontWeight: '700',
    },
    // Modales (Standard)
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: c.surface,
      borderTopLeftRadius: sizes.radius2xl,
      borderTopRightRadius: sizes.radius2xl,
      padding: 24,
      maxHeight: '92%',
    },
    modalTitulo: {
      fontSize: sizes.font2xl,
      fontWeight: '800',
      color: c.text,
      marginBottom: 8,
    },
    modalSub: {
      fontSize: sizes.fontSm,
      color: c.textTer,
      marginBottom: 20,
      lineHeight: 20,
    },
    modalLabel: {
      fontSize: sizes.fontXs,
      fontWeight: '700',
      color: c.textTer,
      marginBottom: 8,
      marginTop: 16,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    modalInput: {
      backgroundColor: c.surfaceAlt,
      borderRadius: sizes.radiusXl,
      padding: 16,
      color: c.text,
      fontSize: sizes.fontBase,
      fontWeight: '600',
    },
    modalBtns: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    modalBtnCancelar: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: sizes.radiusXl,
      alignItems: 'center',
      backgroundColor: c.surfaceAlt,
    },
    modalBtnCancelarText: {
      fontSize: sizes.fontBase,
      fontWeight: '700',
      color: c.textSec,
    },
    modalBtnConfirmar: {
      flex: 2,
      paddingVertical: 16,
      borderRadius: sizes.radiusXl,
      alignItems: 'center',
      backgroundColor: c.accent,
    },
    modalBtnConfirmarText: {
      fontSize: sizes.fontBase,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    // Estados vacíos (Standard)
    vacio: {
      paddingTop: 60,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    vacioTitulo: {
      fontSize: sizes.fontLg,
      fontWeight: '700',
      color: c.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    vacioSub: {
      fontSize: sizes.fontSm,
      color: c.textTer,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
