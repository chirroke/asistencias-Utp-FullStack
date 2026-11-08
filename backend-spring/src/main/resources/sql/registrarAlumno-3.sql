INSERT INTO usuario (correo, contrasena_hash, nombres, apellidos, rol, creado_por)
       VALUES (:p1, :p2, :p3, :p4, 'alumno', :p5) RETURNING id
