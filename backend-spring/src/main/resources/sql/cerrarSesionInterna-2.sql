UPDATE sesion_clase
       SET estado = 'cerrada', hora_cierre_real = now(), tipo_cierre = :p2, cerrada_por = :p3
     WHERE id = :p1
