import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarSearch, Users } from 'lucide-react';
import { obtenerCursosAdmin } from '../../services/api';
import { AdminLayout } from '../../components/AdminLayout';

type Curso = { id: string; codigo: string; nombre: string; seccion: string; capacidad_alumnos: number; matriculados: number; docente: string };

export function AdminCursosPage() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void obtenerCursosAdmin().then((data: { cursos: Curso[] }) => setCursos(data.cursos || [])).catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los cursos.')); }, []);
  return <AdminLayout><div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="flex items-center gap-3 bg-[#002238] px-5 py-4 text-white"><button type="button" aria-label="Volver al panel de administración" onClick={() => navigate('/admin/dashboard')} className="min-h-11 min-w-11 rounded-lg bg-white/10 p-2"><ArrowLeft aria-hidden="true" size={17}/></button><div><h1 className="text-sm font-bold">Cursos y salones</h1><p className="text-[10px] text-slate-300">Matrícula y aforo actual por curso</p></div></header>
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-7"><div><h2 className="text-xl font-bold">Cursos activos</h2><p className="mt-1 text-xs text-slate-500">El cupo máximo está configurado en 5 alumnos por sección.</p></div>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {cursos.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><BookOpen aria-hidden="true" size={28} className="mx-auto mb-2 text-slate-400"/><p className="text-xs text-slate-600">No hay cursos activos.</p></div> : <section aria-label="Cursos activos y aforo" className="grid gap-4 md:grid-cols-2">{cursos.map((curso) => <article key={curso.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase text-slate-600">{curso.codigo} · Sección {curso.seccion}</p><h3 className="mt-1 text-base font-bold">{curso.nombre}</h3><p className="mt-1 text-xs text-slate-600">Docente: {curso.docente}</p></div><BookOpen aria-hidden="true" className="text-violet-700" size={20}/></div><div className="mt-5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-700"><Users aria-hidden="true" size={15}/>{curso.matriculados} de {curso.capacidad_alumnos} alumnos</span><b className={curso.matriculados >= curso.capacidad_alumnos ? 'text-rose-700' : 'text-emerald-800'}>{curso.matriculados >= curso.capacidad_alumnos ? 'Completo' : `${curso.capacidad_alumnos - curso.matriculados} cupos`}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Ocupación de ${curso.nombre}, sección ${curso.seccion}`} aria-valuemin={0} aria-valuemax={curso.capacidad_alumnos} aria-valuenow={Math.min(curso.matriculados, curso.capacidad_alumnos)}><div className="h-full rounded-full bg-[#c8102e]" style={{ width: `${Math.min(100, curso.matriculados / curso.capacidad_alumnos * 100)}%` }}/></div><button type="button" onClick={() => navigate(`/docente/historial/${curso.id}`)} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"><CalendarSearch aria-hidden="true" size={15}/>Ver sesiones y asistencias</button></article>)}</section>}
    </main>
  </div></AdminLayout>;
}

export default AdminCursosPage;
