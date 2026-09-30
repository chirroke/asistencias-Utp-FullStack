import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserQRCodeReader } from '@zxing/browser';
import { ArrowLeft, Camera, CheckCircle2, QrCode, RotateCcw } from 'lucide-react';
import { escanearQrAlumno } from '../../services/api';

export function AlumnoEscaneo() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const procesando = useRef(false);
  const [activo, setActivo] = useState(false);
  const [manual, setManual] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const registrar = useCallback(async (raw: string) => {
    setGuardando(true); setError(''); setMensaje('');
    try {
      const response = await escanearQrAlumno(raw) as { message: string; curso: string; seccion: string };
      setMensaje(`${response.message} ${response.curso} · Sección ${response.seccion}.`);
      setManual('');
      setActivo(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar esta asistencia.');
    } finally {
      setGuardando(false);
      procesando.current = false;
    }
  }, []);

  useEffect(() => {
    if (!activo || !videoRef.current) return;
    let cancelado = false;
    let controles: { stop: () => void } | undefined;
    const lector = new BrowserQRCodeReader();
    lector.decodeFromVideoDevice(undefined, videoRef.current, (result, _error, controlsCallback) => {
      if (!result || procesando.current) return;
      procesando.current = true;
      controlsCallback.stop();
      setActivo(false);
      void registrar(result.getText());
    }).then((createdControls) => {
      controles = createdControls;
      if (cancelado) controles.stop();
    }).catch((cameraError: unknown) => {
      setActivo(false);
      setError(cameraError instanceof Error ? cameraError.message : 'No se pudo abrir la cámara. Revisa los permisos del navegador.');
    });
    return () => { cancelado = true; controles?.stop(); };
  }, [activo, registrar]);

  const enviarManual = (event: React.FormEvent) => {
    event.preventDefault();
    if (manual.trim()) void registrar(manual.trim());
  };

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate('/alumno/dashboard')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#c8102e]"><ArrowLeft size={16}/> Regresar al panel</button>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        <header className="bg-[#002238] p-6 text-white"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/10 p-3"><QrCode size={22}/></div><div><h1 className="text-xl font-bold">Escanear QR de asistencia</h1><p className="mt-1 text-xs text-slate-300">Apunta la cámara al código dinámico proyectado por tu docente.</p></div></div></header>
        <div className="space-y-4 p-5 md:p-7">
          <div className="overflow-hidden rounded-2xl bg-slate-950">
            {activo ? <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline/> : <div className="flex aspect-video flex-col items-center justify-center gap-3 text-slate-300"><Camera size={38} className="text-slate-500"/><p className="text-xs">La cámara se activa cuando pulses “Iniciar cámara”.</p></div>}
          </div>
          <button disabled={guardando || activo} onClick={() => { setError(''); setMensaje(''); procesando.current = false; setActivo(true); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8102e] py-3 text-sm font-bold text-white hover:bg-[#a60d26] disabled:opacity-50"><Camera size={17}/>{activo ? 'Buscando código QR…' : 'Iniciar cámara'}</button>
          {guardando && <p role="status" className="text-center text-xs text-slate-500">Validando el QR y guardando tu asistencia…</p>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<button onClick={() => { setError(''); setActivo(true); }} className="ml-2 inline-flex items-center gap-1 font-bold underline"><RotateCcw size={12}/> Reintentar</button></div>}
          {mensaje && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16}/>{mensaje}</div>}
          <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-xs font-bold text-slate-600">¿No puedes usar la cámara? Ingresar contenido del QR</summary><form onSubmit={enviarManual} className="mt-3 flex gap-2"><input value={manual} onChange={(event) => setManual(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs" placeholder="Pega el texto del QR"/><button disabled={!manual.trim() || guardando} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Validar</button></form></details>
          <p className="text-center text-[11px] leading-5 text-slate-400">El servidor valida matrícula, vigencia del QR y sesión antes de guardar la marcación. Cada alumno puede registrar una vez por sesión.</p>
        </div>
      </section>
    </div>
  </main>;
}

export default AlumnoEscaneo;
