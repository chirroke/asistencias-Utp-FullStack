// backend/src/routes/cursoRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, verificarRol } = require('../middleware/authMiddleware');
const { obtenerMisCursos } = require('../controllers/cursoController');

// Solo el docente logueado ve sus propios cursos
router.get('/', verifyToken, verificarRol(['docente', 'admin']), obtenerMisCursos);

module.exports = router;
