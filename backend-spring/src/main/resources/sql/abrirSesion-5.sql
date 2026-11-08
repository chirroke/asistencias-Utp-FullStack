INSERT INTO sesion_clase
           (curso_id, fecha, hora_inicio, hora_fin_programada, estado, tolerancia_marcado_min, tolerancia_tardanza_min, creado_por)
         VALUES (:p1, CURRENT_DATE, now(), now() + (:p2 || ' minutes')::interval, 'activa', :p3, :p3, :p4)
         RETURNING *
