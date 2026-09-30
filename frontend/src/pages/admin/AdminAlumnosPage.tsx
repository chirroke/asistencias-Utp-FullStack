import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus, Users } from 'lucide-react';
import { obtenerAlumnosAdmin, obtenerCursosAdmin, registrarAlumnoAdmin } from '../../services/api';
import { AdminLayout } from '../../components/AdminLayout';

type Alumno = { id: string; nombres: string; apellidos: string; correo: string; activo: boolean; codigo_alumno: string; cursos_activos: number; cursos: string };
type Curso = { id: string; codigo: string; nombre: string; seccion: string; capacidad_alumnos: number; matriculados: number; docente: string };

export function AdminAlumnosPage() {
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombres: '', apellidos: '', correo: '', codigo_alumno: '', contrasena: '', curso_id: '' });

  const cargar = useCallback(async () => {
    try {
      const [listaAlumnos, listaCursos] = await Promise.all([
        obtenerAlumnosAdmin() as Promise<{ alumnos: Alumno[] }>,
        obtenerCursosAdmin() as Promise<{ cursos: Curso[] }>,
      ]);
      setAlumnos(listaAlumnos.alumnos || []);
      setCursos(listaCursos.cursos || []);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el directorio.'); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const visibles = useMemo(() => alumnos.filter((alumno) => `${alumno.nombres} ${alumno.apellidos} ${alumno.correo} ${alumno.codigo_alumno}`.toLowerCase().includes(buscar.toLowerCase())), [alumnos, buscar]);
  const disponibles = cursos.filter((curso) => curso.matriculados < curso.capacidad_alumnos);

  const registrar = async (event: FormEvent) => {
    event.preventDefault(); setGuardando(true); setError(''); setMensaje('');
    try {
      await registrarAlumnoAdmin({ ...form, codigo_alumno: form.codigo_alumno.trim().toUpperCase(), correo: form.correo.trim().toLowerCase() });
      setMensaje('Alumno registrado y matriculado en el curso.');
      setForm({ nombres: '', apellidos: '', correo: '', codigo_alumno: '', contrasena: '', curso_id: '' });
      await cargar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo registrar al alumno.'); }
    finally { setGuardando(false); }
  };

  return <AdminLayout><div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="flex items-center gap-3 bg-[#002238] px-5 py-4 text-white"><button onClick={() => navigate('/admin/dashboard')} className="rounded-lg bg-white/10 p-2"><ArrowLeft size={17}/></button><div><h1 className="text-sm font-bold">Directorio de Alumnos</h1><p className="text-[10px] text-slate-300">Registro y matrícula · máximo 5 alumnos por curso</p></div></header>
    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-7">
      <div><h2 className="text-xl font-bold">Alumnos</h2><p className="mt-1 text-xs text-slate-500">{alumnos.length} cuentas registradas en PostgreSQL</p></div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {mensaje && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{mensaje}</p>}
      <form onSubmit={(event) => void registrar(event)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-3">
        <h3 className="flex items-center gap-2 text-sm font-bold md:col-span-2 lg:col-span-3"><UserPlus size={17} className="text-[#c8102e]"/> Registrar alumno y matricular</h3>
        <input aria-label="Nombres" required maxLength={100} value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs" placeholder="Nombres"/>
        <input aria-label="Apellidos" required maxLength={100} value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs" placeholder="Apellidos"/>
        <input aria-label="Correo institucional" required type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs" placeholder="Correo @utp.edu.pe"/>
        <input aria-label="Código de alumno" required maxLength={20} value={form.codigo_alumno} onChange={(e) => setForm({ ...form, codigo_alumno: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs" placeholder="Código de alumno"/>
        <input aria-label="Contraseña inicial" required minLength={8} maxLength={14} type="password" value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs" placeholder="Clave inicial (8–14, mayúscula/minúscula/número)"/>
        <select aria-label="Curso con cupo" required value={form.curso_id} onChange={(e) => setForm({ ...form, curso_id: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="">Elegir curso con cupo</option>{disponibles.map((curso) => <option key={curso.id} value={curso.id}>{curso.codigo} · {curso.nombre} · Sección {curso.seccion} ({curso.matriculados}/{curso.capacidad_alumnos})</option>)}</select>
        <p className="text-[11px] text-slate-500 md:col-span-2 lg:col-span-3">La contraseña debe incluir mayúscula, minúscula y número; no uses partes del nombre o correo. Los cupos se asignan de forma transaccional.</p>
        <button disabled={guardando || !disponibles.length} className="rounded-xl bg-[#c8102e] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 md:col-span-2 lg:col-span-3">{guardando ? 'Registrando…' : disponibles.length ? 'Registrar alumno' : 'No hay cursos con cupo'}</button>
      </form>
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 md:w-96"><Search size={15} className="text-slate-400"/><input value={buscar} onChange={(e) => setBuscar(e.target.value)} className="w-full text-xs outline-none" placeholder="Buscar por nombre, código o correo"/></label>
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">{visibles.length === 0 ? <div className="p-12 text-center"><Users size={28} className="mx-auto mb-2 text-slate-300"/><p className="text-xs text-slate-500">No hay alumnos para mostrar.</p></div> : <table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400"><tr>{['Alumno', 'Código', 'Correo', 'Cursos', 'Estado'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibles.map((alumno) => <tr key={alumno.id}><td className="px-4 py-4 font-bold">{alumno.nombres} {alumno.apellidos}</td><td className="px-4 py-4">{alumno.codigo_alumno}</td><td className="px-4 py-4">{alumno.correo}</td><td className="whitespace-pre-line px-4 py-4">{alumno.cursos || 'Sin matrícula'}</td><td className="px-4 py-4">{alumno.activo ? 'Activo' : 'Inactivo'}</td></tr>)}</tbody></table>}</section>
    </main>
  </div></AdminLayout>;
}

export default AdminAlumnosPage;
