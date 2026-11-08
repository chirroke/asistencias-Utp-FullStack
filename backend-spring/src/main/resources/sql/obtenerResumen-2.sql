SELECT c.id, c.codigo, c.nombre, c.seccion, d.nombres || ' ' || d.apellidos AS docente,
              activa.id AS sesion_activa_id, activa.fecha AS sesion_activa_fecha,
              COALESCE(hist.total_clases, 0)::int AS total_clases,
              COALESCE(hist.presentes, 0)::int AS presentes,
              COALESCE(hist.faltas, 0)::int AS faltas,
              COALESCE(hist.justificadas, 0)::int AS justificadas
       FROM matricula m JOIN curso c ON c.id = m.curso_id
       LEFT JOIN usuario d ON d.id = c.docente_id
       LEFT JOIN LATERAL (
         SELECT s.id, s.fecha FROM sesion_clase s WHERE s.curso_id = c.id AND s.estado = 'activa'
         ORDER BY s.hora_inicio DESC LIMIT 1
       ) activa ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'cerrada') AS total_clases,
                COUNT(a.id) FILTER (WHERE a.estado = 'presente') AS presentes,
                COUNT(a.id) FILTER (WHERE a.estado = 'falta') AS faltas,
                COUNT(a.id) FILTER (WHERE a.estado = 'justificada') AS justificadas
         FROM sesion_clase s LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = m.alumno_id
         WHERE s.curso_id = c.id
       ) hist ON TRUE
       WHERE m.alumno_id = :p1 AND m.estado = 'activa' AND c.eliminado_en IS NULL
       ORDER BY c.nombre
