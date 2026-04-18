import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Animated, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { sizes } from '../theme';

const { width } = Dimensions.get('window');

interface Step {
  titulo: string;
  desc: string;
  icono: string;
  color: string;
}

interface GuiaModuloProps {
  visible: boolean;
  onClose: () => void;
  pasos: Step[];
  nombreModulo: string;
}

export function GuiaModulo({ visible, onClose, pasos, nombreModulo }: GuiaModuloProps) {
  const { colors: c, isDark } = useTheme();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  if (!pasos || pasos.length === 0) return null;

  const currentStep = pasos[index];

  const siguiente = () => {
    if (index < pasos.length - 1) {
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
      onClose();
      setIndex(0);
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
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' }]} />
        
        <View style={[st.container, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TouchableOpacity style={st.closeIcon} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={c.textTer} />
          </TouchableOpacity>
          <Text style={[st.moduloLabel, { color: c.textTer }]}>AYUDA: {nombreModulo.toUpperCase()}</Text>
          
          <Animated.View style={[st.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <View style={[st.iconCircle, { backgroundColor: currentStep.color + '15' }]}>
               {currentStep.icono.length > 2 ? (
                 <MaterialCommunityIcons name={currentStep.icono as any} size={42} color={currentStep.color} />
               ) : (
                 <Text style={st.iconText}>{currentStep.icono}</Text>
               )}
            </View>
            
            <Text style={[st.titulo, { color: c.text }]}>{currentStep.titulo}</Text>
            <Text style={[st.desc, { color: c.textSec }]}>{currentStep.desc}</Text>
          </Animated.View>

          <View style={st.pagination}>
            {pasos.map((_, i) => (
              <View 
                key={i} 
                style={[
                   st.dot, 
                   { backgroundColor: i === index ? currentStep.color : c.surfaceAlt, width: i === index ? 20 : 8 }
                ]} 
              />
            ))}
          </View>

          <View style={st.footer}>
            {index > 0 ? (
              <TouchableOpacity style={[st.btnSecondary, { backgroundColor: c.bg }]} onPress={atras}>
                <Text style={[st.btnSecondaryText, { color: c.textSec }]}>Atrás</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={st.btnSecondary} onPress={onClose}>
                <Text style={[st.btnSecondaryText, { color: c.textTer }]}>Cerrar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity activeOpacity={0.8} onPress={siguiente} style={{ flex: 1 }}>
              <LinearGradient
                colors={[currentStep.color, currentStep.color]}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={st.btnPrimary}
              >
                <Text style={st.btnPrimaryText}>
                  {index === pasos.length - 1 ? '¡Entendido!' : 'Siguiente'}
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
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { width: '100%', maxWidth: 400, borderRadius: 32, borderWidth: 1, padding: 28, elevation: 10, position: 'relative' },
  closeIcon: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  moduloLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', marginBottom: 20 },
  content: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText: { fontSize: 40 },
  titulo: { fontSize: sizes.fontXl, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: sizes.fontBase, lineHeight: 22, textAlign: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 28 },
  dot: { height: 6, borderRadius: 3 },
  footer: { flexDirection: 'row', gap: 12 },
  btnPrimary: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { fontSize: 16, fontWeight: '600' },
});
