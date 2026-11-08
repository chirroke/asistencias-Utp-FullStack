INSERT INTO bitacora_auditoria (usuario_id, accion, entidad, entidad_id, datos_despues)
       VALUES (:p1, 'eliminar', 'matricula', :p2, :p3::jsonb)
