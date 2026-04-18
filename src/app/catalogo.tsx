import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { obtenerVariantes, type Variante } from '../../database/variantesDB';
import { useTheme } from '../context/ThemeContext';
import { sizes } from '../theme';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';
import { useResponsive } from '../hooks/useResponsive';

export default function CatalogoVirtual() {
  const { colors: c, isDark } = useTheme();
  const { config: biz, tenantId, realtimeEnabled } = useBusiness();
  const router = useRouter();
  const [datos, setDatos] = useState<Variante[]>([]);
  const [generando, setGenerando] = useState(false);
  const { isTablet, contentPadding, numColumns, getFontSize } = useResponsive();

  const loadData = useCallback(async () => {
    const vars = await obtenerVariantes();
    setDatos(vars);
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  // Sincronización en Tiempo Real
  useEffect(() => {
    if (!tenantId) return;

    // Polling condicional: menos frecuente si solo hay 1 dispositivo
    const pollingInterval = realtimeEnabled ? 3000 : 15000;
    const interval = setInterval(() => {
      loadData();
    }, pollingInterval);

    let channel: any = null;
    if (realtimeEnabled) {
      channel = supabase
        .channel('catalogo_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'variante', filter: `negocio_id=eq.${tenantId}` },
        () => {
          loadData();
        }
      )
      .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, loadData, realtimeEnabled]);

  const generarPDF = async () => {
    setGenerando(true);
    try {
      let htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; background-color: #f9fafb; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { font-size: 32px; color: #111827; margin-bottom: 5px; }
              .header p { font-size: 16px; color: #6b7280; }
              .grid { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
              .card { background: #fff; border-radius: 12px; padding: 15px; width: 45%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; align-items: center;}
              .card img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
              .card img.placeholder { background-color: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #9ca3af; text-align: center; line-height: 100px; }
              .title { font-size: 16px; font-weight: bold; color: #1f2937; text-align: center; margin-bottom: 4px; }
              .meta { font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 8px; }
              .price { font-size: 18px; font-weight: 800; color: #10b981; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${biz.nombre}</h1>
              <p>Catálogo de Productos Oficial</p>
            </div>
            <div class="grid">
      `;

      datos.forEach(item => {
        const imageTag = item.imagenUrl 
          ? `<img src="${item.imagenUrl}" />` 
          : `<div class="card img placeholder" style="height: 100px; width: 100px; background: #eee; border-radius: 8px; margin-bottom: 12px; text-align: center; line-height: 100px;">📦</div>`;

        htmlContent += `
          <div class="card">
            ${imageTag}
            <div class="title">${item.productoNombre}</div>
            <div class="meta">${biz.labelAtributo1}: ${item.talla} &bull; ${biz.labelAtributo2}: ${item.color}</div>
            <div class="price">$${item.precio.toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
          </div>
        `;
      });

      htmlContent += `
            </div>
            <div style="text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px;">
              Generado por Inventray · ${new Date().toLocaleDateString('es-MX')}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartir Catálogo' });
    } catch (error) {
      console.error(error);
      alert('Error al generar el catálogo PDF.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <View style={[st.root, { backgroundColor: c.bg }]}>
      <SafeAreaView style={[st.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
        
        <View style={[st.header, { paddingHorizontal: contentPadding }]}>
          <TouchableOpacity style={[st.btnAvatar, { backgroundColor: c.surfaceAlt }]} onPress={goBack}>
             <MaterialCommunityIcons name="arrow-left" size={24} color={c.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingLeft: 12 }}>
             <Text style={[st.headerTitulo, { color: c.text, fontSize: getFontSize(21) }]}>Catálogo Virtual</Text>
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Animated.View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50', transform: [{ scale: pulseAnim }]}} />
                <Text style={{fontSize: 10, color: c.textTer, fontWeight: '700', letterSpacing: 0.5}}>EN VIVO</Text>
             </View>
          </View>
          <TouchableOpacity 
            style={[st.iconBtn, { backgroundColor: c.accent }]} 
            onPress={generarPDF}
            disabled={generando}
          >
             <MaterialCommunityIcons name={generando ? "progress-clock" : "export-variant"} size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={datos}
          keyExtractor={item => item.id.toString()}
          key={numColumns.toString()}
          numColumns={numColumns}
          contentContainerStyle={{ paddingHorizontal: contentPadding, paddingBottom: 40, paddingTop: 16 }}
          columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: getFontSize(16), color: c.textSec, textAlign: 'center' }}>
                Vista previa de tu catálogo. Usa el botón superior derecho para exportarlo y compartirlo con tus clientes.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
               <Text style={{color: c.textTer, fontSize: getFontSize(14)}}>No hay productos en tu inventario para mostrar en el catálogo.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[st.card, { backgroundColor: c.surface }]}>
              {item.imagenUrl ? (
                <Image source={{ uri: item.imagenUrl }} style={st.cardImage} />
              ) : (
                <View style={[st.cardImagePlaceholder, { backgroundColor: c.surfaceAlt }]}>
                  <MaterialCommunityIcons name="package-variant" size={40} color={c.textTer} />
                </View>
              )}
              <Text style={[st.cardTitle, { color: c.text, fontSize: getFontSize(14) }]} numberOfLines={2}>{item.productoNombre}</Text>
              <Text style={[st.cardMeta, { color: c.textTer, fontSize: getFontSize(11) }]}>{item.talla} • {item.color}</Text>
              <Text style={[st.cardPrice, { color: '#10B981', fontSize: getFontSize(18) }]}>${item.precio.toLocaleString('es-MX', {minimumFractionDigits: 2})}</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 16 },
  btnAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { fontWeight: '700' },
  
  card: { flex: 1, borderRadius: sizes.radiusLg, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardImage: { width: 100, height: 100, borderRadius: sizes.radiusMd, marginBottom: 12 },
  cardImagePlaceholder: { width: 100, height: 100, borderRadius: sizes.radiusMd, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  cardMeta: { fontSize: 11, textAlign: 'center', marginBottom: 8 },
  cardPrice: { fontSize: 18, fontWeight: '800' }
});
