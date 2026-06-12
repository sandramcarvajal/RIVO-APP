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
  User as UserIcon,
  ShieldAlert,
  UserMinus,
  UserPlus,
  XCircle,
  Calendar,
  Activity,
  ThumbsUp,
  ThumbsDown,
  AlertOctagon
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
import { UserRole, RouteStatus, JoinRequestStatus, isAdminUser } from '../shared/enums';
import MyGarage from '../components/MyGarage';
import { HistoryCard } from '../components/HistoryCard';
import { SecureHttpClient } from '../client/modules/auth/services/SecureHttpClient';

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

// --- Admin Profile Component ---
interface AdminProfileProps {
  user: User;
}

interface ExecutiveData {
  adminInfo: {
    id: number;
    email: string;
    createdAt: string;
    lastAccess: string;
    status: string;
    role: string;
    profileData: any;
  };
  indicators: {
    vehiclesApproved: number;
    vehiclesRejected: number;
    reportsManaged: number;
    usersSuspended: number;
    usersReactivated: number;
  };
  timeline: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: string;
  }>;
}

const AdminProfile = ({ user }: AdminProfileProps) => {
  const navigate = useNavigate();
  const { logout, updateUserProfile } = useAppStore();
  const [executiveData, setExecutiveData] = React.useState<ExecutiveData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showAllTimeline, setShowAllTimeline] = React.useState(false);
  
  // Clean states without simulated IP or fake rotation keys
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [editName, setEditName] = React.useState(user?.name || '');
  const { showToast } = useToast();

  React.useEffect(() => {
    let active = true;
    const fetchExecutiveStats = async () => {
      try {
        const res = await SecureHttpClient.request('/api/routes/admin/profile/executive');
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setExecutiveData(data);
          }
        }
      } catch (err) {
        console.error("Error fetching executive administrative stats:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchExecutiveStats();
    return () => {
      active = false;
    };
  }, []);

  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 'Información no disponible';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Información no disponible';
      return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Información no disponible';
    }
  };

  const formatAccessDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 'Información no disponible';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Información no disponible';
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Información no disponible';
    }
  };

  const formatAccessTime = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 'Información no disponible';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Información no disponible';
      return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Información no disponible';
    }
  };

  const formatRelativeTime = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 'Reciente';
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      if (diffMs < 0) return 'Hace unos segundos';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Hace unos segundos';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays} d`;
    } catch {
      return 'Hace poco';
    }
  };

  const getBrowserAndOS = () => {
    if (typeof window === 'undefined' || !navigator?.userAgent) {
      return { browser: 'Información no disponible', os: 'Información no disponible' };
    }
    const ua = navigator.userAgent;
    let browser = "Lector de Red";
    let os = "Dispositivo Corporativo";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Google Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Microsoft Edge";
    else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

    if (ua.includes("Windows")) os = "Windows OS";
    else if (ua.includes("Macintosh") || ua.includes("Mac Intel")) os = "macOS";
    else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux OS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return { browser, os };
  };

  const getActionBadgeDetails = (action: string) => {
    switch (action) {
      case 'vehicle_approved':
        return { label: 'Vehículo Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 };
      case 'vehicle_rejected':
        return { label: 'Vehículo Rechazado', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: XCircle };
      case 'document_approved':
        return { label: 'Doc. Vehículo Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-100/50', icon: ShieldCheck };
      case 'document_rejected':
        return { label: 'Doc. Vehículo Rechazado', color: 'bg-rose-50 text-rose-700 border-rose-100/50', icon: ShieldAlert };
      case 'user_suspended':
        return { label: 'Usuario Suspendido', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: UserMinus };
      case 'user_activated':
        return { label: 'Usuario Activado', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: UserPlus };
      case 'report_resolved':
        return { label: 'Reporte Resuelto', color: 'bg-teal-50 text-teal-700 border-teal-100', icon: CheckCircle2 };
      case 'report_updated':
        return { label: 'Reporte Actualizado', color: 'bg-slate-50 text-slate-700 border-slate-100', icon: HelpCircle };
      default:
        return { label: 'Acción de Control', color: 'bg-slate-50 text-slate-600 border-slate-100', icon: Settings };
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
        showToast('Foto de perfil corporativa actualizada', 'success');
      } catch (err) {
        showToast('Error al subir la imagen.', 'error');
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfileName = () => {
    if (!editName.trim()) {
      showToast('El nombre no puede estar vacío.', 'error');
      return;
    }
    try {
      updateUserProfile({ name: editName });
      setIsEditModalOpen(false);
      showToast('¡Nombre corporativo actualizado con éxito!', 'success');
    } catch (e) {
      showToast('Error al guardar los cambios.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-11 h-11 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-extrabold uppercase tracking-[0.2em] text-center animate-pulse">Sincronizando Consola Ejecutiva...</p>
      </div>
    );
  }

  const info = executiveData?.adminInfo || {
    id: user?.id,
    email: user?.email || '',
    createdAt: user?.createdAt || null,
    lastAccess: null,
    status: 'Activo'
  };

  const metrics = executiveData?.indicators || {
    vehiclesApproved: 0,
    vehiclesRejected: 0,
    reportsManaged: 0,
    usersSuspended: 0,
    usersReactivated: 0
  };

  const timeline = executiveData?.timeline || [];
  const visibleTimeline = showAllTimeline ? timeline : timeline.slice(0, 5);

  const metricCards = [
    { label: 'Aprobaciones de Flota', count: metrics.vehiclesApproved, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', desc: 'Vehículos incorporados' },
    { label: 'Rechazos de Flota', count: metrics.vehiclesRejected, icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-100', desc: 'Trámites devueltos' },
    { label: 'Casos Conflictivos', count: metrics.reportsManaged, icon: AlertOctagon, color: 'text-violet-600 bg-violet-50 border-violet-100', desc: 'Conflictos en rutas' },
    { label: 'Sanciones Emitidas', count: metrics.usersSuspended, icon: UserMinus, color: 'text-amber-600 bg-amber-50 border-amber-100', desc: 'Bloqueos provisionales' },
    { label: 'Cuentas Restablecidas', count: metrics.usersReactivated, icon: UserPlus, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', desc: 'Reincorporados' },
  ];

  const browserTelemetry = getBrowserAndOS();

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* ================= SECTION A: EXECUTIVE PROFILE HEADER ================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-white rounded-[32px] p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative grid overlay */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative flex flex-col md:flex-row items-center md:items-start justify-between gap-6 z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            
            {/* Elegant avatar placeholder with camera trigger */}
            <div className="relative group">
              {(!user?.avatar || user.avatar.includes('gravatar') || user.avatar === '') ? (
                <label className="w-24 h-24 rounded-[28px] bg-slate-800 border-2 border-slate-700 flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:border-indigo-500 group-hover:bg-slate-750 group-hover:shadow-lg cursor-pointer">
                  <UserIcon className="w-11 h-11 text-slate-500 group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute bottom-1 right-1 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <Camera size={13} className="text-white" />
                  </div>
                  <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={user?.avatar}
                    alt={user?.name}
                    className="w-24 h-24 rounded-[28px] border-2 border-slate-700 shadow-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[28px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Camera size={18} className="text-white" />
                    <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
                  </label>
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{user?.name}</h1>
                <span className="px-2.5 py-0.5 bg-indigo-550/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-full border border-indigo-500/20">
                  {user?.role === UserRole.DRIVER ? 'Conductor' : isAdminUser(user?.role) ? 'Director de Operaciones' : 'Pasajero'}
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium mt-1">{user?.email || 'Información no disponible'}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 mt-4 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-extrabold">Institución</span>
                  <span className="font-semibold flex items-center gap-1 mt-0.5">
                    <Briefcase size={12} className="text-indigo-400" /> Sistemas y Computadores SYC
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-extrabold">Estado de Enlace</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Activo Corporativo
                  </span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-extrabold">Id Interno</span>
                  <span className="font-mono text-slate-400 mt-0.5 block">
                    {user?.id ? `SYC-ADMIN-${user.id}` : 'Información no disponible'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-white rounded-xl font-bold py-3 px-4 shadow-sm"
              onClick={() => {
                setEditName(user?.name || '');
                setIsEditModalOpen(true);
              }}
            >
              <Edit3 size={15} className="mr-2" />
              Editar Cuenta
            </Button>
          </div>
        </div>
      </div>

      {/* ================= BENTO GRAPHICS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: SEGURIDAD & ACTIVIDAD (60%) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECCIÓN B: SEGURIDAD DE LA CUENTA (NEW HIGH FIDELITY MODULE) */}
          <section className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Seguridad de la Cuenta</h2>
              </div>
              <span className="text-[9px] px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-black uppercase tracking-wider">Verificado</span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/60 text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Correo Corporativo</span>
                  <span className="text-xs font-bold text-slate-700 truncate block mt-1.5">
                    {user?.email || 'Información no disponible'}
                  </span>
                </div>
                
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/60 text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Estado de Sesión Actual</span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En Línea (Token JWT Securizado)
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 pt-1">
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-400 font-bold text-xs">Esquema de Autenticación</span>
                  <span className="font-extrabold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-mono">
                    Rivo Auth Suite v1.1
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-400 font-bold text-xs">Directivo de Control ID</span>
                  <span className="font-mono font-extrabold text-slate-600">
                    {user?.id ? `SYC-ADMIN-${user.id}` : 'Información no disponible'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-400 font-bold text-xs">Creación de Cuenta / Enlace</span>
                  <span className="font-semibold text-slate-600">
                    {info.createdAt ? formatDate(info.createdAt) : 'Información no disponible'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN C: ÚLTIMO ACCESO (NEW TELEMETRY MODULE WITH REAL GEOMETRIES) */}
          <section className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-indigo-600" />
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Último Acceso Registrado</h2>
              </div>
              <span className="text-[9px] px-2.5 py-0.5 bg-slate-50 text-slate-500 rounded-full font-black uppercase tracking-wider">Actividad</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50/55 rounded-xl border border-slate-100 text-left space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Fecha</span>
                <span className="font-bold text-slate-700 truncate block">
                  {info.lastAccess ? formatAccessDate(info.lastAccess) : 'Información no disponible'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/55 rounded-xl border border-slate-100 text-left space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Hora</span>
                <span className="font-mono font-extrabold text-slate-700 truncate block">
                  {info.lastAccess ? formatAccessTime(info.lastAccess) : 'Información no disponible'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/55 rounded-xl border border-slate-100 text-left space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Dispositivo</span>
                <span className="font-bold text-slate-700 truncate block">
                  {browserTelemetry.os}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/55 rounded-xl border border-slate-100 text-left space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Navegador</span>
                <span className="font-bold text-slate-700 truncate block">
                  {browserTelemetry.browser}
                </span>
              </div>
            </div>
          </section>

          {/* SECCIÓN D: CONSOLA DE ACCIONES RÁPIDAS ADMINISTRATIVAS */}
          <section className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Settings size={18} className="text-slate-400" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Consola Directiva Interna</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                onClick={() => navigate('/admin/operation')}
                className="p-5 border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">Oficina de Operaciones</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-none">Verificación de SOAT y Licencias</p>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all" />
              </div>

              <div 
                onClick={() => navigate('/admin/analytics')}
                className="p-5 border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">Auditoría Vial & Métricas</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-none">Exportación de Reportes Ejecutivos</p>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all" />
              </div>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: ACTIVIDAD DE GESTIÓN & PREFERENCIAS (40%) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* SECCIÓN E: ACTIVIDAD ADMINISTRATIVA (DYNAMIC METRICS FROM DATABASE LOGS) */}
          <section className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 px-1">
              <TrendingUp size={18} className="text-slate-400" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Actividad Administrativa</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {metricCards.slice(0, 4).map((card, idx) => {
                const IconComponent = card.icon;
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "p-4 rounded-[20px] border flex flex-col justify-between transition-all duration-300 hover:shadow-sm",
                      card.color.split(' ').slice(1).join(' ')
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-slate-400">0{idx+1}</span>
                        <IconComponent size={15} className={card.color.split(' ')[0]} />
                      </div>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-4 leading-tight">
                        {card.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-slate-900 tracking-tight mt-3">
                        {card.count}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECCIÓN F: HISTORIAL DE AUDITORÍA (REAL TIMELINE FROM DB LOGS) */}
          <section className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Clock size={18} className="text-slate-400" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Logs de Auditoría Vial</h2>
            </div>

            {timeline.length > 0 ? (
              <div className="space-y-4 relative pl-3 border-l border-slate-100 ml-2 py-1">
                {visibleTimeline.map((item, idx) => {
                  const badge = getActionBadgeDetails(item.action);
                  const BadgeIcon = badge.icon;
                  return (
                    <div key={item.id || idx} className="relative group text-left">
                      {/* Timeline dot */}
                      <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white group-hover:bg-indigo-600 transition-colors" />
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {badge.label}
                          </span>
                          <span className="text-[8px] text-slate-400 font-mono">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 leading-snug">
                          {item.details}
                        </p>
                        <p className="text-[8.5px] font-mono text-slate-400">
                          Ref: #{item.id}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {timeline.length > 5 && (
                  <button
                    onClick={() => setShowAllTimeline(!showAllTimeline)}
                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 cursor-pointer uppercase tracking-wider block mt-3 border-t border-slate-50 pt-2"
                  >
                    {showAllTimeline ? 'Ver menos' : `Ver ${timeline.length - 5} logs adicionales`}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Sin actividades activas de control</p>
            )}
          </section>

          {/* SECCIÓN G: AJUSTES & PREFERENCIAS INTEGRADOS */}
          <section className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Settings size={18} className="text-slate-400" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Preferencias de Rivo</h2>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                { 
                  icon: Bell, 
                  label: 'Notificaciones push', 
                  color: 'text-violet-600 bg-violet-50/60 border-violet-100/50', 
                  badge: 'Próximamente',
                  onClick: () => showToast('Funcionalidad disponible próximamente.', 'info')
                },
                { 
                  icon: Moon, 
                  label: 'Modo oscuro corporativo', 
                  color: 'text-indigo-600 bg-indigo-50/60 border-indigo-100/50', 
                  badge: 'Próximamente',
                  onClick: () => showToast('Modo oscuro disponible próximamente.', 'info')
                },
                { 
                  icon: ShieldCheck, 
                  label: 'Privacidad de datos de SyC', 
                  color: 'text-emerald-600 bg-emerald-50/60 border-emerald-100/50', 
                  onClick: () => navigate('/profile/privacy')
                },
                { 
                  icon: HelpCircle, 
                  label: 'Centro de Soporte Oficial', 
                  color: 'text-amber-600 bg-amber-50/60 border-amber-100/50', 
                  onClick: () => navigate('/profile/help')
                },
              ].map((item, i) => (
                <button 
                  key={i} 
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between py-3 hover:bg-slate-50/20 text-left cursor-pointer group"
                >
                   <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl border transition-all duration-200 group-hover:scale-105", item.color)}>
                         <item.icon size={15} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-xs group-hover:text-indigo-600 transition-colors">{item.label}</p>
                        {item.badge && <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mt-0.5">{item.badge}</span>}
                      </div>
                   </div>
                   <ChevronRight size={14} className="text-slate-350 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all" />
                </button>
              ))}
              
              <button 
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center justify-between py-3 text-left cursor-pointer group"
              >
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-50 text-red-500 border border-red-100/20 group-hover:bg-red-100 transition-all">
                       <LogOut size={15} />
                    </div>
                    <p className="font-bold text-red-500 text-xs">Cerrar Sesión Directiva</p>
                 </div>
                 <ChevronRight size={14} className="text-red-300 group-hover:translate-x-0.5 group-hover:text-red-500 transition-all" />
              </button>
            </div>
          </section>

        </div>

      </div>

      {/* ================= EDIT PROFILE DIALOG MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Identidad Corporativa de Alta Dirección"
        footer={
          <div className="flex gap-2 w-full">
            <Button 
              variant="secondary" 
              onClick={() => setIsEditModalOpen(false)} 
              className="flex-1 rounded-xl py-4 text-xs font-bold text-slate-550 border-slate-100"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProfileName} 
              className="flex-1 rounded-xl py-4 text-xs font-bold bg-indigo-650 hover:bg-indigo-700"
            >
              Guardar Identidad
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2 text-left">
          <p className="text-xs text-slate-500 font-medium">
            Por favor, define el nombre que se mostrará en los reportes corporativos y las operaciones de auditoría interna de SyC.
          </p>
          <Input 
            label="Tu nombre o cargo oficial"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="rounded-xl border-slate-200/80 mt-1"
            placeholder="Ej: Ing. Liliana Gómez Cardona"
          />
        </div>
      </Modal>

      {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="¿Finalizar Sesión Operativa?"
        footer={
          <div className="flex gap-2 w-full">
            <Button 
              variant="secondary" 
              onClick={() => setShowLogoutModal(false)} 
              className="flex-1 rounded-xl py-4 text-xs font-bold text-slate-550 border-slate-100"
            >
              Permanecer Activo
            </Button>
            <Button 
              onClick={() => {
                logout();
                setShowLogoutModal(false);
                showToast('Sesión directiva finalizada correctamente', 'success');
                navigate('/login');
              }} 
              className="flex-1 bg-red-500 hover:bg-red-650 rounded-xl py-4 text-xs font-bold"
            >
              Cerrar Sesión
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center space-y-3 pt-3 pb-1 text-left">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-1">
            <LogOut size={28} />
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm">
            Si finalizas tu sesión directiva, se revocarán provisionalmente tus permisos locales activos y necesitarás reautenticarte en Rivo para coordinar el parque automotor de SyC.
          </p>
        </div>
      </Modal>

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

  if (isAdminUser(user?.role)) {
    return (
      <div className="space-y-8 pb-24 overflow-x-hidden pt-4 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6">
        <AdminProfile user={user} />
        
        <footer className="text-center py-10">
          <p className="text-xs text-slate-400 font-extrabold uppercase tracking-[0.16em]">Rivo v1.0.8 • Experiencia Administrador • SyC</p>
        </footer>
      </div>
    );
  }

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
                 {!isAdminUser(user?.role) && (
                   <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-2xl border border-amber-100 shadow-sm">
                     <Star size={14} fill="currentColor" />
                     <span className="text-sm font-black">{(!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? 'Nuevo' : parseFloat(user.rating.toString()).toFixed(1)}</span>
                   </div>
                 )}
                 <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl">
                   {user?.role === UserRole.DRIVER ? 'Conductor' : isAdminUser(user?.role) ? 'Administrador' : 'Pasajero'}
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
      ) : isAdminUser(user?.role) ? (
        <AdminProfile user={user} />
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
        <p className="text-xs text-slate-400 font-extrabold uppercase tracking-[0.16em]">Rivo v1.0.8 • Experiencia {user?.role === UserRole.DRIVER ? 'Conductor' : isAdminUser(user?.role) ? 'Administrador' : 'Pasajero'} • SyC</p>
      </footer>
    </div>
  );
};

export default ProfileView;
