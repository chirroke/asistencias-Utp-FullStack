WITH periodo_activo AS (SELECT id FROM periodo_academico WHERE activo = TRUE ORDER BY fecha_inicio DESC LIMIT 1)
         SELECT u.id, u.nombres, u.apellidos, al.codigo_alumno,
                COUNT(DISTINCT s.id)::int AS clases,
                COUNT(a.id) FILTER (WHERE a.estado = 'falta')::int AS faltas,
                COALESCE(ROUND(COUNT(a.id) FILTER (WHERE a.estado = 'falta') * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0), 1), 0)::numeric AS porcentaje
         FROM alumno al
         JOIN usuario u ON u.id = al.usuario_id AND u.activo = TRUE
         JOIN matricula m ON m.alumno_id = al.usuario_id AND m.estado = 'activa'
         JOIN sesion_clase s ON s.curso_id = m.curso_id AND s.estado = 'cerrada'
         JOIN curso c ON c.id = s.curso_id JOIN periodo_activo p ON p.id = c.periodo_id
         LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = al.usuario_id
         GROUP BY u.id, u.nombres, u.apellidos, al.codigo_alumno
         HAVING COUNT(DISTINCT s.id) > 0
            AND COUNT(a.id) FILTER (WHERE a.estado = 'falta') * 100.0 / COUNT(DISTINCT s.id) >= 20
         ORDER BY porcentaje DESC, u.apellidos, u.nombres
         LIMIT 10
