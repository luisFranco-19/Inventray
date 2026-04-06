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
  const incomes = data.map(d => d.ingresos);
  const maxVal = Math.max(...incomes, 100) * 1.1; // 10% de margen arriba
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
            <TrendSegment 
              key={i} 
              item={d} 
              maxVal={maxVal} 
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
            <Text style={[s.leyendaText, { color: c.textSec }]}>Crecimiento (Ventas)</Text>
         </View>
         <View style={s.leyendaItem}>
            <View style={[s.dot, { backgroundColor: c.danger }]} />
            <Text style={[s.leyendaText, { color: c.textSec }]}>Pérdidas</Text>
         </View>
      </View>
    </View>
  );
}

function TrendSegment({ item, maxVal, chartHeight, c, isLast }: { item: DataPoint; maxVal: number; chartHeight: number; c: ThemeColors; isLast: boolean }) {
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: (item.ingresos / maxVal) * chartHeight,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [item, maxVal]);

  return (
    <View style={s.segmentContainer}>
      <View style={[s.barTrack, { height: chartHeight }]}>
        
        {/* Área de Relleno (Simula la línea creciente) */}
        <Animated.View style={[s.areaFill, { height: heightAnim }]}>
           <LinearGradient 
              colors={['#8E2DE2', '#4A00E0', 'rgba(74, 0, 224, 0.1)']} 
              style={StyleSheet.absoluteFill} 
           />
           {/* Punto en la cima para simular nodo de línea */}
           <View style={s.point} />
        </Animated.View>

        {/* Indicador de Merma si existe (Pequeña sombra roja abajo) */}
        {item.mermas > 0 && (
           <View 
             style={[
               s.mermaIndicator, 
               { height: (item.mermas / maxVal) * chartHeight, backgroundColor: c.danger }
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
  barTrack: { width: 18, backgroundColor: 'rgba(128,128,128,0.05)', borderRadius: 9, justifyContent: 'flex-end', overflow: 'hidden' },
  areaFill: { 
    width: '100%', 
    borderRadius: 8, 
    position: 'absolute', 
    bottom: 0,
    borderTopWidth: 2,
    borderTopColor: '#fff', // Efecto de borde superior para que parezca línea
  },
  point: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', position: 'absolute', top: 2, alignSelf: 'center' },
  mermaIndicator: { width: 18, position: 'absolute', bottom: 0, opacity: 0.3, borderRadius: 4 },
  label: { fontSize: 9, marginTop: 10, fontWeight: '700', transform: [{ rotate: '-45deg' }], width: 40, textAlign: 'center' },
  
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 24, paddingBottom: 10 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 4, borderRadius: 2 },
  leyendaText: { fontSize: 13, fontWeight: '700' }
});
