SELECT u.id, u.nombres, u.apellidos, u.correo, u.activo,
              COUNT(c.id)::int AS cursos_asignados,
              COALESCE(string_agg(COALESCE(p.codigo, 'Sin ciclo') || ' · ' || c.codigo || ' · ' || c.nombre || ' (' || c.seccion || ')', E'\n' ORDER BY p.fecha_inicio DESC NULLS LAST, c.nombre), '') AS cursos
       FROM usuario u LEFT JOIN curso c ON c.docente_id = u.id AND c.eliminado_en IS NULL
       LEFT JOIN periodo_academico p ON p.id = c.periodo_id
       WHERE u.rol = 'docente'
       GROUP BY u.id ORDER BY u.apellidos, u.nombres
