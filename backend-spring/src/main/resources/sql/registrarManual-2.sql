INSERT INTO asistencia (sesion_id, alumno_id, estado, origen, creado_por)
       VALUES (:p1, :p2, 'presente', 'manual_docente', :p3)
       ON CONFLICT (sesion_id, alumno_id)
       DO UPDATE SET estado = 'presente', origen = 'manual_docente'
       WHERE asistencia.estado <> 'justificada'
       RETURNING *
