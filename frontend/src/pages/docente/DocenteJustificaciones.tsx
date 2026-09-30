import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/Authcontext';
import { AdminLayout } from '../../components/AdminLayout';
import {
  listarJustificacionesAdmin, listarJustificacionesDocente, obtenerEvidenciaJustificacion,
  obtenerEvidenciaJustificacionAdmin, resolverJustificacion, resolverJustificacionAdmin,
} from '../../services/api';

type Justificacion = { id: string; motivo: string; estado: 'pendiente' | 'aprobada' | 'rechazada'; fecha_inicio: string; creado_en: string; comentario_docente: string | null; archivo_nombre: string | null; tiene_archivo: boolean; alumno_id: string; alumno: string; codigo: string; curso_id: string; curso: string; seccion: string; sesion_id: string; sesion_fecha: string };

export function DocenteJustificaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const esAdmin = user?.rol === 'admin';
  const [items, setItems] = useState<Justificacion[]>([]);
  const [filtro, setFiltro] = useState('todas');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const result = await (esAdmin ? listarJustificacionesAdmin() : listarJustificacionesDocente()) as { justificaciones: Justificacion[] };
      setItems(result.justificaciones || []); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la bandeja.'); }
    finally { setCargando(false); }
  }, [esAdmin]);
  useEffect(() => { void Promise.resolve().then(cargar); }, [cargar]);

  const visibles = useMemo(() => filtro === 'todas' ? items : items.filter((item) => item.estado === filtro), [filtro, items]);
  const abrirEvidencia = async (id: string) => {
    try {
      const blob = await (esAdmin ? obtenerEvidenciaJustificacionAdmin(id) : obtenerEvidenciaJustificacion(id));
      const url = URL.createObjectURL(blob);
      const windowPreview = window.open(url, '_blank', 'noopener,noreferrer');
      if (!windowPreview) { const link = document.createElement('a'); link.href = url; link.download = 'evidencia-asistencia'; link.click(); }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo abrir el archivo.'); }
  };

  const resolver = async (item: Justificacion, decision: 'aprobada' | 'rechazada') => {
    setProcesando(item.id); setError('');
    try {
      if (esAdmin) await resolverJustificacionAdmin(item.id, decision);
      else await resolverJustificacion(item.id, decision);
      await cargar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la decisión.'); }
    finally { setProcesando(''); }
  };

  const volver = () => navigate(esAdmin ? '/admin/dashboard' : '/docente/dashboard');
  const conteos = { todas: items.length, pendientes: items.filter((i) => i.estado === 'pendiente').length, aprobadas: items.filter((i) => i.estado === 'aprobada').length, rechazadas: items.filter((i) => i.estado === 'rechazada').length };

  const contenido = <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="flex items-center gap-3 bg-[#002238] px-5 py-4 text-white"><button onClick={volver} aria-label="Regresar" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><ArrowLeft size={17}/></button><div><h1 className="text-sm font-bold">Bandeja de Justificaciones</h1><p className="text-[10px] text-slate-300">Revisa el motivo y la evidencia adjunta</p></div></header>
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">{(['todas', 'pendiente', 'aprobada', 'rechazada'] as const).map((estado) => <button key={estado} onClick={() => setFiltro(estado === 'pendiente' ? 'pendiente' : estado === 'aprobada' ? 'aprobada' : estado === 'rechazada' ? 'rechazada' : 'todas')} className={`rounded-xl border px-4 py-2 text-xs font-semibold ${filtro === (estado === 'pendiente' ? 'pendiente' : estado === 'aprobada' ? 'aprobada' : estado === 'rechazada' ? 'rechazada' : 'todas') ? 'border-[#002238] bg-[#002238] text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{estado === 'todas' ? `Todas (${conteos.todas})` : `${estado[0].toUpperCase()}${estado.slice(1)}s (${conteos[estado === 'pendiente' ? 'pendientes' : estado === 'aprobada' ? 'aprobadas' : 'rechazadas']})`}</button>)}</div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {cargando ? <p className="p-10 text-center text-xs text-slate-400">Cargando solicitudes…</p> : visibles.length === 0 ? <div className="p-12 text-center"><ClipboardList size={28} className="mx-auto mb-2 text-slate-300"/><p className="text-xs text-slate-500">No hay solicitudes en este filtro.</p></div> : <table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400"><tr>{['Alumno', 'Curso / sesión', 'Motivo', 'Evidencia', 'Estado', 'Acciones'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibles.map((item) => <tr key={item.id}><td className="px-4 py-4"><b className="block text-slate-800">{item.alumno}</b><span className="text-[10px] text-slate-400">{item.codigo}</span></td><td className="px-4 py-4"><b>{item.curso}</b><span className="mt-1 block text-[10px] text-slate-400">Sección {item.seccion} · {item.sesion_fecha ? new Date(`${item.sesion_fecha}T12:00:00`).toLocaleDateString('es-PE') : '—'}</span></td><td className="max-w-64 px-4 py-4 text-slate-600">{item.motivo}</td><td className="px-4 py-4">{item.tiene_archivo ? <button onClick={() => void abrirEvidencia(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-100">Ver archivo <ExternalLink size={12}/></button> : <span className="text-slate-400">Sin archivo</span>}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : item.estado === 'rechazada' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{item.estado}</span></td><td className="px-4 py-4">{item.estado === 'pendiente' ? <div className="flex gap-1.5"><button disabled={procesando === item.id} onClick={() => void resolver(item, 'aprobada')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Aprobar</button><button disabled={procesando === item.id} onClick={() => void resolver(item, 'rechazada')} className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Rechazar</button></div> : <span className="text-[10px] text-slate-400">Procesada{item.comentario_docente ? ` · ${item.comentario_docente}` : ''}</span>}</td></tr>)}</tbody></table>}
      </section>
    </main>
  </div>;
  return esAdmin ? <AdminLayout>{contenido}</AdminLayout> : contenido;
}

export default DocenteJustificaciones;
