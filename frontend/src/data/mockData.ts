import type { Usuario, Curso, SesionClase, AsistenciaRecord, Justificacion } from '../types';

export const MOCK_USERS: Usuario[] = [
  {
    id: 'usr-1',
    correo: 'demo.alumno1@example.com',
    nombres: 'Alumna Demo',
    apellidos: 'Uno',
    rol: 'alumno',
    codigo: 'DEMO-001',
    carrera: 'Carrera de demostración',
    ciclo: 'Ciclo Demo',
    sede: 'Sede Demo',
    embeddingRegistrado: true,
  },
  {
    id: 'usr-2',
    correo: 'demo.docente@example.com',
    nombres: 'Docente',
    apellidos: 'Demo',
    rol: 'docente',
    codigo: 'DEMO-DOC-01',
    sede: 'Sede Demo',
    embeddingRegistrado: true,
  },
  {
    id: 'usr-3',
    correo: 'demo.admin@example.com',
    nombres: 'Administrador',
    apellidos: 'Demo',
    rol: 'admin',
    sede: 'Sede Demo',
    embeddingRegistrado: true,
  },
];

export const MOCK_CURSOS: Curso[] = [
  {
    id: 'cur-1',
    codigo: 'DEMO-FS',
    nombre: 'Desarrollo Full Stack - Demo',
    seccion: 'D01',
    docenteNombre: 'Docente Demo',
    horario: '08:00 – 10:00 (Lunes y Miércoles)',
    aula: 'Aula Demo',
    sede: 'Sede Demo',
    totalAlumnos: 2,
  },
  {
    id: 'cur-2',
    codigo: 'DEMO-BD',
    nombre: 'Base de Datos - Demo',
    seccion: 'D02',
    docenteNombre: 'Docente Demo',
    horario: '10:00 – 12:00 (Martes y Jueves)',
    aula: 'Aula Demo',
    sede: 'Sede Demo',
    totalAlumnos: 1,
  },
];

export const MOCK_SESION_ACTIVA: SesionClase = {
  id: 'ses-demo-01',
  cursoId: 'cur-1',
  cursoNombre: 'Desarrollo Full Stack - Demo',
  seccion: 'D01',
  aula: 'Aula Demo',
  fecha: '2026-08-30',
  horaInicio: '08:00',
  horaFin: '10:00',
  estado: 'activa',
  toleranciaMinutos: 15,
  qrRotacionSegundos: 20,
};

export const MOCK_HISTORIAL_ALUMNO: AsistenciaRecord[] = [
  { id: 'att-demo-04', sesionNumero: 4, fecha: '25 Ago 2026', horaMarcacion: '08:04:12 a.m.', aula: 'Aula Demo', estado: 'presente', similitudFacial: 0.984 },
  { id: 'att-demo-03', sesionNumero: 3, fecha: '20 Ago 2026', horaMarcacion: '08:18:05 a.m.', aula: 'Aula Demo', estado: 'presente', similitudFacial: 0.961 },
  { id: 'att-demo-02', sesionNumero: 2, fecha: '18 Ago 2026', aula: 'Aula Demo', estado: 'falta' },
  { id: 'att-demo-01', sesionNumero: 1, fecha: '13 Ago 2026', horaMarcacion: '08:02:40 a.m.', aula: 'Aula Demo', estado: 'justificada', similitudFacial: 0.978 },
];

export const MOCK_JUSTIFICACIONES: Justificacion[] = [
  {
    id: 'just-1',
    alumnoNombre: 'Alumna Demo Uno',
    alumnoCodigo: 'DEMO-001',
    cursoNombre: 'Desarrollo Full Stack - Demo',
    sesion: 'Sesión demo 2 (18 Ago 2026)',
    motivo: 'Motivo de demostración',
    descripcion: 'Solicitud de prueba con información y documento ficticios.',
    archivoUrl: 'justificacion_demo.pdf',
    estado: 'pendiente',
    fechaEnvio: '19 Ago 2026',
  },
];
