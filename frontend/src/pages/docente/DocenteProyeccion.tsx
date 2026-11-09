import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/Authcontext';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, CalendarCheck, Check, Download, Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import {
  checkinDocente,
  generarQR,
  obtenerAsistenciaEnVivo,
  obtenerCheckinDocente,
  obtenerTicketAsistencia,
  registrarAsistenciaManual,
  API_URL,
} from '../../services/api';

type AlumnoEnVivo = {
  id: string;
  nombre: string;
  codigo: string;
  estado: 'presente' | 'falta' | 'justificada' | 'pendiente';
  hora?: string;
  similitud?: string;
  foto?: string;
};

interface Props {
  sesionId: string;
  cursoNombre: string;
  cursoSeccion: string;
}

export function DocenteProyeccion({ sesionId, cursoNombre, cursoSeccion }: Props) {
  const [qrPayload, setQrPayload] = useState('');
  const [qrSeconds, setQrSeconds] = useState(20);
  const [alumnos, setAlumnos] = useState<AlumnoEnVivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [conectado, setConectado] = useState(false);
  const [qrDisponible, setQrDisponible] = useState(true);
  const [errorQR, setErrorQR] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [modalManual, setModalManual] = useState(false);
  const [alumnoId, setAlumnoId] = useState('');
  const [buscarAlumno, setBuscarAlumno] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const cargarAsistencia = useCallback(async () => {
    try {
      const data = await obtenerAsistenciaEnVivo(sesionId);
      setAlumnos(data.alumnos || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la asistencia');
    } finally {
      setCargando(false);
    }
  }, [sesionId]);

  const renovarQR = useCallback(async () => {
    if (!navigator.onLine) {
      setQrDisponible(false);
      setQrPayload('');
      setQrSeconds(0);
      setErrorQR('Sin conexión. La proyección del QR está detenida hasta recuperar internet.');
      return;
    }
    try {
      const data = await generarQR(sesionId, 20);
      if (!navigator.onLine) {
        setQrDisponible(false);
        setQrPayload('');
        setQrSeconds(0);
        setErrorQR('Sin conexión. La proyección del QR está detenida hasta recuperar internet.');
        return;
      }
      setQrPayload(data.qr_code);
      setQrSeconds(20);
      setQrDisponible(true);
      setErrorQR('');
    } catch {
      setQrPayload('');
      setQrSeconds(0);
      setQrDisponible(false);
      setErrorQR('No se pudo renovar el QR. Verifica la conexión y que la sesión siga activa; se volverá a intentar.');
    }
  }, [sesionId]);

  useEffect(() => {
    void Promise.resolve().then(cargarAsistencia);
    void Promise.resolve().then(renovarQR);
    void Promise.resolve().then(() => obtenerCheckinDocente(sesionId)).then((status) => setCheckedIn(status.registrado)).catch(() => undefined);
    const qrTimer = window.setInterval(() => { if (navigator.onLine) void renovarQR(); }, 20_000);
    const rosterTimer = window.setInterval(() => void cargarAsistencia(), 15_000);
    const countdown = window.setInterval(() => setQrSeconds((s) => Math.max(0, s - 1)), 1_000);
    let retryTimer = 0;
    let socket: WebSocket | undefined;
    let cancelled = false;

    const alPerderConexion = () => {
      setQrDisponible(false);
      setQrPayload('');
      setQrSeconds(0);
      setErrorQR('Sin conexión. La proyección del QR está detenida hasta recuperar internet.');
    };
    const alRecuperarConexion = () => {
      setQrDisponible(false);
      setErrorQR('Conexión recuperada. Solicitando un QR vigente…');
      void renovarQR();
    };
    window.addEventListener('offline', alPerderConexion);
    window.addEventListener('online', alRecuperarConexion);
    if (!navigator.onLine) alPerderConexion();

    const connect = async () => {
      try {
        const { ticket } = await obtenerTicketAsistencia(sesionId);
        if (cancelled) return;
        const endpoint = new URL(API_URL, window.location.origin);
        endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
        endpoint.pathname = '/ws/asistencia';
        endpoint.search = new URLSearchParams({ ticket }).toString();
        socket = new WebSocket(endpoint);
        socket.onopen = () => setConectado(true);
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.sesionId === sesionId) void cargarAsistencia();
        };
        socket.onclose = () => {
          setConectado(false);
          if (!cancelled) retryTimer = window.setTimeout(connect, 2_000);
        };
        socket.onerror = () => socket?.close();
      } catch {
        if (!cancelled) retryTimer = window.setTimeout(connect, 4_000);
      }
    };
    void connect();

    return () => {
      cancelled = true;
      window.clearInterval(qrTimer);
      window.clearInterval(rosterTimer);
      window.clearInterval(countdown);
      window.clearTimeout(retryTimer);
      window.removeEventListener('offline', alPerderConexion);
      window.removeEventListener('online', alRecuperarConexion);
      socket?.close();
    };
  }, [cargarAsistencia, renovarQR, sesionId]);

  const presentes = useMemo(() => alumnos.filter((a) => a.estado === 'presente').length, [alumnos]);
  const pendientes = alumnos.length - presentes;
  const porcentaje = alumnos.length ? Math.round((presentes / alumnos.length) * 100) : 0;

  const registrarManual = async () => {
    if (!alumnoId) return;
    setGuardando(true);
    try {
      await registrarAsistenciaManual(sesionId, alumnoId, motivo.trim() || undefined);
      setModalManual(false);
      setAlumnoId('');
      setBuscarAlumno('');
      setMotivo('');
      await cargarAsistencia();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la asistencia');
    } finally {
      setGuardando(false);
    }
  };

  const marcarCheckin = async () => {
    try {
      await checkinDocente(sesionId);
      setCheckedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el check-in');
    }
  };

  return (
    <div className="flex min-h-screen flex-col font-sans bg-[#020d1a] text-white lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#021428] px-4 py-3 shadow-xl sm:px-6 sm:py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(user?.rol === 'admin' ? '/admin/dashboard' : '/docente/dashboard')} aria-label="Regresar al panel docente" className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"><ArrowLeft size={15}/> Regresar</button>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/50">Universidad Tecnológica del Perú</p>
            <p className="font-bold">{cursoNombre} · Sección {cursoSeccion}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {checkedIn ? <span className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-400"><Check size={14}/> Docente en Aula</span>
            : <button onClick={marcarCheckin} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold"><CalendarCheck size={14}/> Check-in Docente</button>}
        </div>
      </header>

      {error && <div role="alert" className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar error"><X size={16}/></button></div>}

      <main className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 lg:min-h-0 lg:flex-row lg:overflow-hidden lg:p-5">
        <section className="flex min-h-[55vh] flex-1 flex-col items-center justify-center lg:min-h-0 lg:overflow-y-auto">
          <div className="relative flex shrink-0 flex-col items-center rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:p-8">
            {qrPayload && qrDisponible ? <QRCodeSVG value={qrPayload} size={320} level="M" fgColor="#002B49" className="h-auto w-[min(320px,65vw)]" /> : <div role="status" aria-live="polite" className="flex h-64 w-64 max-w-full items-center justify-center px-6 text-center text-sm text-slate-600 sm:h-80 sm:w-80">{errorQR || 'Generando QR vigente…'}</div>}
            <div className="mt-5 flex flex-col items-center sm:mt-8">
              <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${qrDisponible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}><RefreshCw size={16} className={qrDisponible && qrSeconds < 5 ? 'animate-spin' : ''}/>{qrDisponible ? `Nuevo QR en ${qrSeconds}s` : 'QR pausado · reintentando'}</div>
              <p className="mt-3 text-xs text-slate-500">Token dinámico · se renueva automáticamente cada 20 segundos</p>
            </div>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-white/50"><span className={`h-2 w-2 rounded-full ${conectado ? 'bg-emerald-400' : 'bg-amber-400'}`}/>{conectado ? 'Actualización en vivo conectada' : 'Reconectando actualización en vivo...'}</p>
          <button disabled className="mt-5 flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white/50" title="La exportación se encuentra fuera de este avance"><Download size={16}/> Exportar Asistencia</button>
        </section>

        <aside className="flex h-[65vh] max-h-[75vh] w-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#051a30] shadow-2xl lg:h-full lg:max-h-full lg:w-[24rem] lg:shrink-0">
          <div className="border-b border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Users size={18}/> Asistencia en Vivo</h2><span className={`h-2.5 w-2.5 rounded-full ${conectado ? 'bg-emerald-500' : 'bg-amber-500'}`}/></div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3"><span className="text-2xl font-black text-emerald-400">{presentes}</span><span className="text-[10px] font-bold uppercase text-emerald-400/70">Presentes</span></div>
              <div className="flex flex-col items-center rounded-xl border border-red-500/20 bg-red-500/10 p-3"><span className="text-2xl font-black text-red-400">{pendientes}</span><span className="text-[10px] font-bold uppercase text-red-400/70">Pendientes</span></div>
            </div>
            <div className="mb-2 flex justify-between text-xs text-white/50"><span>{presentes} de {alumnos.length} alumnos</span><span className="text-emerald-400">{porcentaje}% asistencia</span></div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${porcentaje}%` }}/></div>
            <button onClick={() => setModalManual(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"><Plus size={14}/> Registrar Asistencia Manual</button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            {cargando && <p className="py-8 text-center text-xs text-white/50">Cargando alumnos...</p>}
            {!cargando && alumnos.length === 0 && <p className="py-8 text-center text-xs text-white/50">No hay alumnos matriculados en este curso.</p>}
            {alumnos.map((alumno) => <div key={alumno.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
              {alumno.foto ? <img src={alumno.foto} alt={`Selfie de ${alumno.nombre}`} className="h-11 w-11 shrink-0 rounded-full border-2 border-emerald-500 object-cover"/> : <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${alumno.estado === 'presente' ? 'bg-emerald-600' : 'bg-slate-700'}`}>{alumno.nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}</div>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{alumno.nombre}</p><p className="text-[10px] text-white/40">{alumno.codigo}{alumno.hora ? ` · ${alumno.hora}` : ''}</p></div>
              <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${alumno.estado === 'presente' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-300'}`}>{alumno.estado}</span>
            </div>)}
          </div>
        </aside>
      </main>

      {modalManual && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="manual-title">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#021428] p-8 shadow-2xl">
          <h2 id="manual-title" className="mb-2 text-xl font-bold">Registrar asistencia</h2><p className="mb-5 text-sm text-white/50">Si un alumno no pudo completar el registro con el QR, selecciónalo para marcar su asistencia como presente.</p>
          <label className="mb-2 block text-xs font-semibold text-white/70" htmlFor="alumno-manual">1. Seleccionar alumno</label>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3"><Search size={15} className="text-white/40"/><input id="alumno-manual" value={buscarAlumno} onChange={(e) => setBuscarAlumno(e.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/35" placeholder="Buscar por nombre o código"/></div>
          <div className="mb-5 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-white/10 p-1">
            {alumnos.filter((a) => `${a.nombre} ${a.codigo}`.toLowerCase().includes(buscarAlumno.toLowerCase())).map((a) => <button type="button" key={a.id} onClick={() => setAlumnoId(a.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${alumnoId === a.id ? 'bg-cyan-500/15 text-cyan-200' : 'text-white/80 hover:bg-white/5'}`}><span><b>{a.nombre}</b><span className="ml-2 text-white/40">{a.codigo}</span></span><span className="text-[10px] text-white/40">{a.estado === 'pendiente' ? 'Sin marcar' : a.estado}</span></button>)}
            {alumnos.length === 0 && <p className="p-3 text-center text-xs text-white/50">No hay alumnos matriculados.</p>}
          </div>
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">Estado que se registrará: Presente</div>
          <label className="mb-2 block text-xs font-semibold text-white/70" htmlFor="motivo-manual">2. Observación del problema con el QR (opcional)</label><input id="motivo-manual" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mb-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" placeholder="Ej.: no cargó la cámara o falló la lectura"/>
          <div className="flex justify-end gap-3"><button onClick={() => setModalManual(false)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white/70 hover:bg-white/10">Cancelar</button><button disabled={!alumnoId || guardando} onClick={() => void registrarManual()} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar asistencia'}</button></div>
        </div>
      </div>}
    </div>
  );
}

export default DocenteProyeccion;
