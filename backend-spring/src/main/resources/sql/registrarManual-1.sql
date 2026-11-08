SELECT 1 FROM sesion_clase s JOIN matricula m ON m.curso_id = s.curso_id AND m.alumno_id = :p2 AND m.estado = 'activa' WHERE s.id = :p1
