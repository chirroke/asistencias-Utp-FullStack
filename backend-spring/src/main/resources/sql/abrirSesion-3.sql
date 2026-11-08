SELECT * FROM sesion_clase WHERE curso_id = :p1 AND estado = 'activa'
       ORDER BY hora_inicio DESC, id DESC LIMIT 1
