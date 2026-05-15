import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Users, 
  Car, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck,
  Navigation,
  Flag,
  AlertTriangle,
  Star
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuthContext } from '../client/modules/auth/context/AuthContext';
import Button from '../components/ui/Button';
import { cn, formatPrice, formatTime } from '../lib/utils';
import { RouteStatus, JoinRequestStatus } from '../shared/enums';
import { useToast } from '../components/ui/Toast';
import RatingModal from '../components/ui/RatingModal';

const RouteDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { 
    routes, 
    requests, 
    updateRouteStatus, 
    updateRequestStatus, 
    cancelJoinRequest,
    getRoutePassengers,
    submitReview
  } = useAppContext();
  const { showToast } = useToast();

  const [routePassengers, setRoutePassengers] = useState<any[]>([]);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ id: string, name: string } | null>(null);

  const route = routes.find(r => r.id === id);
  const isDriver = String(user?.id) === String(route?.driverId);
  const myRequest = requests.find(r => r.routeId === id && String(r.passengerId) === String(user?.id));
  const pendingRequests = requests.filter(r => r.routeId === id && r.status === JoinRequestStatus.PENDING && isDriver);

  useEffect(() => {
    if (id && isDriver) {
      getRoutePassengers(id).then(setRoutePassengers);
    }
  }, [id, isDriver, getRoutePassengers, requests]);

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <p className="text-slate-400">Ruta no encontrada</p>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

  const handleStartTrip = async () => {
    try {
      await updateRouteStatus(route.id, RouteStatus.IN_PROGRESS);
      showToast('¡Viaje iniciado! Conduce con cuidado.');
    } catch (err) {
      showToast('Error al iniciar viaje', 'error');
    }
  };

  const handleCompleteTrip = async () => {
    try {
      await updateRouteStatus(route.id, RouteStatus.COMPLETED);
      showToast('¡Viaje finalizado exitosamente!');
    } catch (err) {
      showToast('Error al finalizar viaje', 'error');
    }
  };

  const handleCancelRoute = async () => {
    if (window.confirm('¿Estás seguro de que quieres cancelar esta ruta?')) {
      try {
        await updateRouteStatus(route.id, RouteStatus.CANCELLED);
        showToast('Ruta cancelada');
        navigate(-1);
      } catch (err) {
        showToast('Error al cancelar ruta', 'error');
      }
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await updateRequestStatus(requestId, JoinRequestStatus.ACCEPTED);
      showToast('Pasajero aceptado');
      getRoutePassengers(route.id).then(setRoutePassengers);
    } catch (err) {
      showToast('Error al aceptar pasajero', 'error');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await updateRequestStatus(requestId, JoinRequestStatus.REJECTED);
      showToast('Solicitud rechazada');
    } catch (err) {
      showToast('Error al rechazar solicitud', 'error');
    }
  };

  const handleRateUser = (userId: string, name: string) => {
    setRatingTarget({ id: userId, name });
    setIsRatingModalOpen(true);
  };

  const onRatingSubmit = async (score: number, comment: string) => {
    if (!ratingTarget) return;
    await submitReview({
      routeId: route.id,
      toUserId: ratingTarget.id,
      score,
      comment
    });
  };

  const statusColors = {
    [RouteStatus.SCHEDULED]: 'bg-blue-50 text-blue-500 border-blue-100',
    [RouteStatus.ACTIVE]: 'bg-emerald-50 text-emerald-500 border-emerald-100',
    [RouteStatus.IN_PROGRESS]: 'bg-amber-50 text-amber-500 border-amber-100',
    [RouteStatus.COMPLETED]: 'bg-slate-100 text-slate-500 border-slate-200',
    [RouteStatus.CANCELLED]: 'bg-red-50 text-red-500 border-red-100',
  };

  return (
    <div className="space-y-8 pb-24 max-w-lg mx-auto px-2">
      <header className="flex items-center gap-4 pt-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Detalle del Viaje</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">ID: #{route.id.slice(0, 8)}</p>
        </div>
      </header>

      {/* Status Badge */}
      <div className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-black uppercase tracking-widest",
        statusColors[route.status as RouteStatus] || statusColors[RouteStatus.SCHEDULED]
      )}>
        <div className={cn(
          "w-2 h-2 rounded-full bg-current",
          route.status === RouteStatus.IN_PROGRESS && "animate-pulse"
        )} />
        {route.status === RouteStatus.IN_PROGRESS ? 'En progreso' : 
         route.status === RouteStatus.SCHEDULED ? 'Programado' :
         route.status === RouteStatus.ACTIVE ? 'Activa' :
         route.status === RouteStatus.COMPLETED ? 'Completado' :
         route.status === RouteStatus.CANCELLED ? 'Cancelado' : route.status}
      </div>

      {route.status === RouteStatus.IN_PROGRESS && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center gap-3 text-amber-800"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
             <Navigation size={20} className="animate-bounce" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-tight">Estado del Viaje</p>
            <p className="text-sm font-medium">Trayecto en curso. ¡Que tengas un buen viaje!</p>
          </div>
        </motion.div>
      )}

      {/* Route Map Card (Static/Abstract for now) */}
      <div className="card-rivo p-0 overflow-hidden relative min-h-[180px] flex flex-col justify-end">
        <div className="absolute inset-0 bg-slate-900 group-hover:scale-105 transition-transform duration-700">
           {/* Placeholder for map */}
           <div className="w-full h-full opacity-30 flex items-center justify-center p-12">
              <Navigation size={80} className="text-primary rotate-45" />
           </div>
        </div>
        <div className="relative p-6 bg-gradient-to-t from-slate-900 to-transparent text-white space-y-3">
           <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-primary" />
             <p className="text-sm font-bold truncate">{route.origin}</p>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-accent" />
             <p className="text-sm font-bold truncate">{route.destination}</p>
           </div>
        </div>
      </div>

      {/* Ride Info */}
      <div className="grid grid-cols-2 gap-4">
         <div className="card-rivo p-4 bg-slate-50 border-none">
            <Clock size={16} className="text-primary mb-2" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Salida</p>
            <p className="font-bold text-slate-800">{formatTime(route.departureTime)}</p>
            <p className="text-[10px] text-slate-500">{route.date}</p>
         </div>
         <div className="card-rivo p-4 bg-slate-50 border-none">
            <Car size={16} className="text-accent mb-2" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Precio</p>
            <p className="font-bold text-slate-800">{formatPrice(route.price)}</p>
            <p className="text-[10px] text-slate-500">Por persona</p>
         </div>
      </div>

      {/* Driver/My Role Section */}
      <section className="space-y-4">
        {isDriver ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Pasajeros confirmados</h2>
              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-xs font-bold">
                {route.totalSeats - route.availableSeats} / {route.totalSeats}
              </span>
            </div>

            {pendingRequests.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="text-sm font-black text-primary uppercase tracking-wider">Solicitudes Pendientes</h3>
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <motion.div 
                      key={req.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-primary/5 border border-primary/10 rounded-3xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img src={req.passengerAvatar} className="w-10 h-10 rounded-xl" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{req.passengerName}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Quiere unirse</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 rounded-full bg-white border border-slate-100 text-red-500"
                          onClick={() => handleRejectRequest(req.id)}
                        >
                          <XCircle size={18} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 rounded-full bg-primary text-white"
                          onClick={() => handleAcceptRequest(req.id)}
                        >
                          <CheckCircle2 size={18} />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {routePassengers.length > 0 ? (
              <div className="space-y-3">
                 {routePassengers.map(p => (
                   <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl">
                      <div className="flex items-center gap-3">
                         <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.name}`} className="w-10 h-10 rounded-xl" />
                         <p className="font-bold text-slate-800">{p.name}</p>
                      </div>
                      {route.status === RouteStatus.COMPLETED && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-primary font-bold"
                          onClick={() => handleRateUser(p.id, p.name)}
                        >
                          Calificar
                        </Button>
                      )}
                   </div>
                 ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">No hay pasajeros confirmados aún</p>
              </div>
            )}

            {/* Driver Actions */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              {route.status === RouteStatus.SCHEDULED || route.status === RouteStatus.ACTIVE ? (
                <>
                  <Button className="w-full py-6 rounded-2xl bg-primary text-white" onClick={handleStartTrip}>
                    Iniciar Viaje
                  </Button>
                  <Button variant="ghost" className="w-full text-red-500" onClick={handleCancelRoute}>
                    Cancelar Ruta
                  </Button>
                </>
              ) : route.status === RouteStatus.IN_PROGRESS ? (
                <Button className="w-full py-6 rounded-2xl bg-emerald-500 text-white" onClick={handleCompleteTrip}>
                  Finalizar Viaje
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800">Tu estado</h2>
            <div className="card-rivo p-6 bg-slate-50 border-none space-y-4">
               <div className="flex items-center gap-4">
                 <div className={cn(
                   "w-12 h-12 rounded-2xl flex items-center justify-center",
                   myRequest?.status === JoinRequestStatus.ACCEPTED ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                 )}>
                   {myRequest?.status === JoinRequestStatus.ACCEPTED ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                 </div>
                 <div>
                    <p className="font-bold text-slate-900">
                      {myRequest?.status === JoinRequestStatus.ACCEPTED ? '¡Estás confirmado!' : 
                       myRequest?.status === JoinRequestStatus.PENDING ? 'Solicitud pendiente' : 'Sin solicitud'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {myRequest?.status === JoinRequestStatus.ACCEPTED ? 'Tu asiento está reservado.' : 'Espera a que el conductor acepte.'}
                    </p>
                 </div>
               </div>

               {myRequest?.status === JoinRequestStatus.ACCEPTED && route.status === RouteStatus.COMPLETED && (
                 <Button className="w-full py-6 rounded-2xl bg-amber-400 text-white" onClick={() => handleRateUser(String(route.driverId), "el Conductor")}>
                   <Star size={18} fill="currentColor" className="mr-2" /> Calificar Conductor
                 </Button>
               )}

               {myRequest?.status === JoinRequestStatus.PENDING && (
                 <Button variant="ghost" className="w-full text-red-500" onClick={() => cancelJoinRequest(myRequest.id)}>
                   Abandonar Solicitud
                 </Button>
               )}
            </div>

            {/* Insurance/Support Info */}
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex gap-3">
               <ShieldCheck className="text-emerald-500 shrink-0" size={24} />
               <div>
                  <p className="text-xs font-bold text-emerald-900">Viaje Protegido</p>
                  <p className="text-[10px] text-emerald-700">Este trayecto cuenta con el respaldo de seguridad de Rivo y S&C.</p>
               </div>
            </div>
          </div>
        )}
      </section>

      {/* Safety Info */}
      <section className="px-1 py-4">
        <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-3xl border border-amber-100">
          <AlertTriangle className="text-amber-500 shrink-0" size={20} />
          <p className="text-[10px] text-amber-700 leading-relaxed">
            Recordatorio: Mantén siempre la comunicación dentro de la plataforma. Si el viaje no se realiza según lo planeado, repórtalo en el centro de ayuda.
          </p>
        </div>
      </section>

      {ratingTarget && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          targetName={ratingTarget.name}
          onSubmit={onRatingSubmit}
        />
      )}
    </div>
  );
};

export default RouteDetailView;
