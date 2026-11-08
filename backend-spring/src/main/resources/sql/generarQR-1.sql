SELECT 1 FROM sesion_clase s JOIN curso c ON c.id = s.curso_id
       JOIN periodo_academico p ON p.id = c.periodo_id AND p.activo = TRUE WHERE s.id = :p1
