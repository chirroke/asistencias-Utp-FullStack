UPDATE usuario SET activo = :p1, actualizado_en = now(), actualizado_por = :p2
       WHERE id = :p3 AND rol = 'docente' RETURNING id, activo
