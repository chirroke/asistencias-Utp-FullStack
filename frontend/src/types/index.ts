export type UserRole = 'alumno' | 'docente' | 'admin';

export interface Usuario {
  id: string;
  correo: string;
  nombres: string;
  apellidos: string;
  rol: UserRole;
  codigo?: string;
  carrera?: string;
  ciclo?: string;
  sede: string;
  embeddingRegistrado: boolean;
}

export interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  seccion: string;
  docenteNombre: string;
  horario: string;
  aula: string;
  sede: string;
  totalAlumnos: number;
}

export interface SesionClase {
  id: string;
  cursoId: string;
  cursoNombre: string;
  seccion: string;
  aula: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: 'programada' | 'activa' | 'cerrada';
  toleranciaMinutos: number;
  qrRotacionSegundos: number;
}

export interface AsistenciaRecord {
  id: string;
  sesionNumero: number;
  fecha: string;
  horaMarcacion?: string;
  aula: string;
  estado: 'presente' | 'falta' | 'justificada';
  similitudFacial?: number;
  justificacionId?: string;
}

export interface Justificacion {
  id: string;
  alumnoNombre: string;
  alumnoCodigo: string;
  cursoNombre: string;
  sesion: string;
  motivo: string;
  descripcion: string;
  archivoUrl: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fechaEnvio: string;
}