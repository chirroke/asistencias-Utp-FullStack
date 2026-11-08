SELECT a.id AS asistencia_id, a.estado, a.registrado_en,
              s.id AS sesion_id, s.fecha, s.hora_inicio,
              c.id AS curso_id, c.nombre AS curso, c.codigo, c.seccion
       FROM asistencia a
       JOIN sesion_clase s ON s.id = a.sesion_id
       JOIN curso c ON c.id = s.curso_id
       WHERE a.alumno_id = :p1 AND s.estado = 'cerrada'
       ORDER BY s.fecha DESC, s.hora_inicio DESC
       LIMIT 60
