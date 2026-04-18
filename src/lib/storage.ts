import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Sube una imagen a Supabase Storage y devuelve la URL pública.
 * @param uri URI local de la imagen (de ImagePicker)
 * @param folder Carpeta dentro del bucket (ej. tenantId)
 * @returns URL pública de la imagen
 */
export async function subirImagen(uri: string, folder: string): Promise<string> {
  try {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const filePath = `${folder}/${fileName}`;

    // Convertir URI a Base64 para subir (Compatibilidad máxima en móviles)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const { data, error } = await supabase.storage
      .from('productos')
      .upload(filePath, decode(base64), {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.log('Error de Supabase Storage:', error);
      throw error;
    }

    const { data: publicUrl } = supabase.storage
      .from('productos')
      .getPublicUrl(filePath);

    return publicUrl.publicUrl;
  } catch (error: any) {
    console.error('Error detallado al subir imagen:', error);
    // Mostrar un mensaje más informativo si es posible
    const mensajeError = error?.message || 'Error desconocido';
    throw new Error(`Fallo en la nube: ${mensajeError}. Verifica el bucket y las políticas.`);
  }
}
