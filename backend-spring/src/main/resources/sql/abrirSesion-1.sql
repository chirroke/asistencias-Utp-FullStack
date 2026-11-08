SELECT c.id, c.nombre, c.seccion, c.tolerancia_marcado_min, c.docente_id
       FROM curso c JOIN periodo_academico p ON p.id = c.periodo_id AND p.activo = TRUE
       WHERE c.id = :p1 AND c.eliminado_en IS NULL
