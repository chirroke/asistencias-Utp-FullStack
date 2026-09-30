const authorizeRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'Acceso denegado: No tienes los permisos necesarios para realizar esta acción.' 
      });
    }
    next();
  };
};

module.exports = { authorizeRoles };