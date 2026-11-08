INSERT INTO asistencia (sesion_id, alumno_id, estado, origen, foto_marcacion, puntaje_facial)
       VALUES (:p1, :p2, 'presente', 'qr_dinamico', :p3, :p4)
       ON CONFLICT (sesion_id, alumno_id) DO NOTHING RETURNING id, registrado_en
