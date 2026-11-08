SELECT creado_en AS registrado_en FROM bitacora_auditoria
       WHERE usuario_id = :p1 AND accion = 'checkin_docente' AND entidad = 'sesion_clase' AND entidad_id = :p2::text
       ORDER BY creado_en LIMIT 1
