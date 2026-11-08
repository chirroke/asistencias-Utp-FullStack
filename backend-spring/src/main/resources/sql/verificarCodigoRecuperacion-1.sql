SELECT r.usuario_id, r.codigo_hash, r.intentos
         FROM password_reset_code r JOIN usuario u ON u.id = r.usuario_id
         WHERE u.correo = :p1 AND u.activo = TRUE AND r.expira_en > now()
           AND r.verificado_en IS NULL FOR UPDATE OF r
