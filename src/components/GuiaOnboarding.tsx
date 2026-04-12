import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Animated, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusiness } from '../context/BusinessContext';
import { useTheme } from '../context/ThemeContext';
import { sizes } from '../theme';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: number;
  titulo: string;
  desc: string;
  icono: string;
  color: string;
}

const SLIDES: Slide[] = [
  {
    id: 0,
    titulo: '¡Hola! Te damos la bienvenida',
    desc: 'Tu negocio está listo para despegar. Hemos configurado lo básico para que empieces hoy mismo.',
    icono: 'sparkles',
    color: '#8E2DE2',
  },
  {
    id: 1,
    titulo: 'Gestiona tu Inventario',
    desc: 'Agrega productos, define variantes (tallas, colores) y recibe alertas cuando el stock esté bajo.',
    icono: 'package-variant',
    color: '#1D4ED8',
  },
  {
    id: 2,
    titulo: 'Vende en Segundos',
    desc: 'Usa el "Punto de Venta" para cobrar rápido. Es compatible con escáner de barras y múltiples pagos.',
    icono: 'shopping',
    color: '#16A34A',
  },
  {
    id: 3,
    titulo: 'Métricas de Éxito',
    desc: 'En "Reportes Financieros" verás tus ganancias netas, productos más vendidos y salud de tu negocio.',
    icono: 'chart-line',
    color: '#E91E8C',
  },
];

export function GuiaOnboarding() {
  const { hasSeenGuide, completarGuia, config, isLoading } = useBusiness();
  const { colors: c, isDark } = useTheme();
  
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // No mostrar si ya la vio o si todavía está cargando
  if (isLoading || hasSeenGuide) return null;

  const currentSlide = SLIDES[index];

  const saltar = () => {
    completarGuia();
  };

  const siguiente = () => {
    if (index < SLIDES.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setIndex(prev => prev + 1);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    } else {
      saltar();
    }
  };

  const atras = () => {
    if (index > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setIndex(prev => prev - 1);
        slideAnim.setValue(-20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    }
  };

  return (
    <Modal transparent visible={!hasSeenGuide} animationType="fade">
      <View style={st.overlay}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' }]} />
        
        <View style={[st.container, { backgroundColor: c.surface, borderColor: c.border }]}>
          
          <Animated.View style={[st.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <View style={[st.iconCircle, { backgroundColor: currentSlide.color + '20' }]}>
               <MaterialCommunityIcons name={currentSlide.icono as any} size={48} color={currentSlide.color} />
            </View>
            
            <Text style={[st.titulo, { color: c.text }]}>
              {index === 0 ? '¡Hola! Bienvenido a Inventray' : currentSlide.titulo}
            </Text>

            
            <Text style={[st.desc, { color: c.textSec }]}>
              {currentSlide.desc}
            </Text>
          </Animated.View>

          {/* Progress Indicators */}
          <View style={st.pagination}>
            {SLIDES.map((_, i) => (
              <View 
                key={i} 
                style={[
                   st.dot, 
                   { backgroundColor: i === index ? currentSlide.color : c.surfaceAlt, width: i === index ? 24 : 8 }
                ]} 
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={st.footer}>
            {index > 0 ? (
              <TouchableOpacity style={[st.btnSecondary, { backgroundColor: c.bg }]} onPress={atras}>
                <Text style={[st.btnSecondaryText, { color: c.textSec }]}>Atrás</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={st.btnSecondary} onPress={saltar}>
                <Text style={[st.btnSecondaryText, { color: c.textTer }]}>Saltar guía</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity activeOpacity={0.8} onPress={siguiente} style={{ flex: 1 }}>
              <LinearGradient
                colors={[currentSlide.color, currentSlide.color]}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={st.btnPrimary}
              >
                <Text style={st.btnPrimaryText}>
                  {index === SLIDES.length - 1 ? '¡Listo para empezar!' : 'Siguiente'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 32,
    borderWidth: 1,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 48,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  desc: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  btnPrimary: {
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
