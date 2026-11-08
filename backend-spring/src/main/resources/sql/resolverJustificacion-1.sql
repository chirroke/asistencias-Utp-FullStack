SELECT j.id, j.estado, c.docente_id
       FROM justificacion j JOIN curso c ON c.id = j.curso_id
       WHERE j.id = :p1 FOR UPDATE OF j
