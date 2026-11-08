SELECT 1 FROM justificacion_asistencia ja JOIN justificacion j ON j.id = ja.justificacion_id
       WHERE ja.asistencia_id = :p1 AND j.estado = 'pendiente'
