import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert, Platform, Modal, TextInput, Animated, Clipboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useBusiness, METODOS_PAGO_OPCIONES } from '../context/BusinessContext';
import { sizes } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../hooks/useResponsive';

// ─── Item de sección ──────────────────────────────────────────────────────────

function InfoRow({ label, valor, color, isDark, c }: { label: string; valor: string; color?: string; isDark: boolean; c: any }) {
  return (
    <View style={[st.infoRow, { borderBottomColor: isDark ? c.surfaceAlt : c.border }]}>
      <Text style={[st.infoLabel, { color: c.textSec }]}>{label}</Text>
      <Text style={[st.infoValor, { color: color ?? c.text }]}>{valor}</Text>
    </View>
  );
}

export default function Ajustes() {
  const { colors: c, isDark, toggleTheme } = useTheme();
  const { 
    config: biz, 
    tenantLlave, 
    isAdmin, 
    deviceId,
    dispositivos,
    recargar, 
    actualizarNegocio, 
    resetearGuiaContext, 
    borrarNegocio, 
    reclamarAdmin,
    cambiarRolDispositivo,
    eliminarDispositivo,
    actualizarPermisosDispositivo
  } = useBusiness();
  const router = useRouter();
  const [modalEliminar, setModalEliminar] = useState(false);
  const [modalReclamar, setModalReclamar] = useState(false);
  const [modalPermisos, setModalPermisos] = useState(false);
  const [modalAcciones, setModalAcciones] = useState(false);
  const [dispSeleccionado, setDispSeleccionado] = useState<any>(null);
  const [permisosEdit, setPermisosEdit] = useState<string[]>([]);
  const [pinReclamar, setPinReclamar] = useState('');
  const [reclamando, setReclamando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const { isTablet, contentPadding, width: screenWidth } = useResponsive();

  // Estados Customización
  const [modalEditar, setModalEditar] = useState(false);
  const [editNombre, setEditNombre] = useState(biz.nombre);
  const [editIcono, setEditIcono] = useState(biz.customIcono ?? biz.icono);
  const [editGradiente, setEditGradiente] = useState<[string, string]>(biz.customGradiente ?? biz.gradiente);
  const [editAtributo1, setEditAtributo1] = useState(biz.labelAtributo1 || '');
  const [editAtributo2, setEditAtributo2] = useState(biz.labelAtributo2 || '');
  const [editMetodos, setEditMetodos] = useState<string[]>(biz.metodosPago || ['efectivo']);

  // Sincronizar estados cuando el negocio cambie (ej: al cargar de la DB)
  React.useEffect(() => {
    if (modalEditar) {
      setEditNombre(biz.nombre);
      setEditIcono(biz.customIcono ?? biz.icono);
      setEditGradiente(biz.customGradiente ?? biz.gradiente);
      setEditAtributo1(biz.labelAtributo1 || '');
      setEditAtributo2(biz.labelAtributo2 || '');
      setEditMetodos(biz.metodosPago || ['efectivo']);
    }
  }, [modalEditar, biz]);

  const TAGS_POR_TIPO: Record<string, string[]> = {
    ropa: ['Talla', 'Color', 'Marca', 'Material', 'Temporada', 'Estilo', 'Género'],
    tecnologia: ['Marca', 'Modelo', 'Capacidad', 'Color', 'RAM', 'Estado', 'Garantía'],
    belleza: ['Marca', 'Tono', 'Tamaño', 'Vencimiento', 'Aroma', 'Colección'],
    pintura: ['Color', 'Acabado', 'Base', 'Marca', 'Volumen', 'Superficie'],
    alimentos: ['Caducidad', 'Sabor', 'Peso', 'Marca', 'Variante', 'Ingrediente'],
    general: ['Variante', 'Tipo', 'Marca', 'Categoría', 'Tamaño', 'Material'],
  };
  const tagDisponibles = TAGS_POR_TIPO[biz.tipo] || TAGS_POR_TIPO['general'];

  const toggleTag = (tag: string) => {
    if (tag === editAtributo1) {
      setEditAtributo1(editAtributo2 || '');
      setEditAtributo2('');
    } else if (tag === editAtributo2) {
      setEditAtributo2('');
    } else if (!editAtributo1) {
      setEditAtributo1(tag);
    } else if (!editAtributo2) {
      setEditAtributo2(tag);
    } else {
      setEditAtributo1(editAtributo2);
      setEditAtributo2(tag);
    }
  };

  const toggleMetodo = (mId: string) => {
    if (editMetodos.includes(mId)) {
      if (editMetodos.length > 1) {
        setEditMetodos(prev => prev.filter(x => x !== mId));
      } else {
        Alert.alert('Atención', 'Debes tener al menos un método de pago activo.');
      }
    } else {
      setEditMetodos(prev => [...prev, mId]);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleReclamar = async () => {
    if (pinReclamar.length !== 4) return;
    setReclamando(true);
    try {
      await reclamarAdmin(editNombre, pinReclamar);
      setModalReclamar(false);
      Alert.alert('¡Éxito!', 'Ahora eres administrador. Ya puedes gestionar el negocio.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo validar el PIN.');
    } finally {
      setReclamando(false);
      setPinReclamar('');
    }
  };

  const guardarApariencia = async () => {
    try {
      await actualizarNegocio({
        nombre: editNombre,
        customIcono: editIcono,
        customGradiente: editGradiente,
        labelAtributo1: editAtributo1,
        labelAtributo2: editAtributo2,
        metodosPago: editMetodos
      });
      setModalEditar(false);
      Alert.alert('Éxito', 'Configuración del negocio actualizada correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  const guardarPermisos = async () => {
    if (!dispSeleccionado) return;
    try {
      await actualizarPermisosDispositivo(dispSeleccionado.id, permisosEdit);
      setModalPermisos(false);
      Alert.alert('Éxito', 'Permisos actualizados correctamente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudieron actualizar los permisos.');
    }
  };

  const togglePermiso = (id: string) => {
    setPermisosEdit(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const OPCIONES_TEMA: [string, string][] = [
    ['#8E2DE2', '#4A00E0'],
    ['#FF416C', '#FF4B2B'],
    ['#11998e', '#38ef7d'],
    ['#2193b0', '#6dd5ed'],
    ['#FFB75E', '#ED8F03'],
    ['#c31432', '#240b36'],
    ['#434343', '#000000'],
  ];

  const getColorForDevice = (id?: string) => {
    if (!id) return OPCIONES_TEMA[0];
    let sum = 0;
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
    return OPCIONES_TEMA[sum % (OPCIONES_TEMA.length - 1)]; 
  };

  const confirmarEliminar = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('⚠️ ¿Estás seguro?\n\nSe eliminarán TODOS los datos.')) {
        ejecutarEliminacion();
      }
      return;
    }
    setModalEliminar(true);
  };

  const ejecutarEliminacion = async () => {
    setEliminando(true);
    try {
      await borrarNegocio();
      router.replace('/bienvenida');
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo eliminar el negocio.');
    } finally {
      setEliminando(false);
      setModalEliminar(false);
    }
  };

  const ejecutarSalir = async () => {
    await AsyncStorage.multiRemove(['@mbpos_tenant_id', '@mbpos_is_admin', '@mbpos_local_config']);
    router.replace('/bienvenida');
    setTimeout(() => recargar(), 100); 
  };

  const confirmarSalir = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Cerrar Sesión\n\n¿Estás seguro?')) {
        ejecutarSalir();
      }
      return;
    }
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: ejecutarSalir }
    ]);
  };

  const tipoLabel: Record<string, string> = {
    ropa: 'Ropa y Moda',
    tecnologia: 'Tecnología',
    belleza: 'Belleza',
    pintura: 'Pintura',
    alimentos: 'Alimentos',
    general: 'General',
  };

  return (
    <SafeAreaView style={[st.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

      <View style={[st.header, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity style={[st.btnBack, { backgroundColor: c.surfaceAlt }]} onPress={goBack}>
          <Text style={{ fontSize: 20 }}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={[st.headerTitulo, { color: c.text }]}>Ajustes</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        <View style={[st.section, { paddingHorizontal: contentPadding }]}>
          <Text style={[st.sectionTitle, { color: c.textTer }]}>ACERCA DE LA APP</Text>
          <View style={[st.card, { backgroundColor: c.surface }]}>
            <InfoRow label="Nombre" valor="Inventray" c={c} isDark={isDark} />
            <InfoRow label="Versión" valor="1.1.0" c={c} isDark={isDark} />
            <InfoRow label="Licencia" valor="Premium Edition" color={biz.gradiente[0]} c={c} isDark={isDark} />
          </View>
        </View>

        <View style={[st.section, { paddingHorizontal: contentPadding }, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
          <Text style={[st.sectionTitle, { color: c.textTer }]}>CONFIGURACIÓN DEL NEGOCIO</Text>
          <View style={[st.card, { backgroundColor: c.surface }]}>
            <InfoRow label="Nombre del negocio" valor={biz.nombre} c={c} isDark={isDark} />
            <InfoRow label="Tipo de negocio" valor={tipoLabel[biz.tipo] ?? biz.tipo} c={c} isDark={isDark} />
            {isAdmin && (
              <TouchableOpacity style={[st.featureRow, { borderTopWidth: 1, borderTopColor: isDark ? c.surfaceAlt : c.border }]} onPress={() => setModalEditar(true)}>
                <View style={[st.featureIcon, { backgroundColor: c.accent + '15' }]}>
                   <Text style={{ fontSize: 20 }}>🎨</Text>
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={[st.featureName, { color: c.text }]}>Personalizar Apariencia</Text>
                   <Text style={[st.featureDesc, { color: c.textTer }]}>Cambia nombre, icono y colores</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isAdmin && (
          <View style={[st.section, { paddingHorizontal: contentPadding }, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
            <Text style={[st.sectionTitle, { color: c.textTer }]}>EQUIPOS CONECTADOS ({dispositivos.length})</Text>
            <View style={[st.card, { backgroundColor: c.surface, minHeight: 60, justifyContent: 'center' }]}>
              {dispositivos.map((d, i) => (
                <View key={d.id} style={[st.deviceRow, i < dispositivos.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.surfaceAlt }]}>
                  <View style={st.deviceIconWrap}>
                    <Text style={{ fontSize: 20 }}>{d.rol === 'admin' ? '🛡️' : '📱'}</Text>
                  </View>
                  <View style={st.deviceInfo}>
                    <Text style={[st.deviceName, { color: c.text }]} numberOfLines={1}>{d.nombre}</Text>
                    <View style={st.roleBadge}>
                      <Text style={[st.roleText, { color: c.textTer }]}>
                        {d.rol === 'admin' ? 'ADMINISTRADOR' : 'EMPLEADO'} • {d.permisos?.length || 0} PERMISOS
                      </Text>
                    </View>
                  </View>

                  {isAdmin && d.id !== deviceId && (
                    <TouchableOpacity 
                      style={[st.menuDots, { backgroundColor: c.surfaceAlt }]} 
                      onPress={() => {
                        setDispSeleccionado(d);
                        setModalAcciones(true);
                      }}
                    >
                      <Text style={{ fontSize: 18, color: c.textSec, fontWeight: 'bold', letterSpacing: 1.5 }}>•••</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {isAdmin && (
           <View style={[st.section, { paddingHorizontal: contentPadding }, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
             <View style={[st.cardLlave, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[st.iconCircle, { backgroundColor: c.accent + '20' }]}>
                   <Text style={{ fontSize: 20 }}>🔑</Text>
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={[st.llaveTitulo, { color: c.textTer }]}>LLAVE DE VINCULACIÓN</Text>
                   <Text style={[st.llaveCodigo, { color: c.accent }]}>{tenantLlave ?? 'Cargando...'}</Text>
                </View>
                <TouchableOpacity 
                   style={[st.btnCopiarChico, { backgroundColor: c.accent }]}
                   onPress={() => {
                      if (tenantLlave) {
                         Clipboard.setString(tenantLlave);
                         Alert.alert('Copiado', 'Llave copiada al portapapeles.');
                      }
                   }}
                >
                   <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>COPIAR</Text>
                </TouchableOpacity>
             </View>
           </View>
        )}

        <View style={[st.section, { paddingHorizontal: contentPadding }]}>
           <Text style={[st.sectionTitle, { color: c.textTer }]}>APARIENCIA</Text>
           <View style={[st.card, { backgroundColor: c.surface }]}>
              <TouchableOpacity style={[st.infoRow, { borderBottomColor: c.surfaceAlt, alignItems: 'center' }]} onPress={toggleTheme}>
                 <Text style={[st.infoLabel, { color: c.textSec, flex: 1 }]}>Modo de Visualización</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: c.text, fontWeight: '600' }}>{isDark ? 'Oscuro' : 'Claro'}</Text>
                    <Text style={{ fontSize: 20 }}>{isDark ? '🌙' : '☀️'}</Text>
                 </View>
              </TouchableOpacity>
           </View>
        </View>

        {isAdmin && (
          <View style={[st.section, { paddingHorizontal: contentPadding }, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
            <Text style={[st.sectionTitle, { color: c.danger }]}>ZONA DE PELIGRO</Text>
            <View style={[st.card, { backgroundColor: c.surface, overflow: 'hidden', borderWidth: 1, borderColor: c.danger + '30' }]}>
              <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: 6 }}>Eliminar Negocio</Text>
                <Text style={{ color: c.textTer, fontSize: 14, lineHeight: 20 }}>
                  Esta acción borrará permanently todos tus datos, incluyendo el inventario, catálogo, ventas y configuraciones y tu llave será desconectada de todos los equipos.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[st.dangerBtn, { backgroundColor: c.danger, borderColor: c.danger, marginHorizontal: 20, marginBottom: 20 }]}
                onPress={confirmarEliminar}
              >
                <Text style={{ fontSize: 20 }}>⚠️</Text>
                <Text style={[st.dangerBtnText, { color: '#ffffff', fontSize: 16 }]}>Eliminar Negocio Definitivamente</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isAdmin && (
          <View style={[st.section, { paddingHorizontal: contentPadding }, isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
            <Text style={[st.sectionTitle, { color: c.danger }]}>SESIÓN</Text>
            <TouchableOpacity 
              style={[st.card, { backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', padding: 20 }]}
              onPress={confirmarSalir}
            >
              <View style={[st.featureIcon, { backgroundColor: c.danger + '15' }]}>
                <Text style={{ fontSize: 24 }}>🚪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.featureName, { color: c.danger, fontWeight: '800' }]}>Salir del Negocio</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODALES */}

      <Modal visible={modalEliminar} animationType="fade" transparent onRequestClose={() => setModalEliminar(false)}>
        <View style={[st.modalOverlay, isTablet && { justifyContent: 'center', padding: 40 }]}>
          <View style={[st.modalCard, { backgroundColor: c.surface, borderColor: c.danger, borderWidth: 1 }, isTablet && { maxWidth: 500, alignSelf: 'center' }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.danger + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 32 }}>⚠️</Text>
              </View>
            </View>
            <Text style={[st.modalTitle, { color: c.text }]}>¿Eliminar Negocio?</Text>
            <Text style={{ color: c.textTer, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              Se borrarán <Text style={{fontWeight:'800', color: c.danger}}>TODOS</Text> los datos: inventario, ventas, deudas e ingresos acumulados. Esta acción NO se puede deshacer.
            </Text>
            
            <View style={{ gap: 12 }}>
              <TouchableOpacity style={[st.btnModal, { backgroundColor: c.danger }]} onPress={ejecutarEliminacion} disabled={eliminando}>
                <Text style={[st.btnModalText, { color: '#fff', fontSize: 16 }]}>
                   {eliminando ? 'Eliminando...' : 'Sí, Eliminar para siempre'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btnModal, { backgroundColor: c.surfaceAlt }]} onPress={() => setModalEliminar(false)} disabled={eliminando}>
                <Text style={[st.btnModalText, { color: c.text, fontSize: 16 }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalEditar} animationType="slide" transparent>
         <View style={[st.modalOverlay, isTablet && { justifyContent: 'center', padding: 40 }]}>
            <View style={[st.modalContent, { backgroundColor: c.surface, maxHeight: '85%' }, isTablet && { borderRadius: 24, maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
               <Text style={[st.modalTitle, { color: c.text }]}>Personalizar Negocio</Text>
               
               <ScrollView showsVerticalScrollIndicator={false}>
                 <Text style={st.modalLabel}>Nombre</Text>
                 <TextInput style={[st.modalInput, { backgroundColor: c.surfaceAlt, color: c.text }]} value={editNombre} onChangeText={setEditNombre} />
                 
                 <Text style={st.modalLabel}>Ícono / Emoji</Text>
                 <TextInput style={[st.modalInput, { backgroundColor: c.surfaceAlt, color: c.text, textAlign: 'center' }]} value={editIcono} onChangeText={setEditIcono} maxLength={2} />
                 
                 <Text style={st.modalLabel}>Color del Negocio</Text>
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                   {OPCIONES_TEMA.map((t, i) => (
                     <TouchableOpacity 
                       key={i} 
                       onPress={() => setEditGradiente(t as [string, string])} 
                       style={{
                          width: 44, height: 44, borderRadius: 22, 
                          borderWidth: 3, 
                          borderColor: editGradiente[0] === t[0] ? c.text : 'transparent'
                       }}
                     >
                       <LinearGradient colors={t} style={{ flex: 1, borderRadius: 20 }} />
                     </TouchableOpacity>
                   ))}
                 </View>

                 <Text style={st.modalLabel}>Etiquetas de Catálogo (MÁX 2)</Text>
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                   {tagDisponibles.map(tag => {
                     const activo = editAtributo1 === tag || editAtributo2 === tag;
                     return (
                       <TouchableOpacity 
                         key={tag} 
                         onPress={() => toggleTag(tag)}
                         style={{
                           paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, 
                           backgroundColor: activo ? c.accent : c.surfaceAlt,
                           borderWidth: 1, borderColor: activo ? c.accent : c.border
                         }}
                       >
                         <Text style={{ fontSize: 13, fontWeight: '600', color: activo ? '#fff' : c.text }}>
                           {tag}
                         </Text>
                       </TouchableOpacity>
                     );
                   })}
                 </View>

                 <Text style={st.modalLabel}>Métodos de Pago Aceptados</Text>
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                   {METODOS_PAGO_OPCIONES.map(m => {
                     const activo = editMetodos.includes(m.id);
                     return (
                       <TouchableOpacity 
                         key={m.id} 
                         onPress={() => toggleMetodo(m.id)}
                         style={{
                           paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, 
                           backgroundColor: activo ? c.accent : c.surfaceAlt,
                           borderWidth: 1, borderColor: activo ? c.accent : c.border,
                           flexDirection: 'row', alignItems: 'center', gap: 8
                         }}
                       >
                         <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: activo ? '#fff' : c.border, alignItems: 'center', justifyContent: 'center' }}>
                           {activo && <Text style={{ color: c.accent, fontSize: 8, fontWeight: '900' }}>✓</Text>}
                         </View>
                         <Text style={{ fontSize: 13, fontWeight: '600', color: activo ? '#fff' : c.text }}>
                           {m.label.split(' ')[0]}
                         </Text>
                       </TouchableOpacity>
                     );
                   })}
                 </View>
               </ScrollView>

               <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                 <TouchableOpacity style={[st.btnModalAccion, { backgroundColor: c.surfaceAlt }]} onPress={() => {
                   setEditGradiente(biz.customGradiente ?? biz.gradiente);
                   setEditAtributo1(biz.labelAtributo1 || '');
                   setEditAtributo2(biz.labelAtributo2 || '');
                   setModalEditar(false);
                 }}>
                   <Text style={[st.btnModalTxt, { color: c.textSec }]}>Cancelar</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[st.btnModalAccion, { backgroundColor: c.accent }]} onPress={guardarApariencia}>
                   <Text style={[st.btnModalTxt, { color: '#fff' }]}>Guardar</Text>
                 </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

      {/* Otros Modales omitidos por brevedad pero asumiendo consistencia */}
      
      <Modal visible={modalPermisos} animationType="slide" transparent>
        <View style={[st.modalOverlay, isTablet && { justifyContent: 'center', padding: 40 }]}>
          <View style={[st.modalCard, { backgroundColor: c.surface }, isTablet && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
            <Text style={[st.modalTitle, { color: c.text }]}>Permisos: {dispSeleccionado?.nombre}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {['ventas', 'inventario', 'catalogo', 'dashboard', 'clientes', 'gastos', 'deudas', 'reportes', 'ajustes'].map(p => (
                <TouchableOpacity key={p} style={[st.permisoRow, { borderColor: c.border }]} onPress={() => togglePermiso(p)}>
                  <Text style={[st.permisoLabel, { color: c.text }]}>
                    {p === 'ventas' ? '🛍️ Punto de Venta' : 
                     p === 'inventario' ? '📦 Control de Stock' : 
                     p === 'dashboard' ? '📊 Métricas (Dashboard)' :
                     p === 'catalogo' ? '📖 Catálogo' :
                     p === 'gastos' ? '📉 Gastos' :
                     p === 'deudas' ? '🤝 Cuentas x Cobrar' :
                     p === 'clientes' ? '👥 Clientes' : 
                     p === 'ajustes' ? '⚙️ Ajustes y Configuración' : '📈 Reportes'}
                  </Text>
                  <View style={[st.checkbox, { backgroundColor: permisosEdit.includes(p) ? c.accent : c.surfaceAlt }]}>
                    {permisosEdit.includes(p) && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={[st.btnModal, { flex: 1, backgroundColor: c.surfaceAlt }]} onPress={() => setModalPermisos(false)}>
                <Text style={[st.btnModalText, { color: c.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btnModal, { flex: 1, backgroundColor: c.accent }]} onPress={guardarPermisos}>
                <Text style={[st.btnModalText, { color: '#fff' }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalAcciones} animationType="fade" transparent>
        <View style={[st.modalOverlay, isTablet && { justifyContent: 'center', padding: 40 }]}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setModalAcciones(false)} />
          <View style={[st.modalCard, { backgroundColor: c.surface, overflow: 'hidden', padding: 0 }, isTablet && { maxWidth: 500, alignSelf: 'center', width: '100%', borderRadius: 24 }]}>
            <LinearGradient 
              colors={getColorForDevice(dispSeleccionado?.id)} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={[st.actionSheetHeader, { paddingTop: 24, paddingBottom: 20, marginBottom: 0 }]}
            >
               <Text style={[st.actionSheetTitle, { color: '#fff' }]}>{dispSeleccionado?.nombre}</Text>
               <Text style={[st.actionSheetSub, { color: 'rgba(255,255,255,0.8)' }]}>GESTIÓN DE EQUIPO</Text>
            </LinearGradient>

            <View style={{ padding: 20, gap: 10 }}>
              <TouchableOpacity activeOpacity={0.7} style={[st.actionItem, { backgroundColor: c.surfaceAlt, borderRadius: 12, borderBottomWidth: 0, paddingHorizontal: 16 }]} onPress={() => { setModalAcciones(false); setPermisosEdit(dispSeleccionado?.permisos || []); setModalPermisos(true); }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.text + '10', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 18 }}>🔑</Text>
                </View>
                <Text style={[st.actionItemText, { color: c.text, flex: 1 }]}>Gestionar Permisos</Text>
                <Text style={{ color: c.textTer }}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} style={[st.actionItem, { backgroundColor: c.surfaceAlt, borderRadius: 12, borderBottomWidth: 0, paddingHorizontal: 16 }]} onPress={() => { setModalAcciones(false); cambiarRolDispositivo(dispSeleccionado?.id, dispSeleccionado?.rol === 'admin' ? 'empleado' : 'admin'); }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.text + '10', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 18 }}>🛡️</Text>
                </View>
                <Text style={[st.actionItemText, { color: c.text, flex: 1 }]}>{dispSeleccionado?.rol === 'admin' ? 'Bajar a Empleado' : 'Subir a Administrador'}</Text>
                <Text style={{ color: c.textTer }}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} style={[st.actionItem, { backgroundColor: c.danger + '15', borderRadius: 12, borderBottomWidth: 0, paddingHorizontal: 16 }]} onPress={() => { setModalAcciones(false); Alert.alert('Expulsar', '¿Confirmas?', [{ text: 'No' }, { text: 'Sí', style: 'destructive', onPress: () => eliminarDispositivo(dispSeleccionado?.id) }]); }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.danger + '20', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 18 }}>🚫</Text>
                </View>
                <Text style={[st.actionItemText, { color: c.danger, flex: 1 }]}>Expulsar del Negocio</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[st.btnCloseSheet, { marginTop: 10 }]} onPress={() => setModalAcciones(false)}>
                <Text style={st.btnCloseSheetText}>Cerrar Opciones</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  btnBack: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { fontSize: 22, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  card: { borderRadius: 20, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  infoLabel: { fontSize: 14, fontWeight: '500' },
  infoValor: { fontSize: 14, fontWeight: '700' },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  featureIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  featureName: { fontSize: 14, fontWeight: '600' },
  featureDesc: { fontSize: 12 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 1 },
  dangerBtnText: { fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 24, padding: 24 },
  modalContent: { borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 10 },
  modalInput: { height: 50, borderRadius: 12, paddingHorizontal: 16, marginBottom: 10 },
  btnModalAccion: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnModalTxt: { fontWeight: '600' },
  btnModalText: { fontWeight: '700' },
  permisoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  permisoLabel: { fontSize: 13, fontWeight: '700' },
  checkbox: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  btnModal: { padding: 14, borderRadius: 12, alignItems: 'center' },
  cardLlave: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  llaveTitulo: { fontSize: 8, fontWeight: '800' },
  llaveCodigo: { fontSize: 18, fontWeight: '800' },
  btnCopiarChico: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  deviceIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f0f0f010', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '700' },
  roleBadge: { marginTop: 4 },
  roleText: { fontSize: 10, fontWeight: '700' },
  menuDots: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  actionSheetHeader: { alignItems: 'center', marginBottom: 20 },
  actionSheetTitle: { fontSize: 18, fontWeight: '800' },
  actionSheetSub: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  actionItemText: { fontSize: 16, fontWeight: '600' },
  btnCloseSheet: { marginTop: 10, padding: 16, alignItems: 'center' },
  btnCloseSheetText: { fontWeight: '700', color: '#888' },
});
