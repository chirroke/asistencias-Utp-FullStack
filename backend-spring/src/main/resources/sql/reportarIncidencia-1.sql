SELECT s.id FROM sesion_clase s JOIN curso c ON c.id = s.curso_id
       WHERE s.id = :p1 AND s.estado = 'activa' AND c.docente_id = :p2
