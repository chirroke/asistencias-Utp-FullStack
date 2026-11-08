SELECT i.id, i.tipo, i.descripcion, i.estado, i.creado_en, i.archivo_nombre,
              (i.archivo_contenido IS NOT NULL) AS tiene_archivo,
              u.id AS docente_id, u.nombres || ' ' || u.apellidos AS docente, u.correo,
              c.nombre AS curso, c.seccion, s.fecha AS sesion_fecha
       FROM incidencia_docente i JOIN usuario u ON u.id = i.docente_id
       JOIN sesion_clase s ON s.id = i.sesion_id JOIN curso c ON c.id = s.curso_id
       ORDER BY (i.estado = 'pendiente') DESC, i.creado_en DESC
