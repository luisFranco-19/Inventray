import { Linking } from 'react-native';
import type { ItemCarrito } from '../../database/types';

/**
 * Genera un mensaje formateado y abre WhatsApp para compartir el recibo.
 */
export function compartirReciboWhatsApp(
  bizName: string,
  ventaId: number,
  items: ItemCarrito[],
  total: number,
  metodoPago: string,
  telefonoCliente?: string
) {
  let mensaje = `*${bizName.toUpperCase()}* 🧾\n`;
  mensaje += `Ticket: #${ventaId}\n`;
  mensaje += `Fecha: ${new Date().toLocaleDateString()}\n`;
  mensaje += `----------------------------\n`;
  
  items.forEach(item => {
    // Formato: 2x Camisa (M/Azul) ... $200.00
    const sub = (item.precio * item.cantidad).toFixed(2);
    mensaje += `${item.cantidad}x ${item.productoNombre} (${item.talla}/${item.color}) - *$${sub}*\n`;
  });
  
  mensaje += `----------------------------\n`;
  mensaje += `*TOTAL A PAGAR: $${total.toFixed(2)}*\n`;
  mensaje += `Método de pago: ${metodoPago.toUpperCase()}\n\n`;
  mensaje += `¡Gracias por su preferencia! ✨`;

  // Limpiar el teléfono de caracteres no numéricos
  const telefono = telefonoCliente ? telefonoCliente.replace(/[^0-9]/g, '') : '';
  
  // Intentar abrir con el esquema de WhatsApp (App) o wa.me (Web/Fallback)
  const url = `whatsapp://send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
  
  Linking.canOpenURL(url).then(supported => {
    if (supported) {
      Linking.openURL(url);
    } else {
      const webUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
      Linking.openURL(webUrl);
    }
  });
}
