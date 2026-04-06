import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusiness } from '../context/BusinessContext';
import { useTheme } from '../context/ThemeContext';
import { sizes } from '../theme';

export function HeaderBanner() {
  const { config, isAdmin } = useBusiness();
  const { colors: c } = useTheme();

  return (
    <View style={st.container}>
      <LinearGradient
        colors={config.gradiente}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.gradient}
      >
        <View style={st.info}>
          <Text style={st.badge}>{isAdmin ? 'MODO DUEÑO' : 'MODO EMPLEADO'}</Text>
          <Text style={st.negocioNombre}>{config.nombre}</Text>
          <Text style={st.negocioLema}>Transformando tu negocio ✨</Text>
        </View>
        <View style={st.iconWrap}>
          <Text style={st.mainIcon}>{config.icono}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const st = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 10 },
  gradient: {
    padding: 24,
    borderRadius: sizes.radiusXl,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  info: { flex: 1 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    alignSelf: 'flex-start',
    marginBottom: 8,
    letterSpacing: 1
  },
  negocioNombre: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5
  },
  negocioLema: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 4
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mainIcon: { fontSize: 32 }
});
