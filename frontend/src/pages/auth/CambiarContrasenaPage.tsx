import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, KeyRound, LogOut } from 'lucide-react';
import { cambiarContrasenaActual } from '../../services/api';
import { useAuth } from '../../context/Authcontext';

export function CambiarContrasenaPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const dashboard = user?.rol === 'admin' ? '/admin/dashboard' : user?.rol === 'alumno' ? '/alumno/dashboard' : '/docente/dashboard';
  const tieneMayuscula = /[A-Z]/.test(nueva);
  const tieneMinuscula = /[a-z]/.test(nueva);
  const tieneNumero = /\d/.test(nueva);
  const longitudValida = nueva.length >= 8 && nueva.length <= 14;

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMensaje('');
    const partesPersonales = [user?.nombres, user?.apellidos, user?.correo?.split('@')[0]]
      .flatMap((parte) => (parte || '').split(/[\s._-]+/))
      .filter((parte) => parte.length >= 3);
    if (!longitudValida || !tieneMayuscula || !tieneMinuscula || !tieneNumero) {
      setError('Completa todos los requisitos mínimos de contraseña.');
      return;
    }
    if (partesPersonales.some((parte) => nueva.toLowerCase().includes(parte.toLowerCase()))) {
      setError('No uses tu nombre, apellido o usuario de correo en la contraseña.');
      return;
    }
    if (nueva !== confirmar) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      const result = await cambiarContrasenaActual(actual, nueva);
      setMensaje(result.message || 'Contraseña actualizada correctamente.');
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="flex items-center justify-between bg-[#002238] px-6 py-4 text-white shadow-md">
      <div className="flex items-center gap-3"><div className="rounded-lg bg-white px-2 py-1 font-black tracking-wider text-[#c8102e]">UTP</div><div><p className="text-xs font-bold">Asistencia UTP</p><p className="text-[10px] text-slate-300">Seguridad de la cuenta</p></div></div>
      <button onClick={logout} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"><LogOut size={14}/> Cerrar sesión</button>
    </header>
    <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-5xl items-center gap-10 p-5 md:grid-cols-2 md:p-10">
      <section className="hidden rounded-3xl bg-gradient-to-br from-[#002238] via-[#073958] to-[#c8102e] p-10 text-white shadow-xl md:block">
        <div className="mb-12 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><KeyRound size={28}/></div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Asistencia UTP</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight">Protege tu cuenta con una contraseña segura</h1>
        <p className="mt-4 text-sm leading-6 text-slate-200">Usa una clave única que no compartas con otras cuentas y evita información personal.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-9">
        <button onClick={() => navigate(dashboard)} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#c8102e]"><ArrowLeft size={15}/> Regresar al panel</button>
        <div className="mb-6"><h2 className="text-2xl font-bold text-slate-900">Cambio de contraseña</h2><p className="mt-2 text-sm text-slate-500">Hola {user?.nombres}, puedes actualizar la contraseña de tu cuenta aquí.</p></div>
        <form onSubmit={(event) => void guardar(event)} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-700">Contraseña actual<input required type="password" autoComplete="current-password" value={actual} onChange={(event) => setActual(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#002238] focus:ring-2 focus:ring-[#002238]/10" placeholder="Ingresa tu contraseña actual"/></label>
          <label className="block text-xs font-semibold text-slate-700">Nueva contraseña<input required type="password" autoComplete="new-password" maxLength={14} value={nueva} onChange={(event) => setNueva(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#002238] focus:ring-2 focus:ring-[#002238]/10" placeholder="Crea una contraseña segura"/></label>
          <label className="block text-xs font-semibold text-slate-700">Repetir nueva contraseña<input required type="password" autoComplete="new-password" maxLength={14} value={confirmar} onChange={(event) => setConfirmar(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#002238] focus:ring-2 focus:ring-[#002238]/10" placeholder="Vuelve a escribirla"/></label>
          <div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-bold text-slate-700">Requisitos mínimos</p><ul className="space-y-1.5 text-xs">{[
            [longitudValida, 'Entre 8 y 14 caracteres'],
            [tieneMinuscula, 'Al menos una letra minúscula'],
            [tieneMayuscula, 'Al menos una letra mayúscula'],
            [tieneNumero, 'Al menos un número'],
          ].map(([ok, text]) => <li key={String(text)} className={`flex items-center gap-2 ${ok ? 'text-emerald-700' : 'text-slate-500'}`}><Check size={13} className={ok ? 'opacity-100' : 'opacity-30'}/>{text}</li>)}</ul><p className="mt-2 text-[11px] text-slate-500">Recomendación: no uses nombres, correo, fechas ni otros datos personales.</p></div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          {mensaje && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{mensaje}</p>}
          <button disabled={guardando} className="w-full rounded-xl bg-[#c8102e] py-3 text-sm font-bold text-white transition hover:bg-[#a60d26] disabled:opacity-60">{guardando ? 'Guardando...' : 'Cambiar contraseña'}</button>
        </form>
      </section>
    </main>
  </div>;
}

export default CambiarContrasenaPage;
