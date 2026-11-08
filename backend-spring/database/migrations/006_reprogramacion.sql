-- Run once on the target database before deploying the reprogramming feature.
ALTER TYPE public.estado_sesion ADD VALUE IF NOT EXISTS 'reprogramada';

CREATE TABLE IF NOT EXISTS public.reprogramacion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_anterior_id uuid NOT NULL REFERENCES public.sesion_clase(id),
    sesion_nueva_id uuid NOT NULL REFERENCES public.sesion_clase(id),
    docente_id uuid NOT NULL REFERENCES public.usuario(id),
    motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 8 AND 1000),
    solicitada_en timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_reprogramacion_sesion_anterior UNIQUE (sesion_anterior_id),
    CONSTRAINT uq_reprogramacion_sesion_nueva UNIQUE (sesion_nueva_id)
);

CREATE INDEX IF NOT EXISTS idx_reprogramacion_docente_fecha
    ON public.reprogramacion (docente_id, solicitada_en DESC);
