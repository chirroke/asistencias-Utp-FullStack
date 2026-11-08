INSERT INTO justificacion
         (alumno_id, curso_id, motivo, fecha_inicio, fecha_fin, estado, archivo_nombre, archivo_mime, archivo_contenido, creado_por)
       VALUES (:p1, :p2, :p3, :p4, :p4, 'pendiente', :p5, :p6, :p7, :p1) RETURNING id
