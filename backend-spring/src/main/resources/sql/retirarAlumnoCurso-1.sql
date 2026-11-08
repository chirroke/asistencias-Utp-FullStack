UPDATE matricula
       SET estado = 'retirada', retirada_en = now(), actualizado_en = now(), actualizado_por = :p1
       WHERE alumno_id = :p2 AND curso_id = :p3 AND estado = 'activa'
       RETURNING id
