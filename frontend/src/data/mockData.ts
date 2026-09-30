import type { Usuario, Curso, SesionClase, AsistenciaRecord, Justificacion } from '../types';

export const MOCK_USERS: Usuario[] = [
  {
    id: 'usr-1',
    correo: 'u22221422@utp.edu.pe',
    nombres: 'Gabriel Esau',
    apellidos: 'Conislla Alvarez',
    rol: 'alumno',
    codigo: 'U22221422',
    carrera: 'Ingeniería de Sistemas',
    ciclo: '8vo Ciclo',
    sede: 'Lima Centro',
    embeddingRegistrado: true,
  },
  {
    id: 'usr-2',
    correo: 'r.quispe@utp.edu.pe',
    nombres: 'Roberto',
    apellidos: 'Quispe Mamani',
    rol: 'docente',
    codigo: 'D10452',
    sede: 'Lima Centro',
    embeddingRegistrado: true,
  },
  {
    id: 'usr-3',
    correo: 'admin@utp.edu.pe',
    nombres: 'Administrador',
    apellidos: 'General UTP',
    rol: 'admin',
    sede: 'Nacional (Todas las sedes)',
    embeddingRegistrado: true,
  },
];

export const MOCK_CURSOS: Curso[] = [
  {
    id: 'cur-1',
    codigo: 'IS-402',
    nombre: 'Curso Integrador II: Software',
    seccion: '32847',
    docenteNombre: 'Dr. Roberto Quispe',
    horario: '08:00 – 10:00 (Lunes y Miércoles)',
    aula: 'A-304',
    sede: 'Lima Centro',
    totalAlumnos: 40,
  },
  {
    id: 'cur-2',
    codigo: 'IS-305',
    nombre: 'Base de Datos Avanzada',
    seccion: '31102',
    docenteNombre: 'Dr. Roberto Quispe',
    horario: '10:00 – 12:00 (Martes y Jueves)',
    aula: 'B-201',
    sede: 'Lima Centro',
    totalAlumnos: 38,
  },
];

export const MOCK_SESION_ACTIVA: SesionClase = {
  id: 'ses-14',
  cursoId: 'cur-1',
  cursoNombre: 'Curso Integrador II: Software',
  seccion: '32847',
  aula: 'A-304',
  fecha: '2026-08-30',
  horaInicio: '08:00',
  horaFin: '10:00',
  estado: 'activa',
  toleranciaMinutos: 15,
  qrRotacionSegundos: 20,
};

export const MOCK_HISTORIAL_ALUMNO: AsistenciaRecord[] = [
  { id: 'att-14', sesionNumero: 14, fecha: '25 Ago 2026', horaMarcacion: '08:04:12 a.m.', aula: 'A-304', estado: 'presente', similitudFacial: 0.984 },
  { id: 'att-13', sesionNumero: 13, fecha: '20 Ago 2026', horaMarcacion: '08:18:05 a.m.', aula: 'A-304', estado: 'presente', similitudFacial: 0.961 },
  { id: 'att-12', sesionNumero: 12, fecha: '18 Ago 2026', aula: 'A-304', estado: 'falta' },
  { id: 'att-11', sesionNumero: 11, fecha: '13 Ago 2026', horaMarcacion: '08:02:40 a.m.', aula: 'A-304', estado: 'justificada', similitudFacial: 0.978 },
];

export const MOCK_JUSTIFICACIONES: Justificacion[] = [
  {
    id: 'just-1',
    alumnoNombre: 'Gabriel Conislla',
    alumnoCodigo: 'U22221422',
    cursoNombre: 'Curso Integrador II: Software',
    sesion: 'Sesión 12 (18 Ago 2026)',
    motivo: 'Descanso Médico',
    descripcion: 'Presenté cuadro de gastroenteritis aguda. Se adjunta descanso médico emitido por EsSalud.',
    archivoUrl: 'certificado_medico_u22221422.pdf',
    estado: 'pendiente',
    fechaEnvio: '19 Ago 2026',
  },
];