import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarCheck, CalendarClock, Clock3, FileCheck2, History, KeyRound, Layers3, LogOut, QrCode, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../context/Authcontext';
import { checkinDocente, enviarIncidenciaDocente, listarJustificacionesDocente, obtenerMisCursos } from '../../services/api';

interface CursoApi {
  id: string;
  codigo: string;
  nombre: string;
  seccion: string;
  alumnosTotal: number;
  capacidadAlumnos: number;
  asistenciaPromedio: number | null;
  docenteCheckin: boolean;
  enCurso: boolean;
  sesionActivaId: string | null;
  sesionHoraInicio?: string | null;
  sesionHoraFin?: string | null;
}

export const DocenteDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [cursos, setCursos] = useState<CursoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [marcandoEntrada, setMarcandoEntrada] = useState(false);
  const [pendientesJustificacion, setPendientesJustificacion] = useState(0);
  const [modalIncidencia, setModalIncidencia] = useState(false);
  const [tipoIncidencia, setTipoIncidencia] = useState('falla_pc');
  const [descripcionIncidencia, setDescripcionIncidencia] = useState('');
  const [evidenciaIncidencia, setEvidenciaIncidencia] = useState<File | null>(null);
  const [enviandoIncidencia, setEnviandoIncidencia] = useState(false);

  const cargarCursos = async () => {
    setCargando(true);
    setError('');
    try {
      const [lista, inbox] = await Promise.all([obtenerMisCursos(), listarJustificacionesDocente() as Promise<{ justificaciones: Array<{ estado: string }> }>]);
      setCursos(lista);
      setPendientesJustificacion(inbox.justificaciones.filter((item) => item.estado === 'pendiente').length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus cursos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void Promise.resolve().then(cargarCursos); }, []);

  const activos = useMemo(() => cursos.filter((curso) => curso.enCurso), [cursos]);
  const alumnos = useMemo(() => cursos.reduce((total, curso) => total + curso.alumnosTotal, 0), [cursos]);
  const asistenciaPromedio = useMemo(() => {
    const cursosConDatos = cursos.filter((curso) => curso.asistenciaPromedio !== null);
    return cursosConDatos.length
      ? Math.round(cursosConDatos.reduce((total, curso) => total + (curso.asistenciaPromedio || 0), 0) / cursosConDatos.length)
      : null;
  }, [cursos]);

  const formatHora = (value?: string | null) => value
    ? new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null;

  const marcarEntrada = async () => {
    const cursoActivo = activos[0];
    if (!cursoActivo?.sesionActivaId || cursoActivo.docenteCheckin) return;
    setMarcandoEntrada(true);
    try {
      await checkinDocente(cursoActivo.sesionActivaId);
      setCursos((actuales) => actuales.map((curso) => curso.id === cursoActivo.id ? { ...curso, docenteCheckin: true } : curso));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo marcar la entrada');
    } finally {
      setMarcandoEntrada(false);
    }
  };

  const enviarIncidencia = async (event: React.FormEvent) => {
    event.preventDefault();
    const cursoActivo = activos[0];
    if (!cursoActivo?.sesionActivaId || !evidenciaIncidencia) return;
    setEnviandoIncidencia(true); setError('');
    try {
      await enviarIncidenciaDocente(cursoActivo.sesionActivaId, tipoIncidencia, descripcionIncidencia, evidenciaIncidencia);
      setModalIncidencia(false); setDescripcionIncidencia(''); setEvidenciaIncidencia(null);
      setAviso('Incidencia enviada a administración para verificación. No cambia tu asistencia.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo reportar la incidencia.'); }
    finally { setEnviandoIncidencia(false); }
  };

  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="flex items-center justify-between bg-[#002238] px-6 py-3.5 text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-700/40 bg-[#0b3552] text-sm font-bold text-cyan-200">
          {(user?.nombres || 'D').slice(0, 1)}{(user?.apellidos || '').slice(0, 1)}
        </div>
        <div><h2 className="text-sm font-bold">{[user?.nombres, user?.apellidos].filter(Boolean).join(' ') || 'Docente'}</h2><p className="text-[11px] text-slate-300">Docente · Periodo activo</p></div>
      </div>
      <div className="flex items-center gap-2"><button onClick={() => navigate('/cuenta/cambiar-contrasena')} title="Cambiar contraseña" className="rounded-lg bg-white/10 p-2 text-slate-100 transition hover:bg-white/20"><KeyRound size={17}/></button><button onClick={logout} title="Cerrar sesión" className="rounded-lg bg-white/10 p-2 text-slate-100 transition hover:bg-red-900/50"><LogOut size={17}/></button></div>
    </header>

    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Mis cursos del periodo activo</h1>
        <button onClick={() => void cargarCursos()} disabled={cargando} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={14}/> Actualizar</button>
      </div>

      {activos.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white"><CalendarCheck size={19}/></div><div><h2 className="text-xs font-bold text-amber-900">{activos[0].docenteCheckin ? 'Entrada docente registrada' : 'Asistencia docente pendiente'}</h2><p className="text-[11px] text-amber-700">{activos[0].nombre} · Sección {activos[0].seccion}</p></div></div>
        <div className="flex flex-wrap gap-2">{activos[0].docenteCheckin ? <span className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white">Entrada marcada</span> : <button disabled={marcandoEntrada} onClick={() => void marcarEntrada()} className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60">{marcandoEntrada ? 'Marcando...' : 'Marcar entrada'}</button>}<button onClick={() => setModalIncidencia(true)} className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100">Reportar problema del aula</button></div>
      </div>}

      {error && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"><span>{error}</span><button onClick={() => void cargarCursos()} className="font-bold underline">Reintentar</button></div>}
      {aviso && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{aviso}</p>}

      {!error && !cargando && cursos.length > 0 && <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Cursos activos', value: String(cursos.length), Icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Secciones', value: String(new Set(cursos.map((curso) => curso.seccion)).size), Icon: Layers3, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Alumnos matriculados', value: String(alumnos), Icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Asistencia promedio', value: asistenciaPromedio === null ? '—' : `${asistenciaPromedio}%`, Icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, Icon, color, bg }) => <div key={label} className={`${bg} rounded-2xl p-4`}><Icon size={19} className={`${color} mb-2`}/><p className="text-2xl font-extrabold text-slate-800">{value}</p><p className="mt-0.5 text-xs text-slate-500">{label}</p></div>)}
      </section>}

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-800">Cursos y sesiones</h2><span className="text-[11px] text-slate-400">{cursos.length} secciones</span></div>
        {cargando ? <p className="py-12 text-center text-xs text-slate-400">Cargando tus cursos...</p>
          : cursos.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-xs text-slate-400">No tienes cursos asignados en la base de datos.</div>
            : <div className="grid gap-4 md:grid-cols-2">{cursos.map((curso) => {
              const horaInicio = formatHora(curso.sesionHoraInicio);
              const horaFin = formatHora(curso.sesionHoraFin);
              return <article key={curso.id} className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm ${curso.enCurso ? 'border-[#c8102e]' : 'border-slate-200'}`}>
                <div>
                  <div className="mb-3 flex items-center justify-between"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${curso.enCurso ? 'bg-rose-50 text-[#c8102e]' : 'bg-slate-100 text-slate-500'}`}>{curso.enCurso ? '● Clase en curso' : 'Sesión no iniciada'}</span><span className="text-[10px] font-semibold text-slate-400">{curso.codigo}</span></div>
                  <h3 className="text-base font-bold text-slate-900">{curso.nombre}</h3>
                  <p className="mt-1 text-xs text-slate-500">Sección {curso.seccion}{horaInicio && horaFin ? ` · ${horaInicio}–${horaFin}` : ''} · {curso.alumnosTotal}/{curso.capacidadAlumnos} alumnos</p>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500"><span>Matrícula activa</span><b className="text-slate-700">{curso.alumnosTotal}/{curso.capacidadAlumnos}</b></div>
                  {curso.asistenciaPromedio !== null && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${curso.asistenciaPromedio}%` }}/></div>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => navigate(`/docente/proyeccion/${curso.id}`)} className="flex items-center justify-center gap-2 rounded-xl bg-[#c8102e] py-2.5 text-xs font-bold text-white transition hover:bg-[#a60d26]"><QrCode size={15}/>{curso.enCurso ? 'Continuar proyección' : 'Abrir sesión'}</button>
                  <button onClick={() => navigate(`/docente/historial/${curso.id}`)} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-slate-600 hover:bg-slate-50"><History size={15}/><span className="text-xs font-semibold">Historial</span></button>
                  <button onClick={() => navigate(`/docente/cursos/${curso.id}/reprogramar`)} className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100"><CalendarClock size={15}/>Reprogramar a otra sección</button>
                </div>
              </article>;
            })}</div>}
      </section>
      <button onClick={() => navigate('/docente/justificaciones')} className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left hover:bg-amber-100"><span className="flex items-center gap-3"><span className="rounded-xl bg-amber-500/10 p-2 text-amber-700"><FileCheck2 size={20}/></span><span><b className="block text-xs text-amber-900">Bandeja de justificaciones</b><span className="text-[11px] text-amber-700">{pendientesJustificacion} solicitudes pendientes de revisión</span></span></span><span className="text-xs font-bold text-amber-800">Revisar →</span></button>
    </main>
    {modalIncidencia && activos[0]?.sesionActivaId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={(event) => void enviarIncidencia(event)} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div><h2 className="text-lg font-bold">Reportar incidencia técnica</h2><p className="mt-1 text-xs text-slate-500">Administración revisará el archivo. La incidencia no cambia el registro de asistencia.</p></div>
      <label className="block text-xs font-semibold">Tipo<select value={tipoIncidencia} onChange={(event) => setTipoIncidencia(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="falla_pc">La PC del aula no encendió</option><option value="problema_red">Problema de red o proyector</option><option value="otro">Otra incidencia técnica</option></select></label>
      <label className="block text-xs font-semibold">Descripción<textarea required minLength={5} maxLength={1000} value={descripcionIncidencia} onChange={(event) => setDescripcionIncidencia(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" rows={3} placeholder="Describe qué ocurrió y a qué hora"/></label>
      <label className="block text-xs font-semibold">Evidencia (PDF, JPG o PNG · máximo 5 MB)<input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setEvidenciaIncidencia(event.target.files?.[0] || null)} className="mt-2 block w-full text-xs"/></label>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalIncidencia(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Cancelar</button><button disabled={enviandoIncidencia || !evidenciaIncidencia} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{enviandoIncidencia ? 'Enviando…' : 'Enviar a administración'}</button></div>
    </form></div>}
  </div>;
};
