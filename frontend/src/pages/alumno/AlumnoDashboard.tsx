import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertCircle, ArrowLeft, Bell, BookOpen,
  Camera, Check, CheckCircle2, ClipboardList, Download,
  FileText, Fingerprint, Home, LogOut, ShieldCheck, Upload, UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/Authcontext';
import { enviarJustificacion, obtenerResumenAlumno } from '../../services/api';

type CursoAlumno = { id: string; codigo: string; nombre: string; seccion: string; docente: string | null; sesion_activa_id: string | null; total_clases: number; presentes: number; faltas: number; justificadas: number };
type Falla = { asistencia_id: string; fecha: string; curso_id: string; curso: string; seccion: string };
type Solicitud = { id: string; motivo: string; estado: string; creado_en: string; archivo_nombre: string | null; curso: string; fecha_sesion: string };
type Registro = { asistencia_id: string; estado: 'presente' | 'tardanza' | 'falta' | 'justificada'; registrado_en: string | null; sesion_id: string; fecha: string; hora_inicio: string; curso_id: string; curso: string; codigo: string; seccion: string };
type Resumen = {
  alumno: { nombres: string; apellidos: string; codigo: string; correo?: string };
  resumen: { clases: number; presentes: number; faltas: number; justificadas: number; porcentajeFaltas: number };
  cursos: CursoAlumno[];
  justificaciones: Solicitud[];
  faltasJustificables: Falla[];
  historial: Registro[];
};

type Vista = 'inicio' | 'reporte' | 'justificar' | 'perfil';
const tabs: { id: Vista; label: string; Icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', Icon: Home },
  { id: 'reporte', label: 'Reporte', Icon: Activity },
  { id: 'justificar', label: 'Justificar', Icon: FileText },
  { id: 'perfil', label: 'Perfil', Icon: UserRound },
];
const fechaCorta = (fecha?: string) => fecha ? new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : 'Fecha pendiente';

