import { useWindowDimensions } from 'react-native';

export type DeviceType = 'phone' | 'tablet' | 'large-tablet';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const isPhone = !isTablet;

  const deviceType: DeviceType = isLargeTablet 
    ? 'large-tablet' 
    : isTablet 
      ? 'tablet' 
      : 'phone';

  const contentPadding = isTablet ? 32 : 16;
  const gap = 12; // Espacio entre columnas

  // Ancho de columna ideal para grids
  const columnWidth = isLargeTablet 
    ? (width - (contentPadding * 2) - (gap * 3)) / 4 
    : isTablet 
      ? (width - (contentPadding * 2) - (gap * 2)) / 3 
      : (width - (contentPadding * 2) - (gap * 1)) / 2;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    isLargeTablet,
    isPhone,
    deviceType,
    columnWidth,
    contentPadding: isTablet ? 32 : 16,
  };
}
