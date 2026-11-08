-- Synthetic accounts and courses for the public teaching demo only.
-- Shared demo password for all three roles: Demo2026!
-- Do not load the institutional backup into a public hosting database.

INSERT INTO public.usuario (id, correo, contrasena_hash, nombres, apellidos, rol, activo)
VALUES
  ('22222222-2222-4222-8222-222222222222', 'demo.docente@example.com', crypt('Demo2026!', gen_salt('bf', 12)), 'Docente', 'Demostracion', 'docente', TRUE),
  ('33333333-3333-4333-8333-333333333333', 'demo.admin@example.com', crypt('Demo2026!', gen_salt('bf', 12)), 'Admin', 'Demostracion', 'admin', TRUE),
  ('44444444-4444-4444-8444-444444444444', 'demo.alumno1@example.com', crypt('Demo2026!', gen_salt('bf', 12)), 'Alumna', 'Demo Uno', 'alumno', TRUE),
  ('55555555-5555-4555-8555-555555555555', 'demo.alumno2@example.com', crypt('Demo2026!', gen_salt('bf', 12)), 'Alumno', 'Demo Dos', 'alumno', TRUE),
  ('66666666-6666-4666-8666-666666666666', 'demo.alumno3@example.com', crypt('Demo2026!', gen_salt('bf', 12)), 'Alumno', 'Demo Tres', 'alumno', TRUE)
ON CONFLICT (id) DO UPDATE SET
  correo = EXCLUDED.correo,
  contrasena_hash = EXCLUDED.contrasena_hash,
  nombres = EXCLUDED.nombres,
  apellidos = EXCLUDED.apellidos,
  rol = EXCLUDED.rol,
  activo = TRUE,
  eliminado_en = NULL;

INSERT INTO public.alumno (usuario_id, codigo_alumno)
VALUES
  ('44444444-4444-4444-8444-444444444444', 'DEMO-001'),
  ('55555555-5555-4555-8555-555555555555', 'DEMO-002'),
  ('66666666-6666-4666-8666-666666666666', 'DEMO-003')
ON CONFLICT (usuario_id) DO UPDATE SET codigo_alumno = EXCLUDED.codigo_alumno;

INSERT INTO public.periodo_academico (id, codigo, fecha_inicio, fecha_fin, activo)
VALUES ('11111111-1111-4111-8111-111111111111', '2026-II', DATE '2026-08-01', DATE '2026-12-31', TRUE)
ON CONFLICT (id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  fecha_inicio = EXCLUDED.fecha_inicio,
  fecha_fin = EXCLUDED.fecha_fin,
  activo = TRUE;

INSERT INTO public.curso (
  id, periodo_id, docente_id, codigo, nombre, seccion,
  tolerancia_marcado_min, umbral_riesgo_pct, tolerancia_tardanza_min, capacidad_alumnos
)
VALUES
  ('77777777-7777-4777-8777-777777777777', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'DEMO-FS', 'Desarrollo Full Stack - Demo', 'D01', 10, 25.00, 15, 5),
  ('88888888-8888-4888-8888-888888888888', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'DEMO-BD', 'Base de Datos - Demo', 'D02', 10, 25.00, 15, 5)
ON CONFLICT (id) DO UPDATE SET
  periodo_id = EXCLUDED.periodo_id,
  docente_id = EXCLUDED.docente_id,
  codigo = EXCLUDED.codigo,
  nombre = EXCLUDED.nombre,
  seccion = EXCLUDED.seccion,
  tolerancia_marcado_min = EXCLUDED.tolerancia_marcado_min,
  umbral_riesgo_pct = EXCLUDED.umbral_riesgo_pct,
  tolerancia_tardanza_min = EXCLUDED.tolerancia_tardanza_min,
  capacidad_alumnos = EXCLUDED.capacidad_alumnos,
  eliminado_en = NULL;

INSERT INTO public.matricula (id, curso_id, alumno_id, estado)
VALUES
  ('99999999-9999-4999-8999-999999999991', '77777777-7777-4777-8777-777777777777', '44444444-4444-4444-8444-444444444444', 'activa'),
  ('99999999-9999-4999-8999-999999999992', '77777777-7777-4777-8777-777777777777', '55555555-5555-4555-8555-555555555555', 'activa'),
  ('99999999-9999-4999-8999-999999999993', '88888888-8888-4888-8888-888888888888', '66666666-6666-4666-8666-666666666666', 'activa')
ON CONFLICT (id) DO UPDATE SET
  curso_id = EXCLUDED.curso_id,
  alumno_id = EXCLUDED.alumno_id,
  estado = EXCLUDED.estado;
