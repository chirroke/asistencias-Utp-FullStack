const pool = require('../config/db');
const { validateEvidenceSignature } = require('../middleware/uploadEvidence');

const reportarIncidencia = async (req, res) => {
  const { sesion_id, tipo, descripcion } = req.body;
  const file = req.file;
  const tipos = ['falla_pc', 'problema_red', 'otro'];
  if (!sesion_id || !tipos.includes(tipo) || typeof descripcion !== 'string' || descripcion.trim().length < 5) {
    return res.status(400).json({ error: 'Completa el tipo y la descripción de la incidencia.' });
  }
  if (!file || !validateEvidenceSignature(file)) {
    return res.status(400).json({ error: 'Adjunta una evidencia válida en PDF, JPG o PNG (máximo 5 MB).' });
  }
  try {
    const session = await pool.query(
      `SELECT s.id FROM sesion_clase s JOIN curso c ON c.id = s.curso_id
       WHERE s.id = $1 AND s.estado = 'activa' AND c.docente_id = $2`, [sesion_id, req.user.id]
    );
    if (!session.rowCount) return res.status(404).json({ error: 'No hay una sesión activa tuya para asociar esta incidencia.' });
    const { rows } = await pool.query(
      `INSERT INTO incidencia_docente
         (docente_id, sesion_id, tipo, descripcion, archivo_nombre, archivo_mime, archivo_contenido)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, creado_en, estado`,
      [req.user.id, sesion_id, tipo, descripcion.trim(), file.originalname.replace(/[\r\n"\\]/g, '_').slice(0, 200), file.mimetype, file.buffer]
    );
    res.status(201).json({ message: 'Incidencia enviada al administrador para verificación.', incidencia: rows[0] });
  } catch (error) {
    console.error('Error al reportar incidencia docente:', error.message);
    res.status(500).json({ error: 'No se pudo enviar la incidencia.' });
  }
};

module.exports = { reportarIncidencia };
