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
  Route as RouteIcon,
  User as UserIcon
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
import MyGarage from '../components/MyGarage';
import { HistoryCard } from '../components/HistoryCard';

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

  const handleSaveVehicle = () => {
    updateUserProfile({ vehicle: editVehicle });
    setIsEditingVehicle(false);
    showToast('¡Vehículo actualizado!');
  };

  const myTotalPasajeros = requests.filter(req => {
    const route = routes.find(r => String(r.id) === String(req.routeId));
    return String(route?.driverId) === String(user?.id) && String(req.status).toLowerCase() === String(JoinRequestStatus.ACCEPTED).toLowerCase();
   }).length;

  const driverStats = [
    { label: 'Viajes creados', value: myRoutes.length.toString(), icon: Car, color: 'text-indigo-500' },
    { label: 'Pasajeros confirmados', value: myTotalPasajeros.toString(), icon: Users, color: 'text-emerald-500' },
    { label: 'Rating promedio', value: (!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? 'Nuevo' : parseFloat(user.rating.toString()).toFixed(1), icon: Star, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Rivo Garage - Multi-vehicle & official documents administrator */}
      <section className="px-2">
        <MyGarage />
      </section>

      {/* Driver Stats */}
      <section className="px-2 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">Mi reputación como conductor</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {driverStats.map((stat, i) => (
            <div key={i} className="card-rivo p-4 sm:p-5 border-none bg-slate-50/50 flex flex-col justify-between">
              <div>
                <stat.icon size={18} className={cn("mb-2 sm:mb-2.5", stat.color)} />
                <p className="text-[10px] sm:text-xs uppercase font-black text-slate-400 tracking-wider leading-tight">{stat.label}</p>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-800 mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mis Rutas Section */}
      <section className="px-2 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">Mis rutas publicadas</h2>
          </div>
          <button 
            type="button"
            className="text-xs font-black uppercase tracking-wider text-primary hover:text-primary/80 flex items-center gap-1 transition-all" 
            onClick={() => navigate('/requests', { state: { tab: 'historial' } })}
          >
            Ver historial completo
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>
        
        {myRoutes.length > 0 ? (
          <div className="space-y-3">
            {[...myRoutes]
              .sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime())
              .slice(0, 5)
              .map((route: Route) => {
                const statusLower = route.status.toLowerCase();
                const isCompleted = statusLower === RouteStatus.COMPLETED;
                const isCancelled = statusLower === RouteStatus.CANCELLED;
                const isInProgress = statusLower === RouteStatus.IN_PROGRESS;
                const isScheduled = statusLower === RouteStatus.SCHEDULED;

                let statusText: string = route.status;
                let statusType: 'success' | 'danger' | 'warning' | 'info' | 'neutral' = 'neutral';

                if (isCompleted) {
                  statusText = 'Completado';
                  statusType = 'success';
                } else if (isCancelled) {
                  statusText = 'Cancelado';
                  statusType = 'danger';
                } else if (isInProgress) {
                  statusText = 'En progreso';
                  statusType = 'warning';
                } else if (isScheduled) {
                  statusText = 'Programado';
                  statusType = 'info';
                }

                return (
                  <HistoryCard
                    key={route.id}
                    origin={route.origin}
                    destination={route.destination}
                    date={route.date}
                    time={route.time}
                    price={route.price}
                    status={statusText}
                    statusType={statusType}
                    avatar={user?.avatar}
                    avatarIcon={<Car size={18} className="text-slate-400" />}
                    titleLabel="Cupos"
                    titleValue={`${route.availableSeats}/${route.totalSeats}`}
                    onClick={() => navigate(`/route/${route.id}`)}
                  />
                );
              })}
          </div>
        ) : (
          <EmptyState 
            icon={RouteIcon} 
            title="No has publicado rutas aún" 
            description="Aquí aparecerán todas tus rutas pasadas y actuales."
            action={() => navigate('/create')}
            actionLabel="Publicar Mi Primera Ruta"
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

   const passengerStats = [
    { label: 'Viajes finalizados', value: history.filter(h => h.status === JoinRequestStatus.ACCEPTED).length.toString(), icon: CheckCircle2, color: 'text-indigo-500' },
    { label: 'Rating promedio', value: (!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? 'Nuevo' : parseFloat(user.rating.toString()).toFixed(1), icon: Star, color: 'text-amber-500' },
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
              <p className="text-sm uppercase font-black text-slate-400 tracking-widest">{stat.label}</p>
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
          <button 
            type="button"
            className="text-xs font-black uppercase tracking-wider text-primary hover:text-primary/80 flex items-center gap-1 transition-all" 
            onClick={() => navigate('/requests', { state: { tab: 'historial' } })}
          >
            Ver historial completo
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>
        
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.slice(0, 5).map((req: JoinRequest) => {
              const route = routes.find((r: Route) => r.id === req.routeId);
              const isCompleted = route?.status === RouteStatus.COMPLETED && req.status === JoinRequestStatus.ACCEPTED;
              
              let statusText = 'Finalizado';
              let statusType: 'success' | 'danger' | 'warning' | 'info' | 'neutral' = 'neutral';
              
              if (isCompleted) {
                statusText = 'Completado';
                statusType = 'success';
              } else if (req.status === JoinRequestStatus.REJECTED) {
                statusText = 'Rechazado';
                statusType = 'danger';
              } else if (req.status === JoinRequestStatus.CANCELLED_BY_DRIVER) {
                statusText = 'Conductor Canceló';
                statusType = 'danger';
              } else if (req.status === JoinRequestStatus.CANCELLED) {
                statusText = 'Cancelado';
                statusType = 'neutral';
              }

              return (
                <HistoryCard
                  key={req.id}
                  origin={route?.origin || 'Origen'}
                  destination={route?.destination || 'Destino'}
                  date={route?.date || 'Fecha'}
                  time={route?.time || ''}
                  price={route?.price}
                  status={statusText}
                  statusType={statusType}
                  avatar={route?.driverAvatar}
                  avatarIcon={<UserIcon size={18} className="text-slate-400" />}
                  titleLabel="Conductor"
                  titleValue={route?.driverName || 'Compañero'}
                  onClick={route ? () => navigate(`/route/${route.id}`) : undefined}
                />
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
        setEditData(prev => ({ ...prev, avatar: base64Data }));
        showToast('¡Foto de perfil actualizada exitosamente!', 'success');
      } catch (err) {
        showToast('Error al subir la imagen.', 'error');
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 pb-24 overflow-x-hidden pt-4 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6">
      {/* 1. 👤 Header */}
      <header className="px-2">
        <div className="flex items-center gap-6">
           <div className="relative group">
            {(!user?.avatar || user.avatar.includes('gravatar') || user.avatar === '') ? (
              <label className="w-24 h-24 rounded-[32px] bg-slate-50 border border-slate-200 flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:border-primary group-hover:bg-slate-100 group-hover:shadow-md cursor-pointer">
                {/* Quiet human silhouette (silueta humana gris) with brand alignment */}
                <UserIcon className="w-11 h-11 text-slate-300 group-hover:scale-105 transition-transform duration-300" />
                
                {/* Subtle camera icon in the lower-right corner as a floating badge */}
                <div className="absolute bottom-1 right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-md group-hover:scale-110 transition-transform duration-300 text-slate-400 group-hover:text-primary">
                  <Camera size={13} />
                </div>
                
                {/* Visual indicator on hover */}
                <span className="absolute inset-0 bg-primary/40 flex items-center justify-center text-xs text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Subir Foto
                </span>
                <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={user?.avatar}
                  alt={user?.name}
                  className="w-24 h-24 rounded-[32px] border-4 border-white shadow-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-md text-slate-400 group-hover:text-primary transition-transform duration-300 group-hover:scale-110">
                  <Camera size={13} />
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/45 rounded-[32px] cursor-pointer transition-all duration-350">
                  <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Cambiar Foto
                  </span>
                  <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
                </label>
              </div>
            )}
           </div>
           <div className="flex-1">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user?.name}</h1>
             <p className="text-sm text-slate-400 font-medium">{user?.email}</p>
             <div className="flex items-center gap-3 mt-3">
                 <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-2xl border border-amber-100 shadow-sm">
                   <Star size={14} fill="currentColor" />
                   <span className="text-sm font-black">{(!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? 'Nuevo' : parseFloat(user.rating.toString()).toFixed(1)}</span>
                 </div>
                 <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl">
                   {user?.role === UserRole.DRIVER ? 'Conductor' : user?.role === UserRole.ADMIN ? 'Administrador' : 'Pasajero'}
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
              { 
                icon: Bell, 
                label: 'Notificaciones push', 
                color: 'text-violet-600 bg-violet-50 border-violet-100/50', 
                badge: 'Próximamente',
                onClick: () => showToast('Funcionalidad disponible próximamente.', 'info')
              },
              { 
                icon: Moon, 
                label: 'Modo oscuro', 
                color: 'text-indigo-600 bg-indigo-50 border-indigo-100/50', 
                badge: 'Próximamente',
                onClick: () => showToast('Modo oscuro disponible próximamente.', 'info')
              },
              { 
                icon: ShieldCheck, 
                label: 'Privacidad de datos', 
                color: 'text-emerald-600 bg-emerald-50 border-emerald-100/50', 
                onClick: () => navigate('/profile/privacy')
              },
              { 
                icon: HelpCircle, 
                label: 'Centro de ayuda', 
                color: 'text-amber-600 bg-amber-50 border-amber-100/50', 
                onClick: () => navigate('/profile/help')
              },
            ].map((item, i) => (
              <button 
                key={i} 
                onClick={item.onClick}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50/60 transition-all duration-200 text-left cursor-pointer group"
              >
                 <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-2xl border transition-all duration-200 group-hover:scale-105", item.color)}>
                       <item.icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm group-hover:text-violet-700 transition-colors">{item.label}</p>
                      {item.badge && <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5 block">{item.badge}</span>}
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-violet-500" />
              </button>
            ))}
            <button 
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-between p-5 hover:bg-red-50/40 transition-all duration-200 text-left cursor-pointer group"
            >
               <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-red-50 text-red-500 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                     <LogOut size={20} className="transition-transform duration-200 group-hover:scale-110" />
                  </div>
                  <p className="font-bold text-red-500 text-sm">Cerrar sesión</p>
               </div>
               <ChevronRight size={18} className="text-red-200 transition-all duration-200 group-hover:translate-x-1 group-hover:text-red-500" />
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
        <p className="text-xs text-slate-400 font-extrabold uppercase tracking-[0.16em]">Rivo v1.0.8 • Experiencia {user?.role === UserRole.DRIVER ? 'Conductor' : user?.role === UserRole.ADMIN ? 'Administrador' : 'Pasajero'} • SyC</p>
      </footer>
    </div>
  );
};

export default ProfileView;
