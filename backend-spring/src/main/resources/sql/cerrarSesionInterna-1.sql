INSERT INTO asistencia (sesion_id, alumno_id, estado, origen)
     SELECT s.id, m.alumno_id, 'falta', 'cierre_automatico'
     FROM sesion_clase s
     JOIN matricula m ON m.curso_id = s.curso_id AND m.estado = 'activa'
     WHERE s.id = :p1
       AND NOT EXISTS (
         SELECT 1 FROM asistencia a WHERE a.sesion_id = s.id AND a.alumno_id = m.alumno_id
       )
