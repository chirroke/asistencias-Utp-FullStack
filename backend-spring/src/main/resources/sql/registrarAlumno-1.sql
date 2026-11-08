SELECT id, capacidad_alumnos FROM curso WHERE id = :p1 AND eliminado_en IS NULL FOR UPDATE
