import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { sizes } from '../theme';

export function Splash() {
  const { colors: c } = useTheme();

  return (
    <View style={[st.container, { backgroundColor: c.bg }]}>
      <View style={[st.logoBox, { backgroundColor: c.surface }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
      <Text style={[st.text, { color: c.textSec }]}>Iniciando Inventra...</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: sizes.radiusXl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  text: {
    fontSize: sizes.fontMd,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  }
});
