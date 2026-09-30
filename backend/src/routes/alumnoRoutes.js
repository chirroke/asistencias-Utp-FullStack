const express = require('express');
const router = express.Router();
const { verifyToken, verificarRol } = require('../middleware/authMiddleware');
const { uploadEvidence } = require('../middleware/uploadEvidence');
const { obtenerResumen, registrarConQR, enviarJustificacion } = require('../controllers/alumnoController');
const { descargarEvidencia } = require('../controllers/justificacionController');

router.use(verifyToken, verificarRol(['alumno']));
router.get('/resumen', obtenerResumen);
router.post('/asistencia/escanear', registrarConQR);
router.post('/justificaciones', uploadEvidence, enviarJustificacion);
router.get('/justificaciones/:id/evidencia', descargarEvidencia);

module.exports = router;
