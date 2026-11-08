import { lazy, Suspense, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/Authcontext';
import { LoginPage } from './pages/auth/LoginPage';
import { CambiarContrasenaPage } from './pages/auth/CambiarContrasenaPage';
import { DocenteDashboard } from './pages/docente/DocenteDashboard';
import DocenteProyeccion from './pages/docente/DocenteProyeccion';
import { DocenteHistorial } from './pages/docente/DocenteHistorial';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDocentesPage } from './pages/admin/AdminDocentesPage';
import { AdminIncidencias } from './pages/admin/AdminIncidencias';
import { AdminAlumnosPage } from './pages/admin/AdminAlumnosPage';
import { AdminCursosPage } from './pages/admin/AdminCursosPage';
import { AlumnoDashboard } from './pages/alumno/AlumnoDashboard';
import { DocenteJustificaciones } from './pages/docente/DocenteJustificaciones';
import { DocenteReprogramarPage } from './pages/docente/DocenteReprogramarPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { abrirSesion } from './services/api';

const AlumnoEscaneo = lazy(() => import('./pages/alumno/AlumnoEscaneo'));
const AlumnoRegistrarRostro = lazy(() => import('./pages/alumno/AlumnoRegistrarRostro'));

// El cursoId vive en la URL (/docente/proyeccion/:cursoId), no en el
// "state" de React Router: ese state se pierde con cualquier refresh
// o recarga de Vite (HMR), y sin él la pantalla no tenía sesionId.
// Aquí mismo se abre (o reutiliza) la sesión real cada vez que se entra
// a esta pantalla, así sobrevive a un F5 en pleno.
const DocenteProyeccionWrapper = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cursoId } = useParams<{ cursoId: string }>();

  const [datos, setDatos] = useState<{
    sesionId: string;
    cursoNombre: string;
    cursoSeccion: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const volver = () =>
    navigate(user?.rol === 'admin' ? '/admin/dashboard' : '/docente/dashboard', { replace: true });

  useEffect(() => {
    if (!cursoId) {
      volver();
      return;
    }
    void Promise.resolve().then(() => {
      setError(null);
      setDatos(null);
      return abrirSesion(cursoId);
    }).then((data) => {
        setDatos({
          sesionId: data.sesion.id,
          cursoNombre: data.curso.nombre,
          cursoSeccion: data.curso.seccion,
        });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo abrir la sesión'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#071118] text-white flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-red-400 text-center">{error}</p>
        <button
          onClick={volver}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="min-h-screen bg-[#071118] text-white flex items-center justify-center">
        <p className="text-sm text-slate-400">Abriendo sesión...</p>
      </div>
    );
  }

  return (
    <DocenteProyeccion
      sesionId={datos.sesionId}
      cursoNombre={datos.cursoNombre}
      cursoSeccion={datos.cursoSeccion}
    />
  );
};

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'docente') return <Navigate to="/docente/dashboard" replace />;
  if (user.rol === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.rol === 'alumno') return <Navigate to="/alumno/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cuenta/cambiar-contrasena" element={<ProtectedRoute allowedRoles={['docente', 'alumno', 'admin']}><CambiarContrasenaPage /></ProtectedRoute>} />

          {/* Docente */}
          <Route
            path="/docente/dashboard"
            element={
              <ProtectedRoute allowedRoles={['docente']}>
                <DocenteDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/docente/proyeccion/:cursoId"
            element={
              <ProtectedRoute allowedRoles={['docente', 'admin']}>
                <DocenteProyeccionWrapper />
              </ProtectedRoute>
            }
          />
          <Route
            path="/docente/historial/:cursoId"
            element={
              <ProtectedRoute allowedRoles={['docente', 'admin']}>
                <DocenteHistorial />
              </ProtectedRoute>
            }
          />
          <Route path="/docente/justificaciones" element={<ProtectedRoute allowedRoles={['docente']}><DocenteJustificaciones /></ProtectedRoute>} />
          <Route path="/docente/cursos/:cursoId/reprogramar" element={<ProtectedRoute allowedRoles={['docente']}><DocenteReprogramarPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/docentes" element={<ProtectedRoute allowedRoles={['admin']}><AdminDocentesPage /></ProtectedRoute>} />
          <Route path="/admin/alumnos" element={<ProtectedRoute allowedRoles={['admin']}><AdminAlumnosPage /></ProtectedRoute>} />
          <Route path="/admin/cursos" element={<ProtectedRoute allowedRoles={['admin']}><AdminCursosPage /></ProtectedRoute>} />
          <Route path="/admin/incidencias" element={<ProtectedRoute allowedRoles={['admin']}><AdminIncidencias /></ProtectedRoute>} />
          <Route path="/admin/justificaciones" element={<ProtectedRoute allowedRoles={['admin']}><DocenteJustificaciones /></ProtectedRoute>} />

          {/* Alumno */}
          <Route
            path="/alumno/dashboard"
            element={
              <ProtectedRoute allowedRoles={['alumno']}>
                <AlumnoDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alumno/escaneo"
            element={
              <ProtectedRoute allowedRoles={['alumno']}>
                <Suspense fallback={<div className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">Abriendo escáner…</div>}><AlumnoEscaneo /></Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="/alumno/rostro" element={<ProtectedRoute allowedRoles={['alumno']}><Suspense fallback={<div className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">Abriendo registro facial…</div>}><AlumnoRegistrarRostro /></Suspense></ProtectedRoute>} />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
