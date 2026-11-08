UPDATE incidencia_docente SET estado = :p1, revisada_por = :p2, revisada_en = now(), comentario_admin = NULLIF(:p3, '')
       WHERE id = :p4 AND estado = 'pendiente' RETURNING id
