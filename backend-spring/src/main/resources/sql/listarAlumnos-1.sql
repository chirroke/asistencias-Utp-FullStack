SELECT u.id, u.nombres, u.apellidos, u.correo, u.activo, al.codigo_alumno,
              COUNT(m.id) FILTER (WHERE m.estado = 'activa')::int AS cursos_activos,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'cursoId', c.id,
                'codigo', c.codigo,
                'nombre', c.nombre,
                'seccion', c.seccion,
                'estado', m.estado,
                'retiradaEn', m.retirada_en
              )) FILTER (WHERE c.id IS NOT NULL), '[]'::json) AS matriculas
       FROM usuario u JOIN alumno al ON al.usuario_id = u.id
       LEFT JOIN matricula m ON m.alumno_id = u.id
       LEFT JOIN curso c ON c.id = m.curso_id AND c.eliminado_en IS NULL
       WHERE u.rol = 'alumno'
       GROUP BY u.id, al.codigo_alumno ORDER BY u.apellidos, u.nombres
