import React from 'react';
import { 
  Users, 
  Route as RouteIcon, 
  ShieldAlert, 
  FileCheck, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Car, 
  ChevronRight, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw, 
  FileText, 
  Calendar, 
  AlertCircle, 
  Ban, 
  History,
  TrendingUp,
  Inbox,
  ArrowRight
} from 'lucide-react';

interface DashboardTabProps {
  statsData: {
    totalUsers: number;
    drivers: number;
    passengers: number;
    totalVehicles: number;
    pendingVehicles: number;
    activeRoutes: number;
    completedRoutes: number;
    averageRating: number;
  };
  usersList: any[];
  vehiclesList: any[];
  documentsList: any[];
  reportsList: any[];
  adminLogsList: any[];
  moderationStats: any;
  loading: boolean;
  onNavigateTab: (tab: 'dashboard' | 'routes' | 'users' | 'vehicles' | 'documents' | 'moderation', filters?: { status?: string; type?: string; compliance?: string }) => void;
  onNavigateModerationSubTab?: (subtab: 'reports' | 'logs' | 'risks' | 'incidents') => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  statsData,
  usersList,
  vehiclesList,
  documentsList,
  reportsList,
  adminLogsList,
  moderationStats,
  loading,
  onNavigateTab,
  onNavigateModerationSubTab
}) => {
  // 1. Calculations from real list states
  const totalVerifiedDrivers = usersList.filter(
    u => u.role?.toLowerCase() === 'driver' && !u.isDisabled
  ).length || statsData.drivers || 0;

  const totalVehicles = vehiclesList.length || statsData.totalVehicles || 0;
  const pendingVehicles = statsData.pendingVehicles || vehiclesList.filter(v => v.verifiedStatus === 'pending').length || 0;

  const pendingDocsCount = documentsList.filter(
    d => d.status !== 'approved' && d.status !== 'rejected'
  ).length;

  const openReportsCount = reportsList.filter(
    r => r.status === 'pending' || r.status === 'reviewing'
  ).length;

  const activeAlertsCount = 
    (moderationStats?.riskAlerts?.lowRatedDrivers?.length || 0) + 
    (moderationStats?.riskAlerts?.usersWithMultipleReports?.length || 0) + 
    (moderationStats?.riskAlerts?.recurringCancellations?.length || 0);

  const suspendedUsersCount = usersList.filter(u => u.isDisabled).length;

  // 2. Health Score of the Platform calculation
  let healthScoreLabel = 'Salud Alta';
  let healthScoreColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
  let healthCircleColor = 'bg-emerald-500 animate-pulse';
  let healthCommentary = 'Todos los sistemas operativos e indicadores de seguridad se encuentran en niveles óptimos de servicio.';

  // Cumulative risk factor
  const totalRiskScore = (pendingDocsCount * 1) + (pendingVehicles * 2) + (openReportsCount * 3) + (activeAlertsCount * 1.5);

  if (totalRiskScore >= 12) {
    healthScoreLabel = 'Riesgo Operativo';
    healthScoreColor = 'text-rose-700 bg-rose-50 border-rose-100';
    healthCircleColor = 'bg-rose-500 animate-ping';
    healthCommentary = 'Se detectaron múltiples reportes de seguridad críticos o documentos sin verificar que ponen en riesgo la operación comercial.';
  } else if (totalRiskScore > 0) {
    healthScoreLabel = 'Atención Requerida';
    healthScoreColor = 'text-amber-700 bg-amber-50 border-amber-100';
    healthCircleColor = 'bg-amber-500';
    healthCommentary = 'Hay tareas de validación vehicular pendientes u hojas de vida técnicas acumuladas que requieren revisión.';
  }

  // 3. Finding TOP 3 oldest pending tasks (Priority Operations)
  const allPendingItems: any[] = [];
  
  // Add expired documents (High priority)
  documentsList.filter(d => d.complianceStatus === 'VENCIDO' && d.status !== 'rejected').forEach(d => {
    allPendingItems.push({
      id: `expired-doc-${d.id}`,
      type: 'expired_document',
      docType: d.documentType,
      title: `🚨 DOCUMENTO VENCIDO: ${d.documentName}`,
      subtitle: `Conductor: ${d.ownerName || 'Desconocido'} (${d.ownerEmail || ''}) • Requiere decisión de suspensión manual`,
      date: new Date('1970-01-01'), // Oldest date to prioritize first
      tabTarget: 'documents'
    });
  });

  // Add pending docs
  documentsList.filter(d => d.status !== 'approved' && d.status !== 'rejected' && d.complianceStatus !== 'VENCIDO').forEach(d => {
    allPendingItems.push({
      id: `doc-${d.id}`,
      type: 'document',
      title: d.documentName || 'Documento por verificar',
      subtitle: `Propietario: ${d.ownerName || 'Desconocido'} (${d.ownerEmail || ''})`,
      date: d.uploadedAt || d.createdAt || new Date(),
      tabTarget: 'documents'
    });
  });

  // Add pending reports
  reportsList.filter(r => r.status === 'pending' || r.status === 'reviewing').forEach(r => {
    allPendingItems.push({
      id: `report-${r.id}`,
      type: 'report',
      title: `Reporte de conflicto: ${r.reason?.replace('_', ' ').toUpperCase() || 'Incidencia'}`,
      subtitle: `Involucrado: ${r.reportedName || r.reportedEmail || 'Usuario'} • "${r.description || 'Sin comentarios'}"`,
      date: r.createdAt || new Date(),
      tabTarget: 'moderation'
    });
  });
  
  // Add pending vehicles
  vehiclesList.filter(v => v.verifiedStatus === 'pending').forEach(v => {
    const owner = usersList.find(u => u.id === v.userId);
    let ownerName = '';
    if (owner?.profileData) {
      try {
        const prof = JSON.parse(owner.profileData);
        ownerName = prof.name || '';
      } catch (_) {}
    }
    allPendingItems.push({
      id: `vehicle-${v.id}`,
      type: 'vehicle',
      title: `Vehículo por aprobar: ${v.brand || ''} ${v.model || ''} (${v.plate || ''})`,
      subtitle: `Propietario: ${ownerName || owner?.email || 'N/A'}`,
      date: v.createdAt || new Date(),
      tabTarget: 'vehicles'
    });
  });

  // Sort by date ascending (oldest first - expired items will bubbled up due to 1970 date)
  const sortedPendingItems = [...allPendingItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const top3PendingItems = sortedPendingItems.slice(0, 3);

  // 4. Slice of the last 3 relevant logs
  const top3Logs = adminLogsList.slice(0, 3);

  // Safe compliance variables extraction
  const compStats = moderationStats?.compliance || {
    alDiaCount: 0,
    vence30Count: 0,
    vence15Count: 0,
    vencidoCount: 0,
    expiringSoonLicense: [],
    expiringSoonSoat: [],
    expiringSoonTech: []
  };

  const expiredDocsCount = compStats.vencidoCount || 0;
  const licensesExpiringCount = compStats.expiringSoonLicense?.length || 0;
  const soatExpiringCount = compStats.expiringSoonSoat?.length || 0;
  const techExpiringCount = compStats.expiringSoonTech?.length || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 text-slate-400 bg-white border border-slate-100 rounded-[28px] shadow-xs">
        <RefreshCw size={36} className="animate-spin text-violet-600" />
        <p className="text-sm font-semibold">Cargando Centro de Mando Ejecutivo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="centro-mando-operativo">

      {/* SECTION: PREVENTIVE DOCUMENT CONTROL BAR */}
      <section className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-xs space-y-4" id="compliance-prevention-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-left">
            <h4 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">
              🛡️ Control Preventivo y Cumplimiento Documental
            </h4>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              Monitoreo activo para evitar multas de tránsito y asegurar la circulación reglamentaria de la flota Rivo.
            </p>
          </div>
          <span className="shrink-0 self-start sm:self-center px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-full text-[9px] font-black uppercase tracking-wider">
            Fase 1: Alertas en Vivo
          </span>
        </div>

        {/* 4 Counter Indicators Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Indicator 1: Licencias */}
          <div 
            onClick={() => onNavigateTab('documents', { type: 'license', compliance: 'EXPIRING_SOON' })}
            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
              licensesExpiringCount > 0 
                ? 'bg-amber-50/40 border-amber-200/50 hover:bg-amber-50/70' 
                : 'bg-slate-50/20 border-slate-100/80 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Licencias</span>
              {licensesExpiringCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className={`text-xl font-black ${licensesExpiringCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {licensesExpiringCount}
              </span>
              <span className="text-[9px] text-slate-400 font-bold block">Por vencer</span>
            </div>
          </div>

          {/* Indicator 2: SOAT */}
          <div 
            onClick={() => onNavigateTab('documents', { type: 'soat', compliance: 'EXPIRING_SOON' })}
            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
              soatExpiringCount > 0 
                ? 'bg-amber-50/40 border-amber-200/50 hover:bg-amber-50/70' 
                : 'bg-slate-50/20 border-slate-100/80 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">SOAT</span>
              {soatExpiringCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-550 animate-pulse" />}
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className={`text-xl font-black ${soatExpiringCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {soatExpiringCount}
              </span>
              <span className="text-[9px] text-slate-400 font-bold block">Por vencer</span>
            </div>
          </div>

          {/* Indicator 3: Tecnomecánica */}
          <div 
            onClick={() => onNavigateTab('documents', { type: 'tech_preventive', compliance: 'EXPIRING_SOON' })}
            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
              techExpiringCount > 0 
                ? 'bg-amber-50/40 border-amber-200/50 hover:bg-amber-50/70' 
                : 'bg-slate-50/20 border-slate-100/80 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tecnomecánica</span>
              {techExpiringCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className={`text-xl font-black ${techExpiringCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {techExpiringCount}
              </span>
              <span className="text-[9px] text-slate-400 font-bold block">Por vencer</span>
            </div>
          </div>

          {/* Indicator 4: Vencidos */}
          <div 
            onClick={() => onNavigateTab('documents', { compliance: 'VENCIDO' })}
            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
              expiredDocsCount > 0 
                ? 'bg-rose-50/60 border-rose-200 hover:bg-rose-50/80' 
                : 'bg-slate-50/20 border-slate-100/80 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block">Docs Vencidos</span>
              {expiredDocsCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className={`text-xl font-black ${expiredDocsCount > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-700'}`}>
                {expiredDocsCount}
              </span>
              <span className="text-[9px] text-slate-405 font-bold block">Acción Crítica</span>
            </div>
          </div>
        </div>

        {/* Detail Alerts Expansion banner */}
        {expiredDocsCount > 0 && (
          <div className="bg-rose-50 text-rose-750 border border-rose-105/40 p-4 rounded-2xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed text-left">
            <span className="text-sm shrink-0">⚠️</span>
            <div>
              <span className="font-extrabold text-rose-800">Decisión Administrativa Requerida:</span> Existen {expiredDocsCount} documentos caducados en circulación. No se han aplicado bloqueos ni suspensiones automáticas en esta versión preventiva; se recomienda auditar sus expedientes y aplicar restricciones manuales a sus respectivas cuentas.
            </div>
          </div>
        )}
      </section>
      
      {/* SECTION: FILA 1 – Primary Action & Ecosystem Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2 (lg:col-span-2): PRIORIDAD OPERATIVA (New Chief Component) */}
        <div className="lg:col-span-2" id="block-prioridades">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs flex flex-col justify-between h-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-3">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Control de Cuellos de Botella</span>
                <h3 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2">
                  Prioridad Operativa
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-100/50">
                <AlertCircle size={11} /> Acción Inmediata
              </span>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {top3PendingItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-bold italic bg-slate-50/30 rounded-2xl border border-dashed border-slate-100">
                  No hay prioridades operativas pendientes en el sistema.
                </div>
              ) : (
                top3PendingItems.map((item) => {
                  const itemDate = item.type === 'expired_document'
                    ? 'CADUCADO'
                    : item.date ? new Date(item.date).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Pendiente';

                  return (
                    <div 
                      key={item.id} 
                      className={`border p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                        item.type === 'expired_document'
                          ? 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/50'
                          : 'bg-slate-50/50 hover:bg-slate-50/80 border-slate-100/80'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider rounded-md border ${
                            item.type === 'expired_document' ? 'bg-rose-100 text-rose-700 border-rose-250 font-black animate-pulse' :
                            item.type === 'document' ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50' :
                            item.type === 'report' ? 'bg-rose-50 text-rose-605 border-rose-100/50' :
                            'bg-amber-50 text-amber-655 border-amber-100/50'
                          }`}>
                            {item.type === 'expired_document' ? 'VENCIDO 🚨' : item.type === 'document' ? 'Documento' : item.type === 'report' ? 'Conflicto' : 'Vehículo'}
                          </span>
                          <span className={`text-[9.5px] font-bold ${item.type === 'expired_document' ? 'text-rose-600' : 'text-slate-400'}`}>
                            Estatus: {itemDate}
                          </span>
                        </div>
                        
                        <h5 className={`font-extrabold text-xs truncate leading-snug ${item.type === 'expired_document' ? 'text-rose-900' : 'text-slate-800'}`}>{item.title}</h5>
                        <p className={`text-[10.5px] font-medium leading-normal truncate ${item.type === 'expired_document' ? 'text-rose-700' : 'text-slate-505'}`}>
                          {item.subtitle}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (item.type === 'expired_document') {
                            onNavigateTab('documents', { type: item.docType || 'all', compliance: 'VENCIDO' });
                          } else if (item.type === 'document') {
                            onNavigateTab('documents', { status: 'pending' });
                          } else {
                            onNavigateTab(item.tabTarget);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                          item.type === 'expired_document'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        Aprobar <ArrowRight size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-50">
              * Ordenados por antigüedad. Resuelve los elementos de arriba primero para mantener la operación fluida.
            </div>
          </div>
        </div>

        {/* Column 3 (lg:col-span-1): SALUD DEL ECOSISTEMA (Redesigned with high density & no waste space) */}
        <div className="lg:col-span-1" id="block-salud">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${healthScoreColor}`}>
                  <span className={`w-2 h-2 rounded-full ${healthCircleColor}`} />
                  {healthScoreLabel}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-base font-black text-slate-800 tracking-tight leading-tight">Salud del Ecosistema</h4>
                <p className="text-slate-505 font-bold text-xs mt-2 leading-relaxed text-slate-500">
                  {healthCommentary}
                </p>
              </div>
            </div>

            {/* High density 2x2 grid without empty holes */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              
              <div 
                onClick={() => onNavigateTab('documents')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                  pendingDocsCount > 0 
                    ? 'bg-amber-50/50 border-amber-200/50 hover:bg-amber-50/80' 
                    : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/60'
                }`}
              >
                <span className="text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-1">Doc. Pendientes</span>
                <span className={`text-lg font-black block leading-none ${pendingDocsCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {pendingDocsCount}
                </span>
                <span className="text-[9.5px] text-slate-400 font-bold mt-1 block">Por aprobar</span>
              </div>

              <div 
                onClick={() => onNavigateTab('vehicles')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                  pendingVehicles > 0 
                    ? 'bg-amber-50/50 border-amber-200/50 hover:bg-amber-50/80' 
                    : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/60'
                }`}
              >
                <span className="text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-1">Vehículos</span>
                <span className={`text-lg font-black block leading-none ${pendingVehicles > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {pendingVehicles}
                </span>
                <span className="text-[9.5px] text-slate-400 font-bold mt-1 block">Revisión parque</span>
              </div>

              <div 
                onClick={() => onNavigateTab('moderation')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                  openReportsCount > 0 
                    ? 'bg-rose-50/50 border-rose-200/50 hover:bg-rose-50/80' 
                    : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/60'
                }`}
              >
                <span className="text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-1">Reportes Seg.</span>
                <span className={`text-lg font-black block leading-none ${openReportsCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                  {openReportsCount}
                </span>
                <span className="text-[9.5px] text-slate-400 font-bold mt-1 block">Abiertos</span>
              </div>

              <div 
                onClick={() => {
                  onNavigateTab('moderation');
                  if (onNavigateModerationSubTab) onNavigateModerationSubTab('risks');
                }}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-205 ${
                  activeAlertsCount > 0 
                    ? 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/50' 
                    : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/60'
                }`}
              >
                <span className="text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-1">Alertas Riesgo</span>
                <span className="text-lg font-black block leading-none text-slate-700 font-black">
                  {activeAlertsCount}
                </span>
                <span className="text-[9.5px] text-slate-400 font-bold mt-1 block font-semibold">Seguimiento</span>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* SECTION: FILA 2 – Core Performance Metrics (Reusing space beautifully) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="block-metricas">
         
         {/* Widget 1: Indicadores Visuales */}
         <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Centro de Mando</span>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-3">Indicadores Visuales</h4>
            </div>
            
            <div className="space-y-2">
              {/* Card item: Usuarios */}
              <div className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100/60">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users size={13} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-black text-slate-400 uppercase leading-none">Usuarios</p>
                    <p className="text-[11px] font-black text-slate-800 tracking-tight mt-0.5">{statsData.totalUsers}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <svg className="w-10 h-4 text-blue-500 shrink-0" viewBox="0 0 100 30" fill="none" stroke="currentColor">
                    <path d="M 0,25 Q 20,5 40,20 T 80,10 T 100,2" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Card item: Conductores */}
              <div className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100/60">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Activity size={13} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-black text-slate-400 uppercase leading-none">Cond. Activos</p>
                    <p className="text-[11px] font-black text-slate-800 tracking-tight mt-0.5">{totalVerifiedDrivers}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <svg className="w-10 h-4 text-emerald-500 shrink-0" viewBox="0 0 100 30" fill="none" stroke="currentColor">
                    <path d="M 0,20 Q 20,25 40,10 T 80,5 T 100,12" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Card item: Vehículos */}
              <div className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100/60">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Car size={13} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-black text-slate-400 uppercase leading-none">Vehículos</p>
                    <p className="text-[11px] font-black text-slate-800 tracking-tight mt-0.5">{totalVehicles}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <svg className="w-10 h-4 text-amber-500 shrink-0" viewBox="0 0 100 30" fill="none" stroke="currentColor">
                    <path d="M 0,22 Q 25,12 50,18 T 100,5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
         </div>

         {/* Widget 2: Distribución de Usuarios */}
         <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs flex flex-col justify-between">
           <div>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Demografía interna</span>
             <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">Distribución de Usuarios</h5>
           </div>
           
           <div className="flex items-center gap-4 my-2">
             <div className="relative w-14 h-14 shrink-0">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                 <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                 <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="4" 
                   strokeDasharray={`${(statsData.passengers / (statsData.totalUsers || 1)) * 100} ${100 - (statsData.passengers / (statsData.totalUsers || 1)) * 100}`} 
                   strokeDashoffset="25"
                   strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-[10px] font-black text-slate-805 leading-none">
                   {Math.round(((statsData.passengers) / (statsData.totalUsers || 1)) * 100)}%
                 </span>
                 <span className="text-[7px] font-black text-slate-400 tracking-tighter uppercase mt-0.5">Pax</span>
               </div>
             </div>
             
             <div className="space-y-1 text-[10px] flex-1">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-1.5 font-bold text-slate-500">
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                   Pasajeros
                 </div>
                 <span className="font-extrabold text-slate-705">{statsData.passengers}</span>
               </div>
               <div className="flex items-center justify-between border-t border-slate-50 pt-1">
                 <div className="flex items-center gap-1.5 font-bold text-slate-500">
                   <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                   Conductores
                 </div>
                 <span className="font-extrabold text-slate-705">{statsData.totalUsers - statsData.passengers || statsData.drivers}</span>
               </div>
             </div>
           </div>

           <p className="text-[9px] text-slate-400 font-bold leading-tight">
             Soporte óptimo de viajes con balance equilibrado en Rivo.
           </p>
         </div>

         {/* Widget 3: Carga Operativa */}
         <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs flex flex-col justify-between">
           <div>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Servicios en Tiempo Real</span>
             <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">Carga Operativa</h5>
           </div>
           
           <div className="space-y-2.5 my-2">
             <div className="space-y-0.5">
               <div className="flex items-center justify-between text-[10px]">
                 <span className="font-bold text-slate-500">Servicios Activos</span>
                 <span className="font-black text-indigo-600">{statsData.activeRoutes}</span>
               </div>
               <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                 <div 
                   className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                   style={{ width: `${Math.min(100, Math.max(15, (statsData.activeRoutes / ((statsData.completedRoutes || 10) + statsData.activeRoutes || 1)) * 100))}%` }}
                 />
               </div>
             </div>

             <div className="space-y-0.5">
               <div className="flex items-center justify-between text-[10px]">
                 <span className="font-bold text-slate-500">Efectividad Promedio</span>
                 <span className="font-black text-emerald-600">★ {statsData.averageRating.toFixed(2)}</span>
               </div>
               <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                 <div 
                   className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                   style={{ width: `${(statsData.averageRating / 5) * 100}%` }}
                 />
               </div>
             </div>
           </div>

           <p className="text-[9px] text-slate-400 font-bold leading-tight">
             Total finalizados: <span className="text-slate-600 font-extrabold">{statsData.completedRoutes} trayectos</span>.
           </p>
         </div>

      </div>

      {/* SECTION: FILA 3 – Audit Reciente (Full Width Wide Screen Logs) */}
      <div className="grid grid-cols-1 gap-6 pb-6" id="block-auditoria">

        {/* Actividad Reciente de Moderación */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Auditoría Ejecutiva</span>
              <h3 className="text-base font-black text-slate-850 tracking-tight">Actividad de Moderación Reciente</h3>
            </div>
            <button
              onClick={() => {
                onNavigateTab('moderation');
                if (onNavigateModerationSubTab) onNavigateModerationSubTab('logs');
              }}
              className="text-indigo-600 hover:text-indigo-700 text-xs font-black flex items-center gap-1 group cursor-pointer transition-colors"
            >
              Auditar Todo <ChevronRight size={13} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="divide-y divide-slate-100/70 pt-1">
            {top3Logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold italic">
                No hay actividad de administración registrada aún.
              </div>
            ) : (
              top3Logs.map((log: any) => {
                const logDate = log.createdAt ? new Date(log.createdAt).toLocaleString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                }) : 'Recientemente';

                return (
                  <div key={log.id} className="py-3 flex items-start gap-3.5 first:pt-0 last:pb-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 flex items-center justify-center shrink-0 text-xs font-bold font-mono">
                      {log.adminName?.slice(0, 2).toUpperCase() || 'AD'}
                    </div>
                    
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2.5">
                        <p className="text-xs font-black text-slate-850 uppercase tracking-tight truncate">
                          {log.action}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono text-left sm:text-right shrink-0">
                          {logDate}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                        {log.details}
                      </p>
                      
                      <p className="text-[9.5px] text-slate-400 font-bold mt-1">
                        Admin: <span className="text-indigo-650 font-black text-indigo-650">{log.adminName}</span> ({log.adminEmail})
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
