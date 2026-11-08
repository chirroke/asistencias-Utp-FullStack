INSERT INTO bitacora_auditoria (usuario_id, accion, entidad, entidad_id, datos_despues)
       VALUES (:p1, 'checkin_docente', 'sesion_clase', :p2, :p3)
