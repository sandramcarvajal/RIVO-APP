import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ShieldCheck, Car, UserCircle, LogIn, User, Hash, Palette, Tag, Loader2, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { useAuth } from '../client/modules/auth/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../client/modules/auth/services/AuthService';
import { normalizeName } from '../lib/utils';

const AuthView = () => {
  const { showToast } = useToast();
  const { register, login: authLogin, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCookieBlocked, setIsCookieBlocked] = React.useState(false);

  React.useEffect(() => {
    const handleCookieBlocked = () => {
      setIsCookieBlocked(true);
    };
    window.addEventListener("rivo_cookie_blocked", handleCookieBlocked);
    return () => {
      window.removeEventListener("rivo_cookie_blocked", handleCookieBlocked);
    };
  }, []);

  const queryParams = new URLSearchParams(location.search);
  const actionParam = queryParams.get("action");
  const tokenParam = queryParams.get("token");

  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<'passenger' | 'driver'>('passenger');
  const [vehicle, setVehicle] = React.useState({ plate: '', brand: '', color: '', model: '' });
  const [error, setError] = React.useState('');

  // Password Recovery State
  const [forgotMode, setForgotMode] = React.useState(false);
  const [recoveryEmail, setRecoveryEmail] = React.useState('');
  const [recoverySuccess, setRecoverySuccess] = React.useState(false);
  const [devBackupLink, setDevBackupLink] = React.useState<string | null>(null);

  // Password Reset State
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [resetSuccess, setResetSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const from = location.state?.from?.pathname || "/";

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clean state when moving between actions
  React.useEffect(() => {
    setError('');
    setRecoverySuccess(false);
    setDevBackupLink(null);
    setResetSuccess(false);
    setNewPassword('');
    setConfirmPassword('');
  }, [location.search, forgotMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      if (!email || !password) {
        showToast('Por favor completa todos los campos', 'error');
        return;
      }
    } else {
      if (!name.trim() || !email || !password) {
        showToast('Por favor completa todos los campos obligatorios', 'error');
        return;
      }

      if (role === 'driver' && (!vehicle.plate || !vehicle.brand || !vehicle.color)) {
        showToast('Por favor completa todos los datos del vehículo', 'error');
        return;
      }
    }

    try {
      setError('');
      if (isLogin) {
        await authLogin(email, password);
        showToast('¡Bienvenido de nuevo!');
      } else {
        const normalizedName = normalizeName(name);
        const normalizedVehicle = role === 'driver' ? {
          ...vehicle,
          brand: normalizeName(vehicle.brand),
          color: normalizeName(vehicle.color),
          model: vehicle.model ? normalizeName(vehicle.model) : undefined,
          plate: vehicle.plate.toUpperCase().trim()
        } : undefined;

        await register(normalizedName, email, role, password, normalizedVehicle as any);
        showToast('Cuenta creada exitosamente');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      showToast('Por favor ingresa tu correo corporativo', 'error');
      return;
    }
    if (!recoveryEmail.toLowerCase().trim().endsWith("@syc.com.co")) {
      showToast('El correo debe pertenecer al dominio @syc.com.co', 'error');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      const res = await AuthService.forgotPassword(recoveryEmail);
      setRecoverySuccess(true);
      showToast('Enlace de recuperación generado.');
      if (res.devLink) {
        setDevBackupLink(res.devLink);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar recuperación';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      await AuthService.resetPassword(tokenParam!, newPassword);
      setResetSuccess(true);
      showToast('¡Contraseña restablecida!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeResetMode = actionParam === 'reset-password' && !!tokenParam;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent relative">
      {isCookieBlocked && (
        <div className="absolute top-0 left-0 right-0 bg-rose-600 text-white p-3 text-xs font-semibold text-center flex flex-col gap-1 items-center justify-center border-b border-rose-700 animate-pulse z-50">
          <p>⚠️ Tu navegador bloqueó la cookie de seguridad de AI Studio (común en Safari/iOS).</p>
          <a 
            href={window.location.href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline font-black hover:text-rose-100 flex items-center gap-1"
          >
            Hacer clic aquí para abrir la aplicación en una pestaña nueva ↗
          </a>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="brand-block flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src="/logo_icon.svg"
                alt="Rivo Logo Icon"
                className="h-11 w-11 animate-none"
                referrerPolicy="no-referrer"
              />
              <h1 className="text-3xl font-bold text-slate-950 tracking-tight leading-none">
                Rivo
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Comparte tu ruta, a tu ritmo
            </p>
          </div>

          {!activeResetMode && !forgotMode && (
            <div className="flex justify-center gap-1">
              <button 
                onClick={() => setIsLogin(true)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all",
                  isLogin ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-slate-400 hover:text-primary"
                )}
              >
                Entrar
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all",
                  !isLogin ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-slate-400 hover:text-primary"
                )}
              >
                Registrarse
              </button>
            </div>
          )}
        </div>

        {activeResetMode ? (
          // RESET PASSWORD VIEW
          <div className="bg-white p-2 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-slate-950 tracking-tight">
                Restablecer Contraseña
              </h2>
              <p className="text-sm text-slate-500">
                Crea una nueva contraseña segura para tu cuenta de Rivo
              </p>
            </div>

            {resetSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5 p-4 border border-emerald-100 bg-emerald-50/50 rounded-2xl"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900">¡Contraseña Cambiada!</h3>
                  <p className="text-sm text-slate-500">Tu contraseña ha sido actualizada con éxito de extremo a extremo.</p>
                </div>
                <Button 
                  onClick={() => {
                    navigate('/auth', { replace: true });
                  }} 
                  className="w-full text-base"
                >
                  <LogIn size={18} />
                  Iniciar Sesión
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Input
                    label="Nueva Contraseña"
                    type="password"
                    placeholder="Contraseña (mín. 6 caracteres)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    icon={<Lock size={20} />}
                    required
                  />
                  <Input
                    label="Confirmar Nueva Contraseña"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={<Lock size={20} />}
                    required
                  />
                </div>

                {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl font-medium">{error}</p>}

                <div className="space-y-3">
                  <Button type="submit" className="w-full text-lg py-4 animate-none" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        Procesando...
                        <Loader2 className="animate-spin" size={20} />
                      </>
                    ) : (
                      <>
                        Restablecer contraseña
                        <CheckCircle size={20} />
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => navigate('/auth', { replace: true })}
                    className="w-full text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 py-2 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Cancelar y volver
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : forgotMode ? (
          // FORGOT PASSWORD RECOVERY VIEW
          <div className="bg-white p-2 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-slate-950 tracking-tight">
                ¿Olvidaste tu contraseña?
              </h2>
              <div className="text-[10px] font-bold text-slate-400 font-mono tracking-widest bg-slate-100 py-1 px-2.5 rounded-full inline-block mx-auto">
                RIVO BUILD: 8.7.4.2D-TEST
              </div>
              <p className="text-sm text-slate-500">
                Ingresa tu correo corporativo y te enviaremos un token temporal de recuperación.
              </p>
            </div>

            {recoverySuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="text-center space-y-4 p-4 border border-sky-100 bg-sky-50/50 rounded-2xl">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                    <Mail size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900">Correo Enviado</h3>
                    <p className="text-sm text-slate-500">
                      Si el correo <strong className="text-slate-800">{recoveryEmail}</strong> está registrado, recibirás un enlace de recuperación válido por 1 hora.
                    </p>
                  </div>
                </div>

                {devBackupLink && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border-2 border-dashed border-sky-200 bg-sky-50/30 rounded-2xl space-y-3"
                  >
                    <div className="text-xs font-bold text-sky-700 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Atajo de Desarrollo AI Studio
                    </div>
                    <p className="text-xs text-slate-600">
                      Como no hay SMTP de producción configurado, haz clic en este enlace generado para ir directamente a la página de restablecer contraseña:
                    </p>
                    <a
                      href={devBackupLink}
                      className="block text-center w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 rounded-xl text-sm shadow-md transition-colors"
                    >
                      Bypass: Restablecer Contraseña Ahora ↗
                    </a>
                  </motion.div>
                )}

                <Button 
                  onClick={() => {
                    setForgotMode(false);
                    setRecoverySuccess(false);
                    setDevBackupLink(null);
                  }} 
                  className="w-full text-base"
                >
                  <ArrowLeft size={18} />
                  Volver al Login
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Input
                    label="Correo Corporativo Registrado"
                    type="email"
                    placeholder="nombre@syc.com.co"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    icon={<Mail size={20} />}
                    required
                    helperText="Debe ser el correo con el que te registraste"
                  />
                </div>

                {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl font-medium">{error}</p>}

                <div className="space-y-3">
                  <Button type="submit" className="w-full text-lg py-4 animate-none" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        Enviando...
                        <Loader2 className="animate-spin" size={20} />
                      </>
                    ) : (
                      <>
                        Enviar enlace temporal
                        <Mail size={20} />
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 py-2 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Volver al login
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          // STANDARD LOGIN / REGISTER VIEW
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="register-fields"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <Input
                      label="Nombre Completo"
                      placeholder="Ej: Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      icon={<User size={20} />}
                      required
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Input
                label="Correo Corporativo"
                type="email"
                placeholder="nombre@syc.com.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                icon={<Mail size={20} />}
                required
                helperText="Debe ser @syc.com.co"
              />

              <div className="space-y-1 relative">
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={20} />}
                  required
                />
                {isLogin && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs font-bold text-primary hover:underline transition-all"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700 ml-1">Soy un</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setRole('passenger')}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                            role === 'passenger' 
                              ? "border-primary bg-primary/5 text-primary" 
                              : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          <UserCircle size={24} />
                          <span className="font-bold text-sm">Pasajero</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('driver')}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                            role === 'driver' 
                              ? "border-primary bg-primary/5 text-primary" 
                              : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          <Car size={24} />
                          <span className="font-bold text-sm">Conductor</span>
                        </button>
                      </div>
                    </div>

                    {role === 'driver' && (
                      <motion.div 
                        className="space-y-4 pt-2"
                      >
                        <div className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Vehículo</div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Placa"
                            placeholder="AAA-123"
                            value={vehicle.plate}
                            onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value.toUpperCase() })}
                            icon={<Hash size={18} />}
                          />
                          <Input
                            label="Marca"
                            placeholder="Ej: Chevrolet"
                            value={vehicle.brand}
                            onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })}
                            icon={<Tag size={18} />}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Modelo"
                            placeholder="Ej: Onix"
                            value={vehicle.model}
                            onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                            icon={<Car size={18} />}
                          />
                          <Input
                            label="Color"
                            placeholder="Ej: Blanco"
                            value={vehicle.color}
                            onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                            icon={<Palette size={18} />}
                          />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl font-medium">{error}</p>}

            <Button type="submit" className="w-full text-lg py-4" disabled={isLoading}>
              {isLoading ? (
                <>
                  Procesando...
                  <Loader2 className="animate-spin" size={20} />
                </>
              ) : (
                <>
                  {isLogin ? 'Entrar ahora' : 'Crear cuenta'}
                  <LogIn size={20} />
                </>
              )}
            </Button>

            <div className="flex items-center gap-2 justify-center text-slate-400 text-xs sm:text-[13px] uppercase font-extrabold tracking-tight">
              <ShieldCheck size={14} className="text-accent" />
              Acceso exclusivo @syc.com.co
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default AuthView;
