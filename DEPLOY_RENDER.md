# Despliegue separado en Render

El Blueprint `render.yaml` define tres recursos independientes:

- **Frontend:** React/Vite como sitio estático.
- **Backend:** API Spring Boot en un servicio Docker.
- **Base de datos:** PostgreSQL.

El frontend lee `VITE_API_URL`; Spring y el WebSocket aceptan el dominio del frontend mediante `FRONTEND_ORIGINS`. El backend ya no incluye el build React en el JAR.

## 1. Subir el proyecto a un repositorio Git

Render necesita poder leer el repositorio conectado. Conserva el repositorio privado y verifica que no estén versionados `.env`, `.env.local`, contraseñas, backups ni dumps. El `.gitignore` del proyecto excluye esos archivos.

## 2. Crear el Blueprint

1. En el panel de Render, selecciona **New > Blueprint**.
2. Conecta GitHub y elige el repositorio y la rama que contienen `render.yaml`.
3. Deja la ruta del Blueprint como `render.yaml` si está en la raíz del repositorio.
4. Revisa el resumen: debe mostrar un sitio estático, un servicio web y una base PostgreSQL.
5. Confirma **Deploy Blueprint**.

Los tres recursos se crean en Virginia. El frontend compila desde `frontend`; el servicio Spring usa el `Dockerfile` de la raíz. La conexión a PostgreSQL se establece con las variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` del servicio de base de datos.

## 3. Verificar los dominios y variables

Render propone estos dominios según los nombres del Blueprint:

- Frontend: `https://asistencia-qr-frontend.onrender.com`
- API: `https://asistencia-qr-api.onrender.com`

Si Render muestra dominios distintos, actualiza:

- En **frontend > Environment**, `VITE_API_URL` = `https://<dominio-real-de-la-api>/api`.
- En **API > Environment**, `FRONTEND_ORIGINS` = `https://<dominio-real-del-frontend>`.

Guarda los cambios y vuelve a desplegar ambos servicios. `VITE_API_URL` se usa durante el build del frontend.

## 4. Inicializar la base sintética

La base nueva se crea vacía. No cargues el backup personal/institucional en una base pública. El script configura el esquema, la migración de reprogramación y cuentas y cursos inventados.

1. Instala `psql` de PostgreSQL 18 o superior en la laptop.
2. En Render, abre la base `asistencia-qr-demo-db` y entra a **Connect**. Usa la conexión externa para llenar los datos que pide el script.
3. En PowerShell, ejecuta:

```powershell
cd "D:\TDG\UTP\UTP-CICLO10\FS\SistemaAsistenciaQR\SistemaAsistenciaQR\backend-spring"
.\Inicializar-Demo-Render.ps1
```

El script solicita host, puerto, base, usuario y contraseña; la contraseña no se muestra. No compartas esos datos en el chat. El script se detiene si la base ya contiene `public.usuario`, para evitar borrar o sobrescribir tablas existentes. Ejecútalo una sola vez sobre la base recién creada.

## 5. Comprobar la aplicación

1. Abre `https://<dominio-real-de-la-api>/api/health`. Debe responder con estado `UP`, backend `Spring Boot` y base `PostgreSQL`.
2. Abre el dominio público del frontend.
3. Prueba inicio de sesión con las cuentas sintéticas:

| Rol | Correo |
| --- | --- |
| Docente | `demo.docente@example.com` |
| Administrador | `demo.admin@example.com` |
| Alumna | `demo.alumno1@example.com` |

Contraseña de demostración para esas cuentas: `Demo2026!`.

## Límites del plan gratuito

- El servicio API gratuito se duerme después de 15 minutos sin tráfico; la siguiente llamada puede tardar cerca de un minuto.
- La base PostgreSQL gratuita vence a los 30 días. Para conservar los datos después de ese plazo, cambia la base a un plan pagado antes de su vencimiento.
- El SMTP saliente en los puertos comunes 25, 465 y 587 está bloqueado en los servicios gratuitos; no presentes la recuperación por correo como verificada.
