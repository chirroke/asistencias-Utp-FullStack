-- Ejecutar en pgAdmin Query Tool conectado a la base existente asistencia.
-- Migracion aditiva: no borra datos, no crea otra base y no inserta cuentas demo.
-- Prepara el esquema que usan los flujos de QR, selfie y referencia facial.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.alumno') IS NULL
       OR to_regclass('public.asistencia') IS NULL
       OR to_regclass('public.sesion_clase') IS NULL
       OR to_regclass('public.usuario') IS NULL THEN
        RAISE EXCEPTION 'No se reconoce el esquema de asistencia. Conecta Query Tool a la base existente y confirma que contiene las tablas public.alumno, public.asistencia, public.sesion_clase y public.usuario.';
    END IF;
END $$;

-- Datos de referencia facial del alumno. La aplicación debe capturar la foto,
-- validarla y calcular/guardar el embedding; SQL no realiza reconocimiento facial.
ALTER TABLE public.alumno
    ADD COLUMN IF NOT EXISTS foto_referencia_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS foto_referencia BYTEA,
    ADD COLUMN IF NOT EXISTS rostro_embedding TEXT,
    ADD COLUMN IF NOT EXISTS rostro_modelo VARCHAR(50),
    ADD COLUMN IF NOT EXISTS rostro_actualizado_en TIMESTAMPTZ;

-- La selfie de cada marcación se conserva en BYTEA, como espera el backend.
ALTER TABLE public.asistencia
    ADD COLUMN IF NOT EXISTS foto_marcacion BYTEA,
    ADD COLUMN IF NOT EXISTS puntaje_facial NUMERIC(5,4);

-- Campos que el docente usa para publicar y renovar el QR de una sesión.
ALTER TABLE public.sesion_clase
    ADD COLUMN IF NOT EXISTS qr_secreto VARCHAR(64),
    ADD COLUMN IF NOT EXISTS qr_ventana_seg INTEGER,
    ADD COLUMN IF NOT EXISTS token_qr VARCHAR(255),
    ADD COLUMN IF NOT EXISTS expira_en TIMESTAMPTZ;

-- Historial de intentos: no guarda una selfie rechazada ni inventa resultados.
CREATE TABLE IF NOT EXISTS public.intento_asistencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id UUID NOT NULL REFERENCES public.sesion_clase(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
    resultado public.resultado_intento NOT NULL,
    puntaje_facial NUMERIC(5,4),
    selfie_url VARCHAR(500),
    direccion_ip INET,
    info_dispositivo VARCHAR(255),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_intento_puntaje_facial
        CHECK (puntaje_facial IS NULL OR puntaje_facial BETWEEN 0 AND 1)
);

CREATE INDEX IF NOT EXISTS idx_intento_alumno
    ON public.intento_asistencia (alumno_id);
CREATE INDEX IF NOT EXISTS idx_intento_sesion
    ON public.intento_asistencia (sesion_id);

COMMIT;

-- Verificacion visible en la pestaña Data Output de pgAdmin.
SELECT tabla, columna, tipo
FROM (
    SELECT c.table_name AS tabla, c.column_name AS columna, c.data_type AS tipo
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND ( (c.table_name = 'alumno' AND c.column_name IN
                ('foto_referencia_url', 'foto_referencia', 'rostro_embedding', 'rostro_modelo', 'rostro_actualizado_en'))
         OR (c.table_name = 'asistencia' AND c.column_name IN
                ('foto_marcacion', 'puntaje_facial'))
         OR (c.table_name = 'sesion_clase' AND c.column_name IN
                ('qr_secreto', 'qr_ventana_seg', 'token_qr', 'expira_en')) )
    UNION ALL
    SELECT 'intento_asistencia', '(tabla)', 'table'
    WHERE to_regclass('public.intento_asistencia') IS NOT NULL
) AS esquema_qr_biometria
ORDER BY tabla, columna;
