const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { validatePassword } = require('./authController');

const listarDocentes = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nombres, u.apellidos, u.correo, u.activo,
              COUNT(c.id)::int AS cursos_asignados,
              COALESCE(string_agg(c.codigo || ' · ' || c.nombre || ' (' || c.seccion || ')', E'\\n' ORDER BY c.nombre), '') AS cursos
       FROM usuario u LEFT JOIN curso c ON c.docente_id = u.id AND c.eliminado_en IS NULL
       WHERE u.rol = 'docente'
       GROUP BY u.id ORDER BY u.apellidos, u.nombres`
    );
    res.json({ docentes: rows });
  } catch (error) {
    console.error('Error al consultar directorio docente:', error.message);
    res.status(500).json({ error: 'No se pudo cargar el directorio de docentes.' });
  }
};

const listarAlumnos = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nombres, u.apellidos, u.correo, u.activo, al.codigo_alumno,
              COUNT(m.id) FILTER (WHERE m.estado = 'activa')::int AS cursos_activos,
              COALESCE(string_agg(DISTINCT c.codigo || ' · ' || c.nombre || ' (' || c.seccion || ')', E'\\n'
                ORDER BY c.codigo || ' · ' || c.nombre || ' (' || c.seccion || ')')
                FILTER (WHERE m.estado = 'activa'), '') AS cursos
       FROM usuario u JOIN alumno al ON al.usuario_id = u.id
       LEFT JOIN matricula m ON m.alumno_id = u.id
       LEFT JOIN curso c ON c.id = m.curso_id AND c.eliminado_en IS NULL
       WHERE u.rol = 'alumno'
       GROUP BY u.id, al.codigo_alumno ORDER BY u.apellidos, u.nombres`
    );
    res.json({ alumnos: rows });
  } catch (error) {
    console.error('Error al consultar directorio de alumnos:', error.message);
    res.status(500).json({ error: 'No se pudo cargar el directorio de alumnos.' });
  }
};

