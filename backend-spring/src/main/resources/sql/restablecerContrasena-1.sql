SELECT u.id, u.correo, u.nombres, u.apellidos
       FROM password_reset_code r JOIN usuario u ON u.id = r.usuario_id
       WHERE r.token_reset_hash = :p1 AND r.verificado_en > now() - interval '10 minutes'
         AND r.expira_en > now() AND u.activo = TRUE FOR UPDATE OF r, u
