import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Search, X } from 'lucide-react';
import { obtenerDetalleSesion, obtenerHistorialCurso } from '../../services/api';
import { useAuth } from '../../context/Authcontext';

type SesionHistorial = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin_programada: string;
  hora_cierre_real: string | null;
  estado: string;
  presentes: number;
  matriculados: number;
};

type DetalleSesion = {
  sesion: { hora_inicio: string };
  alumnos: Array<{
    alumno_id: string;
    nombre: string;
    codigo: string;
    estado: string;
    registrado_en: string | null;
    origen: string | null;
  }>;
};

export function DocenteHistorial() {
  const { cursoId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sesiones, setSesiones] = useState<SesionHistorial[]>([]);
  const [detalle, setDetalle] = useState<DetalleSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await obtenerHistorialCurso(cursoId, desde, hasta);
      setSesiones(data.sesiones || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void Promise.resolve().then(cargar); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId]);

  const verDetalle = async (id: string) => {
    try { setDetalle(await obtenerDetalleSesion(id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo obtener el detalle'); }
  };

  const limpiarFiltros = async () => {
    setDesde('');
    setHasta('');
    setCargando(true);
    try {
      const data = await obtenerHistorialCurso(cursoId);
      setSesiones(data.sesiones || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial');
    } finally {
      setCargando(false);
    }
  };

  const volver = () => navigate(user?.rol === 'admin' ? '/admin/dashboard' : '/docente/dashboard');

  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="flex items-center justify-between bg-[#002238] px-6 py-4 text-white shadow-md">
      <div><p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Asistencia UTP</p><h1 className="text-lg font-bold">Historial de sesiones</h1></div>
      <button onClick={volver} className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10"><ArrowLeft size={15}/> Volver</button>
    </header>
    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Search size={16} className="text-[#c8102e]"/><h2 className="text-sm font-bold">Filtrar por fecha</h2></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"/></label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"/></label>
          <button onClick={() => void cargar()} className="rounded-xl bg-[#c8102e] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#a60d26]">Buscar</button>
          <button onClick={() => void limpiarFiltros()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold hover:bg-slate-50">Limpiar</button>
        </div>
      </section>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5"><CalendarDays size={17} className="text-[#c8102e]"/><h2 className="text-sm font-bold">Sesiones del curso</h2></div>
        {cargando ? <p className="p-8 text-center text-xs text-slate-400">Cargando historial...</p> : sesiones.length === 0 ? <p className="p-8 text-center text-xs text-slate-400">No se encontraron sesiones en el rango seleccionado.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400"><tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Horario</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Asistencia</th><th className="px-5 py-3 text-right">Detalle</th></tr></thead><tbody className="divide-y divide-slate-100">{sesiones.map((s) => <tr key={s.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold">{new Date(`${s.fecha}T12:00:00`).toLocaleDateString('es-PE')}</td><td className="px-5 py-4 text-slate-500">{new Date(s.hora_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} – {new Date(s.hora_fin_programada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">{s.estado}</span></td><td className="px-5 py-4">{s.presentes} / {s.matriculados}</td><td className="px-5 py-4 text-right"><button onClick={() => void verDetalle(s.id)} className="font-bold text-blue-700 hover:underline">Ver detalle</button></td></tr>)}</tbody></table></div>}
      </section>
    </main>
    {detalle && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div role="dialog" aria-modal="true" className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Detalle de asistencia</h2><p className="mt-1 text-xs text-slate-500">{new Date(detalle.sesion.hora_inicio).toLocaleString('es-PE')}</p></div><button onClick={() => setDetalle(null)} aria-label="Cerrar detalle" className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="max-h-[65vh] overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">Alumno</th><th className="px-5 py-3">Código</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Hora</th><th className="px-5 py-3">Origen</th></tr></thead><tbody className="divide-y">{detalle.alumnos.map((a) => <tr key={a.alumno_id}><td className="px-5 py-3 font-semibold">{a.nombre}</td><td className="px-5 py-3">{a.codigo}</td><td className="px-5 py-3 capitalize">{a.estado}</td><td className="px-5 py-3">{a.registrado_en ? new Date(a.registrado_en).toLocaleTimeString('es-PE') : '—'}</td><td className="px-5 py-3">{a.origen || '—'}</td></tr>)}</tbody></table></div></div></div>}
  </div>;
}

export default DocenteHistorial;
