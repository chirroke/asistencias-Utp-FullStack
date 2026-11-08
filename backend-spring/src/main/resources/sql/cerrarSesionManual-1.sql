SELECT id FROM sesion_clase WHERE estado = 'activa' AND hora_fin_programada < now()
