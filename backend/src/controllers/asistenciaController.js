const pool = require('../config/db');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Generar código QR para una sesión de clase
const generarQR = async (req, res) => {
  const { curso_id, duracion_minutos = 5 } = req.body;

  try {
    // 1. Generar un token único y definir el tiempo de expiración
    const tokenQR = crypto.randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + duracion_minutos * 60 * 1000);

    // 2. Guardar la sesión en la Base de Datos
    const query = `
      INSERT INTO sesion_clase (curso_id, token_qr, expira_en)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [curso_id, tokenQR, expiraEn]);
    const sesion = rows[0];

    // 3. Crear el payload que contendrá el QR (JSON con la sesión y token)
    const payloadQR = JSON.stringify({
      sesion_id: sesion.id,
      token: tokenQR
    });

    // 4. Generar el QR en formato Data URL (base64) para renderizar en Frontend
    const qrDataUrl = await QRCode.toDataURL(payloadQR);

    res.status(201).json({
      message: 'Sesión y código QR generados exitosamente',
      sesion_id: sesion.id,
      expira_en: sesion.expira_en,
      qr_code: qrDataUrl // Cadena "data:image/png;base64,..."
    });
  } catch (error) {
    console.error('Error al generar código QR:', error);
    res.status(500).json({ error: 'Error al generar el código QR' });
  }
};

module.exports = { generarQR };