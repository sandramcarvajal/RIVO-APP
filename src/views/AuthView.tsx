import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ShieldCheck, Car, UserCircle, LogIn, User, Hash, Palette, Tag, Loader2, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAppStore } from '../hooks/useAppStore';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { useAuth } from '../client/modules/auth/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

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
  
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<'passenger' | 'driver'>('passenger');
  const [vehicle, setVehicle] = React.useState({ plate: '', brand: '', color: '', model: '' });
  const [error, setError] = React.useState('');

  const from = location.state?.from?.pathname || "/";

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

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
        </div>

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

            <Input
              label="Contraseña"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={20} />}
              required
            />

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
      </motion.div>
    </div>
  );
};

export default AuthView;
