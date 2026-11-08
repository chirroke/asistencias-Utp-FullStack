-- La selfie capturada al marcar asistencia se usa para la demo en vivo.
-- El docente autorizado ve la foto en el roster de la sesión.
ALTER TABLE asistencia
  ADD COLUMN IF NOT EXISTS foto_marcacion BYTEA;
