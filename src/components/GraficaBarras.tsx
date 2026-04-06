import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors } from '../theme';

interface DataPoint {
  etiqueta: string;
  ingresos: number;
  mermas: number;
  utilidad: number;
}

interface Props {
  data: DataPoint[];
  colors: ThemeColors;
  isDark: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function GraficaBarras({ data, colors: c, isDark }: Props) {
  const maxVal = Math.max(...data.map(d => Math.max(d.ingresos, d.mermas, 100)), 1);
  const chartHeight = 220;

  return (
    <View style={s.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        <View style={s.chartArea}>
          {data.map((d, i) => (
            <BarGroup 
              key={i} 
              item={d} 
              maxVal={maxVal} 
              chartHeight={chartHeight} 
              c={c} 
            />
          ))}
        </View>
      </ScrollView>

      {/* Leyenda */}
      <View style={s.leyenda}>
         <View style={s.leyendaItem}>
            <View style={[s.dot, { backgroundColor: '#4A00E0' }]} />
            <Text style={[s.leyendaText, { color: c.textSec }]}>Ingresos</Text>
         </View>
         <View style={s.leyendaItem}>
            <View style={[s.dot, { backgroundColor: c.danger }]} />
            <Text style={[s.leyendaText, { color: c.textSec }]}>Pérdidas</Text>
         </View>
         <View style={s.leyendaItem}>
            <View style={[s.dot, { backgroundColor: '#34C759' }]} />
            <Text style={[s.leyendaText, { color: c.textSec }]}>Utilidad</Text>
         </View>
      </View>
    </View>
  );
}

function BarGroup({ item, maxVal, chartHeight, c }: { item: DataPoint; maxVal: number; chartHeight: number; c: ThemeColors }) {
  const animIngreso = useRef(new Animated.Value(0)).current;
  const animMerma = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animIngreso, { toValue: (item.ingresos / maxVal) * chartHeight, duration: 800, useNativeDriver: false }),
      Animated.timing(animMerma, { toValue: (item.mermas / maxVal) * chartHeight, duration: 1000, useNativeDriver: false }),
    ]).start();
  }, [item, maxVal]);

  return (
    <View style={s.barGroup}>
      <View style={[s.barTrack, { height: chartHeight }]}>
        
        {/* Barra de Ingreso */}
        <Animated.View style={[s.barBase, { height: animIngreso, zIndex: 2 }]}>
           <LinearGradient 
              colors={['#8E2DE2', '#4A00E0']} 
              style={StyleSheet.absoluteFill} 
           />
        </Animated.View>

        {/* Barra de Merma (Sutilmente detrás o al lado) */}
        <Animated.View style={[s.barMerma, { height: animMerma, backgroundColor: c.danger, zIndex: 1 }]} />

      </View>
      <Text style={[s.label, { color: c.textTer }]} numberOfLines={1}>{item.etiqueta}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 10 },
  scrollContent: { paddingHorizontal: 10, paddingBottom: 10 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 260 },
  barGroup: { width: 50, alignItems: 'center', marginHorizontal: 4 },
  barTrack: { width: 14, backgroundColor: 'rgba(128,128,128,0.1)', borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  barBase: { width: '100%', borderRadius: 7, position: 'absolute', bottom: 0 },
  barMerma: { width: '100%', borderRadius: 7, opacity: 0.6 },
  label: { fontSize: 10, marginTop: 8, fontWeight: '600', transform: [{ rotate: '-45deg' }], width: 40, textAlign: 'center' },
  
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 24, paddingBottom: 10 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  leyendaText: { fontSize: 12, fontWeight: '600' }
});
