import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, XCircle, Clock, MapPin, Info, ChevronRight, Inbox, Navigation, Flag, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import { cn } from '../lib/utils';
import { NotificationType } from '../shared/enums';

const NotificationsView = () => {
  const navigate = useNavigate();
  const { user, notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAppStore();

  const userNotifications = notifications;
  console.log(`[NOTIFICATION_RENDER] Rendering ${userNotifications.length} notifications:`, userNotifications.map(n => ({ id: n.id, title: n.title, isRead: n.isRead })));

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.REQUEST_ACCEPTED: return <CheckCircle2 className="text-emerald-500" size={20} />;
      case NotificationType.REQUEST_REJECTED: return <XCircle className="text-rose-500" size={20} />;
      case NotificationType.NEW_REQUEST: return <Bell className="text-amber-500" size={20} />;
      case NotificationType.TRIP_STARTING: return <Clock className="text-blue-500" size={20} />;
      case NotificationType.TRIP_STARTED: return <Navigation className="text-primary" size={20} />;
      case NotificationType.TRIP_COMPLETED: return <Flag className="text-emerald-500" size={20} />;
      case NotificationType.ROUTE_CANCELLED: return <AlertTriangle className="text-red-500" size={20} />;
      default: return <Info className="text-slate-400" size={20} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Ahora mismo';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notificaciones</h1>
          <p className="text-sm text-slate-500 font-medium">Mantente al tanto de tus viajes</p>
        </div>
        {userNotifications.some(n => !n.isRead) && (
          <button 
            onClick={() => markAllNotificationsAsRead?.()} 
            className="text-sm font-bold text-primary hover:underline"
          >
            Marcar todas como leídas
          </button>
        )}
      </header>

      <div className="space-y-3">
        {userNotifications.length > 0 ? (
          userNotifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                markNotificationAsRead(notif.id);
                if (notif.data?.routeId) {
                  navigate(`/route/${notif.data.routeId}`);
                } else if (notif.type === NotificationType.NEW_REQUEST) {
                  navigate('/requests');
                }
              }}
              className={cn(
                "card-rivo p-4 flex items-start gap-4 transition-all cursor-pointer group",
                !notif.isRead ? "bg-white border-primary/20 shadow-md shadow-primary/5 ring-1 ring-primary/5" : "bg-white border-slate-50 opacity-80"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors",
                !notif.isRead ? "bg-primary/5" : "bg-slate-50"
              )}>
                {getIcon(notif.type)}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className={cn("text-sm font-bold", !notif.isRead ? "text-slate-900" : "text-slate-600")}>
                    {notif.title}
                  </h4>
                  <span className="text-xs sm:text-[13px] font-bold text-slate-400 uppercase tracking-widest">
                    {formatDate(notif.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed pr-6">
                  {notif.description}
                </p>
              </div>

              {!notif.isRead && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-300">
                <Inbox size={40} />
             </div>
             <div>
               <p className="text-slate-800 font-bold">Sin notificaciones</p>
               <p className="text-sm text-slate-400">Te avisaremos cuando pase algo importante.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsView;
