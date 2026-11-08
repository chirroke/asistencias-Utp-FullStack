WITH periodo_activo AS (SELECT id FROM periodo_academico WHERE activo = TRUE ORDER BY fecha_inicio DESC LIMIT 1)
         SELECT a.estado::text AS estado, COUNT(*)::int AS cantidad
         FROM asistencia a JOIN sesion_clase s ON s.id = a.sesion_id
         JOIN curso c ON c.id = s.curso_id JOIN periodo_activo p ON p.id = c.periodo_id
         GROUP BY a.estado
