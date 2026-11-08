SELECT s.id, s.curso_id, s.fecha, s.token_qr, s.expira_en, s.estado,
              c.nombre AS curso, c.seccion
       FROM sesion_clase s JOIN curso c ON c.id = s.curso_id
       JOIN periodo_academico p ON p.id = c.periodo_id AND p.activo = TRUE
       WHERE s.id = :p1 FOR UPDATE OF s
