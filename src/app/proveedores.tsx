import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  TextInput, Linking, Alert, Modal, ScrollView, Platform,
  StatusBar, RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
// import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInRight, FadeOut } from 'react-native-reanimated';

export default function ProveedoresScreen() {
  const { colors: c, isDark } = useTheme();
  const { proveedores, crearProveedor, actualizarProveedor, eliminarProveedor, recargarProveedores, isAdmin, userPermisos } = useBusiness();
  
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProv, setEditingProv] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (recargarProveedores) await recargarProveedores();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');

  const filtered = useMemo(() => {
    return proveedores.filter(p => 
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.contacto && p.contacto.toLowerCase().includes(search.toLowerCase()))
    );
  }, [proveedores, search]);

  const openModal = (prov?: any) => {
    if (prov) {
      setEditingProv(prov);
      setNombre(prov.nombre);
      setContacto(prov.contacto || '');
      setTelefono(prov.telefono || '');
    } else {
      setEditingProv(null);
      setNombre('');
      setContacto('');
      setTelefono('');
    }
    setModalVisible(true);
  };

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del negocio es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const data = { 
        nombre: nombre.trim(), 
        contacto: contacto.trim(), 
        telefono: telefono.trim(), 
        activo: true 
      };
      
      if (editingProv) {
        await actualizarProveedor(editingProv.id, data);
      } else {
        await crearProveedor(data);
      }
      setModalVisible(false);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || 'No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (prov: any) => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'Solo el administrador puede eliminar proveedores.');
      return;
    }
    Alert.alert(
      'Eliminar Proveedor',
      `¿Estás seguro de eliminar a ${prov.nombre}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
             try {
               await eliminarProveedor(prov.id);
             } catch (e: any) {
               Alert.alert('Error', 'No se pudo eliminar el proveedor');
             }
          } 
        }
      ]
    );
  };

  const contactarWA = (tel: string) => {
    if (!tel) return;
    const clean = tel.replace(/\D/g, '');
    const url = `whatsapp://send?phone=${clean}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp no está instalado');
      }
    });
  };

  const renderProv = ({ item, index }: { item: any; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).springify()}
      style={[st.card, { backgroundColor: c.surface, borderLeftColor: index % 2 === 0 ? '#10B981' : '#0D9488' }]}
    >
      <View style={st.cardHeader}>
        <View style={st.iconBox}>
          <MaterialCommunityIcons name="account-group" size={24} color={c.accent} />
        </View>
        <View style={st.titleContainer}>
          <Text style={[st.provName, { color: c.text }]}>{item.nombre}</Text>
          {item.contacto && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <MaterialCommunityIcons name="account-tie-outline" size={14} color={c.textTer} style={{ marginRight: 4 }} />
              <Text style={[st.provSubtitle, { color: c.textSec }]}>{item.contacto}</Text>
            </View>
          )}
        </View>
        <View style={st.actions}>
           <TouchableOpacity onPress={() => openModal(item)} style={st.miniAction}>
             <MaterialCommunityIcons name="pencil-outline" size={20} color={c.textTer} />
           </TouchableOpacity>
           {isAdmin && (
             <TouchableOpacity onPress={() => confirmDelete(item)} style={st.miniAction}>
               <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
             </TouchableOpacity>
           )}
        </View>
      </View>

      <View style={st.cardBody}>
        {item.telefono && (
          <TouchableOpacity onPress={() => contactarWA(item.telefono)} style={st.infoRow}>
            <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
            <Text style={[st.infoText, { color: c.textSec }]}>{item.telefono}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={st.cardFooter}>
          <TouchableOpacity 
            style={[st.waBtn, { backgroundColor: '#25D366' + '15' }]}
            onPress={() => contactarWA(item.telefono)}
          >
            <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
            <Text style={[st.waBtnText, { color: '#128C7E' }]}>WHATSAPP</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[st.orderBtn, { backgroundColor: c.accent + '15' }]}
            onPress={() => contactarWA(item.telefono)}
          >
            <MaterialCommunityIcons name="send-outline" size={16} color={c.accent} />
            <Text style={[st.orderBtnText, { color: c.accent }]}>PEDIDO</Text>
          </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={[st.container, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[st.header, { backgroundColor: c.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color={c.text} />
        </TouchableOpacity>
        <View style={st.headerText}>
          <Text style={[st.title, { color: c.text }]}>Proveedores</Text>
          <Text style={[st.subtitle, { color: c.textSec }]}>{proveedores.length} registrados</Text>
        </View>
      </View>

      <View style={st.searchContainer}>
        <View style={[st.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
          <MaterialCommunityIcons name="magnify" size={22} color={c.textTer} />
          <TextInput 
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre o contacto..."
            placeholderTextColor={c.textTer}
            style={[st.searchInput, { color: c.text }]}
          />
        </View>
      </View>

      <FlatList 
        data={filtered}
        renderItem={renderProv}
        keyExtractor={p => p.id.toString()}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10B981']} tintColor={c.accent} />
        }
        ListEmptyComponent={
          <View style={st.emptyState} key="empty">
             <MaterialCommunityIcons name="account-search-outline" size={80} color={c.border} />
             <Text style={[st.emptyTitle, { color: c.textSec }]}>No hay proveedores</Text>
             <Text style={[st.emptyPara, { color: c.textTer }]}>
               Comienza agregando los proveedores de tus productos para gestionar tus pedidos fácilmente.
             </Text>
          </View>
        }
      />

      {(isAdmin || userPermisos.includes('proveedores')) && (
        <TouchableOpacity 
          style={[st.fab, { backgroundColor: '#10B981' }]} 
          onPress={() => openModal()}
        >
          <MaterialCommunityIcons name="plus" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal Add/Edit */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={[st.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
           <Animated.View entering={FadeInDown} style={[st.modalContent, { backgroundColor: c.surface }]}>
              <View style={st.modalHeader}>
                 <Text style={[st.modalTitle, { color: c.text }]}>
                   {editingProv ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                 </Text>
                 <TouchableOpacity onPress={() => setModalVisible(false)}>
                   <MaterialCommunityIcons name="close" size={24} color={c.textTer} />
                 </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={st.form}>
                 <Text style={[st.label, { color: c.textSec }]}>Nombre del Negocio *</Text>
                 <TextInput 
                   value={nombre} onChangeText={setNombre}
                   placeholder="Ej: Lácteos El Vaquero" placeholderTextColor={c.textTer}
                   style={[st.input, { color: c.text, borderColor: c.border }]}
                 />

                 <Text style={[st.label, { color: c.textSec }]}>Persona de Contacto (Encargado)</Text>
                 <TextInput 
                   value={contacto} onChangeText={setContacto}
                   placeholder="¿Quién es el encargado de entregarte?" placeholderTextColor={c.textTer}
                   style={[st.input, { color: c.text, borderColor: c.border }]}
                 />

                 <Text style={[st.label, { color: c.textSec }]}>WhatsApp / Teléfono</Text>
                 <TextInput 
                   value={telefono} onChangeText={setTelefono} keyboardType="phone-pad"
                   placeholder="Ej: 8888 8888" placeholderTextColor={c.textTer}
                   style={[st.input, { color: c.text, borderColor: c.border }]}
                 />
              </ScrollView>

              <TouchableOpacity 
                style={[st.saveBtn, { backgroundColor: '#10B981', opacity: saving ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={st.saveBtnText}>{saving ? 'GUARDANDO...' : 'GUARDAR PROVEEDOR'}</Text>
              </TouchableOpacity>
           </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingTop: 60, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  backBtn: { marginRight: 15 },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 2 },
  
  searchContainer: { padding: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 15,
    borderLeftWidth: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { 
    width: 45, 
    height: 45, 
    borderRadius: 12, 
    backgroundColor: '#10B981' + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  titleContainer: { flex: 1 },
  provName: { fontSize: 18, fontWeight: '700' },
  provSubtitle: { fontSize: 13 },
  actions: { flexDirection: 'row' },
  miniAction: { padding: 5, marginLeft: 8 },
  
  cardBody: { marginTop: 15, paddingLeft: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { marginLeft: 10, fontSize: 14 },
  
  cardFooter: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12, flexDirection: 'row', gap: 10 },
  waBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
  },
  waBtnText: { marginLeft: 8, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  orderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
  },
  orderBtnText: { marginLeft: 8, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  emptyPara: { textAlign: 'center', marginTop: 10, fontSize: 15, lineHeight: 22 },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    maxHeight: '90%',
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  form: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 15 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16
  },
  row: { flexDirection: 'row' },
  saveBtn: {
    height: 55,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    marginBottom: Platform.OS === 'ios' ? 20 : 0
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});
