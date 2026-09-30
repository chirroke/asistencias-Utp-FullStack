// backend/src/routes/asistenciaRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, verificarRol } = require('../middleware/authMiddleware');
const {
  abrirSesion,
  generarQR,
  obtenerAsistenciaVivo,
  emitirTicketWebSocket,
  obtenerHistorialCurso,
  obtenerDetalleSesion,
  cerrarSesionManual,
  registrarManual,
  checkinDocente,
  obtenerCheckinDocente,
} = require('../controllers/sesionController');

// Docente/admin abre la sesión de un curso (o recupera la que ya está activa)
router.post('/abrir-sesion', verifyToken, verificarRol(['docente', 'admin']), abrirSesion);

// Docente/admin pide un nuevo token de QR para la sesión ya abierta
router.post('/generar-qr', verifyToken, verificarRol(['docente', 'admin']), generarQR);

// Lista en vivo del roster (docente/admin la proyectan; el alumno no la necesita)
router.get('/sesion/:id/asistencia-vivo', verifyToken, verificarRol(['docente', 'admin']), obtenerAsistenciaVivo);
router.get('/sesion/:id/ws-ticket', verifyToken, verificarRol(['docente', 'admin']), emitirTicketWebSocket);
router.get('/cursos/:cursoId/historial', verifyToken, verificarRol(['docente', 'admin']), obtenerHistorialCurso);
router.get('/sesion/:id/detalle', verifyToken, verificarRol(['docente', 'admin']), obtenerDetalleSesion);

// Registrar asistencia manual (alumno que no pudo escanear el QR)
router.post('/manual', verifyToken, verificarRol(['docente', 'admin']), registrarManual);

// Check-in del docente al iniciar su clase
router.post('/checkin-docente', verifyToken, verificarRol(['docente', 'admin']), checkinDocente);
router.get('/sesion/:id/checkin-docente', verifyToken, verificarRol(['docente', 'admin']), obtenerCheckinDocente);
router.post('/sesion/:id/cerrar', verifyToken, verificarRol(['docente', 'admin']), cerrarSesionManual);

module.exports = router;
