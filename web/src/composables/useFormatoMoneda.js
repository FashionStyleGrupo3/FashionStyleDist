export function useFormatoMoneda() {
  const formatearCOP = (valor) => {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return '$ 0';
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(Number(valor));
  };

  return { formatearCOP };
}
