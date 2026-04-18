import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isPhone = !isTablet;

  const deviceType: DeviceType = isDesktop 
    ? 'desktop' 
    : isTablet 
      ? 'tablet' 
      : 'phone';

  // Factores de escala basados en el ancho de pantalla (guía base 375px)
  const scale = width / 375;
  const moderateScale = (size: number, factor = 0.5) => size + (size * scale - size) * factor;

  // Padding de contenido adaptativo
  const contentPadding = isDesktop ? 48 : isTablet ? 32 : 16;
  
  // Grid System
  const gap = moderateScale(12);
  const numColumns = isDesktop ? 4 : isTablet ? 3 : 2;
  const gridColumnWidth = (width - (contentPadding * 2) - (gap * (numColumns - 1))) / numColumns;

  // Font sizes responsivos (mínimos y máximos para evitar extremos)
  const fontScale = PixelRatio.getFontScale();
  const getFontSize = (size: number) => {
    const scaledSize = moderateScale(size);
    // Limitar el crecimiento excesivo en pantallas muy grandes
    return Math.min(scaledSize, size * 1.5) / fontScale;
  };

  return {
    width,
    height,
    isLandscape,
    isTablet,
    isDesktop,
    isPhone,
    deviceType,
    contentPadding,
    gap,
    numColumns,
    gridColumnWidth,
    getFontSize,
    moderateScale,
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
  };
}
