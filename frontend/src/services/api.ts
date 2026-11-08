// frontend/src/services/api.ts

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Todas las rutas protegidas necesitan el token que guarda AuthContext al hacer login.
const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem('asistencia_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Se guarda el status HTTP en el Error para que quien llama pueda
// distinguir, por ejemplo, un 404 real (sesión ya no activa) de un
// error transitorio (500, red caída, token vencido).
class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const manejarRespuesta = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || errorData.mensaje || (response.status === 404
        ? 'La ruta no existe en el backend activo. Reinicia el servidor backend para cargar los cambios.'
        : `Error en la solicitud (HTTP ${response.status})`),
      response.status
    );
  }
  return response.json();
};

export const login = async (email: string, pass: string) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: email, contrasena: pass }),
  });
  return manejarRespuesta(response);
};

// Cursos del docente logueado (reales, según el JWT)
export const obtenerMisCursos = async () => {
  const response = await fetch(`${API_URL}/cursos`, {
    headers: { ...authHeaders() },
  });
  return manejarRespuesta(response);
};

// Abre (o reutiliza) la sesión de clase activa de hoy para ese curso
export const abrirSesion = async (cursoId: string) => {
  const response = await fetch(`${API_URL}/asistencia/abrir-sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ curso_id: cursoId }),
  });
  return manejarRespuesta(response);
};

// Pide un nuevo token de QR para una sesión ya abierta
export const generarQR = async (sesionId: string, duracionSegundos: number = 20) => {
  const response = await fetch(`${API_URL}/asistencia/generar-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ sesion_id: sesionId, duracion_segundos: duracionSegundos }),
  });
  return manejarRespuesta(response);
};

export const obtenerAsistenciaEnVivo = async (sesionId: string) => {
  const response = await fetch(`${API_URL}/asistencia/sesion/${sesionId}/asistencia-vivo`, {
    headers: { ...authHeaders() },
  });
  return manejarRespuesta(response);
};

// Alumno que no pudo escanear el QR: el docente lo marca a mano
export const registrarAsistenciaManual = async (
  sesionId: string,
  alumnoId: string,
  motivo?: string,
) => {
  const response = await fetch(`${API_URL}/asistencia/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ sesion_id: sesionId, alumno_id: alumnoId, motivo }),
  });
  return manejarRespuesta(response);
};

// Check-in del docente al iniciar su clase, sin clasificar tardanzas.
export const checkinDocente = async (sesionId: string, motivo?: string) => {
  const response = await fetch(`${API_URL}/asistencia/checkin-docente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ sesion_id: sesionId, motivo }),
  });
  return manejarRespuesta(response);
};

export const obtenerCheckinDocente = async (sesionId: string) => {
  const response = await fetch(`${API_URL}/asistencia/sesion/${sesionId}/checkin-docente`, {
    headers: { ...authHeaders() },
  });
  return manejarRespuesta(response) as Promise<{ registrado: boolean; registrado_en: string | null }>;
};

const publicPost = async (path: string, body: Record<string, string>) => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return manejarRespuesta(response);
};

export const solicitarRecuperacion = (correo: string) =>
  publicPost('/auth/recuperacion/solicitar', { correo });

export const verificarCodigoRecuperacion = (correo: string, codigo: string) =>
  publicPost('/auth/recuperacion/verificar', { correo, codigo }) as Promise<{ token: string }>;

export const restablecerContrasena = (token: string, contrasena: string) =>
  publicPost('/auth/recuperacion/restablecer', { token, contrasena });

export const cambiarContrasenaActual = async (actual: string, nueva: string) => {
  const response = await fetch(`${API_URL}/auth/cambiar-contrasena`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ actual, nueva }),
  });
  return manejarRespuesta(response);
};

export const verificarSesion = async () => {
  const response = await fetch(`${API_URL}/auth/perfil`, {
    headers: { ...authHeaders() },
  });
  return manejarRespuesta(response);
};

export const obtenerTicketAsistencia = async (sesionId: string) => {
  const response = await fetch(`${API_URL}/asistencia/sesion/${sesionId}/ws-ticket`, {
    headers: { ...authHeaders() },
  });
  return manejarRespuesta(response) as Promise<{ ticket: string }>;
};

export const obtenerHistorialCurso = async (cursoId: string, desde = '', hasta = '') => {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const suffix = params.size ? `?${params}` : '';
  const response = await fetch(`${API_URL}/asistencia/cursos/${cursoId}/historial${suffix}`, {
    headers: { ...authHeaders() },
  });
  return manejarRespuesta(response);
};

export const obtenerDetalleSesion = async (sesionId: string) => {
  const response = await fetch(`${API_URL}/asistencia/sesion/${sesionId}/detalle`, {
    headers: { ...authHeaders() },
  });
  return manejarRespuesta(response);
};

