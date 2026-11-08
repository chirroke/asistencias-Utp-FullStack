WITH periodo_activo AS (SELECT id FROM periodo_academico WHERE activo = TRUE ORDER BY fecha_inicio DESC LIMIT 1)
         SELECT c.id, c.nombre, c.seccion,
                COUNT(a.id)::int AS registros,
                COUNT(a.id) FILTER (WHERE a.estado IN ('presente', 'tardanza'))::int AS presentes,
                COALESCE(ROUND(COUNT(a.id) FILTER (WHERE a.estado IN ('presente', 'tardanza')) * 100.0 / NULLIF(COUNT(a.id), 0), 1), 0)::numeric AS porcentaje
         FROM curso c
         LEFT JOIN sesion_clase s ON s.curso_id = c.id AND s.estado = 'cerrada'
         LEFT JOIN asistencia a ON a.sesion_id = s.id
         JOIN periodo_activo p ON p.id = c.periodo_id
         WHERE c.eliminado_en IS NULL
         GROUP BY c.id
         ORDER BY porcentaje DESC, c.nombre
         LIMIT 8
