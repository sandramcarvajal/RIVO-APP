import React from 'react';
import { useSearchParams } from 'react-router-dom';
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
    const route = routes.find((r: Route) => String(r.id) === String(req.routeId));
    return String(route?.driverId) === String(user?.id);
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
                           <p className="text-[12px] font-black text-slate-400 uppercase tracking-wider">En tu ruta:</p>
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
                              <p className="text-[12px] text-slate-400 font-semibold">#{String(route?.id).slice(0,5)}</p>
                           </div>
                        </div>
                         <div className={cn(
                           "px-3 py-1.5 rounded-full text-[11.5px] font-black uppercase tracking-widest border",
                           String(req.status).toLowerCase() === String(JoinRequestStatus.ACCEPTED).toLowerCase() ? "bg-emerald-50 text-emerald-500 border-emerald-100" : 
                           String(req.status).toLowerCase() === String(JoinRequestStatus.CANCELLED_BY_DRIVER).toLowerCase() ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-red-50 text-red-500 border-red-100"
                         )}>
                           {String(req.status).toLowerCase() === String(JoinRequestStatus.ACCEPTED).toLowerCase() ? 'Aprobado' : 
                            String(req.status).toLowerCase() === String(JoinRequestStatus.CANCELLED_BY_DRIVER).toLowerCase() ? 'Cancelado' : 'Rechazado'}
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
  requestJoin: (routeId: string) => Promise<void>;
}

