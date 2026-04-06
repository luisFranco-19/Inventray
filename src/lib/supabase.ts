import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oajtxznnvrbadgmjdpwj.supabase.co';
const supabaseKey = 'sb_publishable_huHeOFEZlJHtYjxthSU1AA_FFvkWMwa';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getTenantId(): Promise<string> {
  const tenantId = await AsyncStorage.getItem('@mbpos_tenant_id');
  if (!tenantId) {
    throw new Error('Sesión de negocio no encontrada. Vincula o crea un negocio primero.');
  }
  return tenantId;
}
