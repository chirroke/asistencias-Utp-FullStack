UPDATE sesion_clase
         SET token_qr = :p1, expira_en = :p2
       WHERE id = :p3 AND estado = 'activa'
       RETURNING id, expira_en
