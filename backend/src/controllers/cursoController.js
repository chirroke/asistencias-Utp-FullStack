const pool = require('../config/db');

// GET /api/cursos  (protegido: solo el docente logueado ve SUS cursos)
const obtenerMisCursos = async (req, res) => {
  const docenteId = req.user.id; // viene del token (verifyToken)

  try {
    const query = `
      SELECT
        c.id,
        c.codigo,
        c.nombre,
        c.seccion,
        c.capacidad_alumnos,
        c.tolerancia_marcado_min,
        (SELECT COUNT(*) FROM matricula m WHERE m.curso_id = c.id AND m.estado = 'activa') AS alumnos_total,
        (SELECT ROUND(COUNT(*) FILTER (WHERE a.estado = 'presente') * 100.0 / NULLIF(COUNT(a.id), 0), 1)
         FROM sesion_clase sh JOIN asistencia a ON a.sesion_id = sh.id WHERE sh.curso_id = c.id) AS asistencia_promedio,
        EXISTS (SELECT 1 FROM bitacora_auditoria b WHERE b.entidad = 'sesion_clase'
          AND b.entidad_id = s.id::text AND b.usuario_id = $1 AND b.accion = 'checkin_docente') AS docente_checkin,
        s.id            AS sesion_activa_id,
        s.hora_inicio   AS sesion_hora_inicio,
        s.hora_fin_programada AS sesion_hora_fin
      FROM curso c
      LEFT JOIN sesion_clase s
        ON s.curso_id = c.id AND s.estado = 'activa'
      WHERE c.docente_id = $1
        AND c.eliminado_en IS NULL
      ORDER BY c.nombre;
    `;
    const { rows } = await pool.query(query, [docenteId]);

    const cursos = rows.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      seccion: r.seccion,
      alumnosTotal: Number(r.alumnos_total),
      capacidadAlumnos: Number(r.capacidad_alumnos),
      asistenciaPromedio: r.asistencia_promedio === null ? null : Number(r.asistencia_promedio),
      docenteCheckin: Boolean(r.docente_checkin),
      enCurso: !!r.sesion_activa_id,
      sesionActivaId: r.sesion_activa_id,
      sesionHoraInicio: r.sesion_hora_inicio,
      sesionHoraFin: r.sesion_hora_fin,
    }));

    res.json(cursos);
  } catch (error) {
    console.error('Error al obtener cursos del docente:', error);
    res.status(500).json({ error: 'Error al obtener los cursos' });
  }
};

module.exports = { obtenerMisCursos };
