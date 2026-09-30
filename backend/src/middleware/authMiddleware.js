const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secreto_desarrollo');
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {
    const rolUsuario = req.user?.rol;

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({ 
        error: 'Acceso Denegado: No tienes permisos para este recurso' 
      });
    }
    next();
  };
};

// Se exportan AMBOS middlewares juntos en un solo objeto
module.exports = { verifyToken, verificarRol };
