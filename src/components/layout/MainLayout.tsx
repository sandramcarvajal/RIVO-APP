import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, PlusCircle, LayoutDashboard, User, Bell, Compass, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../hooks/useAppStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';

const MainLayout = () => {
  const { user, notifications, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const unreadCount = notifications.filter(n => n.userId === user?.id && !n.isRead).length;

  const navItems = [
    { icon: Home, label: 'Inicio', path: '/' },
    { icon: Compass, label: 'Explorar', path: '/explore' },
    { icon: PlusCircle, label: 'Publicar', path: '/create', roles: ['driver', 'admin'] },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  const filteredNav = navItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      {/* Mobile-style Container for all screens */}
      <div className="w-full max-w-[480px] min-h-screen bg-background flex flex-col relative shadow-2xl shadow-slate-200">
        
        {/* Mobile Top Bar */}
        <header className="flex items-center justify-between p-5 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-50">
          <img 
            src="/logo_rivo.svg" 
            alt="Rivo Logo" 
            className="h-8 w-auto"
            referrerPolicy="no-referrer"
          />
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/notifications')}
              className="relative w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
              )}
            </button>
            {user && (
              <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-100 shadow-sm transition-transform active:scale-90 ring-2 ring-transparent hover:ring-primary/20">
                <img src={user.avatar} alt={user.name} />
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-5 pb-24 overflow-y-auto">
          <Outlet />
        </main>

        {/* Fixed Bottom Nav (Always Visible) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-20 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-2 pb-2 z-40">
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
                "text-[10px] font-bold tracking-wide uppercase",
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
