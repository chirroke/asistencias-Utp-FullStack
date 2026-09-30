# Actualizaciones de base de datos

pgAdmin 4 es el cliente para administrar PostgreSQL; no es necesario actualizarlo para instalar cambios del sistema. Las migraciones modifican la base PostgreSQL a la que se conecta el backend.

Para crear una base limpia para la presentación, ejecuta `database.sql` desde la raíz del proyecto. Ese archivo reúne el esquema completo y los datos iniciales de demostración. Para actualizar una base existente, usa las migraciones de abajo en lugar de volver a crear las tablas.

Para una base existente, abre en pgAdmin la base configurada en `backend/.env`, abre Query Tool y ejecuta los archivos completos en este orden:

1. `001_password_reset.sql`
2. `002_student_teacher_admin.sql`
3. `003_course_capacity.sql`

La segunda migración agrega los campos de evidencia para justificaciones, el registro independiente de incidencias docentes y el origen `qr_dinamico` para las asistencias escaneadas por alumnos. La tercera establece la capacidad de demo de cinco matrículas por curso. Las migraciones son aditivas y no eliminan datos existentes.

Después de ejecutar cada archivo, revisa la pestaña **Messages** y actualiza el árbol de objetos de pgAdmin. No compartas el archivo `.env`; contiene la conexión privada a la base.
