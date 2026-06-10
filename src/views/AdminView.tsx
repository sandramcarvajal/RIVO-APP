import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Route as RouteIcon, 
  ShieldAlert, 
  Search, 
  FileCheck, 
  Activity, 
  AlertTriangle,
  Lock, 
  CheckCircle,
  Clock,
  Car,
  ChevronRight,
  Filter,
  UserCheck,
  ShieldAlert as ShieldIcon
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

type TabId = 'routes' | 'users' | 'vehicles' | 'documents' | 'moderation';

const AdminView = () => {
  const { routes } = useAppStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('routes');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering routes
  const filteredRoutes = routes.filter(route => 
    route.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: 'Rutas Activas', value: String(routes.length), icon: RouteIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Usuarios Totales', value: '384', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Vehículos Esperando', value: '3', icon: Car, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Alertas Sistema', value: '1', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const tabs: { id: TabId; label: string; icon: any; isBeta?: boolean }[] = [
    { id: 'routes', label: 'Rutas', icon: RouteIcon },
    { id: 'users', label: 'Usuarios', icon: Users, isBeta: true },
    { id: 'vehicles', label: 'Vehículos', icon: Car, isBeta: true },
    { id: 'documents', label: 'Documentos', icon: FileCheck, isBeta: true },
    { id: 'moderation', label: 'Moderación', icon: ShieldIcon, isBeta: true },
  ];

  return (
    <div id="admin-operation-container" className="space-y-7 pb-24 text-left">
      {/* 1. Header with Name */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 rounded-full border border-violet-100/30">
            Control Operativo
          </span>
          <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 rounded-full">
            Producción Estable
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Operación General</h1>
        <p className="text-slate-500 font-semibold text-sm">Supervisión activa, administración de accesos, aprobación del parque vehicular y moderación de incidencias.</p>
      </header>

      {/* 2. Mini KPI Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-4.5 rounded-[24px] shadow-xs flex items-center gap-3">
            <div className={`w-9.5 h-9.5 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-xl font-black text-slate-800 leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Horizontal Custom Admin Tabs Selector */}
      <div className="border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.isBeta) {
                  showToast(`Visualizando adelanto visual de: ${tab.label}`, 'info');
                }
              }}
              className={`flex items-center gap-2 py-3 px-4.5 border-b-2 text-sm font-black transition-all whitespace-nowrap justify-center outline-none relative cursor-pointer ${
                isActive 
                  ? 'border-violet-600 text-violet-600' 
                  : 'border-transparent text-slate-450 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.label}</span>
              {tab.isBeta && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 ${
                  isActive ? 'bg-violet-100 text-violet-755' : 'bg-slate-100 text-slate-500'
                }`}>
                  Próximamente
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Main Panel Body */}
      <main className="min-h-[300px]">
        {activeTab === 'routes' && (
          <section className="space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Supervisión de Rutas Públicas</h3>
                <p className="text-xs text-slate-400 font-semibold">Trazado y estatus de recorridos metropolitanos activos</p>
              </div>
              <div className="w-full sm:w-64">
                <Input 
                  size="sm" 
                  placeholder="Buscar conductor, origen o destino..." 
                  icon={<Search size={16} className="text-slate-400" />} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredRoutes.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                  <RouteIcon size={24} />
                </div>
                <h4 className="font-bold text-slate-700">No se encontraron rutas</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Intenta modificando los criterios de búsqueda o registrando nuevos recorridos corporativos.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/55 border-b border-slate-100">
                      <th className="px-6 py-4.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Conductor</th>
                      <th className="px-6 py-4.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Ruta Origen → Destino</th>
                      <th className="px-6 py-4.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Vehículo / Capacidad</th>
                      <th className="px-6 py-4.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70">
                    {filteredRoutes.map((route) => (
                      <tr key={route.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 text-xs font-black flex items-center justify-center">
                              {route.driverName?.slice(0, 2).toUpperCase() || 'CV'}
                            </div>
                            <div className="text-left">
                              <p className="font-extrabold text-slate-800 text-sm leading-snug">{route.driverName || 'Conductor Corporativo'}</p>
                              <p className="text-[11px] text-slate-400 font-bold leading-none">ID: #{route.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-left">
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 leading-snug">
                              <span className="text-slate-900 font-extrabold">{route.origin}</span>
                              <ChevronRight size={12} className="text-slate-350" />
                              <span className="text-primary font-extrabold">{route.destination}</span>
                            </p>
                            <p className="text-xs text-slate-400 font-medium">{route.departureTime ? new Date(route.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '07:30 AM'} • {route.departureTime ? new Date(route.departureTime).toLocaleDateString() : 'Hoy'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-left space-y-0.5">
                            <p className="text-xs font-bold text-slate-700">Placa: <span className="font-black text-slate-900">{route.vehiclePlate || 'ABC-123'}</span></p>
                            <p className="text-[11px] text-slate-400 font-semibold">{route.availableSeats} cupos disponibles / {route.totalSeats || 4} totales</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10.5px] font-black uppercase tracking-wider border border-emerald-100/30">
                            <Activity size={10} className="animate-pulse" />
                            ACTIVA
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 2. Management of Users Preview (Beta / Coming soon) */}
        {activeTab === 'users' && (
          <section className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Gestión de Usuarios</h3>
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 rounded-lg px-2 py-0.5">Siguiente Sprint</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">Consolidado de afiliados corporativos, cambios de roles y bloqueo preventivo de perfiles</p>
              </div>
            </div>

            <div className="relative bg-white border border-slate-100 rounded-[28px] overflow-hidden p-6 text-center space-y-6">
              {/* Blur watermark block overlay */}
              <div className="space-y-3.5 max-w-lg mx-auto py-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center mx-auto shadow-sm">
                  <Lock size={20} strokeWidth={2.5} />
                </div>
                <h4 className="font-black text-slate-800 text-lg">Módulo de Usuarios en Desarrollo</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Este panel permitirá auditar las cuentas corporativas registradas con sus respectivos dominios autorizados de Rivo, bloquear perfiles infractores y habilitar permisos especiales entre Pasajeros y Conductores en un solo clic.
                </p>
              </div>

              {/* Sample Table Previewing behind modern semi-opaque banner card */}
              <div className="opacity-30 border border-slate-100 rounded-2xl overflow-hidden pointer-events-none text-left">
                <table className="w-full text-left text-xs bg-slate-50/10">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-450 uppercase">Nombre</th>
                      <th className="px-4 py-3 font-bold text-slate-450 uppercase">E-mail</th>
                      <th className="px-4 py-3 font-bold text-slate-450 uppercase">Rol</th>
                      <th className="px-4 py-3 font-bold text-slate-450 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-700">Carlos Mario Restrepo</td>
                      <td className="px-4 py-3 text-slate-550">carlos.mario@empresa.com</td>
                      <td className="px-4 py-3 font-bold"><span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Conductor</span></td>
                      <td className="px-4 py-3 text-emerald-600 font-black">Activo</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-700">Beatriz Helena Gaviria</td>
                      <td className="px-4 py-3 text-slate-550">beatriz.gaviria@empresa.com</td>
                      <td className="px-4 py-3 font-bold"><span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Pasajero</span></td>
                      <td className="px-4 py-3 text-emerald-600 font-black">Activo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 3. Management of Vehicles Preview (Beta / Coming soon) */}
        {activeTab === 'vehicles' && (
          <section className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Gestión de Vehículos</h3>
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 rounded-lg px-2 py-0.5">Siguiente Sprint</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">Aprobación, rechazo e historial de auditoría de automóviles e inscripciones vehiculares</p>
              </div>
            </div>

            <div className="relative bg-white border border-slate-100 rounded-[28px] overflow-hidden p-6 text-center space-y-6">
              <div className="space-y-3.5 max-w-lg mx-auto py-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center mx-auto shadow-sm">
                  <Car size={20} strokeWidth={2.5} />
                </div>
                <h4 className="font-black text-slate-800 text-lg">Módulo de Parque Automotor en Desarrollo</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Aquí podrás validar la cilindrada de los vehículos inscritos por los conductores, cotejar sus placas físicas oficiales y aprobar/rechazar las solicitudes vehiculares de Rivo para salvaguardar la experiencia de transporte.
                </p>
              </div>

              {/* Sample list Previewing back there */}
              <div className="opacity-25 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pointer-events-none">
                <div className="border border-slate-150 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-800">Mazda 3 (Negro)</h5>
                    <p className="text-xs text-slate-500">Placa: RIV-300 • Propietario: Pedro Pérez</p>
                  </div>
                  <span className="bg-amber-100 text-amber-700 px-2.5 py-1 text-[11px] font-black rounded-full uppercase tracking-wide">En revisión</span>
                </div>
                <div className="border border-slate-150 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-800">Kia Picanto (Gris)</h5>
                    <p className="text-xs text-slate-500">Placa: KLO-456 • Propietario: Liliana Castro</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[11px] font-black rounded-full uppercase tracking-wide">Aprobado</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. Document Verification Preview (Beta / Coming soon) */}
        {activeTab === 'documents' && (
          <section className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Gestión e Historial Documental</h3>
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 rounded-lg px-2 py-0.5">Siguiente Sprint</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">Validación del SOAT, licencia de conducción e inspecciones mecánicas preventivas</p>
              </div>
            </div>

            <div className="relative bg-white border border-slate-100 rounded-[28px] overflow-hidden p-6 text-center space-y-6">
              <div className="space-y-3.5 max-w-lg mx-auto py-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center mx-auto shadow-sm">
                  <FileCheck size={20} strokeWidth={2.5} />
                </div>
                <h4 className="font-black text-slate-800 text-lg">Módulo de Auditoría de Documentos en Desarrollo</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Sistema interactivo de revisión visual donde se desplegarán las imágenes adjuntas del SOAT y las licencias de conducción subidas por los usuarios. Incluirá zoom interactivo y aprobación asincrónica con envío de notificaciones automáticas al correo del conductor.
                </p>
              </div>

              {/* Sample list previewing */}
              <div className="opacity-20 flex flex-col gap-2 text-left pointer-events-none">
                <div className="border border-slate-150 p-4.5 rounded-xl flex items-center justify-between text-xs font-bold text-slate-600">
                  <span className="text-slate-850 font-black">SOAT_MAZDA3_RIV300.pdf</span>
                  <span className="text-violet-600 cursor-pointer">Verificar adjunto ➔</span>
                </div>
                <div className="border border-slate-150 p-4.5 rounded-xl flex items-center justify-between text-xs font-bold text-slate-600">
                  <span className="text-slate-850 font-black">LICENCIA_PEDRO_2026.png</span>
                  <span className="text-violet-600 cursor-pointer">Verificar adjunto ➔</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. System Moderation Preview (Beta / Coming soon) */}
        {activeTab === 'moderation' && (
          <section className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Moderación & Seguridad</h3>
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 rounded-lg px-2 py-0.5">Siguiente Sprint</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">Incidencias reportadas, alertas de Pico y Placa, y calibración de seguridad general</p>
              </div>
            </div>

            <div className="relative bg-white border border-slate-100 rounded-[28px] overflow-hidden p-6 text-center space-y-6">
              <div className="space-y-3.5 max-w-lg mx-auto py-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto shadow-xs border border-orange-100/50">
                  <AlertTriangle size={20} strokeWidth={2.5} />
                </div>
                <h4 className="font-black text-slate-800 text-lg">Módulo de Seguridad General en Desarrollo</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Panel integrado para examinar quejas de usuarios corporativos frente a retrasos o anomalías en la conducción. Permitirá coordinar alertas directas del pico y placa para los conductores exentos o infractores inmediatos de Bucaramanga.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminView;
