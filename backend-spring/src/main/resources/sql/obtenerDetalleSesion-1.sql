SELECT u.id AS alumno_id, al.codigo_alumno AS codigo,
              u.nombres || ' ' || u.apellidos AS nombre, a.estado,
              a.origen, a.registrado_en
       FROM sesion_clase s JOIN matricula m ON m.curso_id = s.curso_id AND m.estado = 'activa'
       JOIN alumno al ON al.usuario_id = m.alumno_id JOIN usuario u ON u.id = al.usuario_id
       LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = m.alumno_id
       WHERE s.id = :p1 ORDER BY u.apellidos, u.nombres
