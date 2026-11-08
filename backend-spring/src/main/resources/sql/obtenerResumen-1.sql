SELECT u.nombres, u.apellidos, al.codigo_alumno
       FROM usuario u JOIN alumno al ON al.usuario_id = u.id WHERE u.id = :p1 AND u.activo = TRUE
