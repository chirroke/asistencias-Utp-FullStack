const pool = require('../config/db');

const User = {
  // Buscar usuario por correo para la autenticación
  findByEmail: async (email) => {
    const query = 'SELECT * FROM usuario WHERE correo = $1 AND activo = TRUE';
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  },

  // Obtener usuario por ID
  findById: async (id) => {
    const query = 'SELECT id, correo, nombres, apellidos, rol, activo FROM usuario WHERE id = $1 AND activo = TRUE';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
};

// IMPORTANTE: Se debe exportar la constante User
module.exports = User;
