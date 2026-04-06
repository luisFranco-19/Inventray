import * as React from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { BusinessProvider } from '../context/BusinessContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';

function RootNavigation() {
  const { colors, isDark } = useTheme();

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const setNavBar = async () => {
        try {
          await NavigationBar.setBackgroundColorAsync(colors.bg);
          await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
        } catch (e) {
          // Fallback
        }
      };
      setNavBar();
    }
  }, [colors.bg, isDark]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
       <Stack
         screenOptions={{
           headerShown: false,
           animation: 'slide_from_right',
           contentStyle: { backgroundColor: colors.bg },
         }}
       />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BusinessProvider>
            <RootNavigation />
          </BusinessProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
