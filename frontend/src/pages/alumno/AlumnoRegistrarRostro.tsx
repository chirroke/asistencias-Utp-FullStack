import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2, LoaderCircle, ScanFace, ShieldCheck } from 'lucide-react';
import { analizarRostro, capturarJpeg, cargarModelosFaciales } from '../../services/biometria';
import { registrarRostroAlumno } from '../../services/api';
import { useAuth } from '../../context/Authcontext';

export default function AlumnoRegistrarRostro() {
  const navigate = useNavigate();
  const { recargarPerfil } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camaraLista, setCamaraLista] = useState(false);
  const [modelosListos, setModelosListos] = useState(false);
  const [calidad, setCalidad] = useState('Carga los modelos faciales y permite el uso de la cámara.');
  const [consentimiento, setConsentimiento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    let cancelado = false;
    const iniciar = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Para usar la cámara, abre la app en localhost o mediante HTTPS.');
        await cargarModelosFaciales();
        if (cancelado) return;
        setModelosListos(true);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (cancelado) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCamaraLista(true);
        setCalidad('Cámara lista. Centra el rostro, mira de frente y pulsa “Registrar mi rostro”.');
      } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron iniciar los modelos o la cámara.'); }
    };
    void iniciar();
    return () => { cancelado = true; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  }, []);

  const guardar = async () => {
    if (!consentimiento) { setError('Debes aceptar el uso de tu foto y patrón facial para registrar tu rostro.'); return; }
    const video = videoRef.current;
    if (!video || !camaraLista) { setError('La cámara todavía no está lista.'); return; }
    setGuardando(true); setError(''); setExito(''); setCalidad('Analizando rostro e iluminación…');
    try {
      const analisis = await analizarRostro(video);
      const foto = await capturarJpeg(video);
      await registrarRostroAlumno(foto, analisis.embedding);
      await recargarPerfil();
      setCalidad(analisis.calidad);
      setExito('Rostro registrado correctamente. Ya puedes usar el escáner QR.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo registrar la foto.'); }
    finally { setGuardando(false); }
  };

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8"><div className="mx-auto max-w-2xl">
    <button onClick={() => navigate('/alumno/dashboard')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#c8102e]"><ArrowLeft size={16}/> Volver al panel</button>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
      <header className="bg-[#002238] p-6 text-white"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/10 p-3"><ScanFace size={22}/></div><div><h1 className="text-xl font-bold">Registrar mi rostro</h1><p className="mt-1 text-xs text-slate-300">Se usará para comparar tu selfie al marcar asistencia con QR.</p></div></div></header>
      <div className="space-y-4 p-5 md:p-7">
        <div className="relative overflow-hidden rounded-2xl bg-slate-950">
          <video ref={videoRef} className={`aspect-video w-full object-cover ${camaraLista ? 'block' : 'invisible absolute inset-0'}`} muted playsInline/>
          {!camaraLista && <div className="absolute inset-0 flex aspect-video flex-col items-center justify-center gap-3 text-slate-300"><LoaderCircle size={32} className="animate-spin"/><p className="text-xs">{error || (modelosListos ? 'Abriendo cámara…' : 'Cargando reconocimiento facial…')}</p></div>}
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-sky-900"><ShieldCheck size={18} className="mt-0.5 shrink-0"/><p><b>Revisión de calidad:</b> verificamos que haya un solo rostro, que esté cerca y centrado, que la imagen sea nítida y que la iluminación sea suficiente.</p></div>
        <p role="status" className="text-xs font-semibold text-slate-600">{calidad}</p>
        <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={consentimiento} onChange={(event) => setConsentimiento(event.target.checked)} className="mt-1"/>Acepto guardar mi foto de referencia y su patrón facial en esta base de datos para validar mis marcaciones. Puedo volver a registrar una foto actualizada.</label>
        <button disabled={!camaraLista || !consentimiento || guardando} onClick={() => void guardar()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8102e] py-3 text-sm font-bold text-white disabled:opacity-50"><Camera size={17}/>{guardando ? 'Analizando y guardando…' : 'Registrar mi rostro'}</button>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        {exito && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16}/>{exito}</p>}
        <p className="text-[11px] leading-5 text-slate-400">El prototipo guarda la imagen JPEG y un descriptor facial de 128 valores. La comparación es orientativa: no detecta suplantación ni reemplaza una verificación oficial. En celular, abre el sitio usando HTTPS y autoriza la cámara.</p>
      </div>
    </section>
  </div></main>;
}
