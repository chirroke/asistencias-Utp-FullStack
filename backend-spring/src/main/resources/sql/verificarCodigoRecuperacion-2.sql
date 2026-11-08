UPDATE password_reset_code SET intentos = LEAST(intentos + 1, 5) WHERE usuario_id = :p1
