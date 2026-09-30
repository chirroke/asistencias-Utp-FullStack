const pool = require('../config/db');

const listarJustificaciones = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.id, j.motivo, j.estado, j.fecha_inicio, j.creado_en, j.comentario_docente,
              j.archivo_nombre, (j.archivo_contenido IS NOT NULL) AS tiene_archivo,
              u.id AS alumno_id, u.nombres || ' ' || u.apellidos AS alumno,
              al.codigo_alumno AS codigo, c.id AS curso_id, c.nombre AS curso,
              c.seccion, s.id AS sesion_id, s.fecha AS sesion_fecha
       FROM justificacion j
       JOIN usuario u ON u.id = j.alumno_id
       JOIN alumno al ON al.usuario_id = u.id
       JOIN curso c ON c.id = j.curso_id
       LEFT JOIN justificacion_asistencia ja ON ja.justificacion_id = j.id
       LEFT JOIN asistencia a ON a.id = ja.asistencia_id
       LEFT JOIN sesion_clase s ON s.id = a.sesion_id
       WHERE ($1 = 'admin' OR c.docente_id = $2)
       ORDER BY j.creado_en DESC`,
      [req.user.rol, req.user.id]
    );
    res.json({ justificaciones: rows });
  } catch (error) {
    console.error('Error al listar justificaciones:', error.message);
    res.status(500).json({ error: 'No se pudo cargar la bandeja de justificaciones.' });
  }
};

const resolverJustificacion = async (req, res) => {
  const { id } = req.params;
  const { decision, comentario = '' } = req.body;
  if (!['aprobada', 'rechazada'].includes(decision)) {
    return res.status(400).json({ error: 'La decisión debe ser aprobada o rechazada.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT j.id, j.estado, c.docente_id
       FROM justificacion j JOIN curso c ON c.id = j.curso_id
       WHERE j.id = $1 FOR UPDATE OF j`, [id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró la justificación.' });
    }
    if (req.user.rol !== 'admin' && rows[0].docente_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No tienes acceso a esta solicitud.' });
    }
    if (rows[0].estado !== 'pendiente') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Esta solicitud ya fue revisada.' });
    }
    await client.query(
      `UPDATE justificacion SET estado = $1, revisada_por = $2, revisada_en = now(),
         comentario_docente = NULLIF($3, ''), actualizado_en = now(), actualizado_por = $2
       WHERE id = $4`, [decision, req.user.id, String(comentario).slice(0, 1000), id]
    );
    if (decision === 'aprobada') {
      await client.query(
        `UPDATE asistencia a SET estado = 'justificada', actualizado_en = now(), actualizado_por = $2
         FROM justificacion_asistencia ja WHERE ja.justificacion_id = $1 AND ja.asistencia_id = a.id`, [id, req.user.id]
      );
    } else {
      await client.query(
        `UPDATE asistencia a SET estado = 'falta', actualizado_en = now(), actualizado_por = $2
         FROM justificacion_asistencia ja WHERE ja.justificacion_id = $1 AND ja.asistencia_id = a.id`, [id, req.user.id]
      );
    }
    const accion = decision === 'aprobada' ? 'aprobar_justificacion' : 'rechazar_justificacion';
    await client.query(
      `INSERT INTO bitacora_auditoria (usuario_id, accion, entidad, entidad_id, datos_despues)
       VALUES ($1, $2, 'justificacion', $3, $4)`,
      [req.user.id, accion, id, JSON.stringify({ decision, comentario: comentario || null })]
    );
    await client.query('COMMIT');
    res.json({ message: decision === 'aprobada' ? 'Justificación aprobada.' : 'Justificación rechazada.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al resolver justificación:', error.message);
    res.status(500).json({ error: 'No se pudo guardar la decisión.' });
  } finally {
    client.release();
  }
};

const descargarEvidencia = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.archivo_contenido, j.archivo_mime, j.archivo_nombre, j.alumno_id, c.docente_id
       FROM justificacion j JOIN curso c ON c.id = j.curso_id WHERE j.id = $1`, [req.params.id]
    );
    if (!rows.length || !rows[0].archivo_contenido) return res.status(404).json({ error: 'No hay evidencia adjunta.' });
    const file = rows[0];
    if (req.user.rol !== 'admin' && req.user.id !== file.alumno_id && req.user.id !== file.docente_id) {
      return res.status(403).json({ error: 'No tienes acceso a este archivo.' });
    }
    res.setHeader('Content-Type', file.archivo_mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.archivo_nombre)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.archivo_contenido);
  } catch (error) {
    console.error('Error al descargar evidencia:', error.message);
    res.status(500).json({ error: 'No se pudo abrir la evidencia.' });
  }
};

module.exports = { listarJustificaciones, resolverJustificacion, descargarEvidencia };
