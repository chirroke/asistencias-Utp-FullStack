SELECT c.id, c.codigo, c.nombre, c.seccion, c.capacidad_alumnos,
              u.nombres || ' ' || u.apellidos AS docente,
              COUNT(m.id) FILTER (WHERE m.estado = 'activa')::int AS matriculados
       FROM curso c JOIN usuario u ON u.id = c.docente_id
       LEFT JOIN matricula m ON m.curso_id = c.id
       WHERE c.eliminado_en IS NULL
       GROUP BY c.id, u.id ORDER BY c.nombre, c.seccion
