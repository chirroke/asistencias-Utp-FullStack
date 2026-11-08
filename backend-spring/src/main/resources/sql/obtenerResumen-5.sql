SELECT a.id AS asistencia_id, s.fecha, c.id AS curso_id, c.nombre AS curso, c.seccion
       FROM asistencia a JOIN sesion_clase s ON s.id = a.sesion_id JOIN curso c ON c.id = s.curso_id
       WHERE a.alumno_id = :p1 AND a.estado = 'falta' AND s.estado = 'cerrada'
         AND NOT EXISTS (
           SELECT 1 FROM justificacion_asistencia ja JOIN justificacion j ON j.id = ja.justificacion_id
           WHERE ja.asistencia_id = a.id AND j.estado = 'pendiente'
         ) ORDER BY s.fecha DESC LIMIT 20
