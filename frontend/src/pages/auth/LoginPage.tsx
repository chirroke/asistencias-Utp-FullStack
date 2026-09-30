import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/Authcontext';
import { restablecerContrasena, solicitarRecuperacion, verificarCodigoRecuperacion } from '../../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ErroresForm = { correo?: string; contrasena?: string };

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [errores, setErrores] = useState<ErroresForm>({});

  // Modal Recuperar Contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  const solicitarCodigo = async () => {
    const email = recoveryEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email) || !email.endsWith('@utp.edu.pe')) {
      setRecoveryError('Ingresa un correo institucional @utp.edu.pe válido.');
      return;
    }
    setRecoveryBusy(true);
    setRecoveryError('');
    try {
      await solicitarRecuperacion(email);
      setRecoveryEmail(email);
      setRecoveryStep(2);
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'No se pudo enviar el código.');
    } finally {
      setRecoveryBusy(false);
    }
  };

  const verificarCodigo = async () => {
    setRecoveryBusy(true);
    setRecoveryError('');
    try {
      const result = await verificarCodigoRecuperacion(recoveryEmail, otpCode.join(''));
      setResetToken(result.token);
      setRecoveryStep(3);
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'No se pudo verificar el código.');
    } finally {
      setRecoveryBusy(false);
    }
  };

  const cambiarContrasena = async () => {
    const password = nuevaContrasena;
    const contieneDatoPersonal = [recoveryEmail.split('@')[0], ...recoveryEmail.split('@')[0].split(/[._-]/)]
      .filter((part) => part.length >= 3)
      .some((part) => password.toLowerCase().includes(part.toLowerCase()));
    if (password.length < 8 || password.length > 14 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setRecoveryError('Usa entre 8 y 14 caracteres e incluye minúscula, mayúscula y número.');
      return;
    }
    if (contieneDatoPersonal) {
      setRecoveryError('Evita incluir tu usuario o datos personales en la contraseña.');
      return;
    }
    if (password !== confirmarContrasena) {
      setRecoveryError('Las contraseñas no coinciden.');
      return;
    }
    setRecoveryBusy(true);
    setRecoveryError('');
    try {
      await restablecerContrasena(resetToken, password);
      setRecoveryStep(4);
      setRecoveryError('');
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setRecoveryBusy(false);
    }
  };

  const validar = (): boolean => {
    const nuevos: ErroresForm = {};
    const email = correo.trim().toLowerCase();

    if (!email) nuevos.correo = 'Ingresa tu correo institucional.';
    else if (!EMAIL_REGEX.test(email)) nuevos.correo = 'El correo no tiene un formato válido.';
    else if (!email.endsWith('@utp.edu.pe')) nuevos.correo = 'Usa tu correo institucional @utp.edu.pe.';

    if (!contrasena) nuevos.contrasena = 'Ingresa tu contraseña.';

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setError('');

    if (!validar()) return;

    setCargando(true);
    const emailNorm = correo.trim().toLowerCase();

    try {
      const exito = await login(emailNorm, contrasena);
      if (exito) navigate('/', { replace: true });
      else setError('Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor. Inténtalo nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061826] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#002238] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-cyan-900/30">
        
        {/* PANEL IZQUIERDO */}
        <div className="md:w-1/2 p-8 md:p-10 flex flex-col justify-between text-white">
          <div>
            <div className="w-16 h-12 bg-white rounded-xl flex items-center justify-center shadow-md mb-8">
              <span className="text-[#c8102e] font-extrabold text-xl tracking-tight">UTP</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-4">
              Portal de Control <br />de Asistencia UTP
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed mb-8">
              Plataforma institucional para docentes, alumnos y autoridades. Triple factor de validación: QR dinámico, geolocalización de aula y biometría facial en tiempo real.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-8">
              <div className="bg-[#0b3552]/80 border border-cyan-800/40 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                <svg className="w-5 h-5 mb-1.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="text-[10px] font-semibold text-slate-200">QR Dinámico</span>
              </div>
              <div className="bg-[#0b3552]/80 border border-cyan-800/40 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                <svg className="w-5 h-5 mb-1.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] font-semibold text-slate-200">Geofencing<br />GPS</span>
              </div>
              <div className="bg-[#0b3552]/80 border border-cyan-800/40 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                <svg className="w-5 h-5 mb-1.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-semibold text-slate-200">Biometría<br />Facial</span>
              </div>
            </div>
          </div>

          <div className="bg-[#072a42]/70 border border-cyan-800/30 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="text-[11px] text-slate-300">
                <p className="font-semibold text-white">Sesión Segura Activa</p>
                <p className="text-slate-400">Validación de aula sincronizada</p>
              </div>
            </div>
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="md:w-1/2 bg-white p-8 md:p-10 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">
            <h2 className="text-xl font-bold text-[#002238]">Iniciar Sesión</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-6">Ingresa con tus credenciales institucionales UTP</p>

            {error && (
              <div role="alert" className="mb-4 text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Institucional
                </label>
                <input
                  type="email"
                  autoComplete="username"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    if (errores.correo) setErrores((prev) => ({ ...prev, correo: undefined }));
                  }}
                  placeholder="r.quispe@utp.edu.pe o u22221422@utp.edu.pe"
                  aria-invalid={!!errores.correo}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-[#002238] focus:outline-none text-slate-800 ${
                    errores.correo ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {errores.correo && (
                  <p className="mt-1 text-[11px] text-red-600">{errores.correo}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={contrasena}
                    onChange={(e) => {
                      setContrasena(e.target.value);
                      if (errores.contrasena) setErrores((prev) => ({ ...prev, contrasena: undefined }));
                    }}
                    placeholder="••••••••"
                    aria-invalid={!!errores.contrasena}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-[#002238] focus:outline-none text-slate-800 pr-9 ${
                      errores.contrasena ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
                {errores.contrasena && (
                  <p className="mt-1 text-[11px] text-red-600">{errores.contrasena}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3 bg-[#c8102e] hover:bg-[#a60d26] text-white font-semibold rounded-xl text-xs shadow-md transition-all cursor-pointer mt-2"
              >
                {cargando ? 'Ingresando...' : 'Ingresar al Panel UTP'}
              </button>
            </form>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setRecoveryStep(1);
                  setRecoveryError('');
                  setOtpCode(['', '', '', '', '', '']);
                  setResetToken('');
                  setNuevaContrasena('');
                  setConfirmarContrasena('');
                }}
                className="text-xs font-semibold text-[#c8102e] hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-6">
              Solo para personal y estudiantes autorizados · UTP 2026
            </p>
          </div>
        </div>
      </div>

      {/* MODAL RECUPERAR CONTRASEÑA */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100">
            <div className="bg-[#002238] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#c8102e] flex items-center justify-center shadow">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Recuperar Contraseña</h3>
                  <p className="text-[10px] text-slate-300">{recoveryStep < 4 ? `Paso ${recoveryStep} de 3` : 'Completado'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="px-6 pt-4 pb-2 flex gap-1.5">
              <div className={`h-1 flex-1 rounded-full ${recoveryStep >= 1 ? 'bg-[#c8102e]' : 'bg-slate-200'}`} />
              <div className={`h-1 flex-1 rounded-full ${recoveryStep >= 2 ? 'bg-[#c8102e]' : 'bg-slate-200'}`} />
              <div className={`h-1 flex-1 rounded-full ${recoveryStep >= 3 ? 'bg-[#c8102e]' : 'bg-slate-200'}`} />
              <div className={`h-1 flex-1 rounded-full ${recoveryStep >= 4 ? 'bg-[#c8102e]' : 'bg-slate-200'}`} />
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-sky-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-sky-100 shadow-inner">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {recoveryStep === 1 ? 'Ingresa tu correo institucional' : recoveryStep === 2 ? 'Ingresa el código de 6 dígitos' : recoveryStep === 3 ? 'Elige una contraseña nueva' : 'Contraseña actualizada'}
                </h4>
                <p className="mt-1 text-[11px] text-slate-500">
                  {recoveryStep === 1 ? 'Te enviaremos un código que vence en 10 minutos.' : recoveryStep === 2 ? `Código enviado a ${recoveryEmail}` : recoveryStep === 3 ? 'Crea una contraseña segura para tu cuenta.' : 'Ya puedes iniciar sesión con tu nueva contraseña.'}
                </p>
              </div>

              {recoveryStep === 1 ? (
                <div className="text-left">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Correo institucional
                  </label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="u00000000@utp.edu.pe o r.docente@utp.edu.pe"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002238] focus:outline-none"
                  />
                </div>
              ) : recoveryStep === 2 ? (
                <div className="flex justify-center gap-2">
                  {otpCode.map((val, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={val}
                      onChange={(e) => {
                        const updated = [...otpCode];
                        updated[idx] = e.target.value.replace(/\D/g, '').slice(-1);
                        setOtpCode(updated);
                      }}
                      aria-label={`Dígito ${idx + 1} del código`}
                      className="w-9 h-10 text-center font-bold text-sm border rounded-lg border-slate-300 focus:border-[#c8102e] outline-none text-slate-800"
                    />
                  ))}
                </div>
              ) : recoveryStep === 3 ? (
                <div className="space-y-3 text-left">
                  <label className="block text-[11px] font-semibold text-slate-700">Nueva contraseña<input type="password" autoComplete="new-password" value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)} maxLength={14} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#002238]" placeholder="8 a 14 caracteres"/></label>
                  <label className="block text-[11px] font-semibold text-slate-700">Repetir contraseña<input type="password" autoComplete="new-password" value={confirmarContrasena} onChange={(e) => setConfirmarContrasena(e.target.value)} maxLength={14} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#002238]" placeholder="Repite la contraseña"/></label>
                  <ul className="space-y-1 text-[10px] text-slate-500"><li className={nuevaContrasena.length >= 8 && nuevaContrasena.length <= 14 ? 'text-emerald-700' : ''}>• Entre 8 y 14 caracteres</li><li className={/[a-z]/.test(nuevaContrasena) ? 'text-emerald-700' : ''}>• Una letra minúscula y una mayúscula</li><li className={/\d/.test(nuevaContrasena) ? 'text-emerald-700' : ''}>• Al menos un número</li><li>• No uses tu nombre ni datos personales</li></ul>
                </div>
              ) : <p className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">Tu contraseña se cambió correctamente.</p>}

              {recoveryError && <p role="alert" className="rounded-lg bg-red-50 p-2 text-left text-[11px] text-red-700">{recoveryError}</p>}

              {recoveryStep < 4 ? <button type="button" disabled={recoveryBusy} onClick={() => void (recoveryStep === 1 ? solicitarCodigo() : recoveryStep === 2 ? verificarCodigo() : cambiarContrasena())} className="w-full rounded-xl bg-[#c8102e] py-2.5 text-xs font-semibold text-white shadow transition hover:bg-[#a60d26] disabled:cursor-wait disabled:opacity-60">
                {recoveryBusy ? 'Procesando...' : recoveryStep === 1 ? 'Enviar código de verificación' : recoveryStep === 2 ? 'Validar código' : 'Cambiar contraseña'}
              </button> : <button type="button" onClick={() => setShowForgotModal(false)} className="w-full rounded-xl bg-[#c8102e] py-2.5 text-xs font-semibold text-white">Volver al inicio de sesión</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
