SELECT a.id, a.estado, a.sesion_id, s.curso_id, s.fecha, s.estado AS estado_sesion
       FROM asistencia a JOIN sesion_clase s ON s.id = a.sesion_id
       WHERE a.id = :p1 AND a.alumno_id = :p2 FOR UPDATE OF a
