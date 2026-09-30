const express = require('express');
const router = express.Router();
const { verifyToken, verificarRol } = require('../middleware/authMiddleware');
const { uploadEvidence } = require('../middleware/uploadEvidence');
const { listarJustificaciones, resolverJustificacion } = require('../controllers/justificacionController');
const { reportarIncidencia } = require('../controllers/docenteController');

router.use(verifyToken, verificarRol(['docente']));
router.get('/justificaciones', listarJustificaciones);
router.post('/justificaciones/:id/resolver', resolverJustificacion);
router.post('/incidencias', uploadEvidence, reportarIncidencia);

module.exports = router;
