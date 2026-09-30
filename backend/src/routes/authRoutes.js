const express = require('express');
const router = express.Router();
const { login, solicitarRecuperacion, verificarCodigoRecuperacion, restablecerContrasena, cambiarContrasenaAutenticado } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const User = require('../models/userModel');

// Ruta pública
router.post('/login', login);
router.post('/recuperacion/solicitar', solicitarRecuperacion);
router.post('/recuperacion/verificar', verificarCodigoRecuperacion);
router.post('/recuperacion/restablecer', restablecerContrasena);
router.post('/cambiar-contrasena', verifyToken, cambiarContrasenaAutenticado);

// Ruta protegida
router.get('/perfil', verifyToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario) return res.status(401).json({ error: 'La cuenta ya no está activa. Inicia sesión nuevamente.' });
    res.json({ message: 'Perfil cargado.', usuario });
  } catch (error) {
    console.error('Error al consultar el perfil:', error.message);
    res.status(500).json({ error: 'No se pudo cargar el perfil de usuario.' });
  }
});

module.exports = router;
