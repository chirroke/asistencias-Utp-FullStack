INSERT INTO password_reset_code (usuario_id, codigo_hash, expira_en, intentos, solicitado_en)
           VALUES (:p1, :p2, now() + interval '10 minutes', 0, now())
           ON CONFLICT (usuario_id) DO UPDATE SET
             codigo_hash = EXCLUDED.codigo_hash, expira_en = EXCLUDED.expira_en,
             intentos = 0, verificado_en = NULL, token_reset_hash = NULL, solicitado_en = now()
