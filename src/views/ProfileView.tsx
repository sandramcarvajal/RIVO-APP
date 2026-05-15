import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  Camera, 
  Edit3, 
  X,
  Star,
  Car,
  TrendingUp,
  Users,
  Bell,
  Moon,
  ArrowRight,
  ShieldCheck,
  Power,
  LogOut,
  History,
  MapPin,
  Compass,
  MessageSquare,
  Map as MapIcon,
  Clock,
  Briefcase,
  Home,
  CheckCircle2,
  Route as RouteIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';
import { User, Route, JoinRequest } from '../types';
import { UserRole, RouteStatus, JoinRequestStatus } from '../shared/enums';

// --- Driver Profile Component ---
interface DriverProfileProps {
  user: User;
  setIsEditing: (val: boolean) => void;
  isEditing: boolean;
}

const DriverProfile = ({ user, setIsEditing, isEditing }: DriverProfileProps) => {
  const { updateUserProfile, routes, requests } = useAppStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isEditingVehicle, setIsEditingVehicle] = React.useState(false);
  const [editVehicle, setEditVehicle] = React.useState(user?.vehicle || { plate: '', brand: '', color: '' });
  const { updateRequestStatus } = useAppStore();
  const [isRatingModalOpen, setIsRatingModalOpen] = React.useState(false);
  const [selectedPassenger, setSelectedPassenger] = React.useState<any>(null);

  const myRoutes = routes.filter(r => String(r.driverId) === String(user?.id));

  const toggleAvailability = () => {
    updateUserProfile({ isAvailable: !user?.isAvailable });
    showToast(user?.isAvailable ? 'Ahora estás en modo desconectado' : '¡Estás disponible para conducir!');
  };

  const handleSaveVehicle = () => {
    updateUserProfile({ vehicle: editVehicle });
    setIsEditingVehicle(false);
    showToast('¡Vehículo actualizado!');
  };

  const myTotalPasajeros = requests.filter(req => {
    const route = routes.find(r => r.id === req.routeId);
    return route?.driverId === user?.id && req.status.toLowerCase() === JoinRequestStatus.ACCEPTED;
   }).length;

  if (myRoutes.length === 0 && !isEditing) {
    return (
      <div className="px-2 py-10">
        <EmptyState 
           icon={RouteIcon}
           title="No tienes rutas creadas"
           description="Publica tu primera ruta para empezar a llevar compañeros hoy mismo."
           action={() => navigate('/create-route')}
           actionLabel="Publicar Mi Primera Ruta"
        />
      </div>
    );
  }

  const driverStats = [
    { icon: Car, label: 'Viajes', value: myRoutes.length.toString(), color: 'text-blue-500' },
    { icon: Users, label: 'Pasajeros', value: myTotalPasajeros.toString(), color: 'text-emerald-500' },
    { icon: TrendingUp, label: 'Estatus', value: 'Silver', color: 'text-indigo-500' },
    { icon: Star, label: 'Rating', value: user.rating?.toString() || '—', color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Availability Toggle */}
      <section className="px-2">
        <div className={cn(
          "card-rivo p-1 flex items-center justify-between border-2 transition-all duration-500",
          user?.isAvailable 
            ? "border-emerald-500/20 bg-emerald-50/20" 
            : "border-slate-200 bg-white"
        )}>
          <div className="flex items-center gap-4 p-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              user?.isAvailable ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-slate-100 text-slate-400"
            )}>
              <Power size={22} />
            </div>
            <div>
              <p className={cn("font-bold transition-colors", user?.isAvailable ? "text-emerald-900" : "text-slate-900")}>
                {user?.isAvailable ? 'Disponible para conducir' : 'En modo desconectado'}
              </p>
              <p className="text-xs text-slate-500">
                {user?.isAvailable ? 'Tu ruta es visible para otros' : 'Activa para recibir solicitudes'}
              </p>
            </div>
          </div>
          <button 
            onClick={toggleAvailability}
            className={cn(
              "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none mr-4",
              user?.isAvailable ? "bg-emerald-500" : "bg-slate-200"
            )}
          >
            <span className={cn(
              "inline-block h-6 w-6 transform rounded-full bg-white transition-transform",
              user?.isAvailable ? "translate-x-7" : "translate-x-1"
            )} />
          </button>
        </div>
      </section>

      {/* Vehicle Info */}
      {user?.vehicle && (
        <section className="px-2 space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-lg font-bold text-slate-800">Mi vehículo</h2>
             <button 
               onClick={() => setIsEditingVehicle(!isEditingVehicle)}
               className="text-xs font-bold text-primary"
             >
               {isEditingVehicle ? 'Cerrar' : 'Editar vehículo'}
             </button>
          </div>

          <div className="card-rivo group relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900/5 via-transparent to-transparent">
             <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-primary/5 rounded-3xl flex items-center justify-center text-primary">
                  <Car size={32} />
                </div>
                <div className="flex-1 space-y-1">
                   <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">{user.vehicle.brand}</p>
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg font-mono text-sm tracking-widest">{user.vehicle.plate}</span>
                   </div>
                   <p className="text-xs text-slate-500">{user.vehicle.color} • 3 cupos disponibles</p>
                </div>
             </div>
             
             <AnimatePresence>
              {isEditingVehicle && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 pt-6 border-t border-slate-100 space-y-4"
                >
                   <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="Placa"
                        value={editVehicle.plate}
                        onChange={(e) => setEditVehicle({...editVehicle, plate: e.target.value})}
                      />
                      <Input 
                        label="Marca"
                        value={editVehicle.brand}
                        onChange={(e) => setEditVehicle({...editVehicle, brand: e.target.value})}
                      />
                   </div>
                   <Input 
                      label="Color"
                      value={editVehicle.color}
                      onChange={(e) => setEditVehicle({...editVehicle, color: e.target.value})}
                    />
                   <Button size="sm" onClick={handleSaveVehicle} className="w-full">Actualizar vehículo</Button>
                </motion.div>
              )}
             </AnimatePresence>
          </div>
        </section>
      )}

      {/* Driver Stats */}
      <section className="px-2 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">Mi reputación como conductor</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {driverStats.map((stat, i) => (
            <div key={i} className="card-rivo p-5 border-none bg-indigo-50/30">
              <stat.icon size={18} className={cn("mb-2", stat.color)} />
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-slate-800">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mis Rutas Section */}
      <section className="px-2 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-slate-800">Mis rutas publicadas</h2>
          <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-lg">{myRoutes.length} TOTAL</span>
        </div>
        
        {myRoutes.length > 0 ? (
          <div className="space-y-4">
            {myRoutes.map((route: Route) => (
              <div key={route.id} className="card-rivo p-6 space-y-4 group transition-all hover:border-primary/20">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className={cn(
                       "w-8 h-8 rounded-lg flex items-center justify-center",
                       route.status.toLowerCase() === RouteStatus.ACTIVE ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400"
                     )}>
                       <Clock size={16} />
                     </div>
                     <span className={cn(
                       "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                       route.status.toLowerCase() === RouteStatus.ACTIVE ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-500"
                     )}>
                       {route.status.toLowerCase() === RouteStatus.ACTIVE ? 'Activa' : route.status}
                     </span>
                   </div>
                  <p className="text-xs font-bold text-slate-400">{route.date} • {route.time}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <p className="text-sm font-bold text-slate-700 truncate">{route.origin}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <p className="text-sm font-bold text-slate-700 truncate">{route.destination}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-300 uppercase">Cupos</p>
                      <p className="text-xs font-bold text-slate-700">{route.availableSeats}/{route.totalSeats}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-300 uppercase">Precio</p>
                      <p className="text-xs font-bold text-slate-700">${route.price}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-primary font-bold"
                    onClick={() => navigate(`/route/${route.id}`)}
                  >
                    Detalles
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={RouteIcon} 
            title="No has publicado rutas aún" 
            description="Aquí aparecerán todas tus rutas pasadas y actuales."
            className="bg-slate-50 border-none shadow-none"
          />
        )}
      </section>
    </div>
  );
};

// --- Passenger Profile Component ---
interface PassengerProfileProps {
  user: User;
}

const PassengerProfile = ({ user }: PassengerProfileProps) => {
  const { requests, routes } = useAppStore();
  const navigate = useNavigate();

   // Filter requests sent by this passenger
   const myRequests = requests.filter((r: JoinRequest) => String(r.passengerId) === String(user?.id));
   
   // History: Completed or cancelled trips
   const history = myRequests.filter(req => {
     const route = routes.find(r => r.id === req.routeId);
     return route?.status === RouteStatus.COMPLETED || route?.status === RouteStatus.CANCELLED || req.status === JoinRequestStatus.REJECTED;
   }).sort((a, b) => {
      const ra = routes.find(r => r.id === a.routeId);
      const rb = routes.find(r => r.id === b.routeId);
      if (!ra || !rb) return 0;
      return new Date(rb.departureTime).getTime() - new Date(ra.departureTime).getTime();
   });

   const myApprovedRequests = myRequests.filter(r => r.status.toLowerCase() === JoinRequestStatus.ACCEPTED);
   
   const passengerStats = [
    { label: 'Viajes finalizados', value: history.filter(h => h.status === JoinRequestStatus.ACCEPTED).length.toString(), icon: CheckCircle2, color: 'text-indigo-500' },
    { label: 'Rating promedio', value: user.rating?.toString() || '—', icon: Star, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-10">
      {/* Mi identidad y reputación */}
      <section className="px-2 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">Mi reputación como pasajero</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {passengerStats.map((stat, i) => (
            <div key={i} className="card-rivo p-5 border-none bg-slate-50/50">
              <stat.icon size={18} className={cn("mb-2", stat.color)} />
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-slate-800">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Historial de Viajes */}
      <section className="px-2 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">Historial de viajes</h2>
          </div>
          <button className="text-xs font-bold text-primary" onClick={() => navigate('/requests')}>Ver historial</button>
        </div>
        
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.slice(0, 5).map((req: JoinRequest) => {
              const route = routes.find((r: Route) => r.id === req.routeId);
              const isCompleted = route?.status === RouteStatus.COMPLETED && req.status === JoinRequestStatus.ACCEPTED;
              return (
                <div key={req.id} className="p-4 bg-white border border-slate-50 rounded-[2rem] shadow-sm flex items-center justify-between opacity-80 transition-opacity hover:opacity-100">
                   <div className="flex items-center gap-4">
                     <div className={cn(
                       "w-10 h-10 rounded-xl flex items-center justify-center",
                       isCompleted ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400"
                     )}>
                       {isCompleted ? <CheckCircle2 size={18} /> : <History size={18} />}
                     </div>
                     <div>
                       <p className="text-sm font-bold text-slate-800">{(route?.destination || 'Ruta').split(',')[0]}</p>
                       <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                        {route?.date} • {isCompleted ? 'Completado' : req.status === JoinRequestStatus.REJECTED ? 'Rechazado' : 'Finalizado'}
                       </p>
                     </div>
                   </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState 
            icon={History} 
            title="Aún no tienes un historial" 
            description="Tus viajes finalizados y calificados aparecerán en esta sección."
            className="bg-slate-50 border-none shadow-none"
          />
        )}
      </section>
    </div>
  );
};

const ProfileView = () => {
  const { user, logout, updateUserProfile, routes, requests } = useAppStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const [editData, setEditData] = React.useState({
    name: user?.name || '',
    avatar: user?.avatar || ''
  });

  if (!user) return null;

  const handleSave = () => {
    if (!editData.name.trim()) {
      showToast('El nombre no puede estar vacío', 'error');
      return;
    }

    try {
      updateUserProfile({
        name: editData.name,
        avatar: editData.avatar
      });
      setIsEditing(false);
      showToast('¡Perfil actualizado exitosamente!');
    } catch (err) {
      showToast('Hubo un error al actualizar el perfil', 'error');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    showToast('La foto de perfil corporativa no puede ser modificada manualmente.', 'neutral');
  };

  return (
    <div className="space-y-8 pb-24 overflow-x-hidden pt-4 max-w-lg mx-auto">
      {/* 1. 👤 Header */}
      <header className="px-2">
        <div className="flex items-center gap-6">
           <div className="relative group">
            <img
              src={user?.avatar}
              alt={user?.name}
              className="w-24 h-24 rounded-[32px] border-4 border-white shadow-2xl object-cover"
            />
            <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-[32px] cursor-pointer transition-all duration-300">
              <Camera className="text-white w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
              <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
            </label>
           </div>
           <div className="flex-1">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user?.name}</h1>
             <p className="text-sm text-slate-400 font-medium">{user?.email}</p>
             <div className="flex items-center gap-3 mt-3">
                 <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-2xl border border-amber-100 shadow-sm">
                   <Star size={14} fill="currentColor" />
                   <span className="text-sm font-black">{user?.rating?.toString() || '—'}</span>
                 </div>
                 <div className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl">
                   {user?.role === UserRole.DRIVER ? 'Conductor' : 'Pasajero'}
                 </div>
              </div>
            </div>
        </div>

        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full mt-8 bg-white border border-slate-100 shadow-sm text-slate-600 hover:bg-slate-50 rounded-2xl py-6"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? <X size={18} /> : <Edit3 size={18} />}
          <span className="font-bold ml-2">{isEditing ? 'Cancelar Edición' : 'Editar perfil corporativo'}</span>
        </Button>
      </header>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-2 overflow-hidden"
          >
            <div className="card-rivo space-y-4 bg-slate-50/50 p-6 rounded-[32px]">
               <Input 
                 label="Tu nombre corporativo"
                 value={editData.name}
                 onChange={(e) => setEditData({...editData, name: e.target.value})}
                 className="rounded-2xl"
               />
               <Button onClick={handleSave} className="w-full rounded-2xl py-6">Guardar Cambios</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conditionally Render Profile Content */}
      {user?.role === UserRole.DRIVER ? (
        <DriverProfile user={user} setIsEditing={setIsEditing} isEditing={isEditing} />
      ) : (
        <PassengerProfile user={user} />
      )}

      {/* Shared Sections: Preferences & Account */}
      
      {/* 6. 🔔 Preferencias */}
      <section className="px-2 space-y-4">
         <div className="flex items-center gap-2 px-1">
            <Settings size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">Preferencias</h2>
         </div>
         <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden divide-y divide-slate-50 shadow-sm">
            {[
              { icon: Bell, label: 'Notificaciones push', color: 'text-blue-500', path: '/notifications' },
              { icon: Moon, label: 'Modo oscuro', color: 'text-slate-400', badge: 'Próximamente' },
              { icon: ShieldCheck, label: 'Privacidad de datos', color: 'text-emerald-500' },
              { icon: HelpCircle, label: 'Centro de ayuda SyC', color: 'text-amber-500' },
            ].map((item, i) => (
              <button 
                key={i} 
                onClick={() => item.path && navigate(item.path)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-all text-left"
              >
                 <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-2xl bg-opacity-10", item.color.replace('text', 'bg'))}>
                       <item.icon size={20} className={item.color} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{item.label}</p>
                      {item.badge && <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">{item.badge}</span>}
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-slate-200" />
              </button>
            ))}
            <button 
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-between p-5 hover:bg-red-50/30 transition-all text-left group"
            >
               <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-red-50 text-red-500 group-hover:bg-red-100 transition-colors">
                     <LogOut size={20} />
                  </div>
                  <p className="font-bold text-red-500 text-sm">Cerrar sesión</p>
               </div>
               <ChevronRight size={18} className="text-red-200" />
            </button>
         </div>
      </section>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="¿Cerrar sesión?"
        footer={
          <div className="flex gap-3 w-full">
            <Button 
              variant="secondary" 
              onClick={() => setShowLogoutModal(false)} 
              className="flex-1 rounded-2xl py-6"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                logout();
                setShowLogoutModal(false);
                showToast('Sesión cerrada correctamente');
                navigate('/login');
              }} 
              className="flex-1 bg-red-500 hover:bg-red-600 rounded-2xl py-6"
            >
              Cerrar sesión
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center space-y-4 pt-4 pb-2">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
            <LogOut size={40} />
          </div>
          <p className="text-slate-600 font-medium">
            Si cierras sesión, tendrás que volver a ingresar para usar Rivo.
          </p>
        </div>
      </Modal>

       <footer className="text-center py-10">
        <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">Rivo v1.0.8 • Experiencia Pasajero • SyC</p>
      </footer>
    </div>
  );
};

export default ProfileView;
