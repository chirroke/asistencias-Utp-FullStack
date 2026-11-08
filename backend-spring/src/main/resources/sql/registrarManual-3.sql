INSERT INTO bitacora_auditoria (usuario_id, accion, entidad, entidad_id, datos_despues)
       VALUES (:p1, 'corregir_asistencia', 'asistencia', :p2, :p3)