const listarCursosAdmin = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.codigo, c.nombre, c.seccion, c.capacidad_alumnos,
              u.nombres || ' ' || u.apellidos AS docente,
              COUNT(m.id) FILTER (WHERE m.estado = 'activa')::int AS matriculados
       FROM curso c JOIN usuario u ON u.id = c.docente_id
       LEFT JOIN matricula m ON m.curso_id = c.id
       WHERE c.eliminado_en IS NULL
       GROUP BY c.id, u.id ORDER BY c.nombre, c.seccion`
    );
    res.json({ cursos: rows });
  } catch (error) {
    console.error('Error al consultar cursos administrativos:', error.message);
    res.status(500).json({ error: 'No se pudo cargar el directorio de cursos.' });
  }
};

const registrarAlumno = async (req, res) => {
  const nombres = typeof req.body.nombres === 'string' ? req.body.nombres.trim() : '';
  const apellidos = typeof req.body.apellidos === 'string' ? req.body.apellidos.trim() : '';
  const correo = typeof req.body.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
  const codigo = typeof req.body.codigo_alumno === 'string' ? req.body.codigo_alumno.trim().toUpperCase() : '';
  const contrasena = req.body.contrasena;
  const cursoId = req.body.curso_id;
  if (!nombres || nombres.length > 100 || !apellidos || apellidos.length > 100 ||
      !/^[^\s@]+@utp\.edu\.pe$/i.test(correo) || !/^[A-Z0-9-]{3,20}$/.test(codigo) ||
      typeof contrasena !== 'string' || !cursoId) {
    return res.status(400).json({ error: 'Completa nombres, apellidos, correo @utp.edu.pe, código, contraseña y curso.' });
  }
  const passwordError = validatePassword(contrasena, { nombres, apellidos, correo });
  if (passwordError) return res.status(400).json({ error: passwordError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const curso = await client.query(
      `SELECT id, capacidad_alumnos FROM curso WHERE id = $1 AND eliminado_en IS NULL FOR UPDATE`, [cursoId]
    );
    if (!curso.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El curso seleccionado no existe o está inactivo.' });
    }
    const matricula = await client.query(
      `SELECT COUNT(*)::int AS total FROM matricula WHERE curso_id = $1 AND estado = 'activa'`, [cursoId]
    );
    if (matricula.rows[0].total >= curso.rows[0].capacidad_alumnos) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `El curso ya alcanzó el máximo de ${curso.rows[0].capacidad_alumnos} alumnos.` });
    }
    const hash = await bcrypt.hash(contrasena, 12);
    const usuario = await client.query(
      `INSERT INTO usuario (correo, contrasena_hash, nombres, apellidos, rol, creado_por)
       VALUES ($1, $2, $3, $4, 'alumno', $5) RETURNING id`,
      [correo, hash, nombres, apellidos, req.user.id]
    );
    await client.query(
      `INSERT INTO alumno (usuario_id, codigo_alumno, creado_por) VALUES ($1, $2, $3)`,
      [usuario.rows[0].id, codigo, req.user.id]
    );
    await client.query(
      `INSERT INTO matricula (curso_id, alumno_id, estado, creado_por) VALUES ($1, $2, 'activa', $3)`,
      [cursoId, usuario.rows[0].id, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ message: 'Alumno registrado y matriculado.', id: usuario.rows[0].id });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'El correo o código de alumno ya está registrado.' });
    if (error.code === '23514') return res.status(409).json({ error: error.message || 'El curso ya alcanzó su aforo de alumnos.' });
    console.error('Error al registrar alumno:', error.message);
    res.status(500).json({ error: 'No se pudo registrar al alumno.' });
  } finally {
    client.release();
  }
};

const obtenerResumenAdmin = async (req, res) => {
  try {
    const [{ rows }, { rows: porCurso }, { rows: distribucion }, { rows: riesgo }] = await Promise.all([
      pool.query(
      `SELECT
        (SELECT COUNT(*) FROM usuario WHERE rol = 'docente' AND activo = TRUE)::int AS docentes,
        (SELECT COUNT(*) FROM usuario WHERE rol = 'alumno' AND activo = TRUE)::int AS alumnos,
        (SELECT COUNT(*) FROM curso WHERE eliminado_en IS NULL)::int AS cursos,
        (SELECT COUNT(*) FROM sesion_clase WHERE estado = 'activa')::int AS sesiones_activas,
        (SELECT COUNT(*) FROM justificacion WHERE estado = 'pendiente')::int AS justificaciones_pendientes,
        (SELECT COUNT(*) FROM sesion_clase WHERE fecha = CURRENT_DATE)::int AS sesiones_hoy,
        (SELECT COUNT(*) FROM justificacion WHERE estado <> 'pendiente')::int AS justificaciones_procesadas,
        (SELECT COUNT(*) FROM asistencia)::int AS asistencias_registradas,
        COALESCE((SELECT ROUND(COUNT(*) FILTER (WHERE estado = 'presente') * 100.0 / NULLIF(COUNT(*), 0), 1) FROM asistencia), 0)::numeric AS porcentaje_global,
        (SELECT COUNT(*) FROM incidencia_docente WHERE estado = 'pendiente')::int AS incidencias_pendientes`
      ),
      pool.query(
        `SELECT c.id, c.nombre, c.seccion,
                COUNT(a.id)::int AS registros,
                COUNT(a.id) FILTER (WHERE a.estado = 'presente')::int AS presentes,
                COALESCE(ROUND(COUNT(a.id) FILTER (WHERE a.estado = 'presente') * 100.0 / NULLIF(COUNT(a.id), 0), 1), 0)::numeric AS porcentaje
         FROM curso c
         LEFT JOIN sesion_clase s ON s.curso_id = c.id AND s.estado = 'cerrada'
         LEFT JOIN asistencia a ON a.sesion_id = s.id
         WHERE c.eliminado_en IS NULL
         GROUP BY c.id
         ORDER BY porcentaje DESC, c.nombre
         LIMIT 8`
      ),
      pool.query(
        `SELECT estado::text AS estado, COUNT(*)::int AS cantidad
         FROM asistencia
         GROUP BY estado`
      ),
      pool.query(
        `SELECT u.id, u.nombres, u.apellidos, al.codigo_alumno,
                COUNT(DISTINCT s.id)::int AS clases,
                COUNT(a.id) FILTER (WHERE a.estado = 'falta')::int AS faltas,
                COALESCE(ROUND(COUNT(a.id) FILTER (WHERE a.estado = 'falta') * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0), 1), 0)::numeric AS porcentaje
         FROM alumno al
         JOIN usuario u ON u.id = al.usuario_id AND u.activo = TRUE
         JOIN matricula m ON m.alumno_id = al.usuario_id AND m.estado = 'activa'
         JOIN sesion_clase s ON s.curso_id = m.curso_id AND s.estado = 'cerrada'
         LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = al.usuario_id
         GROUP BY u.id, u.nombres, u.apellidos, al.codigo_alumno
         HAVING COUNT(DISTINCT s.id) > 0
            AND COUNT(a.id) FILTER (WHERE a.estado = 'falta') * 100.0 / COUNT(DISTINCT s.id) >= 20
         ORDER BY porcentaje DESC, u.apellidos, u.nombres
         LIMIT 10`
      ),
    ]);
    res.json({ ...rows[0], asistencia_por_curso: porCurso, distribucion_estados: distribucion, alumnos_en_riesgo: riesgo });
  } catch (error) {
    console.error('Error al cargar resumen administrativo:', error.message);
    res.status(500).json({ error: 'No se pudo cargar el resumen administrativo.' });
  }
};

const listarIncidenciasDocente = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.tipo, i.descripcion, i.estado, i.creado_en, i.archivo_nombre,
              (i.archivo_contenido IS NOT NULL) AS tiene_archivo,
              u.id AS docente_id, u.nombres || ' ' || u.apellidos AS docente, u.correo,
              c.nombre AS curso, c.seccion, s.fecha AS sesion_fecha
       FROM incidencia_docente i JOIN usuario u ON u.id = i.docente_id
       JOIN sesion_clase s ON s.id = i.sesion_id JOIN curso c ON c.id = s.curso_id
       ORDER BY (i.estado = 'pendiente') DESC, i.creado_en DESC`
    );
    res.json({ incidencias: rows });
  } catch (error) {
    console.error('Error al listar incidencias de docente:', error.message);
    res.status(500).json({ error: 'No se pudieron cargar las incidencias técnicas.' });
  }
};

