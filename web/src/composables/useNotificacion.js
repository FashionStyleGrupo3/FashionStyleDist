import { toast } from 'vue-sonner';
import Swal from 'sweetalert2';

export function useNotificacion() {
  const notificarExito = (mensaje) => toast.success(mensaje, { duration: 3000 });
  const notificarError = (mensaje) => toast.error(mensaje, { duration: 4000 });
  const notificarAdvertencia = (mensaje) => toast.warning(mensaje, { duration: 4000 });

  const confirmarAccion = async ({ titulo, texto, textoBotonConfirmar = 'Sí, continuar' }) => {
    const res = await Swal.fire({
      title: titulo,
      text: texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E91E8C',
      cancelButtonColor: '#6B7280',
      confirmButtonText: textoBotonConfirmar,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
    return res.isConfirmed;
  };

  return { notificarExito, notificarError, notificarAdvertencia, confirmarAccion };
}
