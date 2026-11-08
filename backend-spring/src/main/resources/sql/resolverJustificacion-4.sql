UPDATE asistencia a SET estado = 'falta', actualizado_en = now(), actualizado_por = :p2
         FROM justificacion_asistencia ja WHERE ja.justificacion_id = :p1 AND ja.asistencia_id = a.id