export const AlumnoDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [vista, setVista] = useState<Vista>('inicio');
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [cursoReporte, setCursoReporte] = useState('');
  const [cursoJustificar, setCursoJustificar] = useState('');
  const [faltaId, setFaltaId] = useState('');
  const [motivo, setMotivo] = useState('Descanso Médico');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const archivoInput = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const resumen = await obtenerResumenAlumno() as Resumen;
      setData(resumen);
      setError('');
      setCursoReporte((actual) => actual || resumen.cursos[0]?.id || '');
      setCursoJustificar((actual) => actual || resumen.faltasJustificables[0]?.curso_id || '');
      setFaltaId((actual) => actual || resumen.faltasJustificables[0]?.asistencia_id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu información académica.');
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(cargar); }, [cargar]);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!faltaId || !archivo || !descripcion.trim()) return;
    setEnviando(true);
    setError('');
    try {
      await enviarJustificacion(faltaId, `${motivo}: ${descripcion.trim()}`, archivo);
      setFaltaId(''); setDescripcion(''); setArchivo(null);
      if (archivoInput.current) archivoInput.current.value = '';
      await cargar();
      setVista('inicio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  const asistencias = useMemo(() => (data?.historial || []).filter((registro) => !cursoReporte || registro.curso_id === cursoReporte), [data, cursoReporte]);
  const faltasCurso = data?.faltasJustificables.filter((falta) => falta.curso_id === cursoJustificar) || [];
  const faltasPorCurso = data?.cursos.find((curso) => curso.id === cursoReporte)?.faltas || 0;
  const totalClasesCurso = data?.cursos.find((curso) => curso.id === cursoReporte)?.total_clases || 0;
  const porcentajeFaltasCurso = totalClasesCurso ? Math.round((faltasPorCurso / totalClasesCurso) * 1000) / 10 : 0;
  const activa = data?.cursos.find((curso) => curso.sesion_activa_id);
  const iniciales = (data?.alumno.nombres || user?.nombres || 'A').slice(0, 1) + (data?.alumno.apellidos || user?.apellidos || '').slice(0, 1);
  const nombre = `${data?.alumno.nombres || user?.nombres || 'Alumno'} ${data?.alumno.apellidos || user?.apellidos || ''}`.trim();

  return <div className="alumno-app-shell mx-auto w-full max-w-md text-slate-800 shadow-xl sm:border-x sm:border-slate-200">
    {vista === 'inicio' ? <header className="bg-[#002238] px-5 pb-4 pt-4 text-white shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c8102e] text-xs font-extrabold">{iniciales.toUpperCase()}</div>
          <div className="min-w-0"><p className="truncate text-sm font-bold">{nombre}</p><p className="truncate text-[11px] text-slate-300">{user?.carrera || 'Portal del alumno'}{user?.ciclo ? ` · ${user.ciclo}` : ''}</p></div>
        </div>
        <button onClick={() => void cargar()} aria-label="Actualizar información" className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-white/10"><Bell size={18}/></button>
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Matrícula activa</span>
    </header> : <header className="sticky top-0 z-20 flex items-center gap-3 bg-[#002238] px-5 py-4 text-white shadow-md">
      <button onClick={() => setVista('inicio')} aria-label="Volver al inicio" className="rounded-full p-1.5 hover:bg-white/10"><ArrowLeft size={19}/></button>
      <div><h1 className="text-base font-bold">{vista === 'reporte' ? 'Récord de Asistencia y DPI' : vista === 'justificar' ? 'Subir Justificación' : 'Mi Perfil'}</h1><p className="text-[11px] text-slate-300">{vista === 'justificar' ? 'La solicitud será revisada por el docente' : 'Asistencia UTP'}</p></div>
    </header>}

    <main className="space-y-3.5 px-4 pb-28 pt-4">
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={15} className="mt-0.5 shrink-0"/>{error}</div>}
      {!data ? <p className="py-20 text-center text-sm text-slate-400">Cargando tus datos…</p> : <>
        {vista === 'inicio' && <>
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Riesgo de DPI</p><p className="mt-1 text-xl font-extrabold leading-tight text-[#002b49]">{data.resumen.porcentajeFaltas.toFixed(1)}% Inasistencias</p><p className="mt-1 text-xs text-slate-500">{data.resumen.faltas} faltas · {data.resumen.clases} clases registradas</p></div>
              <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${data.resumen.porcentajeFaltas >= 30 ? '#dc2626' : data.resumen.porcentajeFaltas >= 20 ? '#f59e0b' : '#08b77a'} ${Math.min(100, data.resumen.porcentajeFaltas / 30 * 100)}%, #eef0f3 0)` }}><div className="flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full bg-white"><b className="text-sm">{Math.round(data.resumen.porcentajeFaltas)}%</b><span className="text-[9px] text-slate-400">de 30%</span></div></div>
            </div>
            <div className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${data.resumen.porcentajeFaltas >= 30 ? 'border-red-200 bg-red-50 text-red-700' : data.resumen.porcentajeFaltas >= 20 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {data.resumen.porcentajeFaltas >= 30 ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}<span>{data.resumen.porcentajeFaltas >= 30 ? 'Superaste el límite referencial de inasistencias.' : `Estado: ${data.resumen.porcentajeFaltas >= 20 ? 'ALERTA' : 'REGULAR'} · ${data.resumen.faltas} faltas registradas`}</span>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div><h2 className="text-sm font-extrabold text-[#002b49]">Faltas por justificar</h2><p className="mt-1 text-[11px] text-slate-500">Solo sesiones sin una solicitud enviada</p></div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">{data.faltasJustificables.length} pendientes</span>
            </div>
            {data.faltasJustificables.length ? <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Curso / sección</th><th className="px-3 py-3">Fecha de falta</th><th className="px-3 py-3 text-right">Acción</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{data.faltasJustificables.map((falta) => <tr key={falta.asistencia_id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3"><b className="block max-w-52 truncate text-[#002b49]">{falta.curso}</b><span className="mt-1 block text-[10px] text-slate-500">Sección {falta.seccion}</span></td>
                  <td className="px-3 py-3 text-slate-600">{fechaCorta(falta.fecha)}</td>
                  <td className="px-3 py-3 text-right"><button onClick={() => { setCursoJustificar(falta.curso_id); setFaltaId(falta.asistencia_id); setVista('justificar'); }} className="rounded-lg bg-[#c8102e] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#a60d26]">Justificar</button></td>
                </tr>)}</tbody>
              </table>
            </div> : <div className="p-5 text-center"><CheckCircle2 size={22} className="mx-auto mb-2 text-emerald-600"/><p className="text-xs font-semibold text-slate-700">No tienes faltas pendientes de justificar</p><p className="mt-1 text-[10px] text-slate-500">Cuando exista una falta sin solicitud, aparecerá aquí.</p></div>}
            <p className="border-t border-slate-100 px-4 py-3 text-[10px] leading-4 text-slate-400">Al enviar la solicitud, esa falta se quitará de esta lista y aparecerá en “Mis solicitudes”.</p>
          </section>

          {activa ? <section className="rounded-2xl border-2 border-[#c8102e] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#c8102e]"><span className="h-2 w-2 rounded-full bg-[#c8102e]"/> Clase activa</div>
            <h2 className="text-sm font-extrabold text-[#002b49]">{activa.nombre}</h2>
            <p className="mt-1 text-xs text-slate-500">Sección {activa.seccion} · {activa.codigo} · {activa.docente || 'Docente asignado'}</p>
            <button onClick={() => navigate(`/alumno/escaneo?sesion=${activa.sesion_activa_id}`)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8102e] py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#a60d26]"><Camera size={17}/> Marcar Asistencia a Clase</button>
          </section> : <section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-[#002b49]">No tienes una clase activa</p><p className="mt-1 text-xs text-slate-500">Cuando tu docente inicie una sesión, aquí podrás escanear el QR.</p></section>}

          <button onClick={() => setVista('justificar')} className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-800 shadow-sm"><span className="flex items-center gap-3"><span className="rounded-xl bg-amber-100 p-2"><ClipboardList size={18}/></span><span><b className="block text-sm">Justificaciones</b><small className="text-xs">{data.justificaciones.filter((item) => item.estado === 'pendiente').length} solicitudes pendientes · {data.faltasJustificables.length} faltas por justificar</small></span></span><ArrowLeft size={16} className="rotate-180"/></button>
        </>}

        {vista === 'reporte' && <>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500"><BookOpen size={15}/><select value={cursoReporte} onChange={(event) => setCursoReporte(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none">{data.cursos.map((curso) => <option key={curso.id} value={curso.id}>{curso.nombre} ({curso.seccion})</option>)}</select></label>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Resumen DPI</h2><div className="mt-3 grid grid-cols-3 gap-2 text-center">{[{n: data.cursos.find((curso) => curso.id === cursoReporte)?.presentes || 0, label: 'Asistidas', color: 'text-emerald-600'}, {n: faltasPorCurso, label: 'Faltas', color: 'text-red-600'}, {n: data.cursos.find((curso) => curso.id === cursoReporte)?.justificadas || 0, label: 'Justificadas', color: 'text-blue-600'}].map((item) => <div key={item.label} className="rounded-xl bg-slate-50 p-3"><b className={`text-xl ${item.color}`}>{item.n}</b><p className="mt-1 text-[10px] text-slate-500">{item.label}</p></div>)}</div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${porcentajeFaltasCurso >= 30 ? 'bg-red-500' : porcentajeFaltasCurso >= 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, porcentajeFaltasCurso / 30 * 100)}%` }}/></div><div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>{porcentajeFaltasCurso}% inasistencias</span><span className="text-amber-600">Alerta 20%</span><span className="text-red-600">Límite 30%</span></div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Historial de sesiones</h2>{asistencias.length ? <div className="divide-y divide-slate-100">{asistencias.map((registro) => <article key={registro.asistencia_id} className="py-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold text-[#002b49]">{fechaCorta(registro.fecha)} · {registro.curso}</p><p className="mt-1 text-[11px] text-slate-400">{registro.hora_inicio?.slice(0, 5) || 'Hora no registrada'} · Sección {registro.seccion}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${registro.estado === 'presente' ? 'bg-emerald-100 text-emerald-700' : registro.estado === 'falta' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{registro.estado}</span></div>{registro.estado === 'falta' && data.faltasJustificables.some((falta) => falta.asistencia_id === registro.asistencia_id) && <button onClick={() => { setFaltaId(registro.asistencia_id); const falta = data.faltasJustificables.find((item) => item.asistencia_id === registro.asistencia_id); setCursoJustificar(falta?.curso_id || ''); setVista('justificar'); }} className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">Justificar falta →</button>}</article>)}</div> : <p className="py-8 text-center text-xs text-slate-400">Aún no hay sesiones cerradas para este curso.</p>}</section>
          <button disabled className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-400" title="Disponible en una siguiente entrega"><Download size={15}/> Descargar récord oficial en PDF</button>
        </>}

        {vista === 'justificar' && <>
          <form onSubmit={(event) => void enviar(event)} className="space-y-3">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-semibold text-slate-600">Curso<select required value={cursoJustificar} onChange={(event) => { setCursoJustificar(event.target.value); setFaltaId(data.faltasJustificables.find((falta) => falta.curso_id === event.target.value)?.asistencia_id || ''); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">{[...new Map(data.faltasJustificables.map((falta) => [falta.curso_id, falta])).values()].map((falta) => <option key={falta.curso_id} value={falta.curso_id}>{falta.curso} ({falta.seccion})</option>)}{!data.faltasJustificables.length && <option value="">No hay faltas para justificar</option>}</select></label>
              <label className="block text-xs font-semibold text-slate-600">Falta seleccionada<select required value={faltaId} onChange={(event) => setFaltaId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">{faltasCurso.map((falta) => <option key={falta.asistencia_id} value={falta.asistencia_id}>{fechaCorta(falta.fecha)} · {falta.curso}</option>)}</select></label>
              <label className="block text-xs font-semibold text-slate-600">Motivo<select value={motivo} onChange={(event) => setMotivo(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"><option>Descanso Médico</option><option>Emergencia Familiar</option><option>Problema de transporte</option><option>Otro motivo</option></select></label>
              <label className="block text-xs font-semibold text-slate-600">Descripción<textarea required minLength={5} maxLength={1000} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm" rows={4} placeholder="Explica brevemente el motivo de tu falta"/></label>
              <label className="block text-xs font-semibold text-slate-600">Documento de sustento<input ref={archivoInput} required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setArchivo(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#c8102e] file:px-3 file:py-2 file:font-bold file:text-white"/><span className="mt-1 block text-[10px] font-normal text-slate-400">PDF, JPG o PNG · máximo 5 MB. Puedes cambiarlo antes de enviar.</span></label>
              {archivo && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700"><FileText size={17}/><span className="min-w-0 flex-1 truncate">{archivo.name}</span><button type="button" onClick={() => { setArchivo(null); if (archivoInput.current) archivoInput.current.value = ''; }} className="shrink-0 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 font-bold text-emerald-800 hover:bg-emerald-100">Quitar</button><Check size={15}/></div>}
            </section>
            <button disabled={!data.faltasJustificables.length || !archivo || enviando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8102e] py-3.5 text-sm font-extrabold text-white disabled:opacity-50"><Upload size={17}/>{enviando ? 'Enviando solicitud…' : 'Enviar Justificación al Docente'}</button>
          </form>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-sm font-bold text-[#002b49]">Mis solicitudes</h2>{data.justificaciones.length ? <div className="mt-2 divide-y divide-slate-100">{data.justificaciones.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-xs"><span className="min-w-0"><b className="block truncate">{item.curso}</b><span className="text-slate-500">{item.motivo}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : item.estado === 'rechazada' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{item.estado}</span></div>)}</div> : <p className="mt-2 text-xs text-slate-400">Todavía no has enviado solicitudes.</p>}</section>
        </>}

        {vista === 'perfil' && <>
          <section className="bg-[#002b49] px-5 py-7 text-center text-white"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#c8102e] text-xl font-extrabold">{iniciales.toUpperCase()}</div><h2 className="mt-3 text-lg font-extrabold">{nombre}</h2><p className="mt-1 text-xs text-slate-300">{data.alumno.codigo}{user?.carrera ? ` · ${user.carrera}` : ''}</p>{user?.ciclo && <p className="mt-1 text-xs text-slate-300">{user.ciclo}{user.sede ? ` · ${user.sede}` : ''}</p>}<span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Matrícula activa</span></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">Información académica</h3><dl className="divide-y divide-slate-100 text-xs">{[['Código Alumno', data.alumno.codigo], ['Carrera', user?.carrera || 'No registrada'], ['Ciclo', user?.ciclo || 'No registrado'], ['Sede', user?.sede || 'No registrada'], ['Correo', user?.correo || 'No registrado']].map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-[#002b49]">{value}</dd></div>)}</dl></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700"><Fingerprint size={17} className="text-blue-600"/> Seguridad biométrica</h3><div className="mt-3 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3"><ShieldCheck size={20} className="text-blue-600"/><span className="flex-1"><b className="block text-xs text-blue-900">Reconocimiento facial</b><small className="text-[10px] text-blue-700">{user?.embeddingRegistrado ? 'Patrón registrado' : 'No registrado en tu cuenta'}</small></span><span className={`h-2 w-2 rounded-full ${user?.embeddingRegistrado ? 'bg-emerald-500' : 'bg-slate-300'}`}/></div><button onClick={() => navigate('/alumno/rostro')} className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-[#002b49] hover:bg-slate-50">{user?.embeddingRegistrado ? 'Actualizar foto facial' : 'Registrar foto facial'}</button></section>
          <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#c8102e] py-3 text-sm font-bold text-[#c8102e]"><LogOut size={16}/> Cerrar sesión</button>
        </>}
      </>}
    </main>

    <nav aria-label="Navegación del alumno" className="alumno-bottom-nav">
      {tabs.map(({ id, label, Icon }) => <button key={id} onClick={() => setVista(id)} aria-current={vista === id ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 py-1.5 text-[10px] ${vista === id ? 'font-bold text-[#c8102e]' : 'text-slate-400'}`}><Icon size={20} strokeWidth={vista === id ? 2.5 : 1.8}/>{label}</button>)}
    </nav>
  </div>;
};
