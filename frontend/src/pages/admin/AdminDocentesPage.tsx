import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { obtenerDirectorioDocentes } from '../../services/api';
import { AdminLayout } from '../../components/AdminLayout';

type Docente = { id: string; nombres: string; apellidos: string; correo: string; activo: boolean; cursos_asignados: number; cursos: string };

export function AdminDocentesPage() {
  const navigate = useNavigate();
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    void obtenerDirectorioDocentes().then((result: { docentes: Docente[] }) => { if (vigente) setDocentes(result.docentes || []); })
      .catch((err) => { if (vigente) setError(err instanceof Error ? err.message : 'No se pudo cargar el directorio.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);
  const visibles = useMemo(() => docentes.filter((docente) => `${docente.nombres} ${docente.apellidos} ${docente.correo} ${docente.cursos}`.toLowerCase().includes(buscar.toLowerCase())), [docentes, buscar]);

  return <AdminLayout><div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="flex items-center gap-3 bg-[#002238] px-5 py-4 text-white"><button onClick={() => navigate('/admin/dashboard')} className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><ArrowLeft size={17}/></button><div><h1 className="text-sm font-bold">Directorio de Docentes UTP</h1><p className="text-[10px] text-slate-300">Listado conectado a PostgreSQL</p></div></header>
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Docentes</h2><p className="mt-1 text-xs text-slate-500">{docentes.length} docentes · {docentes.reduce((total, docente) => total + docente.cursos_asignados, 0)} asignaciones de curso</p></div><label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 md:w-80"><Search size={15} className="text-slate-400"/><input value={buscar} onChange={(event) => setBuscar(event.target.value)} className="w-full text-xs outline-none" placeholder="Buscar docente, correo o curso"/></label></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {cargando ? <p className="p-10 text-center text-xs text-slate-400">Cargando directorio…</p> : visibles.length === 0 ? <div className="p-12 text-center"><Users size={27} className="mx-auto mb-2 text-slate-300"/><p className="text-xs text-slate-500">No se encontraron docentes.</p></div> : <table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400"><tr>{['Docente', 'Correo', 'Cursos asignados', 'Cantidad', 'Estado'].map((label) => <th key={label} className="px-5 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibles.map((docente) => <tr key={docente.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#002238] text-[10px] font-bold text-white">{docente.nombres[0]}{docente.apellidos[0]}</span><b>{docente.nombres} {docente.apellidos}</b></div></td><td className="px-5 py-4 text-slate-600">{docente.correo}</td><td className="whitespace-pre-line px-5 py-4 text-slate-600">{docente.cursos || 'Sin cursos asignados'}</td><td className="px-5 py-4 font-bold">{docente.cursos_asignados}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${docente.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{docente.activo ? 'Activo' : 'Inactivo'}</span></td></tr>)}</tbody></table>}
      </section>
    </main>
  </div></AdminLayout>;
}

export default AdminDocentesPage;
