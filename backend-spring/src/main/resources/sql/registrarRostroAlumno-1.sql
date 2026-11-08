UPDATE alumno SET foto_referencia = :p1, rostro_embedding = :p2, rostro_modelo = :p3,
                         rostro_actualizado_en = now()
       WHERE usuario_id = :p4 RETURNING usuario_id
