import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3 } from 'lucide-react';
import { obtenerHistorialReprogramaciones, obtenerMisCursos, reprogramarClase } from '../../services/api';

type Curso = { id: string; codigo: string; nombre: string; seccion: string };
type Cambio = { id: string; codigo: string; nombre: string; seccionOrigen: string; seccionDestino: string; fecha: string; horaInicio: string; horaFin: string; motivo: string; solicitadaEn: string };

export function DocenteReprogramarPage() {
  const { cursoId = '' } = useParams();
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [historial, setHistorial] = useState<Cambio[]>([]);
  const [destino, setDestino] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    void Promise.all([obtenerMisCursos(), obtenerHistorialReprogramaciones()])
      .then(([lista, cambios]) => { setCursos(lista); setHistorial(cambios); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo cargar la información.'))
      .finally(() => setCargando(false));
  }, []);

  const curso = cursos.find((c) => c.id === cursoId);
  const seccionesDestino = useMemo(() => cursos.filter((c) => c.codigo === curso?.codigo && c.id !== cursoId), [cursos, curso, cursoId]);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setAviso(''); setEnviando(true);
    try {
      const resultado = await reprogramarClase(cursoId, { cursoDestinoId: destino, fecha, horaInicio, horaFin, motivo });
      setAviso(resultado.mensaje);
      setHistorial(await obtenerHistorialReprogramaciones());
      setMotivo('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo reprogramar la clase.'); }
    finally { setEnviando(false); }
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 md:px-8">
    <div className="mx-auto max-w-3xl space-y-5">
      <button onClick={() => navigate('/docente/dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={16}/>Volver a mis cursos</button>
      <header className="rounded-2xl bg-[#002238] p-6 text-white shadow-sm">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-3"><CalendarClock size={22}/></span><div><h1 className="text-xl font-bold">Reprogramar clase</h1><p className="mt-1 text-sm text-slate-300">Registra el cambio a otra sección del mismo curso.</p></div></div>
      </header>
      {cargando ? <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Cargando tus secciones…</p> : !curso ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">No encontramos el curso seleccionado.</p> : <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Clase que cambia</p>
          <h2 className="mt-1 text-lg font-bold">{curso.codigo} · {curso.nombre}</h2>
          <p className="mt-1 text-sm text-slate-600">Sección {curso.seccion}</p>
        </section>
        <form onSubmit={(e) => void enviar(e)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold">Nueva sección<select required value={destino} onChange={(e) => setDestino(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Elige otra sección</option>{seccionesDestino.map((c) => <option key={c.id} value={c.id}>Sección {c.seccion}</option>)}</select></label>
          {seccionesDestino.length === 0 && <p className="text-xs text-amber-700">No hay otra sección de este curso asignada a tu cuenta en los datos actuales.</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold">Fecha<input required type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label>
            <label className="text-sm font-semibold">Hora de inicio<input required type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label>
            <label className="text-sm font-semibold">Hora de fin<input required type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label>
          </div>
          <label className="block text-sm font-semibold">Motivo<textarea required minLength={8} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ejemplo: no podré asistir a la sesión por una actividad institucional." className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {aviso && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/>{aviso}</p>}
          <button disabled={enviando || seccionesDestino.length === 0} className="w-full rounded-xl bg-[#c8102e] px-4 py-3 text-sm font-bold text-white hover:bg-[#a60d26] disabled:opacity-50">{enviando ? 'Guardando cambio…' : 'Confirmar reprogramación'}</button>
        </form>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold"><Clock3 size={18}/>Historial de cambios</h2>{historial.length ? <ul className="mt-3 divide-y divide-slate-100">{historial.slice(0, 10).map((c) => <li key={c.id} className="py-3"><p className="text-sm font-semibold">{c.codigo} · {c.nombre}</p><p className="mt-1 text-sm">Sección {c.seccionOrigen} → sección {c.seccionDestino} · {new Date(`${c.fecha}T12:00:00`).toLocaleDateString('es-PE')} · {String(c.horaInicio).slice(11,16)}–{String(c.horaFin).slice(11,16)}</p><p className="mt-1 text-sm text-slate-600">Motivo: {c.motivo}</p><p className="mt-1 text-xs text-slate-500">Registrado {new Date(c.solicitadaEn).toLocaleString('es-PE')}</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Todavía no hay reprogramaciones registradas.</p>}</section>
      </>}
    </div>
  </main>;
}
