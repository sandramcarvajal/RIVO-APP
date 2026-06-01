import React from 'react';
import { motion } from 'motion/react';
import { 
  Car, 
  Users, 
  Star, 
  ChevronRight, 
  Compass, 
  ArrowRight,
  Clock,
  Sparkles,
  MapPin,
  Route as RouteIcon,
  Bell,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { JoinRequestStatus, RouteStatus } from '../shared/enums';
import { VehicleService } from '../client/modules/auth/services/VehicleService';
import { Vehicle } from '../types';

// Imported high-quality custom generated assets matching passenger parity
const imgPiedecuesta = new URL('../client/modules/auth/services/assets/images/piedecuesta.png', import.meta.url).href;
const imgFloridablanca = new URL('../client/modules/auth/services/assets/images/santisimo.png', import.meta.url).href;
const imgGiron = new URL('../client/modules/auth/services/assets/images/giron.png', import.meta.url).href;
const imgBucaramanga = new URL('../client/modules/auth/services/assets/images/bucaramanga.png', import.meta.url).href;
const imgCarCardBg = new URL('../assets/images/car_card_bg_1779742005680.png', import.meta.url).href;
const imgMotoCardBg = new URL('../assets/images/moto_card_bg_1779742720588.png', import.meta.url).href;
const imgheroDriver = new URL('../assets/images/heroDriver.png', import.meta.url).href;

interface HomeDriverViewProps {
  user: any;
  routes: any[];
  requests: any[];
  navigate: (path: string) => void;
  picoPlaca: { canCirculate: boolean; message: string } | null;
}

export const HomeDriverView: React.FC<HomeDriverViewProps> = ({
  user,
  routes,
  requests,
  navigate,
  picoPlaca
}) => {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [userDocs, setUserDocs] = React.useState<any[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [vehiclesList, userDocsList] = await Promise.all([
          VehicleService.getVehicles(),
          VehicleService.getUserDocuments()
        ]);
        if (active) {
          setVehicles(vehiclesList);
          setUserDocs(userDocsList);
        }
      } catch (err) {
        console.error("Error loading vehicles and user docs in HomeDriverView:", err);
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  const activeVehicle = vehicles.find((v: any) => v.isActive);
  const soatDocument = activeVehicle?.documents?.find((d: any) => d.documentType === 'soat');
  
  const isSoatExpired = React.useMemo(() => {
    if (!soatDocument || !soatDocument.expirationDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(soatDocument.expirationDate);
    return expDate < today;
  }, [soatDocument]);

  const hasApprovedSoat = soatDocument && soatDocument.status?.toLowerCase() === 'approved' && !isSoatExpired;

  const licenseDocument = userDocs.find((d: any) => d.documentType === 'license');
  
  const isLicenseExpired = React.useMemo(() => {
    if (!licenseDocument || !licenseDocument.expirationDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(licenseDocument.expirationDate);
    return expDate < today;
  }, [licenseDocument]);

  const hasApprovedLicense = licenseDocument && licenseDocument.status?.toLowerCase() === 'approved' && !isLicenseExpired;

  // Analytical metrics for the driver
  const myRoutesAsDriver = routes.filter((r: any) => String(r.driverId) === String(user.id));
  
  const acceptedPassengersCount = requests.filter((r: any) => {
    const route = routes.find((rt: any) => String(rt.id) === String(r.routeId));
    return String(route?.driverId) === String(user.id) && String(r.status).toLowerCase() === String(JoinRequestStatus.ACCEPTED).toLowerCase();
  }).length;

  const pendingRequests = requests.filter((r: any) => {
    const route = routes.find((rt: any) => String(rt.id) === String(r.routeId));
    return String(route?.driverId) === String(user.id) && String(r.status).toLowerCase() === String(JoinRequestStatus.PENDING).toLowerCase();
  });

  const myActiveRoutes = routes.filter((r: any) => 
    String(r.driverId) === String(user.id) && 
    [RouteStatus.SCHEDULED, RouteStatus.IN_PROGRESS].includes(r.status.toLowerCase() as RouteStatus)
  );

  return (
    <div className="max-w-[480px] mx-auto w-full space-y-6 relative pb-24 text-left bg-transparent min-h-screen px-4 pt-1.5">
      {/* Decorative premium path glow effects */}
      <div className="absolute top-[-90px] right-[-90px] w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[40%] left-[-120px] w-80 h-80 bg-emerald-200/5 rounded-full blur-[110px] pointer-events-none -z-10" />

      {/* 1. Header with Name & Subtitle */}
      <header className="space-y-1.5 pt-2">
        <motion.div 
          initial={{ opacity: 0, y: -8 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="space-y-1"
        >
          <h2 className="text-3xl font-black tracking-tight leading-none text-slate-900">
            Hola, {user?.name?.split(' ')[0] || 'Conductor'}
          </h2>
          <p className="text-sm font-semibold text-slate-500 tracking-normal">
            Gestiona tus rutas
          </p>
        </motion.div>

        {/* 2. Metrics Premium Chips Row (Exactly symmetrical to passenger layout) */}
        <div className="flex flex-wrap gap-2 pt-3">
          {/* Card 1: Viajes Creados */}
          <div className="flex-1 min-w-[110px] bg-white p-3 rounded-[22px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50/80 flex items-center justify-center text-primary shrink-0">
              <Compass size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-slate-900 leading-none">
                {myRoutesAsDriver.length}
              </p>
              <p className="text-sm text-slate-400 font-bold leading-none mt-1.5 truncate">
                Rutas
              </p>
            </div>
          </div>
          
          {/* Card 2: Pasajeros Confirmados */}
          <div className="flex-1 min-w-[110px] bg-white p-3 rounded-[22px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50/80 flex items-center justify-center text-secondary shrink-0">
              <Users size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-slate-900 leading-none">
                {acceptedPassengersCount}
              </p>
              <p className="text-sm text-slate-400 font-bold leading-none mt-1.5 truncate">
                Pasajeros
              </p>
            </div>
          </div>

          {/* Card 3: Calificación */}
          <div className="flex-1 min-w-[110px] bg-white p-3 rounded-[22px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50/80 flex items-center justify-center text-amber-500 shrink-0">
              <Star size={16} className="fill-amber-400 text-amber-400" strokeWidth={1} />
            </div>
            <div className="min-w-0">
              {(!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? (
                <>
                  <p className="text-xs font-black text-amber-600 leading-none uppercase tracking-wide">
                    Nuevo
                  </p>
                  <p className="text-[11px] text-slate-400 font-bold leading-none mt-1.5 truncate" title="Sin calificaciones aún">
                    Sin califs.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-black text-slate-900 leading-none">
                    {parseFloat(user.rating.toString()).toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-400 font-bold leading-none mt-1 truncate">
                    {user.reviewCount} calif.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* [PICO Y PLACA ALERT BANNER] - Polished matching color schema */}
      {picoPlaca && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-4 rounded-3xl border text-left flex items-center justify-between gap-3 shadow-xs transition-all",
            picoPlaca.canCirculate 
              ? "bg-libre-bg border-libre-border/60 text-libre-text" 
              : "bg-restriccion-bg border-restriccion-border text-restriccion-text"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base shrink-0 select-none">
              {picoPlaca.canCirculate ? "✅" : "⚠️"}
            </span>
            <div className="min-w-0">
              <p className="font-extrabold text-sm leading-tight text-slate-900">
                {picoPlaca.canCirculate ? "Puedes circular hoy" : "Tienes Pico y Placa hoy"}
              </p>
              <p className="text-xs opacity-80 font-semibold leading-normal mt-0.5 truncate">
                {picoPlaca.canCirculate 
                  ? `Matrícula ${user.vehicle?.plate || '—'} sin restricción activa.`
                  : "Por favor evita publicar rutas programadas si no puedes circular."}
              </p>
            </div>
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl shrink-0 text-center shadow-xs text-white",
            picoPlaca.canCirculate ? "bg-[#10B981]" : "bg-[#EF4444]"
          )}>
            {picoPlaca.canCirculate ? "Libre" : "Restricción"}
          </span>
        </motion.div>
      )}

      {/* [LICENSE WARNING BANNER] - Premium amber or red layout depending on expiration */}
      {!loadingData && !hasApprovedLicense && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-4 rounded-3xl border text-left flex items-center justify-between gap-3 shadow-xs transition-all mb-4",
            isLicenseExpired 
              ? "bg-rose-50/90 border-rose-200 text-rose-950" 
              : "bg-amber-50/90 border-amber-200 text-amber-950"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base shrink-0 select-none">
              🪪
            </span>
            <div className="min-w-0">
              <p className="font-extrabold text-sm leading-tight text-slate-950">
                {isLicenseExpired ? "Licencia Vencida" : "Licencia Requerida"}
              </p>
              <p className={cn(
                "text-xs font-semibold leading-normal mt-0.5 whitespace-normal",
                isLicenseExpired ? "text-rose-800" : "text-amber-800"
              )}>
                {isLicenseExpired 
                  ? "Tu licencia de conducción está vencida. Actualízala para continuar publicando."
                  : "Debes cargar tu licencia de conducción para comenzar a publicar rutas."}
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile')} 
            className="text-[11px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl shrink-0 transition-all active:scale-[0.98] text-white shadow-sm hover:shadow-md"
            style={{ backgroundColor: isLicenseExpired ? '#DC2626' : '#D97706' }}
          >
            Ir a Mi Garaje
          </button>
        </motion.div>
      )}

      {/* [SOAT WARNING BANNER] - Premium amber or red layout depending on expiration */}
      {!loadingData && !hasApprovedSoat && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-4 rounded-3xl border text-left flex items-center justify-between gap-3 shadow-xs transition-all",
            isSoatExpired 
              ? "bg-rose-50/90 border-rose-200 text-rose-950" 
              : "bg-amber-50/90 border-amber-200 text-amber-950"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base shrink-0 select-none">
              ⚠️
            </span>
            <div className="min-w-0">
              <p className="font-extrabold text-sm leading-tight text-slate-950">
                {isSoatExpired ? "SOAT Vencido" : "SOAT Requerido"}
              </p>
              <p className={cn(
                "text-xs font-semibold leading-normal mt-0.5 whitespace-normal",
                isSoatExpired ? "text-rose-800" : "text-amber-800"
              )}>
                {isSoatExpired 
                  ? "Tu SOAT venció. Actualízalo para continuar publicando."
                  : "⚠ Completa la verificación del SOAT para comenzar a publicar rutas."}
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile')} 
            className="text-[11px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl shrink-0 transition-all active:scale-[0.98] text-white shadow-sm hover:shadow-md"
            style={{ backgroundColor: isSoatExpired ? '#DC2626' : '#D97706' }}
          >
            Ir a Mi Garaje
          </button>
        </motion.div>
      )}

      {/* 3. Hero Grande Dominante */}
      <section>
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-slate-100 p-6 xs:p-7 sm:p-8 w-full aspect-[1.4/1] flex flex-col justify-between shadow-[0_12px_28px_rgba(79,70,229,0.06)] border border-slate-200"
        >
          {/* Background image covering full card */}
          <div className="absolute inset-0 select-none pointer-events-none z-0">
            <img 
              src={imgheroDriver} 
              alt="Driver sharing" 
              className="w-full h-full object-fill"
              referrerPolicy="no-referrer"
            />
            {/* Soft blend overlay matching the gray palette subtly */}
            <div className="absolute inset-0 bg-slate-900/5 mix-blend-multiply" />
          </div>

          <div className="space-y-1 relative z-10 max-w-[55%] xs:max-w-[60%] text-left">
            <span className="text-emerald-700 text-[10px] sm:text-[11px] font-black uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Conduce y gana
            </span>
            <h3 className="text-[22px] sm:text-2xl font-black text-slate-950 tracking-tight leading-tight pt-2">
              Comparte tu ruta hoy
            </h3> 
            <p className="text-slate-600 text-[11px] sm:text-xs font-semibold leading-relaxed">
              Registra tu trayecto<br />
              y viaja en<br />
              compañía.
            </p>
          </div>

          <div className="relative z-20 w-fit">
            <button 
              onClick={() => navigate('/create')} 
              className="bg-primary hover:bg-primary-hover hover:shadow-[0_8px_24px_rgba(79,70,229,0.15)] text-white font-black px-4.5 py-2.5 sm:px-5.5 sm:py-3 rounded-2xl text-[12px] sm:text-[13px] tracking-tight active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(79,70,229,0.12)] border-none shrink-0"
            >
              Publicar ruta <ArrowRight size={13} className="stroke-[3px]" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* [PENDING REQUESTS NOTIFICATION CORNER] - Symmetrical & Dynamic Alert */}
      {pendingRequests.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-bg p-4.5 rounded-3xl border border-accent-border/60 shadow-[0_4px_16px_rgba(245,158,11,0.06)] flex items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 relative">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center">
                {pendingRequests.length}
              </span>
            </div>
            <div className="min-w-0 space-y-0.5 text-left">
              <p className="text-sm font-extrabold text-[#9A3412]">
                ¡Tienes solicitudes de viaje esperando!
              </p>
              <p className="text-xs text-[#C2410C] font-semibold leading-snug">
                Tienes {pendingRequests.length} pasajeros esperando tu confirmación.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/requests')} 
            className="bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-black px-3.5 py-2 rounded-xl shrink-0 transition-colors shadow-sm"
          >
            Aceptar
          </button>
        </motion.div>
      )}

      {/* 4. SECCIÓN "PARA TI" DEBAJO DEL HERO (Beautiful Car vs Moto publication cards) */}
      <section className="space-y-3 pt-2">
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight text-left">
          Tu transporte habitual
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Card Carro Conductor */}
          <div 
            onClick={() => navigate('/create')}
            className="group flex flex-col cursor-pointer text-left transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none"
          >
            <div className="mb-2.5 space-y-0.5">
              <h4 className="font-extrabold text-slate-900 text-[15px] sm:text-base leading-tight group-hover:text-primary transition-colors">
                Publicar en carro
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-snug">
                Ofrece cupos cómodos
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[20px] bg-slate-100 aspect-[1.8/1] w-full shadow-[0_8px_24px_rgba(148,163,184,0.04)] border border-slate-200/50">
              <img 
                src={imgCarCardBg} 
                alt="Ofrecer carro" 
                className="w-full h-full absolute inset-0 object-cover object-left-top transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/5 mix-blend-multiply" />
            </div>
          </div>

          {/* Card Moto Conductor */}
          <div 
            onClick={() => navigate('/create')}
            className="group flex flex-col cursor-pointer text-left transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none"
          >
            <div className="mb-2.5 space-y-0.5">
              <h4 className="font-extrabold text-slate-900 text-[15px] sm:text-base leading-tight group-hover:text-primary transition-colors">
                Publicar en moto
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-snug">
                Lleva un pasajero rápido
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[20px] bg-slate-100 aspect-[1.8/1] w-full shadow-[0_8px_24px_rgba(148,163,184,0.04)] border border-slate-200/50">
              <img 
                src={imgMotoCardBg} 
                alt="Ofrecer moto" 
                className="w-full h-full absolute inset-0 object-cover object-center transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/5 mix-blend-multiply" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECCIÓN "PUNTOS COMUNES DE RUTA" (Symmetrical destinations mapping to form query) */}
      <section className="space-y-3 pt-1">
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
          Destinos frecuentes
        </h3>
        <div className="grid grid-cols-1 min-[350px]:grid-cols-2 gap-3">
          {/* Piedecuesta */}
          <div 
            onClick={() => navigate('/create?destination=Piedecuesta')}
            className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm hover:border-slate-200 cursor-pointer active:scale-95 transition-all text-center pb-3 flex flex-col justify-between"
          >
            <div className="h-24 sm:h-28 overflow-hidden bg-slate-50">
              <img 
                src={imgPiedecuesta} 
                alt="Piedecuesta" 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-base font-extrabold text-slate-800 mt-2">Piedecuesta</p>
          </div>

          {/* Floridablanca */}
          <div 
            onClick={() => navigate('/create?destination=Floridablanca')}
            className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm hover:border-slate-200 cursor-pointer active:scale-95 transition-all text-center pb-3 flex flex-col justify-between"
          >
            <div className="h-24 sm:h-28 overflow-hidden bg-slate-50">
              <img 
                src={imgFloridablanca} 
                alt="Floridablanca" 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-base font-extrabold text-slate-800 mt-2">Floridablanca</p>
          </div>

          {/* Girón */}
          <div 
            onClick={() => navigate('/create?destination=Giron')}
            className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm hover:border-slate-200 cursor-pointer active:scale-95 transition-all text-center pb-3 flex flex-col justify-between"
          >
            <div className="h-24 sm:h-28 overflow-hidden bg-slate-50">
              <img 
                src={imgGiron} 
                alt="Girón" 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-base font-extrabold text-slate-800 mt-2">Girón</p>
          </div>

          {/* Bucaramanga */}
          <div 
            onClick={() => navigate('/create?destination=Bucaramanga')}
            className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm hover:border-slate-200 cursor-pointer active:scale-95 transition-all text-center pb-3 flex flex-col justify-between"
          >
            <div className="h-24 sm:h-28 overflow-hidden bg-slate-50">
              <img 
                src={imgBucaramanga} 
                alt="Bucaramanga" 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-base font-extrabold text-slate-800 mt-2">Bucaramanga</p>
          </div>
        </div>
      </section>

      {/* 6. Mis rutas activas (list matching Passenger UI details) */}
      <section className="space-y-3.5 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            Mis rutas activas
          </h3>
          <button 
            onClick={() => navigate('/requests')} 
            className="text-secondary hover:text-secondary-hover text-sm font-black tracking-wider uppercase"
          >
            VER TODAS
          </button>
        </div>

        {myActiveRoutes.length > 0 ? (
          <div className="space-y-3">
            {myActiveRoutes.slice(0, 3).map((route: any) => (
              <div 
                key={route.id} 
                onClick={() => navigate(`/route/${route.id}`)}
                className="bg-white p-4 rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.015)] border border-slate-100 hover:border-slate-200/80 transition-all cursor-pointer active:scale-[0.99] group text-left flex flex-col min-[390px]:flex-row min-[390px]:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100/50 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-base">{user?.vehicle?.brand?.toLowerCase().includes('moto') ? '🏍️' : '🚗'}</span>
                  </div>
                  <div className="space-y-0.5 min-w-0 text-left">
                    <p className="font-extrabold text-slate-800 text-base truncate leading-snug">
                      {route.origin?.split(',')[0]} ➔ {route.destination?.split(',')[0]}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-400 font-bold leading-none pt-0.5">
                        Hoy, {route.time || '8:00 AM'}
                      </p>
                      {route.status.toLowerCase() === RouteStatus.IN_PROGRESS && (
                        <span className="bg-amber-100/70 text-amber-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-200/50 animate-pulse">
                          En curso
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between min-[390px]:justify-end gap-3 w-full min-[390px]:w-auto"
                >
                  <div className="text-right">
                    <p className="text-secondary text-xs sm:text-sm font-black whitespace-nowrap">
                      {route.availableSeats ?? 0} cupos
                    </p>

                    <p className="text-slate-900 text-sm sm:text-base font-black whitespace-nowrap">
                      {route.price
                        ? `$${Number(route.price).toLocaleString('es-CO')}`
                        : 'Gratis'}
                    </p>
                  </div>

                  <div className="w-7 h-7 bg-[#f8fafc] rounded-full flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-secondary transition-colors">
                    <ChevronRight size={13} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[24px] border border-slate-100 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-secondary/80">
              <Car size={20} className="text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-700">Sin rutas activas de momento</p>
              <p className="text-sm text-slate-400 font-bold leading-relaxed">No tienes recorridos programados para el resto del día.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
