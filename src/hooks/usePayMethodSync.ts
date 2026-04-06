import { useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';

/**
 * For syncing selected métodoPago con cambios de configuración global (dueño).
 * - Si el método actual no existe en la nueva lista, ajusta al primero.
 * - Si no hay métodos disponibles, mantiene el valor actual.
 */
export function usePayMethodSync(metodoPago: string, setMetodoPago: (m: string) => void) {
  const { config: biz, isLoading } = useBusiness();

  useEffect(() => {
    if (isLoading) return;

    const opciones = biz?.metodosPago || [];
    if (opciones.length === 0) return;

    if (!opciones.includes(metodoPago)) {
      setMetodoPago(opciones[0]);
    }
  }, [isLoading, metodoPago, setMetodoPago, biz?.metodosPago]);
}
