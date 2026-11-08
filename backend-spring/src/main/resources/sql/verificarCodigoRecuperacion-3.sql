UPDATE password_reset_code SET verificado_en = now(), token_reset_hash = :p2 WHERE usuario_id = :p1
