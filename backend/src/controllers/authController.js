const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/userModel');
const pool = require('../config/db');
const nodemailer = require('nodemailer');

const secret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET || 'secreto_desarrollo';
const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const mailer = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const hashRecoveryCode = (code) => crypto.createHmac('sha256', secret).update(code).digest('hex');

const validatePassword = (password, user) => {
  if (typeof password !== 'string' || password.length < 8 || password.length > 14) {
    return 'Usa entre 8 y 14 caracteres.';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Incluye al menos una minúscula, una mayúscula y un número.';
  }
  const lowerPassword = password.toLocaleLowerCase();
  const personalParts = [user.nombres, user.apellidos, user.correo.split('@')[0]]
    .flatMap((value) => value.split(/[\s._-]+/))
    .filter((value) => value.length >= 3);
  if (personalParts.some((part) => lowerPassword.includes(part.toLocaleLowerCase()))) {
    return 'No incluyas tu nombre, apellido ni usuario de correo en la contraseña.';
  }
  return null;
};

const login = async (req, res) => {
  const { correo, contrasena } = req.body;

  try {
    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos' });
    }

    const user = await User.findByEmail(correo.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // La BD guarda la contraseña como hash bcrypt: se compara con bcrypt.compare
    const validPassword = await bcrypt.compare(contrasena, user.contrasena_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol, correo: user.correo },
      process.env.JWT_SECRET || 'secreto_desarrollo',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: user.id,
        correo: user.correo,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const solicitarRecuperacion = async (req, res) => {
  const correo = typeof req.body.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
  if (!/^[^\s@]+@utp\.edu\.pe$/i.test(correo)) {
    return res.status(400).json({ error: 'Ingresa un correo institucional @utp.edu.pe válido.' });
  }
  if (!mailConfigured()) {
    return res.status(503).json({ error: 'La recuperación por correo aún no está configurada en el servidor.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, correo, nombres FROM usuario WHERE correo = $1 AND activo = TRUE`, [correo]
    );
    if (rows.length) {
      const user = rows[0];
      const recent = await pool.query(
        `SELECT 1 FROM password_reset_code WHERE usuario_id = $1 AND solicitado_en > now() - interval '60 seconds'`,
        [user.id]
      );
      if (!recent.rowCount) {
        const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
        await pool.query(
          `INSERT INTO password_reset_code (usuario_id, codigo_hash, expira_en, intentos, solicitado_en)
           VALUES ($1, $2, now() + interval '10 minutes', 0, now())
           ON CONFLICT (usuario_id) DO UPDATE SET
             codigo_hash = EXCLUDED.codigo_hash, expira_en = EXCLUDED.expira_en,
             intentos = 0, verificado_en = NULL, token_reset_hash = NULL, solicitado_en = now()`,
          [user.id, hashRecoveryCode(code)]
        );
        try {
          await mailer().sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: user.correo,
            subject: 'Código para recuperar tu contraseña - Asistencia UTP',
            text: `Hola ${user.nombres}, tu código de recuperación es ${code}. Vence en 10 minutos. Si no solicitaste este cambio, ignora este correo.`,
          });
        } catch (mailError) {
          await pool.query('DELETE FROM password_reset_code WHERE usuario_id = $1', [user.id]);
          throw mailError;
        }
      }
    }
    // Mismo mensaje para correos registrados y no registrados.
    res.json({ message: 'Si el correo está registrado, recibirás un código de recuperación.' });
  } catch (error) {
    console.error('Error al solicitar recuperación de contraseña:', error.message);
    res.status(500).json({ error: 'No se pudo procesar la solicitud. Inténtalo más tarde.' });
  }
};

const verificarCodigoRecuperacion = async (req, res) => {
  const correo = typeof req.body.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
  const codigo = typeof req.body.codigo === 'string' ? req.body.codigo.trim() : '';
  if (!/^\d{6}$/.test(codigo)) return res.status(400).json({ error: 'El código debe tener 6 dígitos.' });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT r.usuario_id, r.codigo_hash, r.intentos
         FROM password_reset_code r JOIN usuario u ON u.id = r.usuario_id
         WHERE u.correo = $1 AND u.activo = TRUE AND r.expira_en > now()
           AND r.verificado_en IS NULL FOR UPDATE OF r`, [correo]
      );
      if (!rows.length || rows[0].intentos >= 5 || rows[0].codigo_hash !== hashRecoveryCode(codigo)) {
        if (rows.length) await client.query('UPDATE password_reset_code SET intentos = LEAST(intentos + 1, 5) WHERE usuario_id = $1', [rows[0].usuario_id]);
        await client.query('COMMIT');
        return res.status(400).json({ error: 'El código es incorrecto o venció.' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      await client.query(
        `UPDATE password_reset_code SET verificado_en = now(), token_reset_hash = $2 WHERE usuario_id = $1`,
        [rows[0].usuario_id, hashRecoveryCode(token)]
      );
      await client.query('COMMIT');
      res.json({ token });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error al verificar código de recuperación:', error.message);
    res.status(500).json({ error: 'No se pudo verificar el código.' });
  }
};

const restablecerContrasena = async (req, res) => {
  const { token, contrasena } = req.body;
  if (typeof token !== 'string' || !token || typeof contrasena !== 'string') {
    return res.status(400).json({ error: 'El código de recuperación y la nueva contraseña son requeridos.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT u.id, u.correo, u.nombres, u.apellidos
       FROM password_reset_code r JOIN usuario u ON u.id = r.usuario_id
       WHERE r.token_reset_hash = $1 AND r.verificado_en > now() - interval '10 minutes'
         AND r.expira_en > now() AND u.activo = TRUE FOR UPDATE OF r, u`,
      [hashRecoveryCode(token)]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La autorización venció. Solicita un código nuevo.' });
    }
    const policyError = validatePassword(contrasena, rows[0]);
    if (policyError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: policyError });
    }
    const hash = await bcrypt.hash(contrasena, 12);
    await client.query('UPDATE usuario SET contrasena_hash = $1, actualizado_en = now() WHERE id = $2', [hash, rows[0].id]);
    await client.query('DELETE FROM password_reset_code WHERE usuario_id = $1', [rows[0].id]);
    await client.query('COMMIT');
    res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al restablecer contraseña:', error.message);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
  } finally {
    client.release();
  }
};

const cambiarContrasenaAutenticado = async (req, res) => {
  const { actual, nueva } = req.body;
  if (typeof actual !== 'string' || typeof nueva !== 'string') {
    return res.status(400).json({ error: 'Ingresa la contraseña actual y la nueva contraseña.' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, correo, nombres, apellidos, contrasena_hash FROM usuario WHERE id = $1 AND activo = TRUE',
      [req.user.id]
    );
    if (!rows.length || !(await bcrypt.compare(actual, rows[0].contrasena_hash))) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    if (await bcrypt.compare(nueva, rows[0].contrasena_hash)) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser diferente de la actual.' });
    }
    const policyError = validatePassword(nueva, rows[0]);
    if (policyError) return res.status(400).json({ error: policyError });
    const hash = await bcrypt.hash(nueva, 12);
    await pool.query('UPDATE usuario SET contrasena_hash = $1, actualizado_en = now() WHERE id = $2', [hash, rows[0].id]);
    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error.message);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
  }
};

module.exports = { login, solicitarRecuperacion, verificarCodigoRecuperacion, restablecerContrasena, cambiarContrasenaAutenticado, validatePassword };