export const cerrarSesion = async (sesionId: string) => {
  const response = await fetch(`${API_URL}/asistencia/sesion/${sesionId}/cerrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  return manejarRespuesta(response);
};

export const obtenerResumenAlumno = async () => {
  const response = await fetch(`${API_URL}/alumno/resumen`, { headers: authHeaders() });
  return manejarRespuesta(response);
};

export const escanearQrAlumno = async (qr: string, selfie: Blob, embedding: number[]) => {
  const form = new FormData();
  form.append('qr', qr);
  form.append('selfie', selfie, 'selfie.jpg');
  form.append('embedding', JSON.stringify(embedding));
  const response = await fetch(`${API_URL}/alumno/asistencia/escanear`, {
    method: 'POST', headers: authHeaders(), body: form,
  });
  return manejarRespuesta(response);
};

export const registrarRostroAlumno = async (selfie: Blob, embedding: number[]) => {
  const form = new FormData();
  form.append('selfie', selfie, 'foto-referencia.jpg');
  form.append('embedding', JSON.stringify(embedding));
  const response = await fetch(`${API_URL}/alumno/perfil/rostro`, { method: 'POST', headers: authHeaders(), body: form });
  return manejarRespuesta(response);
};

export const enviarJustificacion = async (asistenciaId: string, motivo: string, evidencia: File) => {
  const form = new FormData();
  form.append('asistencia_id', asistenciaId);
  form.append('motivo', motivo);
  form.append('evidencia', evidencia);
  const response = await fetch(`${API_URL}/alumno/justificaciones`, { method: 'POST', headers: authHeaders(), body: form });
  return manejarRespuesta(response);
};

export const listarJustificacionesDocente = async () => {
  const response = await fetch(`${API_URL}/docente/justificaciones`, { headers: authHeaders() });
  return manejarRespuesta(response);
};

export const resolverJustificacion = async (id: string, decision: 'aprobada' | 'rechazada', comentario = '') => {
  const response = await fetch(`${API_URL}/docente/justificaciones/${id}/resolver`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ decision, comentario }),
  });
  return manejarRespuesta(response);
};

export const listarJustificacionesAdmin = async () => {
  const response = await fetch(`${API_URL}/admin/justificaciones`, { headers: authHeaders() });
  return manejarRespuesta(response);
};

export const resolverJustificacionAdmin = async (id: string, decision: 'aprobada' | 'rechazada', comentario = '') => {
  const response = await fetch(`${API_URL}/admin/justificaciones/${id}/resolver`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ decision, comentario }),
  });
  return manejarRespuesta(response);
};

const obtenerArchivo = async (path: string) => {
  const response = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!response.ok) throw new Error('No se pudo abrir el archivo adjunto.');
  return response.blob();
};

export const obtenerEvidenciaJustificacion = (id: string) => obtenerArchivo(`/alumno/justificaciones/${id}/evidencia`);
export const obtenerEvidenciaJustificacionAdmin = (id: string) => obtenerArchivo(`/admin/justificaciones/${id}/evidencia`);

export const enviarIncidenciaDocente = async (sesionId: string, tipo: string, descripcion: string, evidencia: File) => {
  const form = new FormData();
  form.append('sesion_id', sesionId);
  form.append('tipo', tipo);
  form.append('descripcion', descripcion);
  form.append('evidencia', evidencia);
  const response = await fetch(`${API_URL}/docente/incidencias`, { method: 'POST', headers: authHeaders(), body: form });
  return manejarRespuesta(response);
};

export const obtenerResumenAdmin = async () => {
  const response = await fetch(`${API_URL}/admin/resumen`, { headers: authHeaders() });
  return manejarRespuesta(response);
};

export const obtenerDirectorioDocentes = async () => {
  const response = await fetch(`${API_URL}/admin/docentes`, { headers: authHeaders() });
  return manejarRespuesta(response);
};

export const actualizarEstadoDocenteAdmin = async (docenteId: string, activo: boolean) => {
  const response = await fetch(`${API_URL}/admin/docentes/${docenteId}/estado`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ activo }),
  });
  return manejarRespuesta(response);
};

export const obtenerAlumnosAdmin = async () => {
  const response = await fetch(`${API_URL}/admin/alumnos`, { headers: authHeaders() });
  return manejarRespuesta(response);
};

export const obtenerCursosAdmin = async () => {
  const response = await fetch(`${API_URL}/admin/cursos`, { headers: authHeaders() });
  return manejarRespuesta(response);
};

export const registrarAlumnoAdmin = async (alumno: { nombres: string; apellidos: string; correo: string; codigo_alumno: string; contrasena: string; curso_id: string }) => {
  const response = await fetch(`${API_URL}/admin/alumnos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(alumno),
  });
  return manejarRespuesta(response);
};

export const retirarAlumnoCursoAdmin = async (alumnoId: string, cursoId: string) => {
  const response = await fetch(`${API_URL}/admin/alumnos/${alumnoId}/cursos/${cursoId}/retirar`, {
    method: 'POST', headers: authHeaders(),
  });
  return manejarRespuesta(response);
};

export const listarIncidenciasDocente = async () => {
  const response = await fetch(`${API_URL}/admin/incidencias-docentes`, { headers: authHeaders() });
  return manejarRespuesta(response);
};

export const resolverIncidenciaDocente = async (id: string, decision: 'aprobada' | 'rechazada', comentario = '') => {
  const response = await fetch(`${API_URL}/admin/incidencias-docentes/${id}/resolver`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ decision, comentario }),
  });
  return manejarRespuesta(response);
};

export const obtenerEvidenciaIncidencia = (id: string) => obtenerArchivo(`/admin/incidencias-docentes/${id}/evidencia`);

export const obtenerHistorialReprogramaciones = async () => {
  const response = await fetch(`${API_URL}/docente/reprogramaciones`, { headers: authHeaders() });
  return manejarRespuesta(response) as Promise<Array<{ id: string; codigo: string; nombre: string; seccionOrigen: string; seccionDestino: string; fecha: string; horaInicio: string; horaFin: string; motivo: string; solicitadaEn: string }>>;
};

export const reprogramarClase = async (
  cursoId: string,
  solicitud: { cursoDestinoId: string; fecha: string; horaInicio: string; horaFin: string; motivo: string },
) => {
  const response = await fetch(`${API_URL}/docente/cursos/${cursoId}/reprogramar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(solicitud),
  });
  return manejarRespuesta(response) as Promise<{ mensaje: string }>;
};


export const obtenerEvidenciaJustificacionDocente = (id: string) => obtenerArchivo(`/docente/justificaciones/${id}/evidencia`);
