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

/**
 * GraficaLineal: Simula una gráfica de área/tendencia usando barras de alta densidad
 * para lograr un efecto premium sin dependencias de SVG.
 */
export function GraficaLineal({ data, colors: c, isDark }: Props) {
  if (!data || data.length === 0) {
    return (
      <View style={[s.container, { height: 260, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: c.textTer }}>No hay datos disponibles para este período</Text>
      </View>
    );
  }

  const values = data.flatMap(d => [d.ingresos, d.utilidad]);
  const maxVal = Math.max(...values, 100) * 1.1; 
  const minVal = Math.min(...values, 0); // Consider negative utility
  const chartHeight = 220;
  const range = maxVal - minVal;

  return (
    <View style={s.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        <View style={s.chartArea}>
          {data.map((d, i) => (
            <TrendSegment 
              key={i} 
              item={d} 
              maxVal={maxVal} 
              minVal={minVal}
              range={range}
              chartHeight={chartHeight} 
              c={c} 
              isLast={i === data.length - 1}
            />
          ))}
        </View>
      </ScrollView>

      {/* Leyenda de Crecimiento */}
      <View style={s.leyenda}>
         <View style={s.leyendaItem}>
            <View style={[s.dot, { backgroundColor: '#8E2DE2' }]} />
            <Text style={[s.leyendaText, { color: c.textSec }]}>Ingresos</Text>
         </View>
         <View style={s.leyendaItem}>
            <View style={[s.dot, { backgroundColor: '#34C759' }]} />
            <Text style={[s.leyendaText, { color: c.textSec }]}>Utilidad</Text>
         </View>
         <View style={s.leyendaItem}>
            <View style={[s.dot, { backgroundColor: c.danger }]} />
            <Text style={[s.leyendaText, { color: c.textSec }]}>Pérdidas</Text>
         </View>
      </View>
    </View>
  );
}

function TrendSegment({ item, maxVal, minVal, range, chartHeight, c, isLast }: { item: DataPoint; maxVal: number; minVal: number; range: number; chartHeight: number; c: ThemeColors; isLast: boolean }) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const utilityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: ((item.ingresos - minVal) / range) * chartHeight,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(utilityAnim, {
        toValue: ((Math.max(0, item.utilidad) - minVal) / range) * chartHeight,
        duration: 1200,
        useNativeDriver: false,
      })
    ]).start();
  }, [item, maxVal, minVal, range]);

  return (
    <View style={s.segmentContainer}>
      <View style={[s.barTrack, { height: chartHeight }]}>
        
        {/* Área de Ingresos */}
        <Animated.View style={[s.areaFill, { height: heightAnim, zIndex: 1 }]}>
           <LinearGradient 
              colors={['#8E2DE2', '#4A00E0', 'rgba(74, 0, 224, 0.1)']} 
              style={StyleSheet.absoluteFill} 
           />
        </Animated.View>

        {/* Área de Utilidad (Superpuesta) */}
        <Animated.View style={[s.utilityFill, { height: utilityAnim, zIndex: 2 }]}>
           <LinearGradient 
              colors={['#34C759', '#10B981', 'rgba(16, 185, 129, 0.2)']} 
              style={StyleSheet.absoluteFill} 
           />
        </Animated.View>

        {/* Indicador de Merma si existe */}
        {item.mermas > 0 && (
           <View 
             style={[
               s.mermaIndicator, 
               { height: (item.mermas / range) * chartHeight, backgroundColor: c.danger, zIndex: 3 }
             ]} 
           />
        )}

      </View>
      <Text style={[s.label, { color: c.textTer }]}>{item.etiqueta}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 10 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 10 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 260 },
  segmentContainer: { width: 34, alignItems: 'center', marginHorizontal: 2 },
  barTrack: { width: 14, backgroundColor: 'rgba(128,128,128,0.05)', borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  areaFill: { 
    width: '100%', 
    borderRadius: 7, 
    position: 'absolute', 
    bottom: 0,
    opacity: 0.8,
  },
  utilityFill: {
    width: '100%',
    borderRadius: 7,
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 2,
    borderTopColor: '#fff',
  },
  mermaIndicator: { width: '100%', position: 'absolute', bottom: 0, opacity: 0.5, borderRadius: 2 },
  label: { fontSize: 8, marginTop: 12, fontWeight: '700', transform: [{ rotate: '-45deg' }], width: 40, textAlign: 'center' },
  
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 24, paddingBottom: 10, flexWrap: 'wrap' },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  leyendaText: { fontSize: 11, fontWeight: '700' }
});
