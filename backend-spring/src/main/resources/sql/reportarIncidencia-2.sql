INSERT INTO incidencia_docente
         (docente_id, sesion_id, tipo, descripcion, archivo_nombre, archivo_mime, archivo_contenido)
       VALUES (:p1, :p2, :p3, :p4, :p5, :p6, :p7) RETURNING id, creado_en, estado