const resolverIncidenciaDocente = async (req, res) => {
  const { decision, comentario = '' } = req.body;
  if (!['aprobada', 'rechazada'].includes(decision)) return res.status(400).json({ error: 'La decisión debe ser aprobada o rechazada.' });
  try {
    const { rows } = await pool.query(
      `UPDATE incidencia_docente SET estado = $1, revisada_por = $2, revisada_en = now(), comentario_admin = NULLIF($3, '')
       WHERE id = $4 AND estado = 'pendiente' RETURNING id`,
      [decision, req.user.id, String(comentario).slice(0, 1000), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'La incidencia no existe o ya fue revisada.' });
    res.json({ message: decision === 'aprobada' ? 'Incidencia verificada.' : 'Incidencia rechazada.' });
  } catch (error) {
    console.error('Error al resolver incidencia técnica:', error.message);
    res.status(500).json({ error: 'No se pudo guardar la revisión.' });
  }
};

const descargarEvidenciaIncidencia = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT archivo_contenido, archivo_mime, archivo_nombre FROM incidencia_docente WHERE id = $1', [req.params.id]
    );
    if (!rows.length || !rows[0].archivo_contenido) return res.status(404).json({ error: 'No hay evidencia adjunta.' });
    res.setHeader('Content-Type', rows[0].archivo_mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(rows[0].archivo_nombre)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(rows[0].archivo_contenido);
  } catch (error) {
    console.error('Error al descargar evidencia de incidencia:', error.message);
    res.status(500).json({ error: 'No se pudo abrir la evidencia.' });
  }
};

module.exports = { listarDocentes, listarAlumnos, listarCursosAdmin, registrarAlumno, obtenerResumenAdmin, listarIncidenciasDocente, resolverIncidenciaDocente, descargarEvidenciaIncidencia };
