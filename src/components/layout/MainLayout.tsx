import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, PlusCircle, LayoutDashboard, User, Bell, Compass, LogOut, ClipboardList, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../hooks/useAppStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';

const MainLayout = () => {
  const { user, notifications, logout, updateUserProfile } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecciona un archivo de imagen válido.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no debe superar los 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        await updateUserProfile({ avatar: base64Data });
        showToast('¡Foto de perfil actualizada exitosamente!', 'success');
      } catch (err) {
        showToast('Error al subir la imagen.', 'error');
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const unreadCount = notifications.filter(n => String(n.userId) === String(user?.id) && !n.isRead).length;
  console.log(`[UNREAD_COUNT] Calculated unreadCount: ${unreadCount} total unread out of ${notifications.length} notifications`);

  let filteredNav;
  if (user?.role === 'admin') {
    filteredNav = [
      { icon: Home, label: 'Inicio', path: '/' },
      { icon: ClipboardList, label: 'Operación', path: '/admin/operation' },
      { icon: BarChart3, label: 'Analítica', path: '/admin/analytics' },
      { icon: User, label: 'Perfil', path: '/profile' },
    ];
  } else {
    const navItems = [
      { icon: Home, label: 'Inicio', path: '/' },
      { icon: Compass, label: 'Explorar', path: '/explore' },
      { icon: PlusCircle, label: 'Publicar', path: '/create', roles: ['driver'] },
      { icon: User, label: 'Perfil', path: '/profile' },
    ];
    filteredNav = navItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      {/* Responsive layout container for all screens */}
      <div className="w-full max-w-full md:max-w-3xl lg:max-w-5xl xl:max-w-6xl min-h-screen bg-background flex flex-col relative sm:shadow-2xl sm:shadow-slate-200/50 sm:border-x sm:border-slate-200/40">
        
        {isCookieBlocked && (
          <div className="bg-rose-600 text-white p-3 text-xs font-semibold text-center flex flex-col gap-1 items-center justify-center border-b border-rose-700 animate-pulse z-50">
            <p>⚠️ Tu navegador bloqueó la cookie de seguridad de AI Studio.</p>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline font-black hover:text-rose-100 flex items-center gap-1"
            >
              Hacer clic aquí para abrir en una pestaña nueva y solucionarlo ↗
            </a>
          </div>
        )}

        {/* Mobile Top Bar */}
        <header className="flex items-center justify-between p-4.5 bg-white/95 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100/60">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img 
              src="/logo_rivo.svg" 
              alt="Rivo Logo" 
              className="h-11 w-auto filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.03)] transition-transform hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center gap-3">
            <motion.button 
              onClick={() => navigate('/notifications')}
              whileHover="hover"
              whileTap={{ scale: 0.93 }}
              className="relative w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100/80 hover:text-indigo-600 transition-colors cursor-pointer select-none"
            >
              <motion.div
                variants={{
                  hover: {
                    rotate: [0, -18, 15, -12, 10, -5, 0],
                    transition: {
                      duration: 0.55,
                      ease: "easeInOut"
                    }
                  }
                }}
              >
                <Bell size={20} className="transition-colors duration-200" />
              </motion.div>
              {unreadCount > 0 && (
                <motion.span 
                  variants={{
                    hover: { 
                      scale: [1, 1.3, 1],
                      transition: { duration: 0.3, repeat: Infinity, repeatType: "reverse" as const }
                    }
                  }}
                  className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                />
              )}
            </motion.button>
            {user && (
              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  title="Haz clic para subir tu foto de perfil"
                  className="group relative w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all hover:scale-105 active:scale-95 hover:border-primary cursor-pointer overflow-hidden"
                >
                  {user.avatar && !user.avatar.includes('placeholder') && !user.avatar.includes('avatar') && !user.avatar.includes('default') ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center rounded-full relative">
                      <svg viewBox="0 0 24 24" fill="none" className="w-5.5 h-5.5 text-slate-400 group-hover:text-primary transition-colors" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {/* Minimal camera badge overlapping on the bottom right corner like Uber or WhatsApp */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border border-white text-white flex items-center justify-center shadow-xs transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5 text-white" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {/* Hover visual overlay to show it's an upload area */}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white animate-pulse" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-5 pb-24 overflow-y-auto">
          <Outlet />
        </main>

        {/* Fixed Bottom Nav (Responsive Alignment) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-full md:max-w-3xl lg:max-w-5xl xl:max-w-6xl h-20 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-2 pb-2 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
          {filteredNav.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 transition-all active:scale-90 flex-1"
            >
              <div className={cn(
                "w-12 h-8 rounded-full flex items-center justify-center transition-all relative",
                location.pathname === item.path ? "bg-primary/10 text-primary" : "text-slate-400"
              )}>
                <item.icon size={22} strokeWidth={location.pathname === item.path ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[12px] font-black tracking-wide uppercase",
                location.pathname === item.path ? "text-primary" : "text-slate-400"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default MainLayout;
