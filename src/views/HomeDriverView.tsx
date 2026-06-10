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
  AlertTriangle,
  Bike,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { JoinRequestStatus, RouteStatus } from '../shared/enums';
import { VehicleService } from '../client/modules/auth/services/VehicleService';
import { Vehicle } from '../types';

// Imported high-quality custom generated assets matching passenger parity
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

  // Load vehicles and driver documents
  const loadDriverData = async () => {
    try {
      const [vehiclesList, userDocsList] = await Promise.all([
        VehicleService.getVehicles(),
        VehicleService.getUserDocuments()
      ]);
      setVehicles(vehiclesList);
      setUserDocs(userDocsList);
    } catch (err) {
      console.error("Error loading vehicles and user docs in HomeDriverView:", err);
    } finally {
      setLoadingData(false);
    }
  };

  React.useEffect(() => {
    loadDriverData();
  }, []);

  const handleActivateVehicle = async (id: string) => {
    try {
      setLoadingData(true);
      await VehicleService.activateVehicle(id);
      await loadDriverData();
    } catch (err) {
      console.error("Error activating vehicle in HomeDriverView:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const activeVehicle = vehicles.find((v: any) => v.isActive);
  const otherVehicles = vehicles.filter((v: any) => !v.isActive);

  const soatDocument = activeVehicle?.documents?.find((d: any) => d.documentType === 'soat');
  const propertyCardDocument = activeVehicle?.documents?.find((d: any) => d.documentType === 'property_card');
  const techDocument = activeVehicle?.documents?.find((d: any) => d.documentType === 'tech_preventive');
  const licenseDocument = userDocs.find((d: any) => d.documentType === 'license');
  
  const getDocStatus = (doc: any) => {
    if (!doc) return "missing";
    const status = (doc.status || "pending").toLowerCase();
    
    if (doc.expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(doc.expirationDate);
      if (expDate < today) {
        return "expired";
      }
    }
    return status;
  };

  const soatState = getDocStatus(soatDocument);
  const propCardState = getDocStatus(propertyCardDocument);
  const techState = getDocStatus(techDocument);
  const licenseState = getDocStatus(licenseDocument);

  // Symmetrical verification logic matching security requirements
  const hasApprovedSoat = soatState === 'approved';
  const hasApprovedLicense = licenseState === 'approved';

  // Overall account eligibility status (Verde, Amarillo, Rojo)
  const overallState: 'green' | 'yellow' | 'red' = React.useMemo(() => {
    if (vehicles.length === 0) return 'red';
    if (!activeVehicle) return 'red';
    
    const allStates = [soatState, propCardState, techState, licenseState];
    if (allStates.includes('expired') || allStates.includes('rejected') || allStates.includes('missing')) {
      return 'red';
    }
    if (allStates.includes('pending')) {
      return 'yellow';
    }
    return 'green';
  }, [vehicles, activeVehicle, soatState, propCardState, techState, licenseState]);

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

  // Helper styles for compact documents rendering
  const getCompactBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aprobado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/50 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Revisión
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/50 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Vencido
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/50 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200/50 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Sin Cargar
          </span>
        );
    }
  };

  return (
    <div className="max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full space-y-6 relative pb-24 text-left bg-transparent min-h-screen px-4 pt-1.5">
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
                  ? `Matrícula ${activeVehicle?.plate || '—'} sin restricción activa.`
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

      {/* 3. COCKPIT OPERATIVO POR SEMÁFORO (Estilo Uber Driver) */}
      <section className="space-y-4">
        {/* Semáforo de Operación de la Cuenta */}
        <div className={cn(
          "p-4 rounded-3xl border transition-all duration-300",
          overallState === 'green' 
            ? "bg-emerald-50/70 border-emerald-250/50 text-slate-900" 
            : overallState === 'yellow'
              ? "bg-amber-50/70 border-amber-250/50 text-slate-900"
              : "bg-rose-50/70 border-rose-250/50 text-slate-900"
        )}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                overallState === 'green' ? "bg-emerald-400" : overallState === 'yellow' ? "bg-amber-400" : "bg-rose-400"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-3.5 w-3.5",
                overallState === 'green' ? "bg-emerald-500" : overallState === 'yellow' ? "bg-amber-500" : "bg-rose-500"
              )} />
            </span>
            <div className="min-w-0">
              <p className="font-extrabold text-sm leading-tight text-slate-900">
                {overallState === 'green' ? "🟢 Todo listo para conducir" : 
                 overallState === 'yellow' ? "🟡 Validación pendiente" : "🔴 Acción requerida"}
              </p>
              <p className="text-xs text-slate-550 font-bold leading-normal mt-0.5 text-slate-500">
                {overallState === 'green' ? "Tu cuenta está activa de manera permanente. ¡Buen viaje!" : 
                 overallState === 'yellow' ? "Estamos verificando internamente tus soportes cargados." : "Actualiza tus soportes vencidos o pendientes para recibir pasajeros."}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta de Vehículo Activo Compacta (Estilo Uber Driver - 100% full-width highlighted segment) */}
        {!loadingData && !activeVehicle ? (
          <div className="p-6 text-center bg-white border border-dashed border-slate-200 rounded-[28px] space-y-4 shadow-sm">
            <Car className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-extrabold text-sm text-slate-700">No tienes vehículo principal configurado</p>
            <button 
              onClick={() => navigate('/profile')} 
              className="px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs cursor-pointer"
            >
              Configurar vehículo principal
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-105 p-5 rounded-[26px] shadow-sm relative overflow-hidden flex flex-col gap-4 border-slate-150">
            {/* Header / Subdued watermark */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Vehículo Activo
              </span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-wider rounded-md">
                Principal
              </span>
            </div>

            {/* Premium Compact details (No individual tables, no expiration sheets) */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  {activeVehicle?.type === "motorcycle" ? <Bike size={20} /> : <Car size={20} />}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-[15px] leading-tight">
                    {activeVehicle?.brand}
                  </h4>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    Modelo {activeVehicle?.model || "—"} • {activeVehicle?.color}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="bg-amber-400 text-slate-900 border border-slate-200 px-2 py-0.5 rounded font-mono font-black text-xs tracking-widest uppercase shadow-2xs">
                  {activeVehicle?.plate}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  {overallState === 'green' ? '✓ Documentos al día' : '⚠ Revisar soportes'}
                </span>
              </div>
            </div>

            {/* Immediate Uber-Driver standard Mi Garaje button */}
            <div className="pt-1.5 border-t border-slate-50">
              <button 
                onClick={() => navigate('/profile')}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-indigo-50/80 hover:text-indigo-700 hover:border-indigo-300/50 hover:scale-[1.015] border border-slate-200/50 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ease-out text-slate-600 active:scale-[0.98] shadow-2xs hover:shadow-xs cursor-pointer group"
              >
                <Car size={13} className="text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300 ease-out" />
                Ver Mi Garaje
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Hero Grande Dominante */}
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
