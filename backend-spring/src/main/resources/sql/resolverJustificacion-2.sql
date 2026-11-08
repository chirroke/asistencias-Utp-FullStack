UPDATE justificacion SET estado = :p1, revisada_por = :p2, revisada_en = now(),
         comentario_docente = NULLIF(:p3, ''), actualizado_en = now(), actualizado_por = :p2
       WHERE id = :p4
