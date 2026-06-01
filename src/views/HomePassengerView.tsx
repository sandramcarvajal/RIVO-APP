import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  MapPin, 
  Star, 
  ChevronRight, 
  Compass, 
  ArrowRight,
  Clock,
  Sparkles,
  Search,
  Users,
  Globe
} from 'lucide-react';
import Button from '../components/ui/Button';
import { cn } from '../lib/utils';
import { JoinRequestStatus, RouteStatus } from '../shared/enums';

// Imported high-quality custom generated assets
const imgHeroPassenger = new URL('../client/modules/auth/services/assets/images/heroPassanger.png', import.meta.url).href;
const imgPiedecuesta = new URL('../client/modules/auth/services/assets/images/piedecuesta.png', import.meta.url).href;
const imgFloridablanca = new URL('../client/modules/auth/services/assets/images/santisimo.png', import.meta.url).href;
const imgGiron = new URL('../client/modules/auth/services/assets/images/giron.png', import.meta.url).href;
const imgBucaramanga = new URL('../client/modules/auth/services/assets/images/bucaramanga.png', import.meta.url).href;
const imgCarCardBg = new URL('../assets/images/car_card_bg_1779742005680.png', import.meta.url).href;
const imgMotoCardBg = new URL('../assets/images/moto_card_bg_1779742720588.png', import.meta.url).href;

interface HomePassengerViewProps {
  user: any;
  routes: any[];
  requests: any[];
  navigate: (path: string) => void;
}

