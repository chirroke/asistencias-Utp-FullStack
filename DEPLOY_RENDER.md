# Publicar la demo de Asistencia UTP en Render

Este despliegue junta React y Spring Boot en una sola URL. La base se crea vacia y se inicializa con el esquema y las cuentas ficticias de `backend-spring/database/demo-seed.sql`; no se sube `asistencia_completa.backup` ni el `.env.local`.

## Limites del plan gratuito

- El enlace `*.onrender.com` queda alojado aunque la laptop este apagada.
- El servicio web gratuito se duerme tras 15 minutos sin trafico. La primera visita despues puede tardar cerca de un minuto.
- La base de datos gratuita de Render vence a los 30 dias. Para conservar los datos y disponibilidad a largo plazo hay que pasar la base a un plan pagado o usar otro proveedor persistente.
- El servicio gratuito bloquea el envio SMTP en los puertos comunes 25, 465 y 587; no se debe prometer la recuperacion de contrasena por correo en esta demo.

## Pasos de preparacion y publicacion

1. Revisa el `Dockerfile`, `.dockerignore`, `render.yaml` y esta guia.
2. Publica el codigo del proyecto en un repositorio Git al que tengas acceso desde Render. No incluyas `.env.local`, backups, datos reales, `node_modules` ni `target`.
3. En Render, crea un **Blueprint** desde ese repositorio y selecciona el plan gratuito para el servicio y Postgres. El archivo `render.yaml` configura ambos en Virginia.
4. Espera a que Render cree la base y aparezca su direccion externa en **Connect**. El servicio web puede abrir la portada antes de cargar el esquema.
5. En PowerShell, desde `backend-spring`, ejecuta `.Inicializar-Demo-Render.ps1`. Escribe los campos de conexion mostrados por Render y pega la contrasena solo en el prompt seguro del script. El script rechaza una base que ya tenga `public.usuario` y no borra datos.
6. Espera el siguiente despliegue/reinicio del servicio y comprueba `https://asistencia-qr-avance2.onrender.com/api/health`. Debe responder `UP` con backend Spring Boot y PostgreSQL.
7. Abre la URL principal y usa las cuentas ficticias de abajo.

Si el nombre de servicio no esta disponible y Render asigna otra URL, cambia `FRONTEND_ORIGINS` en el servicio por el origen real `https://<tu-servicio>.onrender.com` y vuelve a desplegar. Esto tambien permite la conexion WebSocket del docente.

## Cuentas ficticias

Las tres cuentas usan `Demo2026!` y contienen solo nombres, codigos y cursos inventados:

| Rol | Correo |
| --- | --- |
| Docente | `demo.docente@example.com` |
| Administrador | `demo.admin@example.com` |
| Alumna 1 | `demo.alumno1@example.com` |
| Alumno 2 | `demo.alumno2@example.com` |
| Alumno 3 | `demo.alumno3@example.com` |

La base incluye dos cursos sinteticos para el docente en el periodo activo `2026-II`.
