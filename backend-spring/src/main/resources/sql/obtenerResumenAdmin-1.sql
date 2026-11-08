WITH periodo_activo AS (
         SELECT id, codigo FROM periodo_academico WHERE activo = TRUE ORDER BY fecha_inicio DESC LIMIT 1
       )
       SELECT
        (SELECT COUNT(*) FROM usuario WHERE rol = 'docente' AND activo = TRUE)::int AS docentes,
        (SELECT COUNT(*) FROM usuario WHERE rol = 'alumno' AND activo = TRUE)::int AS alumnos,
        (SELECT COUNT(*) FROM curso c JOIN periodo_activo p ON p.id = c.periodo_id WHERE c.eliminado_en IS NULL)::int AS cursos,
        (SELECT COUNT(*) FROM sesion_clase s JOIN curso c ON c.id = s.curso_id JOIN periodo_activo p ON p.id = c.periodo_id WHERE s.estado = 'activa')::int AS sesiones_activas,
        (SELECT COUNT(*) FROM justificacion j JOIN curso c ON c.id = j.curso_id JOIN periodo_activo p ON p.id = c.periodo_id WHERE j.estado = 'pendiente')::int AS justificaciones_pendientes,
        (SELECT COUNT(*) FROM sesion_clase s JOIN curso c ON c.id = s.curso_id JOIN periodo_activo p ON p.id = c.periodo_id WHERE s.fecha = CURRENT_DATE)::int AS sesiones_hoy,
        (SELECT COUNT(*) FROM justificacion j JOIN curso c ON c.id = j.curso_id JOIN periodo_activo p ON p.id = c.periodo_id WHERE j.estado <> 'pendiente')::int AS justificaciones_procesadas,
        (SELECT COUNT(*) FROM asistencia a JOIN sesion_clase s ON s.id = a.sesion_id JOIN curso c ON c.id = s.curso_id JOIN periodo_activo p ON p.id = c.periodo_id)::int AS asistencias_registradas,
        COALESCE((SELECT ROUND(COUNT(*) FILTER (WHERE a.estado IN ('presente', 'tardanza')) * 100.0 / NULLIF(COUNT(*), 0), 1) FROM asistencia a JOIN sesion_clase s ON s.id = a.sesion_id JOIN curso c ON c.id = s.curso_id JOIN periodo_activo p ON p.id = c.periodo_id), 0)::numeric AS porcentaje_global,
        (SELECT codigo FROM periodo_activo) AS periodo_codigo,
        (SELECT COUNT(*) FROM incidencia_docente WHERE estado = 'pendiente')::int AS incidencias_pendientes