export const HomePassengerView: React.FC<HomePassengerViewProps> = ({
  user,
  routes,
  requests,
  navigate
}) => {
  const myAcceptedRequests = requests.filter(
    (req: any) => String(req.passengerId) === String(user.id) && String(req.status).toLowerCase() === String(JoinRequestStatus.ACCEPTED).toLowerCase()
  );
  
  const myTotalRequests = requests.filter(
    (req: any) => String(req.passengerId) === String(user.id)
  );

  const myUniqueRutasCount = [...new Set(myTotalRequests.map(r => r.routeId))].length;

  const recommendableRoutes = routes.filter((route: any) => {
    return route.canJoin !== false;
  });

  return (
    <div className="max-w-[480px] mx-auto w-full space-y-6 relative pb-24 text-left bg-transparent min-h-screen px-4 pt-1.5">
      {/* Decorative premium path glow effects */}
      <div className="absolute top-[-90px] right-[-90px] w-96 h-96 bg-emerald-400/5 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[40%] left-[-120px] w-80 h-80 bg-indigo-200/10 rounded-full blur-[110px] pointer-events-none -z-10" />

      {/* 1. Header with Name & Subtitle */}
      <header className="space-y-1.5 pt-2">
        <motion.div 
          initial={{ opacity: 0, y: -8 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="space-y-1"
        >
          <h2 className="text-3xl font-black tracking-tight leading-none text-slate-900">
            Hola, {user?.name?.split(' ')[0] || 'Pasajero'}
          </h2>
          <p className="text-sm font-semibold text-slate-500 tracking-normal">
            Reserva y relájate
          </p>
        </motion.div>

        {/* 2. Metrics Premium Chips Row */}
        <div className="flex flex-wrap gap-2 pt-3">
          {/* Card 1: Viajes Realizados */}
          <div className="flex-1 min-w-[110px] bg-white p-3 rounded-[22px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50/80 flex items-center justify-center text-secondary shrink-0">
              <Car size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-slate-900 leading-none">
                {myAcceptedRequests.length}
              </p>
              <p className="text-sm text-slate-400 font-bold leading-none mt-1.5 truncate">
                Viajes
              </p>
            </div>
          </div>
          
          {/* Card 2: Destinos Visitados */}
          <div className="flex-1 min-w-[110px] bg-white p-3 rounded-[22px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50/80 flex items-center justify-center text-purple-500 shrink-0">
              <MapPin size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-slate-900 leading-none">
                {myUniqueRutasCount}
              </p>
              <p className="text-sm text-slate-400 font-bold leading-none mt-1.5 truncate">
                Rutas
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

      {/* 3. Hero Grande Dominante */}
      <section>
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-slate-100 p-5 xs:p-6 sm:p-7 w-full aspect-[1.4/1] flex items-end justify-start shadow-[0_12px_28px_rgba(148,163,184,0.05)] border border-slate-200/50"
        >
          {/* Background image covering full card */}
          <div className="absolute inset-0 select-none pointer-events-none z-0">
            <img 
              src={imgHeroPassenger} 
              alt="Passenger travel" 
              className="w-full h-full object-fill"
              referrerPolicy="no-referrer"
            />
            {/* Soft blend overlay matching the gray palette sutilly */}
            <div className="absolute inset-0 bg-slate-900/5 mix-blend-multiply" />
          </div>

          {/* Button on top of the card background */}
          <div className="relative z-20 w-fit">
            <button 
              onClick={() => navigate('/explore')} 
              className="bg-primary hover:bg-primary-hover hover:shadow-[0_8px_24px_rgba(79,70,229,0.15)] text-white font-black px-4.5 py-2 sm:px-5.5 sm:py-2.5 rounded-2xl text-[12px] sm:text-[13px] tracking-tight active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(79,70,229,0.12)] border-none shrink-0"
            >
              Buscar viaje <ArrowRight size={13} className="stroke-[3px]" />
            </button>
          </div>

        </motion.div>
      </section>

      {/* 4. SECCIÓN "PARA TI" DEBAJO DEL HERO */}
      <section className="space-y-3 pt-2">
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight text-left">
          Para ti
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Card Carro */}
          <div 
            onClick={() => navigate('/explore?type=car')}
            className="group flex flex-col cursor-pointer text-left transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none"
          >
            {/* Text placed under "Para ti" and above the image card */}
            <div className="mb-2.5 space-y-0.5">
              <h4 className="font-extrabold text-slate-900 text-[15px] sm:text-base leading-tight group-hover:text-primary transition-colors">
                Viajar en carro
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-snug">
                Más comodidad
              </p>
            </div>

            {/* Background image covering full card of the exact aspect ratio */}
            <div className="relative overflow-hidden rounded-[20px] bg-slate-100 aspect-[1.8/1] w-full shadow-[0_8px_24px_rgba(148,163,184,0.04)] border border-slate-200/50">
              <img 
                src={imgCarCardBg} 
                alt="Viajar en carro" 
                className="w-full h-full absolute inset-0 object-cover object-left-top transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              {/* Soft blend overlay matching the gray palette sutilly */}
              <div className="absolute inset-0 bg-slate-900/5 mix-blend-multiply" />
            </div>
          </div>

          {/* Card Moto */}
          <div 
            onClick={() => navigate('/explore?type=moto')}
            className="group flex flex-col cursor-pointer text-left transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none"
          >
            {/* Text placed under "Para ti" and above the image card */}
            <div className="mb-2.5 space-y-0.5">
              <h4 className="font-extrabold text-slate-900 text-[15px] sm:text-base leading-tight group-hover:text-primary transition-colors">
                Viajar en moto
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-snug">
                Trayectos rápidos
              </p>
            </div>

            {/* Background image covering full card of the exact aspect ratio */}
            <div className="relative overflow-hidden rounded-[20px] bg-slate-100 aspect-[1.8/1] w-full shadow-[0_8px_24px_rgba(148,163,184,0.04)] border border-slate-200/50">
              <img 
                src={imgMotoCardBg} 
                alt="Viajar en moto" 
                className="w-full h-full absolute inset-0 object-cover object-center transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              {/* Soft blend overlay matching the gray palette sutilly */}
              <div className="absolute inset-0 bg-slate-900/5 mix-blend-multiply" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECCIÓN "DESTINOS POPULARES" EN FORMATO GRID DE 2 COLUMNAS */}
      <section className="space-y-3 pt-1">
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
          Destinos populares
        </h3>
        <div className="grid grid-cols-1 min-[350px]:grid-cols-2 gap-3">
          {/* Piedecuesta */}
          <div 
            onClick={() => navigate('/explore?destination=Piedecuesta')}
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
            onClick={() => navigate('/explore?destination=Floridablanca')}
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
            onClick={() => navigate('/explore?destination=Giron')}
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
            onClick={() => navigate('/explore?destination=Bucaramanga')}
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
        
        {/* Ver más destinos button */}
        <div className="flex justify-center pt-1 pb-1">
          <button 
            onClick={() => navigate('/explore')}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-black tracking-wider flex items-center gap-1 transition-all uppercase"
          >
            Ver más destinos <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {/* 6. Rutas Recomendadas */}
      <section className="space-y-3.5 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            Rutas recomendadas
          </h3>
          <button 
            onClick={() => navigate('/explore')} 
            className="text-secondary hover:text-secondary-hover text-sm font-black tracking-wider uppercase"
          >
            VER TODAS
          </button>
        </div>

        {recommendableRoutes.length > 0 ? (
          <div className="space-y-3">
            {recommendableRoutes.slice(0, 3).map((route: any) => (
              <div 
                key={route.id} 
                onClick={() => navigate(`/route/${route.id}`)}
                className="bg-white p-4 rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.015)] border border-slate-100 hover:border-slate-200/80 transition-all cursor-pointer active:scale-[0.99] group text-left flex flex-col min-[390px]:flex-row min-[390px]:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100/50 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-base">{route.type === 'moto' ? '🏍️' : '🚗'}</span>
                  </div>
                  <div className="space-y-0.5 min-w-0 text-left">
                    <p className="font-extrabold text-slate-800 text-base truncate leading-snug">
                      {route.origin?.split(',')[0]} ➔ {route.destination?.split(',')[0]}
                    </p>
                    <p className="text-sm text-slate-400 font-bold leading-none pt-0.5">
                      Hoy, {route.time || '8:00 AM'}
                    </p>
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
                        : 'Sin precio'}
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
            <Compass size={24} className="mx-auto text-slate-300" />
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-700">Sin rutas de momento</p>
              <p className="text-sm text-slate-400 font-bold leading-relaxed">No se encontraron rutas programadas creadas recientemente.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
