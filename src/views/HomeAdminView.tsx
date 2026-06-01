import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Car,
  BarChart2, 
  Activity, 
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

interface HomeAdminViewProps {
  user: any;
  navigate: (path: string) => void;
}

export const HomeAdminView: React.FC<HomeAdminViewProps> = ({
  user,
  navigate
}) => {
  return (
    <div className="space-y-7 relative pb-16 text-left bg-gradient-to-b from-white to-slate-50 min-h-screen px-4 pt-1 overflow-hidden">
      {/* Soft gradient background bloomer */}
      <div className="absolute top-[-80px] right-[-80px] w-96 h-96 bg-violet-100/10 rounded-full blur-[105px] pointer-events-none -z-10" />
      <div className="absolute top-[35%] left-[-100px] w-80 h-80 bg-fuchsia-100/10 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* 1. Header with Name */}
      <header className="space-y-2 pt-3">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
        >
          <h2 className="text-[32px] font-black tracking-tight leading-none font-display text-slate-900">
            Hola, {user?.name?.split(' ')[0] || 'Admin'}
          </h2>
        </motion.div>

        {/* 2. Metrics Horizontal Grid (violet/indigo theme) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Card 1: Usuarios */}
          <div className="bg-white p-3 rounded-2xl border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-2">
            <div className="w-8.5 h-8.5 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
              <Users size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold text-slate-450 leading-tight">Usuarios</p>
              <p className="text-sm font-black text-slate-700 leading-none mt-1">Próximamente</p>
            </div>
          </div>
          
          {/* Card 2: Viajes */}
          <div className="bg-white p-3 rounded-2xl border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-2">
            <div className="w-8.5 h-8.5 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
              <Car size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold text-slate-450 leading-tight">Viajes</p>
              <p className="text-sm font-black text-slate-700 leading-none mt-1">Próximamente</p>
            </div>
          </div>

          {/* Card 3: Reportes */}
          <div className="bg-white p-3 rounded-2xl border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-2">
            <div className="w-8.5 h-8.5 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
              <BarChart2 size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold text-slate-450 leading-tight">Reportes</p>
              <p className="text-sm font-black text-slate-700 leading-none mt-1">Próximamente</p>
            </div>
          </div>

          {/* Card 4: Actividad */}
          <div className="bg-white p-3 rounded-2xl border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-2">
            <div className="w-8.5 h-8.5 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
              <Activity size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold text-slate-450 leading-tight">Actividad</p>
              <p className="text-sm font-black text-slate-700 leading-none mt-1">Próximamente</p>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Hero Grande (Analytic Dashboard view, 40-45% visual height in deep purple gradient) */}
      <section>
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#5D3EBA] via-[#7B59EA] to-[#3C258E] text-white p-6.5 shadow-md shadow-violet-500/10 min-h-[205px] flex items-center justify-between"
        >
          <div className="space-y-4 relative z-10 max-w-[62%] text-left">
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                Panel administrativo
              </h3>
              <p className="text-violet-50/95 text-sm sm:text-[15px] font-semibold leading-relaxed">
                Gestiona, analiza y mejora la comunidad Rivo.
              </p>
            </div>

            <div className="flex pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/12 text-white/95">
                <Sparkles size={11} className="text-amber-300 animate-pulse" />
                Auditoría Activa
              </span>
            </div>
          </div>

          {/* Right Static Illustration: administrative visualization with graphs */}
          <div className="w-[38%] h-36 relative select-none shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 140 140" fill="none" className="w-full h-full text-white">
              {/* Concentric administrative halos */}
              <circle cx="70" cy="70" r="50" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.04" strokeWidth="1.5" />
              <circle cx="70" cy="70" r="35" fill="white" fillOpacity="0.05" />
              
              {/* Background data paths */}
              <path d="M15,100 L125,100 M20,80 L120,80" stroke="white" strokeOpacity="0.1" strokeWidth="2" />
              
              {/* Graph display rectangle */}
              <rect x="25" y="32" width="90" height="70" rx="10" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
              
              {/* Bar columns with different colors */}
              <rect x="36" y="66" width="9" height="24" rx="1.5" fill="#34D399" />
              <rect x="50" y="52" width="9" height="38" rx="1.5" fill="#60A5FA" />
              <rect x="64" y="42" width="9" height="48" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="78" y="58" width="9" height="32" rx="1.5" fill="#F472B6" />
              <rect x="92" y="62" width="9" height="28" rx="1.5" fill="#FBBF24" />
              
              {/* Line spline tracker above bar charts */}
              <path d="M40.5,62 L54.5,46 L68.5,38 L82.5,52 L96.5,58" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="68.5" cy="38" r="4.5" fill="#34D399" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
        </motion.div>
      </section>

      {/* 4. Quick Actions (four grid cards: Usuarios, Viajes, Reportes, Moderación - PRÓXIMAMENTE) */}
      <section className="space-y-3 px-0.5">
        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Accesos rápidos</h4>
        <div className="grid grid-cols-2 gap-3.5">
          {/* Card 1: Usuarios */}
          <div 
            onClick={() => navigate('/admin')}
            className="bg-white p-4.5 rounded-[22px] border border-slate-100 hover:border-slate-200 transition-all cursor-pointer shadow-xs flex flex-col justify-between min-h-[135px] group text-left relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
                  <Users size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[11.5px] font-black text-violet-600 bg-violet-100/60 uppercase tracking-wider px-2 py-1 rounded-full shrink-0">Próximamente</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm sm:text-base mt-2.5">Usuarios</h5>
              <p className="text-xs sm:text-[13px] font-semibold mt-1 leading-relaxed text-slate-450">
                Gestionar roles y estado
              </p>
            </div>
          </div>

          {/* Card 2: Viajes */}
          <div 
            onClick={() => navigate('/admin')}
            className="bg-white p-4.5 rounded-[22px] border border-slate-100 hover:border-slate-200 transition-all cursor-pointer shadow-xs flex flex-col justify-between min-h-[135px] group text-left relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
                  <Car size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[11.5px] font-black text-violet-600 bg-violet-100/60 uppercase tracking-wider px-2 py-1 rounded-full shrink-0">Próximamente</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm sm:text-base mt-2.5">Viajes</h5>
              <p className="text-xs sm:text-[13px] font-semibold mt-1 leading-relaxed text-slate-450">
                Monitorear rutas activas
              </p>
            </div>
          </div>

          {/* Card 3: Reportes */}
          <div 
            onClick={() => navigate('/admin')}
            className="bg-white p-4.5 rounded-[22px] border border-slate-100 hover:border-slate-200 transition-all cursor-pointer shadow-xs flex flex-col justify-between min-h-[135px] group text-left relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[11.5px] font-black text-violet-600 bg-violet-100/60 uppercase tracking-wider px-2 py-1 rounded-full shrink-0">Próximamente</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm sm:text-base mt-2.5">Reportes</h5>
              <p className="text-xs sm:text-[13px] font-semibold mt-1 leading-relaxed text-slate-450">
                Estadísticas globales
              </p>
            </div>
          </div>

          {/* Card 4: Moderación */}
          <div 
            onClick={() => navigate('/admin')}
            className="bg-white p-4.5 rounded-[22px] border border-slate-100 hover:border-slate-200 transition-all cursor-pointer shadow-xs flex flex-col justify-between min-h-[135px] group text-left relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
                  <ShieldAlert size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[11.5px] font-black text-violet-600 bg-violet-100/60 uppercase tracking-wider px-2 py-1 rounded-full shrink-0">Próximamente</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm sm:text-base mt-2.5">Moderación</h5>
              <p className="text-xs sm:text-[13px] font-semibold mt-1 leading-relaxed text-slate-450">
                Revisar seguridad e incidencias
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Actividad Reciente List Redesign */}
      <section className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 tracking-tight font-display">
            Actividad reciente
          </h3>
          <button onClick={() => navigate('/admin')} className="text-violet-600 hover:text-violet-700 text-sm font-black tracking-wider uppercase">
            Ver todas
          </button>
        </div>

        <div className="space-y-3">
          {/* Card Item 1 (User register green) */}
          <div className="bg-white p-4.5 rounded-[24px] shadow-xs border border-slate-100/80 flex items-center justify-between text-left">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
                <Users size={15} strokeWidth={3} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="font-extrabold text-slate-800 text-sm leading-snug">Nuevo usuario registrado</p>
                <p className="text-xs sm:text-[13px] text-slate-450 font-semibold leading-none pt-0.5">María López</p>
              </div>
            </div>
            <span className="text-xs sm:text-[13px] text-slate-400 font-bold whitespace-nowrap px-1 shrink-0">Hace 5 min</span>
          </div>

          {/* Card Item 2 (Trip published violet) */}
          <div className="bg-white p-4.5 rounded-[24px] shadow-xs border border-slate-100/80 flex items-center justify-between text-left">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 bg-violet-50 border border-violet-100 rounded-full flex items-center justify-center text-violet-500 shrink-0">
                <Car size={15} strokeWidth={3} />
              </div>
              <div className="space-y-0.5 min-w-0 text-left">
                <p className="font-extrabold text-slate-800 text-sm leading-snug">Nuevo viaje publicado</p>
                <p className="text-xs sm:text-[13px] text-slate-450 font-semibold leading-none pt-0.5">Av. 68 ➔ Centro</p>
              </div>
            </div>
            <span className="text-xs sm:text-[13px] text-slate-400 font-bold whitespace-nowrap px-1 shrink-0 font-sans">Hace 12 min</span>
          </div>

          {/* Card Item 3 (Report received orange/red) */}
          <div className="bg-white p-4.5 rounded-[24px] shadow-xs border border-slate-100/80 flex items-center justify-between text-left">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center text-orange-500 shrink-0">
                <ShieldAlert size={15} strokeWidth={3} />
              </div>
              <div className="space-y-0.5 min-w-0 text-left">
                <p className="font-extrabold text-slate-800 text-sm leading-snug">Reporte recibido</p>
                <p className="text-xs sm:text-[13px] text-slate-450 font-semibold leading-none pt-0.5">Viaje #4587</p>
              </div>
            </div>
            <span className="text-xs sm:text-[13px] text-slate-400 font-bold whitespace-nowrap px-1 shrink-0 font-sans">Hace 18 min</span>
          </div>
        </div>
      </section>
    </div>
  );
};
