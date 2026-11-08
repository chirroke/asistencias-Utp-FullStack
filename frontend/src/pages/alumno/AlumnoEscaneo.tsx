import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserQRCodeReader } from '@zxing/browser';
import { ArrowLeft, Camera, CheckCircle2, QrCode, RotateCcw, ScanFace, X } from 'lucide-react';
import { escanearQrAlumno } from '../../services/api';
import { analizarRostro, capturarJpeg } from '../../services/biometria';

export function AlumnoEscaneo() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const procesando = useRef(false);
  const selfieStream = useRef<MediaStream | null>(null);
  const [activo, setActivo] = useState(false);
  const [qrParaSelfie, setQrParaSelfie] = useState('');
  const [intentoSelfie, setIntentoSelfie] = useState(0);
  const [selfieLista, setSelfieLista] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [manual, setManual] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const registrar = useCallback(async (raw: string, selfie: Blob, embedding: number[]) => {
    setGuardando(true); setError(''); setMensaje('');
    try {
      const response = await escanearQrAlumno(raw, selfie, embedding) as { message: string; curso: string; seccion: string };
      setMensaje(`${response.message} ${response.curso} · Sección ${response.seccion}.`);
      setManual('');
      setQrParaSelfie('');
      setSelfieLista(false);
      setConsentimiento(false);
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
    lector.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, videoRef.current, (result, _error, controlsCallback) => {
      if (!result || procesando.current) return;
      procesando.current = true;
      controlsCallback.stop();
      setActivo(false);
      setError('');
      setQrParaSelfie(result.getText());
    }).then((createdControls) => {
      controles = createdControls;
      if (cancelado) controles.stop();
    }).catch((cameraError: unknown) => {
      setActivo(false);
      setError(cameraError instanceof Error ? cameraError.message : 'No se pudo abrir la cámara. Revisa los permisos del navegador.');
    });
    return () => { cancelado = true; controles?.stop(); };
  }, [activo]);

  useEffect(() => {
    if (!qrParaSelfie || !videoRef.current) return;
    let cancelado = false;
    setSelfieLista(false);
    setConsentimiento(false);
    const iniciarCamaraSelfie = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere abrir esta página por HTTPS. Abre el enlace seguro y vuelve a intentarlo.');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (cancelado) { stream.getTracks().forEach((track) => track.stop()); return; }
        selfieStream.current = stream;
        videoRef.current!.srcObject = stream;
        await videoRef.current!.play();
        setSelfieLista(true);
        setError('');
      } catch (cameraError) {
        setError(cameraError instanceof Error ? cameraError.message : 'Permite el acceso a la cámara frontal para tomar la selfie.');
      }
    };
    void iniciarCamaraSelfie();
    return () => {
      cancelado = true;
      selfieStream.current?.getTracks().forEach((track) => track.stop());
      selfieStream.current = null;
    };
  }, [qrParaSelfie, intentoSelfie]);

  const capturarSelfie = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setError('Espera a que la cámara frontal esté lista.'); return; }
    setError('');
    try {
      const { embedding } = await analizarRostro(video);
      const blob = await capturarJpeg(video);
      void registrar(qrParaSelfie, blob, embedding);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo validar la selfie.'); }
  };

  const enviarManual = (event: React.FormEvent) => {
    event.preventDefault();
    if (manual.trim()) { setError(''); setQrParaSelfie(manual.trim()); }
  };

  const cancelarSelfie = () => { setQrParaSelfie(''); setSelfieLista(false); setConsentimiento(false); setError(''); procesando.current = false; };

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate('/alumno/dashboard')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#c8102e]"><ArrowLeft size={16}/> Regresar al panel</button>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        <header className="bg-[#002238] p-6 text-white"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/10 p-3"><QrCode size={22}/></div><div><h1 className="text-xl font-bold">Escanear QR de asistencia</h1><p className="mt-1 text-xs text-slate-300">Usa la cámara trasera para leer el QR; después cambiaremos a la frontal para validar tu selfie.</p></div></div></header>
        <div className="space-y-4 p-5 md:p-7">
          <div className="overflow-hidden rounded-2xl bg-slate-950">
            {activo || qrParaSelfie ? <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline/> : <div className="flex aspect-video flex-col items-center justify-center gap-3 text-slate-300"><Camera size={38} className="text-slate-500"/><p className="text-xs">La cámara se activa cuando pulses “Iniciar cámara”.</p></div>}
          </div>
          {qrParaSelfie ? <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"><ScanFace size={18} className="mt-0.5 shrink-0"/><p><b>QR leído.</b> Centra tu rostro. La app verificará que coincida con la foto facial que registraste y guardará esta selfie con la asistencia.</p></div>
            <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={consentimiento} onChange={(event) => setConsentimiento(event.target.checked)} className="mt-1"/>Acepto tomar y compartir esta foto con el docente para registrar mi asistencia.</label>
            <button disabled={!selfieLista || !consentimiento || guardando} onClick={capturarSelfie} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8102e] py-3 text-sm font-bold text-white hover:bg-[#a60d26] disabled:opacity-50"><Camera size={17}/>{guardando ? 'Guardando asistencia…' : selfieLista ? 'Tomar selfie y marcar asistencia' : 'Activando cámara frontal…'}</button>
            {!selfieLista && !guardando && <button onClick={() => { setError(''); setIntentoSelfie((value) => value + 1); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-semibold"><RotateCcw size={14}/> Reintentar cámara frontal</button>}
            <button disabled={guardando} onClick={cancelarSelfie} className="flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500"><X size={14}/> Cancelar y volver a escanear</button>
          </div> : <button disabled={guardando || activo} onClick={() => { setError(''); setMensaje(''); procesando.current = false; setActivo(true); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8102e] py-3 text-sm font-bold text-white hover:bg-[#a60d26] disabled:opacity-50"><Camera size={17}/>{activo ? 'Buscando código QR…' : 'Iniciar cámara'}</button>}
          {guardando && <p role="status" className="text-center text-xs text-slate-500">Validando el QR y guardando tu marcación…</p>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}{!qrParaSelfie && <button onClick={() => { setError(''); setActivo(true); }} className="ml-2 inline-flex items-center gap-1 font-bold underline"><RotateCcw size={12}/> Reintentar</button>}</div>}
          {mensaje && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16}/>{mensaje}</div>}
          {!qrParaSelfie && <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-xs font-bold text-slate-600">¿No puedes usar la cámara? Ingresar contenido del QR</summary><form onSubmit={enviarManual} className="mt-3 flex gap-2"><input value={manual} onChange={(event) => setManual(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs" placeholder="Pega el texto del QR"/><button disabled={!manual.trim() || guardando} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Continuar</button></form></details>}
          <p className="text-center text-[11px] leading-5 text-slate-400">La foto se guarda con esta asistencia y aparece en la lista del docente. Solo se registra una vez por alumno y sesión. Usa una conexión segura HTTPS para habilitar la cámara del celular.</p>
        </div>
      </section>
    </div>
  </main>;
}

export default AlumnoEscaneo;
