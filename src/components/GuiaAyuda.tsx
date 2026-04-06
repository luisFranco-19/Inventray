import React from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  ScrollView, Dimensions, Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { sizes } from '../theme';

const { width } = Dimensions.get('window');

interface GuiaAyudaProps {
  visible: boolean;
  onClose: () => void;
  titulo: string;
  pasos: string[];
  tips: string[];
  color?: string;
}

export function GuiaAyuda({ visible, onClose, titulo, pasos, tips, color }: GuiaAyudaProps) {
  const { colors: c, isDark } = useTheme();
  const accentColor = color || c.accent;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={[st.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* Header con gradiente */}
          <LinearGradient
            colors={[accentColor, accentColor + 'AA']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={st.header}
          >
            <View style={st.headerInfo}>
               <Text style={st.headerIcon}>💡</Text>
               <View style={{ flex: 1, paddingRight: 8 }}>
                 <Text style={st.headerSub}>GUÍA RÁPIDA</Text>
                 <Text style={st.headerTitulo} numberOfLines={2} adjustsFontSizeToFit>{titulo}</Text>
               </View>
            </View>
            <TouchableOpacity onPress={onClose} style={st.btnClose}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
            
            {/* Pasos */}
            <Text style={[st.sectionTitle, { color: c.textTer }]}>¿CÓMO FUNCIONA?</Text>
            {pasos.map((paso, i) => (
              <View key={i} style={st.pasoRow}>
                <View style={[st.pasoNum, { backgroundColor: accentColor + '20' }]}>
                  <Text style={{ color: accentColor, fontWeight: '800' }}>{i + 1}</Text>
                </View>
                <Text style={[st.pasoText, { color: c.text }]}>{paso}</Text>
              </View>
            ))}

            <View style={{ height: 20 }} />

            {/* Tips Pro */}
            <View style={[st.tipCard, { backgroundColor: isDark ? c.surfaceAlt : accentColor + '08', borderColor: accentColor + '30' }]}>
              <Text style={[st.tipTitle, { color: accentColor }]}>✨ Tip Pro</Text>
              {tips.map((tip, i) => (
                <View key={i} style={st.tipRow}>
                  <Text style={st.tipBullet}>•</Text>
                  <Text style={[st.tipText, { color: c.textSec }]}>{tip}</Text>
                </View>
              ))}
            </View>

          </ScrollView>

          <TouchableOpacity 
            style={[st.btnCerrar, { backgroundColor: accentColor }]} 
            onPress={onClose}
          >
            <Text style={st.btnCerrarText}>¡Entendido!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 }
    })
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 32,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitulo: {
    color: '#fff',
    fontSize: sizes.fontXl,
    fontWeight: '800',
  },
  btnClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 16,
  },
  pasoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  pasoNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  tipCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.3)',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  btnCerrar: {
    margin: 24,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  btnCerrarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
