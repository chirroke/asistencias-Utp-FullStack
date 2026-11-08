SELECT COUNT(*)::int AS total FROM matricula WHERE curso_id = :p1 AND estado = 'activa'
