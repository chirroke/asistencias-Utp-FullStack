SELECT j.id, j.motivo, j.estado, j.creado_en, j.archivo_nombre,
              c.nombre AS curso, s.fecha AS fecha_sesion
       FROM justificacion j JOIN curso c ON c.id = j.curso_id
       LEFT JOIN justificacion_asistencia ja ON ja.justificacion_id = j.id
       LEFT JOIN asistencia a ON a.id = ja.asistencia_id
       LEFT JOIN sesion_clase s ON s.id = a.sesion_id
      WHERE j.alumno_id = :p1 ORDER BY j.creado_en DESC LIMIT 10
