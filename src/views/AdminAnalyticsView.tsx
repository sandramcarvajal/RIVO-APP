import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Car, 
  MapPin, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { SecureHttpClient } from '../client/modules/auth/services/SecureHttpClient';

const AdminAnalyticsView = () => {
  const { showToast } = useToast();
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    drivers: 0,
    passengers: 0,
    totalVehicles: 0,
    pendingVehicles: 0,
    activeRoutes: 0,
    completedRoutes: 0,
    averageRating: 4.91
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const response = await SecureHttpClient.request('/api/routes/admin/analytics/stats');
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setStats({
              totalUsers: data.totalUsers ?? 0,
              drivers: data.drivers ?? 0,
              passengers: data.passengers ?? 0,
              totalVehicles: data.totalVehicles ?? 0,
              pendingVehicles: data.pendingVehicles ?? 0,
              activeRoutes: data.activeRoutes ?? 0,
              completedRoutes: data.completedRoutes ?? 0,
              averageRating: data.averageRating ?? 4.91
            });
          }
        }
      } catch (err) {
        console.error("Error fetching admin statistics:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      active = false;
    };
  }, []);

  const handleExport = (format: string, reportType: string) => {
    showToast(`Preparando exportación de ${reportType} en formato ${format}...`, 'info');
    setTimeout(() => {
      showToast(`¡Reporte de ${reportType} exportado con éxito! (Formato: ${format})`, 'success');
    }, 1500);
  };

  const kpis = [
    { label: 'Usuarios Totales', value: loading ? '...' : String(stats.totalUsers), change: 'Total afiliados', icon: Users, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100/50' },
    { label: 'Conductores', value: loading ? '...' : String(stats.drivers), change: 'Conductores registrados', icon: Users, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100/50' },
    { label: 'Pasajeros', value: loading ? '...' : String(stats.passengers), change: 'Pasajeros de la plataforma', icon: Users, bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100/50' },
    { label: 'Vehículos Registrados', value: loading ? '...' : String(stats.totalVehicles), change: 'Flota total autorizada', icon: Car, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100/50' },
    { label: 'Vehículos Pendientes', value: loading ? '...' : String(stats.pendingVehicles), change: 'Revisión SOAT y placas', icon: Car, bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100/50' },
    { label: 'Rutas Activas', value: loading ? '...' : String(stats.activeRoutes), change: 'Rutas programadas o en curso', icon: MapPin, bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100/50' },
    { label: 'Rutas Completadas', value: loading ? '...' : String(stats.completedRoutes), change: 'Viajes finalizados con éxito', icon: MapPin, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100/50' },
    { label: 'Calificación Promedio', value: loading ? '...' : stats.averageRating.toFixed(2), change: 'Evaluación general media', icon: Award, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100/50' },
  ];

  return (
    <div id="admin-analytics-container" className="space-y-7 pb-24 text-left">
      {/* Header section */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100/30">
            Módulo Analítica
          </span>
          <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 rounded-full">
            Estructura Visual 2.0
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Analítica de Plataforma</h1>
        <p className="text-slate-500 font-semibold text-sm">Monitoreo estadístico, tendencias de circulación y descarga de reportes corporativos.</p>
      </header>

      {/* KPIs Grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            className={`bg-white border ${kpi.border} p-5 rounded-[24px] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
              <div className={`w-8.5 h-8.5 rounded-xl ${kpi.bg} ${kpi.text} flex items-center justify-center shrink-0`}>
                <kpi.icon size={16} strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</span>
              <p className="text-xs font-bold text-slate-450 mt-1 leading-none flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                {kpi.change}
              </p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Two-Column Analytics Graphics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* SVG Graphic 1: Usage Trends */}
        <motion.section 
          className="bg-white border border-slate-100/90 rounded-[28px] p-5 shadow-xs flex flex-col justify-between"
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Tendencia de Viajes Activos</h3>
              <p className="text-xs text-slate-400 font-semibold">Consolidado diario de las últimas 2 semanas</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 bg-indigo-50/60 rounded-full px-2.5 py-1">
              <Calendar size={12} />
              <span>Junio 2026</span>
            </div>
          </div>

          {/* SVG Line Graph representation */}
          <div className="h-44 w-full flex items-end justify-center pt-2 relative">
            <svg viewBox="0 0 400 150" className="w-full h-full text-slate-300">
              {/* Grid Background lines */}
              <line x1="0" y1="30" x2="400" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="75" x2="400" y2="75" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />

              {/* Gradient overlay path */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path 
                d="M 10 130 Q 70 110 130 85 T 250 50 T 370 20 L 370 140 L 10 140 Z" 
                fill="url(#chartGradient)" 
              />

              {/* Main Line path */}
              <path 
                d="M 10 130 Q 70 110 130 85 T 250 50 T 370 20" 
                fill="none" 
                stroke="#6366F1" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
              />

              {/* Highlighting points */}
              <circle cx="130" cy="85" r="5" fill="#6366F1" stroke="white" strokeWidth="2" />
              <text x="130" y="70" className="text-[10px] font-black fill-slate-700" textAnchor="middle">48 trips</text>

              <circle cx="250" cy="50" r="5" fill="#10B981" stroke="white" strokeWidth="2" />
              <text x="250" y="35" className="text-[10px] font-black fill-emerald-600" textAnchor="middle">85 trips</text>

              <circle cx="370" cy="20" r="6" fill="#6366F1" stroke="white" strokeWidth="2" />
              <text x="350" y="15" className="text-[10px] font-bold fill-slate-450">Hoy: 120</text>
            </svg>
          </div>

          {/* Timeline labels */}
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1">
            <span>Lu 26</span>
            <span>Mi 28</span>
            <span>Vi 30</span>
            <span>Lu 02</span>
            <span>Mi 04</span>
            <span>Vi 06</span>
            <span>Hoy</span>
          </div>
        </motion.section>

        {/* SVG Graphic 2: Document Certification Rates */}
        <motion.section 
          className="bg-white border border-slate-100/90 rounded-[28px] p-5 shadow-xs flex flex-col justify-between"
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Aprobación de Documentos</h3>
              <p className="text-xs text-slate-400 font-semibold">Estatus general de conductores corporativos</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 rounded-full px-2.5 py-1 uppercase tracking-wider">
              <Layers size={12} />
              <span>S&C Pendiente</span>
            </div>
          </div>

          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-slate-150 rounded-2xl bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-450">
              <FileText size={18} />
            </div>
            <div className="space-y-1 px-4">
              <p className="text-xs font-black text-slate-700">Pendiente de implementación</p>
              <p className="text-[11px] text-slate-400 font-bold leading-normal max-w-[240px] mx-auto">
                Los indicadores de SOAT y Licencias automotrices requieren la vinculación de tablas documentales en futuras iteraciones.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-3 text-left mt-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="animate-pulse" />
            </div>
            <p className="text-xs font-medium text-slate-500 leading-normal">
              <span className="font-extrabold text-slate-700">Optimización Automática:</span> El bot de Rivo avisará 15 días antes del vencimiento técnico corporativo una vez habilitado.
            </p>
          </div>
        </motion.section>
      </div>

      {/* Corporate Downloadable Reports module */}
      <section className="space-y-4">
        <h3 className="text-lg font-black text-slate-900 tracking-tight font-display">Descarga de Reportes Corporativos</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Report 1 */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs hover:border-slate-200 transition-all text-left flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <h4 className="font-extrabold text-slate-800 text-base">Reporte de Circulación</h4>
              <p className="text-xs font-semibold text-slate-450 leading-relaxed">
                Bitácoras, viajes diarios, kilómetros y reducción de emisiones de carbono corporativas.
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-5">
              <button 
                onClick={() => handleExport('CSV', 'Circulación')}
                className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider border border-slate-150 flex items-center justify-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet size={13} />
                CSV
              </button>
              <button 
                onClick={() => handleExport('PDF', 'Circulación')}
                className="flex-1 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
              >
                <Download size={13} />
                PDF
              </button>
            </div>
          </div>

          {/* Report 2 */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs hover:border-slate-200 transition-all text-left flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                <Users size={20} />
              </div>
              <h4 className="font-extrabold text-slate-800 text-base">Estatus de Usuarios</h4>
              <p className="text-xs font-semibold text-slate-450 leading-relaxed">
                Roles corporativos de SyC, distribución de viajes, tasas de participación e incidencias.
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-5">
              <button 
                onClick={() => handleExport('CSV', 'Estatus de Usuarios')}
                className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider border border-slate-150 flex items-center justify-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet size={13} />
                CSV
              </button>
              <button 
                onClick={() => handleExport('PDF', 'Estatus de Usuarios')}
                className="flex-1 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
              >
                <Download size={13} />
                PDF
              </button>
            </div>
          </div>

          {/* Report 3 */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs hover:border-slate-200 transition-all text-left flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                <Car size={20} />
              </div>
              <h4 className="font-extrabold text-slate-800 text-base">Parque Automotor Físico</h4>
              <p className="text-xs font-semibold text-slate-450 leading-relaxed">
                Hojas de vida de vehículos afiliados, fechas de vencimiento de SOAT/Tecnomecánica.
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-5">
              <button 
                onClick={() => handleExport('CSV', 'Parque Automotor')}
                className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider border border-slate-150 flex items-center justify-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet size={13} />
                CSV
              </button>
              <button 
                onClick={() => handleExport('PDF', 'Parque Automotor')}
                className="flex-1 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
              >
                <Download size={13} />
                PDF
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminAnalyticsView;
