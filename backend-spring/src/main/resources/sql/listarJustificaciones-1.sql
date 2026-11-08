SELECT j.id, j.motivo, j.estado, j.fecha_inicio, j.creado_en, j.comentario_docente,
              j.archivo_nombre, (j.archivo_contenido IS NOT NULL) AS tiene_archivo,
              u.id AS alumno_id, u.nombres || ' ' || u.apellidos AS alumno,
              al.codigo_alumno AS codigo, c.id AS curso_id, c.nombre AS curso,
              c.seccion, s.id AS sesion_id, s.fecha AS sesion_fecha
       FROM justificacion j
       JOIN usuario u ON u.id = j.alumno_id
       JOIN alumno al ON al.usuario_id = u.id
       JOIN curso c ON c.id = j.curso_id
       LEFT JOIN justificacion_asistencia ja ON ja.justificacion_id = j.id
       LEFT JOIN asistencia a ON a.id = ja.asistencia_id
       LEFT JOIN sesion_clase s ON s.id = a.sesion_id
       WHERE (:p1 = 'admin' OR c.docente_id = :p2)
       ORDER BY j.creado_en DESC
