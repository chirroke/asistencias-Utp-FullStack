const express = require('express');
const router = express.Router();
const { verifyToken, verificarRol } = require('../middleware/authMiddleware');
const { listarDocentes, listarAlumnos, listarCursosAdmin, registrarAlumno, obtenerResumenAdmin, listarIncidenciasDocente, resolverIncidenciaDocente, descargarEvidenciaIncidencia } = require('../controllers/adminController');
const { listarJustificaciones, resolverJustificacion, descargarEvidencia } = require('../controllers/justificacionController');

router.use(verifyToken, verificarRol(['admin']));
router.get('/resumen', obtenerResumenAdmin);
router.get('/docentes', listarDocentes);
router.get('/alumnos', listarAlumnos);
router.post('/alumnos', registrarAlumno);
router.get('/cursos', listarCursosAdmin);
router.get('/justificaciones', listarJustificaciones);
router.post('/justificaciones/:id/resolver', resolverJustificacion);
router.get('/justificaciones/:id/evidencia', descargarEvidencia);
router.get('/incidencias-docentes', listarIncidenciasDocente);
router.post('/incidencias-docentes/:id/resolver', resolverIncidenciaDocente);
router.get('/incidencias-docentes/:id/evidencia', descargarEvidenciaIncidencia);

module.exports = router;