const PassengerExplore = ({ user, routes, requests, requestJoin }: PassengerExploreProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Unified reactive state initialized directly from the browser's URL query string
  const [originInput, setOriginInput] = React.useState(searchParams.get('origin') || '');
  const [destinationInput, setDestinationInput] = React.useState(searchParams.get('destination') || '');
  const [vehicleType, setVehicleType] = React.useState<'all' | 'car' | 'moto'>(
    (searchParams.get('type') as 'all' | 'car' | 'moto') || 'all'
  );
  const [timeFilter, setTimeFilter] = React.useState<'all' | 'morning' | 'afternoon'>('all');
  const [selectedRoute, setSelectedRoute] = React.useState<Route | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);
  
  const { showToast } = useToast();

  // Harmonize state variables with search queries in the URL (non-blocking, smooth hydration)
  React.useEffect(() => {
    const params: Record<string, string> = {};
    if (originInput) params.origin = originInput;
    if (destinationInput) params.destination = destinationInput;
    if (vehicleType !== 'all') params.type = vehicleType;
    setSearchParams(params, { replace: true });
  }, [originInput, destinationInput, vehicleType, setSearchParams]);

  const handleClearFilters = () => {
    setOriginInput('');
    setDestinationInput('');
    setVehicleType('all');
    setTimeFilter('all');
  };

  const hasActiveFilters = originInput || destinationInput || vehicleType !== 'all' || timeFilter !== 'all';

  const filteredRoutes = routes.filter((route: Route) => {
    const isScheduled = route.status.toLowerCase() === RouteStatus.SCHEDULED;
    const hasSeats = route.availableSeats > 0;
    
    // Check match on origin
    const matchesOrigin = !originInput || 
      route.origin.toLowerCase().includes(originInput.toLowerCase());

    // Check match on destination
    const matchesDestination = !destinationInput || 
      route.destination.toLowerCase().includes(destinationInput.toLowerCase());

    // Check match on vehicle type
    const matchesVehicle = vehicleType === 'all' || 
      route.type?.toLowerCase() === vehicleType.toLowerCase();

    // Check match on morning or afternoon
    let matchesTime = true;
    if (timeFilter !== 'all') {
      const departureHour = parseInt(route.time?.split(':')[0] || '12', 10);
      if (timeFilter === 'morning' && departureHour >= 12) matchesTime = false;
      if (timeFilter === 'afternoon' && departureHour < 12) matchesTime = false;
    }

    return isScheduled && hasSeats && matchesOrigin && matchesDestination && matchesVehicle && matchesTime;
  }).sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

  const handleJoinRequest = async () => {
    if (!selectedRoute) return;
    
    // Check if already requested
    const alreadyRequested = requests.find(r => String(r.routeId) === String(selectedRoute.id) && String(r.passengerId) === String(user.id));
    if (alreadyRequested) {
      showToast('Ya has enviado una solicitud para esta ruta.', 'neutral');
      setSelectedRoute(null);
      return;
    }

    setIsJoining(true);
    try {
      await requestJoin(selectedRoute.id);
      showToast('Solicitud enviada correctamente');
      setSelectedRoute(null);
    } catch (error: any) {
      showToast(error.message || 'Error al enviar la solicitud', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[480px] mx-auto w-full px-1">
      <header className="space-y-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight text-left">Explorar Rutas</h2>
        <p className="text-sm text-slate-500 font-semibold text-left leading-snug">
          Encuentra tu próximo compañero de viaje corporativo
        </p>
      </header>

      {/* Redesigned Premium Search Card Area */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-5 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">
            Filtros del viaje
          </h3>
          {hasActiveFilters && (
            <button 
              onClick={handleClearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-extrabold transition-colors hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Origen Input */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Punto de partida</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-sm select-none pointer-events-none">📍</span>
              <input 
                type="text" 
                placeholder="Dirección o edificio..." 
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl py-3.5 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
              />
            </div>
          </div>

          {/* Destino Input */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Destino</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-sm select-none pointer-events-none">🏁</span>
              <input 
                type="text" 
                placeholder="¿A dónde vas?" 
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl py-3.5 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
              />
            </div>
          </div>
        </div>

        {/* Tipo de Movilidad Chips */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Tipo de transporte</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all', label: 'Todos', icon: '🌐' },
              { id: 'car', label: 'Carro', icon: '🚗' },
              { id: 'moto', label: 'Moto', icon: '🏍️' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicleType(v.id as any)}
                className={cn(
                  "py-2.5 px-1 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1.5 active:scale-95",
                  vehicleType === v.id
                    ? "border-secondary bg-secondary/10 text-secondary-hover font-extrabold shadow-sm shadow-secondary/5"
                    : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Filter Buttons */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Horario de partida</label>
          <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
            {[
              { id: 'all', label: 'Todo el día' },
              { id: 'morning', label: 'Mañana (AM)' },
              { id: 'afternoon', label: 'Tarde (PM)' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTimeFilter(f.id as any)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[11px] font-extrabold tracking-tight transition-all active:scale-95 text-center",
                  timeFilter === f.id
                    ? "bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Title/Summary */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">
          Rutas encontradas ({filteredRoutes.length})
        </h3>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 gap-4 pb-24">
        <AnimatePresence mode="popLayout">
          {filteredRoutes.length > 0 ? (
            filteredRoutes.map((route: Route) => {
              const request = requests.find(r => String(r.routeId) === String(route.id) && String(r.passengerId) === String(user.id));
              return (
                <motion.div
                  key={route.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  <RouteCard 
                    route={route} 
                    status={request?.status}
                    onClick={() => setSelectedRoute(route)}
                  />
                </motion.div>
              );
            })
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-full"
            >
              <EmptyState 
                icon={MapPin} 
                title="Sin rutas disponibles" 
                description="No encontramos rutas corporativas vigentes que coincidan con tus criterios de búsqueda."
                className="bg-white border border-slate-50 rounded-[28px] py-12 p-6 shadow-xs"
              />
            </motion.div>
          )}
        </AnimatePresence>
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
              isLoading={isJoining}
              disabled={isJoining}
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
                <span className="text-primary font-black uppercase text-[12px] tracking-wider">{selectedRoute.origin.split(',')[0]} → {selectedRoute.destination.split(',')[0]}</span>
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
