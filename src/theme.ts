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
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EDE8',
  text: '#1A1A1A',
  textSec: '#4A4A4A',
  textTer: '#8A8A8A',
  border: '#E2DFDA',
  accent: '#2D6A4F',
  danger: '#B5303A',
  warning: '#B45309',
  info: '#1D4ED8',
  purple: '#7C3AED',
  softBlue: '#E0F2FE', // Cielo muy suave
  softOrange: '#FFF7ED', // Naranja/Crema muy suave
  softGreen: '#F0FDF4', // Menta muy suave
  softPurple: '#F5F3FF', // Lavanda muy suave
  softYellow: '#FEFCE8', // Limón muy suave
  softPink: '#FDF2F8', // Rosa muy suave
  softCyan: '#ECFEFF', // Cyan muy suave
  statusBar: 'dark-content',
};

// ─── Paleta oscura ────────────────────────────────────────────────────────────

export const dark: ThemeColors = {
  bg: '#0B141A',          // WhatsApp dark background
  surface: '#111B21',     // WhatsApp appbar/panel color
  surfaceAlt: '#202C33',  // WhatsApp input/bubble color
  text: '#E9EDEF',        // WhatsApp primary text
  textSec: '#8696A0',     // WhatsApp secondary text
  textTer: '#667781',     // WhatsApp tertiary text
  border: '#2A3942',      // WhatsApp divider
  accent: '#00A884',      // WhatsApp Green Accent
  danger: '#F15C6D',      // Softer red for WhatsApp theme
  warning: '#FFD279',
  info: '#53BDEB',        // WhatsApp blue tick color
  purple: '#BF5AF2',
  softBlue: '#0C1A21',
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
