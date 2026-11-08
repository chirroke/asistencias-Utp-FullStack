SELECT 1 FROM password_reset_code WHERE usuario_id = :p1 AND solicitado_en > now() - interval '60 seconds'
