import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, ServerCog } from 'lucide-react';
import { listarIncidenciasDocente, obtenerEvidenciaIncidencia, resolverIncidenciaDocente } from '../../services/api';
import { AdminLayout } from '../../components/AdminLayout';

type Incidencia = { id: string; tipo: string; descripcion: string; estado: 'pendiente' | 'aprobada' | 'rechazada'; creado_en: string; archivo_nombre: string; tiene_archivo: boolean; docente: string; correo: string; curso: string; seccion: string; sesion_fecha: string };

export function AdminIncidencias() {
  const navigate = useNavigate();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ocupada, setOcupada] = useState('');
  const cargar = async () => {
    setCargando(true);
    try { const response = await listarIncidenciasDocente() as { incidencias: Incidencia[] }; setIncidencias(response.incidencias || []); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar las incidencias.'); }
    finally { setCargando(false); }
  };
  useEffect(() => { void Promise.resolve().then(cargar); }, []);

  const evidencia = async (id: string) => {
    try {
      const blob = await obtenerEvidenciaIncidencia(id);
      const url = URL.createObjectURL(blob);
      const preview = window.open(url, '_blank', 'noopener,noreferrer');
      if (!preview) { const link = document.createElement('a'); link.href = url; link.download = 'evidencia-incidencia'; link.click(); }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo abrir el archivo.'); }
  };
  const resolver = async (item: Incidencia, decision: 'aprobada' | 'rechazada') => {
    setOcupada(item.id); setError('');
    try { await resolverIncidenciaDocente(item.id, decision); await cargar(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la decisión.'); }
    finally { setOcupada(''); }
  };

  return <AdminLayout><div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="flex items-center gap-3 bg-[#002238] px-5 py-4 text-white"><button onClick={() => navigate('/admin/dashboard')} className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><ArrowLeft size={17}/></button><div><h1 className="text-sm font-bold">Incidencias de docentes</h1><p className="text-[10px] text-slate-300">Evidencia de fallas técnicas para revisión administrativa</p></div></header>
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-7"><div><h2 className="text-xl font-bold">Revisión de incidencias</h2><p className="mt-1 text-xs text-slate-500">Verificar una incidencia no cambia la asistencia del docente ni del alumno.</p></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">{cargando ? <p className="p-10 text-center text-xs text-slate-400">Cargando…</p> : incidencias.length === 0 ? <div className="p-12 text-center"><ServerCog size={28} className="mx-auto mb-2 text-slate-300"/><p className="text-xs text-slate-500">No hay incidencias reportadas todavía.</p></div> : <table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400"><tr>{['Docente', 'Curso / fecha', 'Incidencia', 'Evidencia', 'Estado', 'Revisión'].map((t) => <th key={t} className="px-4 py-3">{t}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{incidencias.map((item) => <tr key={item.id}><td className="px-4 py-4"><b className="block">{item.docente}</b><span className="text-[10px] text-slate-400">{item.correo}</span></td><td className="px-4 py-4"><b>{item.curso}</b><span className="mt-1 block text-[10px] text-slate-400">Sección {item.seccion} · {new Date(`${item.sesion_fecha}T12:00:00`).toLocaleDateString('es-PE')}</span></td><td className="max-w-64 px-4 py-4"><span className="mb-1 block font-bold capitalize">{item.tipo.replace('_', ' ')}</span><span className="text-slate-500">{item.descripcion}</span></td><td className="px-4 py-4">{item.tiene_archivo && <button onClick={() => void evidencia(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700">Ver evidencia <ExternalLink size={12}/></button>}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : item.estado === 'rechazada' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{item.estado}</span></td><td className="px-4 py-4">{item.estado === 'pendiente' ? <div className="flex gap-1.5"><button disabled={ocupada === item.id} onClick={() => void resolver(item, 'aprobada')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white">Verificada</button><button disabled={ocupada === item.id} onClick={() => void resolver(item, 'rechazada')} className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white">Rechazar</button></div> : <span className="text-[10px] text-slate-400">Revisada</span>}</td></tr>)}</tbody></table>}</section>
    </main>
  </div></AdminLayout>;
}

export default AdminIncidencias;
