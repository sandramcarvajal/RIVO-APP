import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, XCircle, User, ArrowRight, MessageSquare, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { cn, formatPrice } from '../lib/utils';
import { JoinRequest } from '../types';
import { UserRole, JoinRequestStatus, RouteStatus } from '../shared/enums';

const RequestsView = () => {
  const { user, requests, updateRequestStatus, routes } = useAppStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'recibidas' | 'enviadas' | 'historial'>(
    user?.role === UserRole.DRIVER ? 'recibidas' : 'enviadas'
  );

  // Filter requests based on user role and tab
  const filteredRequests = requests.filter(req => {
    const route = routes.find(r => String(r.id) === String(req.routeId));
    const isPast = route ? new Date(route.departureTime) < new Date() : false;
    const isFinished = route?.status === RouteStatus.COMPLETED || route?.status === RouteStatus.CANCELLED || isPast;
    const isResolved = req.status === JoinRequestStatus.REJECTED || req.status === JoinRequestStatus.CANCELLED;

    if (activeTab === 'historial') {
      return (String(req.passengerId) === String(user?.id) || String(route?.driverId) === String(user?.id)) && (isFinished || isResolved);
    }
    
    // For active tabs, exclude finished or resolved requests
    if (isFinished || isResolved) return false;

    if (activeTab === 'enviadas') return String(req.passengerId) === String(user?.id);
    return String(route?.driverId) === String(user?.id);
  }).sort((a, b) => {
    const ra = routes.find(r => String(r.id) === String(a.routeId));
    const rb = routes.find(r => String(r.id) === String(b.routeId));
    if (!ra || !rb) return 0;
    // History shows newest first (DESC), active shows soonest first (ASC)
    if (activeTab === 'historial') {
      return new Date(rb.departureTime).getTime() - new Date(ra.departureTime).getTime();
    }
    return new Date(ra.departureTime).getTime() - new Date(rb.departureTime).getTime();
  });

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Actividad</h1>
          <p className="text-slate-500 font-medium">Gestiona tus viajes y solicitudes</p>
        </div>
      </header>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('recibidas')}
          className={cn(
            "flex-1 py-3 px-2 rounded-xl font-bold text-[14px] uppercase tracking-wider transition-all",
            activeTab === 'recibidas' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Recibidas
        </button>
        <button
          onClick={() => setActiveTab('enviadas')}
          className={cn(
            "flex-1 py-3 px-2 rounded-xl font-bold text-[14px] uppercase tracking-wider transition-all",
            activeTab === 'enviadas' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Enviadas
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={cn(
            "flex-1 py-3 px-2 rounded-xl font-bold text-[14px] uppercase tracking-wider transition-all",
            activeTab === 'historial' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Historial
        </button>
      </div>

      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const route = routes.find(r => r.id === req.routeId);
            return (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(`/route/${req.routeId}`)}
                className="card-rivo flex flex-col md:flex-row gap-6 p-6 cursor-pointer hover:border-slate-200 transition-all active:scale-[0.98]"
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-primary overflow-hidden">
                        <img 
                          src={activeTab === 'recibidas' ? req.passengerAvatar : (route?.driverAvatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y')} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                          {activeTab === 'recibidas' ? 'Pasajero' : 'Conductor'}
                        </p>
                        <h4 className="font-bold text-slate-800">
                          {activeTab === 'recibidas' ? req.passengerName : route?.driverName}
                        </h4>
                      </div>
                    </div>
                    <Badge status={req.status} />
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl">
                    <div className="flex-1">
                      <p className="font-bold text-slate-700">{route?.origin}</p>
                      <p className="text-sm text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">ORIGEN</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 animate-pulse" />
                    <div className="flex-1 text-right">
                      <p className="font-bold text-slate-700">{route?.destination}</p>
                      <p className="text-sm text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">DESTINO</p>
                    </div>
                  </div>
                </div>

                 {activeTab === 'recibidas' && req.status === JoinRequestStatus.PENDING && (
                  <div className="flex md:flex-col gap-3 justify-center">
                    <Button 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); updateRequestStatus(req.id, JoinRequestStatus.ACCEPTED); }}
                      className="bg-accent hover:bg-emerald-600 shadow-accent/20"
                    >
                      <CheckCircle2 size={18} />
                      Aprobar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); updateRequestStatus(req.id, JoinRequestStatus.REJECTED); }}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <XCircle size={18} />
                      Rechazar
                    </Button>
                  </div>
                )}
                
                {req.status === JoinRequestStatus.ACCEPTED && (
                  <div className="flex items-center justify-center">
                     <Button 
                       variant="secondary" 
                       size="sm" 
                       className="w-full md:w-auto"
                       onClick={(e) => e.stopPropagation()}
                     >
                        <MessageSquare size={18} />
                        Chat
                     </Button>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <EmptyState 
            icon={Inbox} 
            title="Nada por aquí" 
            description={
              activeTab === 'recibidas' ? "Aún no has recibido solicitudes de otros compañeros." :
              activeTab === 'enviadas' ? "No has enviado solicitudes. ¡Explora las rutas disponibles!" :
              "Tu historial de viajes está vacío por ahora."
            }
            action={activeTab === 'enviadas' ? () => navigate('/explore') : undefined}
            actionLabel={activeTab === 'enviadas' ? "Explorar" : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default RequestsView;

const Badge = ({ status }: { status: JoinRequest['status'] }) => {
  const styles: Record<string, string> = {
    [JoinRequestStatus.PENDING]: "bg-amber-50 text-amber-600 border-amber-100",
    [JoinRequestStatus.ACCEPTED]: "bg-emerald-50 text-emerald-600 border-emerald-100",
    [JoinRequestStatus.REJECTED]: "bg-red-50 text-red-600 border-red-100",
    [JoinRequestStatus.CANCELLED]: "bg-slate-50 text-slate-500 border-slate-100",
    [JoinRequestStatus.CANCELLED_BY_DRIVER]: "bg-rose-50 text-rose-600 border-rose-150",
  };
  
  const labels: Record<string, string> = {
    [JoinRequestStatus.PENDING]: "Pendiente",
    [JoinRequestStatus.ACCEPTED]: "Aprobada",
    [JoinRequestStatus.REJECTED]: "Rechazada",
    [JoinRequestStatus.CANCELLED]: "Cancelada",
    [JoinRequestStatus.CANCELLED_BY_DRIVER]: "Conductor Canceló",
  };

  const currentStyle = styles[status] || "bg-slate-50 text-slate-400 border-slate-100";
  const currentLabel = labels[status] || status;

  return (
    <span className={cn(
      "px-3 py-1.5 rounded-full text-xs sm:text-[13px] font-black uppercase tracking-widest border",
      currentStyle
    )}>
      {currentLabel}
    </span>
  );
};
