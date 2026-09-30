import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, CheckCircle2, ClipboardCheck,
  TrendingUp, UserRoundCog,
} from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout';
import { obtenerResumenAdmin } from '../../services/api';

type ResumenAdmin = {
  docentes: number;
  alumnos: number;
  cursos: number;
  sesiones_activas: number;
  sesiones_hoy: number;
  justificaciones_pendientes: number;
  justificaciones_procesadas: number;
  incidencias_pendientes: number;
  porcentaje_global: number;
  asistencia_por_curso: { id: string; nombre: string; seccion: string; porcentaje: number; registros: number }[];
  distribucion_estados: { estado: 'presente' | 'falta' | 'justificada'; cantidad: number }[];
  alumnos_en_riesgo: { id: string; nombres: string; apellidos: string; codigo_alumno: string; clases: number; faltas: number; porcentaje: number }[];
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    void obtenerResumenAdmin().then((data) => { if (vigente) setResumen(data as ResumenAdmin); })
      .catch((err) => { if (vigente) setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen.'); });
    return () => { vigente = false; };
  }, []);

  const distribucion = useMemo(() => {
    const cantidad = { presente: 0, falta: 0, justificada: 0 };
    for (const estado of resumen?.distribucion_estados || []) cantidad[estado.estado] = estado.cantidad;
    const total = cantidad.presente + cantidad.falta + cantidad.justificada;
    let inicio = 0;
    const partes = (['presente', 'falta', 'justificada'] as const).flatMap((estado) => {
      if (!total || cantidad[estado] === 0) return [];
      const fin = inicio + cantidad[estado] / total * 100;
      const parte = `${estado === 'presente' ? '#10b981' : estado === 'falta' ? '#ef4444' : '#2563eb'} ${inicio}% ${fin}%`;
      inicio = fin;
      return [parte];
    });
    return { cantidad, total, fondo: `conic-gradient(${partes.join(', ')})` };
  }, [resumen]);
  const cursosConAsistencia = resumen?.asistencia_por_curso || [];
  const alumnosEnRiesgo = resumen?.alumnos_en_riesgo || [];
  const analyticsReady = Array.isArray(resumen?.asistencia_por_curso) && Array.isArray(resumen?.distribucion_estados) && Array.isArray(resumen?.alumnos_en_riesgo);

  const indicadores = [
    { label: 'Asistencia global', value: resumen?.porcentaje_global != null ? `${Number(resumen.porcentaje_global).toFixed(1)}%` : '—', note: `${resumen?.docentes ?? '—'} docentes activos`, icon: TrendingUp, color: 'border-emerald-100 bg-emerald-50 text-emerald-600' },
    { label: 'Alumnos en riesgo DPI', value: analyticsReady ? alumnosEnRiesgo.length : '—', note: '20% o más de faltas', icon: AlertTriangle, color: 'border-amber-100 bg-amber-50 text-amber-600' },
    { label: 'Sesiones hoy', value: resumen?.sesiones_hoy ?? '—', note: `${resumen?.sesiones_activas ?? '—'} sesiones en vivo`, icon: Activity, color: 'border-blue-100 bg-blue-50 text-blue-600' },
    { label: 'Justificaciones procesadas', value: resumen?.justificaciones_procesadas ?? '—', note: `${resumen?.justificaciones_pendientes ?? 0} pendientes · Abrir bandeja →`, icon: CheckCircle2, color: 'border-violet-100 bg-violet-50 text-violet-600', route: '/admin/justificaciones' },
  ];

  return <AdminLayout>
    <main className="min-w-0 flex-1 space-y-4 p-4 md:p-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-lg font-extrabold text-[#002b49]">Dashboard Analítico</h1><p className="mt-0.5 text-[11px] text-slate-500">Ciclo 2026-I · Indicadores agregados de la base de datos</p></div><button onClick={() => navigate('/cuenta/cambiar-contrasena')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold">Cambiar contraseña</button></header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {resumen && !analyticsReady && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">El backend está respondiendo con la versión anterior. Reinícialo para cargar las nuevas métricas analíticas.</p>}

      <section className="admin-kpi-grid grid grid-cols-2 gap-3">{indicadores.map(({ label, value, note, icon: Icon, color, ...action }) => {
        const contenido = <><div className="flex items-center justify-between"><Icon size={17}/><span className="text-[9px] text-slate-400">Base de datos</span></div><p className="mt-3 text-2xl font-extrabold text-[#002b49]">{value}</p><p className="text-[11px] font-semibold">{label}</p><p className="mt-1 text-[9px] text-slate-500">{note}</p></>;
        return action.route
          ? <button key={label} onClick={() => navigate(action.route!)} className={`rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${color}`}>{contenido}</button>
          : <article key={label} className={`rounded-2xl border p-3.5 ${color}`}>{contenido}</article>;
      })}</section>

      <section className="admin-analytics-panels grid gap-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-xs font-extrabold text-[#002b49]">% Asistencia por curso</h2>{cursosConAsistencia.length ? <div className="mt-4 space-y-3">{cursosConAsistencia.map((curso) => <div key={curso.id} className="grid grid-cols-[minmax(84px,1fr)_3fr_36px] items-center gap-2 text-[10px]"><span className="truncate text-right text-slate-500">{curso.nombre}</span><div className="h-4 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${curso.porcentaje >= 85 ? 'bg-emerald-500' : curso.porcentaje >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, curso.porcentaje)}%`}}/></div><b className="text-right text-slate-600">{Math.round(curso.porcentaje)}%</b></div>)}</div> : <p className="py-10 text-center text-xs text-slate-400">{analyticsReady ? 'Aún no hay asistencias registradas.' : 'Reinicia el backend para cargar estas métricas.'}</p>}</article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-xs font-extrabold text-[#002b49]">Distribución de estados</h2><div className="admin-distribution-layout mt-4">{distribucion.total ? <div className="admin-donut" style={{ background: distribucion.fondo }}><div className="admin-donut-center"><b className="text-sm text-[#002b49]">{resumen?.porcentaje_global ?? 0}%</b><span className="text-[9px] text-slate-400">Presente</span></div></div> : <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[14px] border-slate-100 text-[10px] text-slate-400">Sin datos</div>}<div className="space-y-2 text-[10px]">{([{ key: 'presente', label: 'Presente', color: 'bg-emerald-500' }, { key: 'falta', label: 'Falta', color: 'bg-red-500' }, { key: 'justificada', label: 'Justificada', color: 'bg-blue-600' }] as const).map(({ key, label, color }) => <p key={key} className="flex items-center gap-2"><i className={`h-2 w-2 shrink-0 rounded-full ${color}`}/><span className="text-slate-500">{label}</span><b>{distribucion.total ? Math.round(distribucion.cantidad[key] * 100 / distribucion.total) : 0}%</b></p>)}</div></div></article>
      </section>

      <section className="admin-shortcuts-grid grid gap-3">{[
        { name: 'Directorio de docentes', note: 'Consultar docentes y cursos que tienen asignados.', icon: UserRoundCog, route: '/admin/docentes' },
        { name: 'Incidencias técnicas', note: 'Verificar reportes de problemas con equipos o red.', icon: AlertTriangle, route: '/admin/incidencias' },
        { name: 'Justificaciones', note: 'Revisar evidencias de inasistencias de alumnos.', icon: ClipboardCheck, route: '/admin/justificaciones' },
      ].map(({ name, note, icon: Icon, route }) => <button key={route} onClick={() => navigate(route)} className="flex min-h-32 flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><Icon size={20} className="text-[#c8102e]"/><span><b className="block text-sm text-[#002b49]">{name}</b><small className="mt-1 block text-xs text-slate-500">{note}</small></span></button>)}</section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="flex items-center gap-2 text-xs font-extrabold text-[#002b49]"><AlertTriangle size={15} className="text-amber-500"/> Alumnos con riesgo de DPI</h2><button onClick={() => navigate('/admin/alumnos')} className="text-[10px] font-bold text-blue-700">Ver directorio →</button></div>{alumnosEnRiesgo.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[10px]"><thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400"><tr>{['Alumno', 'Código', 'Faltas / clases', 'DPI actual', 'Estado', 'Acción'].map((label) => <th key={label} className="px-4 py-2.5">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{alumnosEnRiesgo.map((alumno) => <tr key={alumno.id}><td className="px-4 py-3 font-bold text-[#002b49]">{alumno.nombres} {alumno.apellidos}</td><td className="px-4 py-3 text-slate-500">{alumno.codigo_alumno}</td><td className="px-4 py-3">{alumno.faltas} / {alumno.clases}</td><td className="px-4 py-3 font-bold"><div className="flex items-center gap-2"><span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100"><i className={`block h-full ${alumno.porcentaje >= 30 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, alumno.porcentaje)}%` }}/></span>{Number(alumno.porcentaje).toFixed(0)}%</div></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${alumno.porcentaje >= 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{alumno.porcentaje >= 30 ? 'Crítico ≥30%' : 'Alerta ≥20%'}</span></td><td className="px-4 py-3"><button onClick={() => navigate('/admin/alumnos')} className="rounded-lg bg-blue-50 px-2.5 py-1.5 font-bold text-blue-700">Ver alumnos</button></td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-xs text-slate-400">{analyticsReady ? 'No hay alumnos por encima del umbral de alerta.' : 'Reinicia el backend para identificar alumnos en riesgo.'}</p>}</section>
    </main>
  </AdminLayout>;
};
