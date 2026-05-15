import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User as UserIcon, 
  ArrowRight, 
  MessageSquare,
  Users
} from 'lucide-react';
import Input from '../components/ui/Input';
import RouteCard from '../components/RouteCard';
import { useAppStore } from '../hooks/useAppStore';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { cn, formatPrice } from '../lib/utils';
import { User, Route, JoinRequest } from '../types';
import { UserRole, JoinRequestStatus, RouteStatus } from '../shared/enums';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';

// --- Driver Exploration (Passenger Management) ---
interface DriverExploreProps {
  user: User;
  requests: JoinRequest[];
  routes: Route[];
  updateRequestStatus: (id: string, status: JoinRequestStatus.ACCEPTED | JoinRequestStatus.REJECTED) => void;
}

const DriverExplore = ({ user, requests, routes, updateRequestStatus }: DriverExploreProps) => {
  // Only requests for this driver's routes
  const myRequests = requests.filter((req: JoinRequest) => {
    const route = routes.find((r: Route) => r.id === req.routeId);
    return route?.driverId === user?.id;
  });

  const pendingRequests = myRequests.filter((r: JoinRequest) => String(r.status).toLowerCase() === String(JoinRequestStatus.PENDING).toLowerCase());
  const otherRequests = myRequests.filter((r: JoinRequest) => String(r.status).toLowerCase() !== String(JoinRequestStatus.PENDING).toLowerCase());

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-xl font-bold text-slate-800">Gestión de Pasajeros</h2>
        <p className="text-sm text-slate-400 font-medium">Solicitudes para tu ruta </p>
      </header>

      {myRequests.length > 0 ? (
        <div className="space-y-8">
          {pendingRequests.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase text-amber-500 tracking-[0.2em] px-1 flex items-center gap-2">
                <Clock size={14} /> Solicitudes Pendientes
              </h3>
              <div className="space-y-4">
                {pendingRequests.map((req: any) => {
                  const route = routes.find((r: any) => r.id === req.routeId);
                  return (
                    <motion.div 
                      key={req.id} 
                      layout
                      className="card-rivo p-6 border-amber-100 bg-amber-50/20"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm overflow-hidden border border-slate-100">
                             <img src={req.passengerAvatar} alt={req.passengerName} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pasajero</p>
                            <h4 className="font-bold text-slate-800">{req.passengerName}</h4>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase">En tu ruta:</p>
                           <p className="text-xs font-bold text-slate-700">{(route?.origin || '').split(',')[0]} → {(route?.destination || '').split(',')[0]}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                         <Button 
                           className="flex-1 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                           onClick={() => updateRequestStatus(req.id, JoinRequestStatus.ACCEPTED)}
                         >
                           <CheckCircle2 size={18} /> Aceptar
                         </Button>
                         <Button 
                           variant="ghost" 
                           className="flex-1 text-red-500 hover:bg-red-50"
                           onClick={() => updateRequestStatus(req.id, JoinRequestStatus.REJECTED)}
                         >
                           <XCircle size={18} /> Rechazar
                         </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {otherRequests.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] px-1">Historial de Decisiones</h3>
              <div className="space-y-3">
                {otherRequests.map((req: any) => {
                   const route = routes.find((r: any) => r.id === req.routeId);
                   return (
                    <div key={req.id} className="p-4 bg-white border border-slate-50 rounded-2xl flex items-center justify-between opacity-80">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden border border-slate-100">
                              <img src={req.passengerAvatar} alt={req.passengerName} className="w-full h-full object-cover" />
                           </div>
                           <div>
                              <p className="font-bold text-slate-800 text-sm">{req.passengerName}</p>
                              <p className="text-[10px] text-slate-400 font-medium">#{String(route?.id).slice(0,5)}</p>
                           </div>
                        </div>
                         <div className={cn(
                           "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                           String(req.status).toLowerCase() === String(JoinRequestStatus.ACCEPTED).toLowerCase() ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-red-50 text-red-500 border-red-100"
                         )}>
                           {String(req.status).toLowerCase() === String(JoinRequestStatus.ACCEPTED).toLowerCase() ? 'Aprobado' : 'Rechazado'}
                         </div>
                      </div>
                    );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <EmptyState 
          icon={Users} 
          title="Sin solicitudes" 
          description="Nadie ha solicitado unirse a tus rutas todavía. ¡Comparte tu ruta en la empresa!"
        />
      )}
    </div>
  );
};

// --- Passenger Exploration (Route Browsing) ---
interface PassengerExploreProps {
  user: User;
  routes: Route[];
  requests: JoinRequest[];
  requestJoin: (routeId: string) => void;
}

const PassengerExplore = ({ user, routes, requests, requestJoin }: PassengerExploreProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'morning' | 'afternoon'>('all');
  const [selectedRoute, setSelectedRoute] = React.useState<Route | null>(null);
  const { showToast } = useToast();

  const filteredRoutes = routes.filter((route: Route) => {
    const isFuture = new Date(route.departureTime) > new Date();
    const isActive = [RouteStatus.SCHEDULED, RouteStatus.ACTIVE].includes(route.status.toLowerCase() as RouteStatus);
    const hasSeats = route.availableSeats > 0;
    const matchesSearch = (route.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          route.destination.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTimeFilter = (filterType === 'all' || 
                              (filterType === 'morning' && parseInt(route.time) < 12) ||
                              (filterType === 'afternoon' && parseInt(route.time) >= 12));

    return isFuture && isActive && hasSeats && matchesSearch && matchesTimeFilter;
  }).sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

  const handleJoinRequest = () => {
    if (!selectedRoute) return;
    
    // Check if already requested
    const alreadyRequested = requests.find(r => r.routeId === selectedRoute.id && r.passengerId === user.id);
    if (alreadyRequested) {
      showToast('Ya has enviado una solicitud para esta ruta.', 'neutral');
      setSelectedRoute(null);
      return;
    }

    requestJoin(selectedRoute.id);
    showToast('Solicitud enviada correctamente');
    setSelectedRoute(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-xl font-bold text-slate-800">Explorar Rutas</h2>
        <p className="text-sm text-slate-400 font-medium">Encuentra a tu próximo compañero de viaje</p>
      </header>

      <div className="flex flex-col gap-4 sticky top-5 z-20">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input 
              placeholder="¿A dónde vas?" 
              icon={<Search size={20} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="shadow-sm bg-white border-slate-100 h-14"
            />
          </div>
          <button className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-500 shadow-sm transition-all hover:bg-slate-50">
            <SlidersHorizontal size={20} />
          </button>
        </div>
        
        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'morning', label: 'Mañana (AM)' },
            { id: 'afternoon', label: 'Tarde (PM)' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                filterType === f.id 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-white text-slate-500 border-slate-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {filteredRoutes.length > 0 ? (
          filteredRoutes.map((route: Route) => {
            const request = requests.find(r => r.routeId === route.id && r.passengerId === user.id);
            return (
              <RouteCard 
                key={route.id} 
                route={route} 
                status={request?.status}
                onClick={() => setSelectedRoute(route)}
              />
            );
          })
        ) : (
          <div className="col-span-full">
            <EmptyState 
              icon={MapPin} 
              title="Sin rutas disponibles" 
              description="No encontramos rutas que coincidan con tu búsqueda. Prueba con otros criterios."
              className="bg-slate-50/50"
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!selectedRoute}
        onClose={() => setSelectedRoute(null)}
        title="¿Quieres unirte a esta ruta?"
        footer={
          <div className="flex gap-3 w-full">
            <Button 
              variant="secondary" 
              onClick={() => setSelectedRoute(null)} 
              className="flex-1 rounded-2xl py-6"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleJoinRequest} 
              className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-2xl py-6 shadow-lg shadow-primary/20"
            >
              Enviar solicitud
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-4">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 italic text-slate-500">
            <p className="text-xs">Enviarás una solicitud al conductor para unirte a este recorrido.</p>
          </div>
          
          {selectedRoute && (
            <div className="space-y-2 p-1">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>CONSTRUCTOR</span>
                <span>TRAYECTO</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">{selectedRoute.driverName}</span>
                <span className="text-primary font-black uppercase text-[10px] tracking-wider">{selectedRoute.origin.split(',')[0]} → {selectedRoute.destination.split(',')[0]}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

const ExploreView = () => {
  const { user, routes, requests, updateRequestStatus, requestJoin } = useAppStore();

  if (!user) return null;

  return (
    <div className="space-y-4">
      {user.role === UserRole.DRIVER ? (
        <DriverExplore 
          user={user} 
          requests={requests} 
          routes={routes} 
          updateRequestStatus={updateRequestStatus} 
        />
      ) : (
        <PassengerExplore 
          user={user}
          routes={routes} 
          requests={requests}
          requestJoin={requestJoin}
        />
      )}
    </div>
  );
};

export default ExploreView;
