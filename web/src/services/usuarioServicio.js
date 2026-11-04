// -> Servicio de gestion de usuarios y cuenta
import clienteApi from '@/services/clienteApi';

export async function obtenerPerfilActual() {
  const respuesta = await clienteApi.get('/me');
  const datos = respuesta.data?.data ?? respuesta.data;
  return datos?.user ?? datos?.usuario ?? datos;
}

export async function actualizarPerfil(datos) {
  const respuesta = await clienteApi.put('/me', datos);
  const cuerpo = respuesta.data?.data ?? respuesta.data;
  return cuerpo?.user ?? cuerpo;
}

export async function actualizarContrasena(datos) {
  const respuesta = await clienteApi.put('/me/password', {
    password_actual: datos.password_actual,
    password: datos.password,
    password_confirmation: datos.password_confirmation
  });
  return respuesta.data?.data ?? respuesta.data;
}

export async function solicitarCambioCorreo(correoNuevo) {
  const respuesta = await clienteApi.post('/me/email-change/request', {
    correo_nuevo: correoNuevo
  });
  return respuesta.data;
}

export async function confirmarCambioCorreo(codigo) {
  const respuesta = await clienteApi.post('/me/email-change/confirm', { codigo });
  return respuesta.data; 
}

export async function subirFotoPerfil(archivo) {
  const formData = new FormData();
  formData.append('foto', archivo);

  const respuesta = await clienteApi.post('/me/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  });
  const cuerpo = respuesta.data?.data ?? respuesta.data;
  return cuerpo?.user ?? cuerpo;
}

export async function usarFotoDeGoogle(credential) {
  const respuesta = await clienteApi.post('/me/foto/google', { credential });
  const cuerpo = respuesta.data?.data ?? respuesta.data;
  return cuerpo?.user ?? cuerpo;
}

export async function quitarFotoPerfil() {
  const respuesta = await clienteApi.delete('/me/foto');
  const cuerpo = respuesta.data?.data ?? respuesta.data;
  return cuerpo?.user ?? cuerpo;
}

export default {
  obtenerPerfilActual,
  actualizarPerfil,
  actualizarContrasena
};
