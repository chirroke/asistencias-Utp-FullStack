SELECT s.id, s.fecha, s.hora_inicio, s.hora_fin_programada, s.hora_cierre_real, s.estado,
              COUNT(a.id) FILTER (WHERE a.estado = 'presente') AS presentes,
              COUNT(m.alumno_id) AS matriculados
       FROM sesion_clase s
       LEFT JOIN matricula m ON m.curso_id = s.curso_id AND m.estado = 'activa'
       LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = m.alumno_id
       WHERE s.curso_id = :p1 AND (:p2::date IS NULL OR s.fecha >= :p2::date) AND (:p3::date IS NULL OR s.fecha <= :p3::date)
       GROUP BY s.id
       ORDER BY s.fecha DESC, s.hora_inicio DESC
