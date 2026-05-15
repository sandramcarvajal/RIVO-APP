import React from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  User as UserIcon, 
  ArrowRight, 
  MapPin, 
  History, 
  Star,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Route as RouteIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import { UserRole, JoinRequestStatus, RouteStatus } from '../shared/enums';

/**
 * Rivo Home View - Premium Mobile Design
 * Aesthetic: European Fintech / iOS Modern
 * Primary Color: #1C2C5B (Dark Blue)
 */

const StatsGrid = ({ stats }: { stats: any[] }) => (
  <section className="grid grid-cols-3 gap-3 px-1">
    {stats.map((stat, i) => (
      <div key={i} className="bg-white border border-slate-50 p-4 rounded-[2rem] shadow-sm flex flex-col items-center text-center space-y-2">
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", stat.bg, stat.color)}>
          <stat.icon size={20} />
        </div>
        <div className="space-y-0.5">
          <p className="text-xl font-black text-slate-800">{stat.value}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
        </div>
      </div>
    ))}
  </section>
);

const HomeView = () => {
  const { user, routes, requests } = useAppStore();
  const navigate = useNavigate();
  const [picoPlaca, setPicoPlaca] = React.useState<{ canCirculate: boolean; message: string } | null>(null);

  React.useEffect(() => {
    if (user?.role === UserRole.DRIVER && user.vehicle?.plate) {
      const checkPicoPlaca = async () => {
        try {
          const response = await fetch('/api/pico-placa/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              plate: user.vehicle.plate, 
              date: new Date().toISOString(), 
              city: 'Bucaramanga' 
            })
          });
          const data = await response.json();
          setPicoPlaca(data);
        } catch (err) {
          console.error('Error fetching Pico y Placa:', err);
        }
      };
      checkPicoPlaca();
    }
  }, [user]);

  if (!user) return null;

  const isDriver = user.role === UserRole.DRIVER;
  
  // Stats calculation
  const myApprovedRequests = requests.filter((req: any) => req.passengerId === user.id && req.status.toLowerCase() === JoinRequestStatus.ACCEPTED);
  const myTotalRequests = requests.filter((req: any) => req.passengerId === user.id);
  const myRoutesAsDriver = routes.filter((r: any) => r.driverId === user.id);
  
  // Real stats based on database data
  const stats = isDriver ? [
    { label: 'Viajes', value: myRoutesAsDriver.length.toString(), icon: History, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pasajeros', value: requests.filter((r: any) => {
        const route = routes.find((rt: any) => rt.id === r.routeId);
        return route?.driverId === user.id && r.status.toLowerCase() === JoinRequestStatus.ACCEPTED;
      }).length.toString(), icon: RouteIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Rating', value: user.rating || '—', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
  ] : [
    { label: 'Viajes', value: myApprovedRequests.length.toString(), icon: History, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Rutas', value: [...new Set(myTotalRequests.map(r => r.routeId))].length.toString(), icon: RouteIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Rating', value: user.rating || '—', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  // Specific data
  const myActiveRoutesByRole = isDriver 
    ? routes.filter((r: any) => 
        String(r.driverId) === String(user.id) && 
        [RouteStatus.SCHEDULED, RouteStatus.ACTIVE, RouteStatus.IN_PROGRESS].includes(r.status.toLowerCase() as RouteStatus)
      )
    : (() => {
        const pending = requests.filter((req: any) => 
          String(req.passengerId) === String(user.id) && 
          req.status.toLowerCase() === JoinRequestStatus.PENDING
        );
        const acceptedForFuture = requests.filter((req: any) => {
          const route = routes.find((r: any) => r.id === req.routeId);
          return String(req.passengerId) === String(user.id) && 
                 req.status.toLowerCase() === JoinRequestStatus.ACCEPTED &&
                 route && (new Date(route.departureTime) > new Date() || route.status === RouteStatus.IN_PROGRESS);
        });
        // Sort acceptedForFuture by date
        return [...acceptedForFuture, ...pending].sort((a, b) => {
          const ra = routes.find(r => r.id === a.routeId);
          const rb = routes.find(r => r.id === b.routeId);
          if (!ra || !rb) return 0;
          return new Date(ra.departureTime).getTime() - new Date(rb.departureTime).getTime();
        });
      })();
   
   const pendingRequestsCount = isDriver ? requests.filter((req: any) => {
     const route = routes.find((r: any) => r.id === req.routeId);
     return String(route?.driverId) === String(user.id) && req.status.toLowerCase() === JoinRequestStatus.PENDING;
   }).length : requests.filter((req: any) => 
     String(req.passengerId) === String(user.id) && req.status.toLowerCase() === JoinRequestStatus.PENDING
   ).length;

  return (
    <div className="flex flex-col space-y-8 pb-12 bg-[#F8F9FB] -mt-2 animate-in fade-in duration-700">
      <header className="px-2 pt-2">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
          <h2 className="text-[28px] font-black text-[#1C2C5B] tracking-tight leading-tight">
            Hola, {user.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-400 font-medium text-lg">
            {isDriver ? 'Tu panel de control de hoy' : '¿A dónde vamos hoy?'}
          </p>
        </motion.div>
      </header>

      {/* Main Action Card */}
      <section className="px-1">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden group">
          <div className="bg-gradient-to-br from-[#1C2C5B] via-[#1F3A8A] to-[#2E4DA7] p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/20 text-white relative z-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-1000" />
            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold leading-tight max-w-[200px]">
                  {isDriver ? 'Comparte tu ruta hoy' : 'Muévete fácil por tu día'}
                </h3>
                <p className="text-blue-100/70 font-medium text-sm">
                  {isDriver ? 'Ayuda a tus compañeros a llegar al trabajo' : 'Rutas listas cuando las necesites'}
                </p>
              </div>
              <Button 
                onClick={() => navigate(isDriver ? '/create' : '/explore')} 
                className="bg-white text-[#1C2C5B] hover:bg-white/90 border-none px-6 py-6 h-auto rounded-2xl font-bold flex items-center gap-2 group/btn"
              >
                {isDriver ? 'Publicar ruta' : 'Explorar rutas'} <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Alerts & Operational Section */}
      <div className="px-1 space-y-4">
        {isDriver && picoPlaca && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className={cn(
              "p-6 rounded-[2.5rem] flex items-center justify-between border shadow-sm",
              picoPlaca.canCirculate 
                ? "bg-emerald-50 border-emerald-100 text-emerald-900" 
                : "bg-rose-50 border-rose-100 text-rose-900"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                  picoPlaca.canCirculate ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20"
                )}>
                  {picoPlaca.canCirculate ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div className="text-left">
                  <p className="font-black leading-tight">
                    {picoPlaca.canCirculate ? '¡Puedes circular hoy!' : 'Restricción activa'}
                  </p>
                  <p className="text-xs font-medium opacity-70">
                    Vehículo: {user.vehicle?.brand} • {user.vehicle?.plate}
                  </p>
                </div>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black uppercase opacity-50">Pico y Placa</p>
                 <p className="font-bold">{picoPlaca.canCirculate ? 'Libre' : 'Hoy'}</p>
              </div>
            </div>
          </section>
        )}

        {isDriver && pendingRequestsCount > 0 && (
          <section>
            <button onClick={() => navigate('/explore')} className="w-full bg-amber-50 border border-amber-100 p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm transition-all active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                  <Bell size={24} />
                </div>
                <div className="text-left font-bold">
                  <p className="text-amber-900">Tienes {pendingRequestsCount} solicitudes</p>
                  <p className="text-xs text-amber-700">Compañeros esperan tu respuesta</p>
                </div>
              </div>
              <ChevronRight className="text-amber-500" />
            </button>
          </section>
        )}

        {!isDriver && pendingRequestsCount > 0 && (
          <section>
            <button onClick={() => navigate('/requests')} className="w-full bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm transition-all active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Clock size={24} />
                </div>
                <div className="text-left font-bold">
                  <p className="text-blue-900">{pendingRequestsCount} solicitudes pendientes</p>
                  <p className="text-xs text-blue-700">Los conductores están revisando tu perfil</p>
                </div>
              </div>
              <ChevronRight className="text-blue-500" />
            </button>
          </section>
        )}
      </div>

      {/* Active Section (Routes for Driver, My Travels/Requests for Passenger) */}
      <section className="space-y-4 px-1 pb-10">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold text-[#1C2C5B]">
            {isDriver ? 'Tus rutas activas' : 'Tu actividad actual'}
          </h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/requests')} className="text-slate-400 font-bold">Ver todo</Button>
        </div>
        
        {isDriver ? (
          myActiveRoutesByRole.length > 0 ? (
            <div className="space-y-4">
              {myActiveRoutesByRole.slice(0, 3).map((route: any) => (
                <div 
                  key={route.id} 
                  onClick={() => navigate(`/route/${route.id}`)}
                  className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-center justify-between transition-all hover:border-slate-100 cursor-pointer active:scale-[0.98]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-400 uppercase">{route.time || 'Horario'}</p>
                      {route.status.toLowerCase() === RouteStatus.IN_PROGRESS && (
                        <span className="bg-amber-100 text-amber-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">En curso</span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 truncate max-w-[140px]">{route.destination}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Cupos</p>
                      <p className="font-black text-[#1C2C5B]">{route.availableSeats}/{route.totalSeats}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={RouteIcon} 
              title="No tienes rutas para hoy" 
              description="Parece que hoy no tienes viajes programados. ¿Por qué no crear uno?"
              action={() => navigate('/create-route')}
              actionLabel="Publicar Ruta"
            />
          )
        ) : (
          myActiveRoutesByRole.length > 0 ? (
            <div className="space-y-4">
              {myActiveRoutesByRole.slice(0, 3).map((req: any) => {
                const route = routes.find(r => r.id === req.routeId);
                return (
                  <div 
                    key={req.id} 
                    onClick={() => navigate(`/route/${req.routeId}`)}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-center justify-between transition-all hover:border-slate-100 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block",
                          req.status.toLowerCase() === JoinRequestStatus.PENDING ? "bg-amber-50 text-amber-600" :
                          req.status.toLowerCase() === JoinRequestStatus.ACCEPTED ? "bg-emerald-50 text-emerald-600" :
                          req.status.toLowerCase() === JoinRequestStatus.REJECTED ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-400"
                        )}>
                          {req.status.toLowerCase() === JoinRequestStatus.PENDING ? 'Pendiente' : 
                           req.status.toLowerCase() === JoinRequestStatus.ACCEPTED ? 'Aprobado' : 
                           req.status.toLowerCase() === JoinRequestStatus.REJECTED ? 'Rechazado' : req.status}
                        </div>
                        {route?.status === RouteStatus.IN_PROGRESS && (
                           <span className="bg-amber-100 text-amber-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">¡En curso!</span>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 truncate max-w-[140px]">{route?.destination || 'Destino'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{route?.time || 'Pronto'}</p>
                        <p className="font-black text-[#1C2C5B]">#{req.routeId.toString().slice(0,4)}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState 
              icon={History} 
              title="Aún no tienes viajes" 
              description="Busca una ruta que se adapte a tu horario y solicita unirte."
              action={() => navigate('/explore')}
              actionLabel="Buscar Ruta"
            />
          )
        )}
      </section>
    </div>
  );
};

export default HomeView;
