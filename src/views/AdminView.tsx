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
  ShieldAlert as ShieldIcon,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  FileText,
  Calendar,
  AlertCircle,
  Ban,
  History,
  LayoutDashboard
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { SecureHttpClient } from '../client/modules/auth/services/SecureHttpClient';
import { DashboardTab } from '../components/DashboardTab';

type TabId = 'dashboard' | 'routes' | 'users' | 'vehicles' | 'documents' | 'moderation';

const AdminView = () => {
  const { routes, user: currentUser } = useAppStore();

  const isCurrentUserMaster = currentUser?.email?.toLowerCase().trim() === 'admin@syc.com.co' || currentUser?.role?.toLowerCase() === 'admin_master';

  // SPRINT 8.6 - GESTIÓN DE USUARIOS
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<any | null>(null);

  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: '',
    role: 'passenger'
  });

  const [editUserForm, setEditUserForm] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: '',
    role: 'passenger'
  });

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserForm.email.trim() || !createUserForm.password.trim() || !createUserForm.role) {
      showToast('Por favor completa los campos requeridos (email, password y rol).', 'error');
      return;
    }

    if (!createUserForm.email.trim().toLowerCase().endsWith('@syc.com.co')) {
      showToast('Error: Solo se permiten correos corporativos @syc.com.co', 'error');
      return;
    }

    try {
      const res = await SecureHttpClient.request('/api/routes/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createUserForm)
      });

      if (res.ok) {
        showToast('Usuario creado exitosamente.', 'success');
        setShowCreateUserModal(false);
        setCreateUserForm({
          email: '',
          password: '',
          displayName: '',
          phone: '',
          role: 'passenger'
        });
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al crear el usuario.', 'error');
      }
    } catch (err) {
      showToast('Error de comunicación con el servidor.', 'error');
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;

    if (!editUserForm.email.trim() || !editUserForm.role) {
      showToast('Por favor ingresa un correo electrónico y rol válidos.', 'error');
      return;
    }

    if (!editUserForm.email.trim().toLowerCase().endsWith('@syc.com.co')) {
      showToast('Error: Solo se permiten correos corporativos @syc.com.co', 'error');
      return;
    }

    try {
      const body: any = {
        email: editUserForm.email,
        displayName: editUserForm.displayName,
        phone: editUserForm.phone,
        role: editUserForm.role
      };

      if (editUserForm.password.trim()) {
        body.password = editUserForm.password;
      }

      const res = await SecureHttpClient.request(`/api/routes/admin/users/${selectedUserToEdit.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showToast('Usuario actualizado exitosamente.', 'success');
        setShowEditUserModal(false);
        setSelectedUserToEdit(null);
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al actualizar el usuario.', 'error');
      }
    } catch (err) {
      showToast('Error de comunicación con el servidor.', 'error');
    }
  };
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    drivers: 0,
    passengers: 0,
    totalVehicles: 0,
    pendingVehicles: 0,
    activeRoutes: 0,
    completedRoutes: 0,
    averageRating: 4.91
  });
  const [loading, setLoading] = useState(true);

  // Sprint 4 states for users, vehicles and documents
  const [usersList, setUsersList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>('all');
  const [docStatusFilter, setDocStatusFilter] = useState<string>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [docComplianceFilter, setDocComplianceFilter] = useState<string>('all');
  
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<{ [key: string]: boolean }>({
    users: false,
    vehicles: false,
    documents: false,
    moderation: false
  });

  // Sprint 5 states for Moderation & Governance
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [adminLogsList, setAdminLogsList] = useState<any[]>([]);
  const [moderationStats, setModerationStats] = useState<any>({
    incidents: { suspendedUsers: [], rejectedVehicles: [], expiredDocuments: [], openReportsCount: 0 },
    riskAlerts: { lowRatedDrivers: [], usersWithMultipleReports: [], recurringCancellations: [] }
  });
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const [newReport, setNewReport] = useState({
    reportedUserId: '',
    reason: 'conducta_inapropiada',
    description: ''
  });
  const [moderationTabActive, setModerationTabActive] = useState<'reports' | 'logs' | 'risks' | 'incidents'>('reports');

  const fetchModerationData = async () => {
    setDataLoading(prev => ({ ...prev, moderation: true }));
    try {
      const repRes = await SecureHttpClient.request('/api/routes/admin/reports/all');
      if (repRes.ok) {
        setReportsList(await repRes.json());
      }
      const logRes = await SecureHttpClient.request('/api/routes/admin/logs/all');
      if (logRes.ok) {
        setAdminLogsList(await logRes.json());
      }
      const statsRes = await SecureHttpClient.request('/api/routes/admin/moderation/stats');
      if (statsRes.ok) {
        setModerationStats(await statsRes.json());
      }
    } catch (err) {
      console.error("[AdminView] Error loading moderation data:", err);
    } finally {
      setDataLoading(prev => ({ ...prev, moderation: false }));
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: string) => {
    try {
      const res = await SecureHttpClient.request(`/api/routes/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Reporte marcado como ${status === 'resolved' ? 'Resuelto' : status === 'reviewing' ? 'En Revisión' : status === 'dismissed' ? 'Descartado' : 'Pendiente'}.`, 'success');
        fetchModerationData();
      } else {
        showToast('Error al actualizar estado del reporte.', 'error');
      }
    } catch (err) {
      showToast('Error de comunicación con el servidor.', 'error');
    }
  };

  const handleCreateReport = async () => {
    if (!newReport.reportedUserId || !newReport.description.trim()) {
      showToast('Por favor completa todos los campos del reporte de moderación.', 'error');
      return;
    }
    try {
      const res = await SecureHttpClient.request('/api/routes/admin/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport)
      });
      if (res.ok) {
        showToast('Reporte registrado exitosamente.', 'success');
        setShowCreateReportModal(false);
        setNewReport({ reportedUserId: '', reason: 'conducta_inapropiada', description: '' });
        fetchModerationData();
      } else {
        showToast('Error al crear el reporte.', 'error');
      }
    } catch (err) {
      showToast('Error al conectar con el servidor.', 'error');
    }
  };

  const fetchUsers = async () => {
    setDataLoading(prev => ({ ...prev, users: true }));
    try {
      const res = await SecureHttpClient.request('/api/routes/admin/users/all');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setDataLoading(prev => ({ ...prev, users: false }));
    }
  };

  const fetchVehicles = async () => {
    setDataLoading(prev => ({ ...prev, vehicles: true }));
    try {
      const res = await SecureHttpClient.request('/api/routes/admin/vehicles/all');
      if (res.ok) {
        const data = await res.json();
        setVehiclesList(data);
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setDataLoading(prev => ({ ...prev, vehicles: false }));
    }
  };

  const fetchDocuments = async () => {
    setDataLoading(prev => ({ ...prev, documents: true }));
    try {
      const res = await SecureHttpClient.request('/api/routes/admin/documents/all');
      if (res.ok) {
        const data = await res.json();
        setDocumentsList(data);
      }
    } catch (err) {
      console.error("Error fetching docs:", err);
    } finally {
      setDataLoading(prev => ({ ...prev, documents: false }));
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await SecureHttpClient.request(`/api/routes/admin/users/${userId}/toggle-status`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast(`Estado del usuario actualizado con éxito.`, 'success');
          setUsersList(prev => prev.map(u => u.id === userId ? { ...u, isDisabled: data.user.isDisabled } : u));
        } else {
          showToast(`Error: ${data.error || 'No se pudo cambiar el estado'}`, 'error');
        }
      } else {
        showToast(`Imposible actualizar estado.`, 'error');
      }
    } catch (err) {
      showToast(`Error al conectar con el servidor.`, 'error');
    }
  };

  const handleVerifyVehicle = async (vehicleId: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !rejectReason.trim()) {
      showToast('Por favor escribe un motivo de rechazo.', 'error');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await SecureHttpClient.request(`/api/routes/admin/vehicles/${vehicleId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectReason: status === 'rejected' ? rejectReason : undefined })
      });
      if (res.ok) {
        showToast(`Vehículo ${status === 'approved' ? 'aprobado' : 'rechazado'} con éxito.`, 'success');
        setRejectReason('');
        setSelectedVehicle(null);
        fetchVehicles();
        // Update stats
        const responseStats = await SecureHttpClient.request('/api/routes/admin/analytics/stats');
        if (responseStats.ok) {
          const statsD = await responseStats.json();
          setStatsData(prev => ({ ...prev, pendingVehicles: statsD.pendingVehicles }));
        }
      } else {
        showToast(`Error al verificar vehículo.`, 'error');
      }
    } catch (err) {
      showToast(`Fallo en la comunicación con el servidor.`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyDocument = async (docId: string, sourceType: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !rejectReason.trim()) {
      showToast('Por favor escribe un motivo de rechazo.', 'error');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await SecureHttpClient.request(`/api/routes/admin/documents/${sourceType}/${docId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectReason: status === 'rejected' ? rejectReason : undefined })
      });
      if (res.ok) {
        showToast(`Documento ${status === 'approved' ? 'aprobado' : 'rechazado'} con éxito.`, 'success');
        setRejectReason('');
        setSelectedDocument(null);
        fetchDocuments();
      } else {
        showToast(`Error al verificar el documento.`, 'error');
      }
    } catch (err) {
      showToast(`Fallo en la comunicación con el servidor.`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  React.useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const response = await SecureHttpClient.request('/api/routes/admin/analytics/stats');
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setStatsData({
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
        console.error("[AdminView] Error loading stats:", err);
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

  React.useEffect(() => {
    if (activeTab === 'dashboard') {
      const loadDashboard = async () => {
        setLoading(true);
        try {
          const statsRes = await SecureHttpClient.request('/api/routes/admin/analytics/stats');
          if (statsRes.ok) {
            const data = await statsRes.json();
            setStatsData({
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
          await Promise.all([
            fetchUsers(),
            fetchVehicles(),
            fetchDocuments(),
            fetchModerationData()
          ]);
        } catch (err) {
          console.error("Dashboard parallel fetch failed:", err);
        } finally {
          setLoading(false);
        }
      };
      loadDashboard();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'vehicles') {
      fetchVehicles();
    } else if (activeTab === 'documents') {
      fetchDocuments();
    } else if (activeTab === 'moderation') {
      fetchModerationData();
      fetchUsers(); // also load users list for reporting selector
    }
  }, [activeTab]);

  // Filtering routes
  const filteredRoutes = routes.filter(route => 
    route.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Contextual Document Filtering (Sprint 8.3)
  const filteredDocuments = documentsList
    .filter(d => docStatusFilter === 'all' || d.status?.toLowerCase() === docStatusFilter.toLowerCase())
    .filter(d => docTypeFilter === 'all' || d.documentType === docTypeFilter)
    .filter(d => {
      if (docComplianceFilter === 'all') return true;
      if (docComplianceFilter === 'AL_DIA') return d.complianceStatus === 'AL_DIA';
      if (docComplianceFilter === 'EXPIRING_SOON') {
        return d.complianceStatus === 'VENCE_EN_15_DIAS' || d.complianceStatus === 'VENCE_EN_30_DIAS';
      }
      if (docComplianceFilter === 'VENCIDO') return d.complianceStatus === 'VENCIDO';
      return true;
    });

  const stats = [
    { label: 'Rutas Activas', value: loading ? '...' : String(statsData.activeRoutes), icon: RouteIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Usuarios Totales', value: loading ? '...' : String(statsData.totalUsers), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Vehículos Pendientes', value: loading ? '...' : String(statsData.pendingVehicles), icon: Car, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Calificación Promedio', value: loading ? '...' : statsData.averageRating.toFixed(2), icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const tabs: { id: TabId; label: string; icon: any; isBeta?: boolean }[] = [
    { id: 'dashboard', label: 'Tablero de Control', icon: LayoutDashboard },
    { id: 'routes', label: 'Rutas', icon: RouteIcon },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'vehicles', label: 'Vehículos', icon: Car },
    { id: 'documents', label: 'Documentos', icon: FileCheck },
    { id: 'moderation', label: 'Moderación', icon: ShieldIcon },
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

      {/* 2. Mini KPI Stats - only visible on non-dashboard screens */}
      {activeTab !== 'dashboard' && (
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
      )}

      {/* 3. Horizontal Custom Admin Tabs Selector */}
      <div className="border-b border-slate-100 flex items-center w-full overflow-x-auto pb-0.5 scrollbar-none gap-1.5">
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
              className={`flex-1 flex items-center gap-2 py-3 px-4.5 border-b-2 text-sm font-black transition-all whitespace-nowrap justify-center outline-none relative cursor-pointer ${
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
        {activeTab === 'dashboard' && (
          <DashboardTab
            statsData={statsData}
            usersList={usersList}
            vehiclesList={vehiclesList}
            documentsList={documentsList}
            reportsList={reportsList}
            adminLogsList={adminLogsList}
            moderationStats={moderationStats}
            loading={loading}
            onNavigateTab={(tab, filters) => {
              setActiveTab(tab);
              if (tab === 'documents' && filters) {
                if (filters.status) {
                  setDocStatusFilter(filters.status);
                } else if (filters.type || filters.compliance) {
                  setDocStatusFilter('all');
                }
                if (filters.type) {
                  setDocTypeFilter(filters.type);
                } else {
                  setDocTypeFilter('all');
                }
                if (filters.compliance) {
                  setDocComplianceFilter(filters.compliance);
                } else {
                  setDocComplianceFilter('all');
                }
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateModerationSubTab={(sub) => {
              setModerationTabActive(sub);
            }}
          />
        )}
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

        {/* 2. Management of Users - FULLY FUNCTIONAL */}
        {activeTab === 'users' && (
          <section className="space-y-5 animate-in fade-in duration-300">
            {/* Header / Privileges Bar */}
            <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center shrink-0 ${
                  isCurrentUserMaster ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCurrentUserMaster ? <ShieldIcon size={18} strokeWidth={2.5} /> : <Lock size={18} />}
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nivel de Credenciales</p>
                  <p className="text-sm font-black text-slate-800 leading-none">
                    {isCurrentUserMaster ? 'ADMIN_MASTER (Control Absoluto)' : 'ADMIN (Modo Restringido)'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setCreateUserForm({
                    email: '',
                    password: '',
                    displayName: '',
                    phone: '',
                    role: 'passenger'
                  });
                  setShowCreateUserModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black tracking-wide hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <UserCheck size={14} strokeWidth={2.5} />
                <span>Crear Nuevo Usuario</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Gestión de Usuarios</h3>
                <p className="text-xs text-slate-400 font-semibold">Consolidado de afiliados corporativos, cambios de roles y bloqueo preventivo de perfiles</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                  <Filter size={12} /> Filtrar rol:
                </span>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 font-bold focus:outline-hidden"
                >
                  <option value="all">Todos los Roles</option>
                  <option value="passenger">Pasajeros</option>
                  <option value="driver">Conductores</option>
                  <option value="admin">Administradores</option>
                  <option value="admin_master">Master Admins</option>
                </select>
                <button
                  onClick={fetchUsers}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 shrink-0 cursor-pointer"
                  title="Recargar"
                >
                  <RefreshCw size={14} className={dataLoading.users ? "animate-spin text-indigo-500" : ""} />
                </button>
              </div>
            </div>

            {dataLoading.users ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-2 shadow-xs">
                <RefreshCw size={24} className="animate-spin text-indigo-500" />
                <span>Cargando usuarios corporativos reales...</span>
              </div>
            ) : usersList.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-350 mx-auto">
                  <Users size={24} />
                </div>
                <h4 className="font-bold text-slate-700">No hay usuarios registrados</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">No se encontraron registros de usuarios en la base de datos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop View Table */}
                <div className="hidden md:block bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-xs">
                  <div className="overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse min-w-[750px] md:min-w-0">
                      <thead>
                        <tr className="bg-slate-50/55 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Usuario</th>
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Email</th>
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Rol</th>
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Estado</th>
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70">
                        {usersList
                          .filter(user => selectedRoleFilter === 'all' || user.role?.toLowerCase() === selectedRoleFilter.toLowerCase())
                          .map((user) => {
                            const isUserAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'admin_master';
                            const isUserAdminMaster = user.role?.toLowerCase() === 'admin_master' || user.email?.toLowerCase().trim() === 'admin@syc.com.co';
                            
                            // Standard admin cannot edit/toggle any administrator or modifying master
                            const canModifyUser = isCurrentUserMaster || (!isUserAdmin && !isUserAdminMaster);

                            return (
                              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                      isUserAdminMaster ? 'bg-violet-100 text-violet-700' : isUserAdmin ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {user.displayName?.slice(0, 2).toUpperCase() || user.email?.slice(0, 2).toUpperCase() || 'US'}
                                    </div>
                                    <div className="text-left min-w-0">
                                      <p className="font-extrabold text-slate-800 text-sm leading-snug flex items-center gap-1.5">
                                        <span className="truncate max-w-[150px] sm:max-w-none">{user.displayName || 'Usuario'}</span>
                                        {!canModifyUser && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-205 text-[9px] text-slate-450 font-semibold flex items-center gap-0.5">
                                            <Lock size={8} /> Protegido
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">ID: #{user.id}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-slate-600 font-semibold text-xs shrink-0 block truncate max-w-[180px] sm:max-w-none">{user.email}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded leading-none uppercase tracking-wider ${
                                    isUserAdminMaster
                                      ? 'bg-purple-100 text-purple-755 border border-purple-200' 
                                      : isUserAdmin
                                      ? 'bg-violet-50 text-violet-755 border border-violet-100' 
                                      : user.role?.toLowerCase() === 'driver'
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                                  }`}>
                                    {isUserAdminMaster ? 'ADMIN MASTER 👑' : user.role === 'driver' ? 'CONDUCTOR' : user.role === 'passenger' ? 'PASAJERO' : user.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {user.isDisabled ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-650 text-[10.5px] font-black uppercase tracking-wider border border-rose-100">
                                      <Ban size={11} /> SUSPENDIDO
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-650 text-[10.5px] font-black uppercase tracking-wider border border-emerald-100">
                                      <CheckCircle size={11} className="text-emerald-500" /> ACTIVO
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      disabled={!canModifyUser}
                                      onClick={() => {
                                        setSelectedUserToEdit(user);
                                        setEditUserForm({
                                          email: user.email,
                                          password: '',
                                          displayName: user.displayName || '',
                                          phone: user.phone || '',
                                          role: user.role
                                        });
                                        setShowEditUserModal(true);
                                      }}
                                      className={`px-2.5 py-1 text-xs font-black rounded-lg transition-colors border select-none ${
                                        canModifyUser
                                          ? 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 cursor-pointer'
                                          : 'bg-slate-50 text-slate-350 border-slate-150 cursor-not-allowed'
                                      }`}
                                      title={canModifyUser ? "Editar usuario" : "No tienes permisos para editar este usuario"}
                                    >
                                      {canModifyUser ? 'Editar' : '🔒 Editar'}
                                    </button>

                                    <button
                                      disabled={!canModifyUser}
                                      onClick={() => handleToggleUserStatus(user.id)}
                                      className={`px-2.5 py-1 text-xs font-black rounded-lg transition-colors border select-none ${
                                        !canModifyUser
                                          ? 'bg-slate-50 text-slate-350 border-slate-150 cursor-not-allowed'
                                          : user.isDisabled 
                                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 border-transparent shadow-xs cursor-pointer' 
                                          : 'bg-rose-55 bg-rose-50 text-rose-650 hover:bg-rose-100 border-rose-100 cursor-pointer'
                                      }`}
                                      title={canModifyUser ? "Bloquear o reactivar" : "No tienes permisos para suspender este usuario"}
                                    >
                                      {!canModifyUser ? '🔒 Estado' : user.isDisabled ? 'Reactivar' : 'Suspender'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile View Card Grid */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {usersList
                    .filter(user => selectedRoleFilter === 'all' || user.role?.toLowerCase() === selectedRoleFilter.toLowerCase())
                    .map((user) => {
                      const isUserAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'admin_master';
                      const isUserAdminMaster = user.role?.toLowerCase() === 'admin_master' || user.email?.toLowerCase().trim() === 'admin@syc.com.co';
                      const canModifyUser = isCurrentUserMaster || (!isUserAdmin && !isUserAdminMaster);

                      return (
                        <div key={user.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                isUserAdminMaster ? 'bg-violet-100 text-violet-700' : isUserAdmin ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {user.displayName?.slice(0, 2).toUpperCase() || user.email?.slice(0, 2).toUpperCase() || 'US'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-slate-800 text-sm leading-snug truncate flex items-center gap-1">
                                  <span>{user.displayName || 'Usuario'}</span>
                                  {!canModifyUser && <Lock size={10} className="text-slate-400" />}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">ID: #{user.id}</p>
                              </div>
                            </div>
                            <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded leading-none uppercase tracking-wider shrink-0 ${
                              isUserAdminMaster
                                ? 'bg-purple-100 text-purple-755 border border-purple-200' 
                                : isUserAdmin
                                ? 'bg-violet-50 text-violet-755 border border-violet-100' 
                                : user.role?.toLowerCase() === 'driver'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-slate-50 text-slate-500 border border-slate-100'
                            }`}>
                              {isUserAdminMaster ? 'ADMIN MASTER 👑' : user.role === 'driver' ? 'CONDUCTOR' : user.role === 'passenger' ? 'PASAJERO' : user.role}
                            </span>
                          </div>

                          <div className="border-t border-slate-50 pt-3.5 space-y-3">
                            <div>
                              <span className="text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-0.5">Email</span>
                              <span className="text-slate-600 font-semibold text-xs break-all">{user.email}</span>
                            </div>

                            <div className="flex items-end justify-between pt-2 border-t border-slate-50/70">
                              <div>
                                <span className="text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-1">Estado</span>
                                {user.isDisabled ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-650 text-[10px] font-black uppercase tracking-wider border border-rose-100">
                                    <Ban size={10} /> SUSPENDIDO
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-650 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                    <CheckCircle size={10} className="text-emerald-500" /> ACTIVO
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={!canModifyUser}
                                  onClick={() => {
                                    setSelectedUserToEdit(user);
                                    setEditUserForm({
                                      email: user.email,
                                      password: '',
                                      displayName: user.displayName || '',
                                      phone: user.phone || '',
                                      role: user.role
                                    });
                                    setShowEditUserModal(true);
                                  }}
                                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                    canModifyUser
                                      ? 'bg-white text-slate-700 border border-slate-200'
                                      : 'bg-slate-50 text-slate-300 border border-slate-150 cursor-not-allowed'
                                  }`}
                                >
                                  {canModifyUser ? 'Editar' : '🔒'}
                                </button>
                                
                                <button
                                  disabled={!canModifyUser}
                                  onClick={() => handleToggleUserStatus(user.id)}
                                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                    !canModifyUser
                                      ? 'bg-slate-50 text-slate-300 border border-slate-150 cursor-not-allowed'
                                      : user.isDisabled 
                                      ? 'bg-emerald-500 text-white shadow-xs' 
                                      : 'bg-rose-50 text-rose-600 border border-rose-100'
                                  }`}
                                >
                                  {!canModifyUser ? '🔒 Estado' : user.isDisabled ? 'Habilitar' : 'Inactivar'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* CREAR USUARIO MODAL */}
            {showCreateUserModal && (
              <div id="modal-create-user" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-[28px] max-w-md w-full border border-slate-100 p-6 shadow-2xl text-left space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <UserCheck size={20} className="text-indigo-600" />
                      Crear Nuevo Usuario
                    </h3>
                    <button 
                      onClick={() => setShowCreateUserModal(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      ✕ Cerrar
                    </button>
                  </div>

                  <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Correo Electrónico *</label>
                      <input 
                        type="email" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                        placeholder="ejemplo@rivo.com"
                        value={createUserForm.email}
                        onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Contraseña de Acceso *</label>
                      <input 
                        type="password" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                        placeholder="••••••••••••"
                        value={createUserForm.password}
                        onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Nombre Completo</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          placeholder="Juan Pérez"
                          value={createUserForm.displayName}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, displayName: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Teléfono de Enlace</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          placeholder="+57 300 000 0000"
                          value={createUserForm.phone}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1">
                        <span>Rol Asignado *</span>
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        value={createUserForm.role}
                        onChange={(e) => setCreateUserForm(prev => ({ ...prev, role: e.target.value }))}
                      >
                        <option value="passenger">PASAJERO (Pasajero corporativo estándar)</option>
                        <option value="driver">CONDUCTOR (Conductor de recorridos)</option>
                        
                        {/* standard ADMIN can NOT create admin roles */}
                        <option value="admin" disabled={!isCurrentUserMaster}>
                          ADMINISTRADOR {!isCurrentUserMaster ? '🔒 (Requiere ADMIN_MASTER)' : ''}
                        </option>
                        <option value="admin_master" disabled={!isCurrentUserMaster}>
                          ADMINISTRADOR MASTER {!isCurrentUserMaster ? '🔒 (Requiere ADMIN_MASTER)' : ''}
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3.5 pt-2">
                      <button 
                        type="button"
                        onClick={() => setShowCreateUserModal(false)}
                        className="w-1/2 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="w-1/2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 cursor-pointer shadow-xs"
                      >
                        Crear Afiliado
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* EDITAR USUARIO MODAL */}
            {showEditUserModal && selectedUserToEdit && (
              <div id="modal-edit-user" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-[28px] max-w-md w-full border border-slate-100 p-6 shadow-2xl text-left space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Activity size={20} className="text-indigo-600" />
                      Editar Usuario #{selectedUserToEdit.id}
                    </h3>
                    <button 
                      onClick={() => {
                        setShowEditUserModal(false);
                        setSelectedUserToEdit(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      ✕ Cerrar
                    </button>
                  </div>

                  <form onSubmit={handleEditUserSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Correo Electrónico *</label>
                      <input 
                        type="email" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                        value={editUserForm.email}
                        onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                        Contraseña (Opcional - Dejar vacío para no cambiar)
                      </label>
                      <input 
                        type="password" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                        placeholder="Escribe para modificar..."
                        value={editUserForm.password}
                        onChange={(e) => setEditUserForm(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Nombre Completo</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          value={editUserForm.displayName}
                          onChange={(e) => setEditUserForm(prev => ({ ...prev, displayName: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Teléfono de Enlace</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          value={editUserForm.phone}
                          onChange={(e) => setEditUserForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Rol Asignado *</label>
                      
                      {/* Enforce role assignment rules */}
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        value={editUserForm.role}
                        onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value }))}
                      >
                        <option value="passenger">PASAJERO</option>
                        <option value="driver">CONDUCTOR</option>
                        
                        <option value="admin" disabled={!isCurrentUserMaster}>
                          ADMINISTRADOR {!isCurrentUserMaster ? '🔒 (Requiere ADMIN_MASTER)' : ''}
                        </option>
                        <option value="admin_master" disabled={!isCurrentUserMaster}>
                          ADMINISTRADOR MASTER {!isCurrentUserMaster ? '🔒 (Requiere ADMIN_MASTER)' : ''}
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3.5 pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setShowEditUserModal(false);
                          setSelectedUserToEdit(null);
                        }}
                        className="w-1/2 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="w-1/2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 cursor-pointer shadow-xs"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </section>
        )}

        {/* 3. Management of Vehicles - FULLY FUNCTIONAL */}
        {activeTab === 'vehicles' && (
          <section className="space-y-5 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Gestión de Vehículos</h3>
                <p className="text-xs text-slate-400 font-semibold">Aprobación, rechazo e historial de auditoría de automóviles e inscripciones vehiculares</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                  <Filter size={12} /> Estado:
                </span>
                <select
                  value={vehicleStatusFilter}
                  onChange={(e) => setVehicleStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 font-bold focus:outline-hidden"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="pending">Pendientes de Aprobación</option>
                  <option value="approved">Aprobados</option>
                  <option value="rejected">Rechazados</option>
                </select>
                <button
                  onClick={fetchVehicles}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 shrink-0 cursor-pointer"
                  title="Recargar"
                >
                  <RefreshCw size={14} className={dataLoading.vehicles ? "animate-spin text-indigo-500" : ""} />
                </button>
              </div>
            </div>

            {dataLoading.vehicles ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-2 shadow-xs">
                <RefreshCw size={24} className="animate-spin text-indigo-500" />
                <span>Cargando parque automotor real...</span>
              </div>
            ) : vehiclesList.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-350 mx-auto">
                  <Car size={24} />
                </div>
                <h4 className="font-bold text-slate-700">No hay vehículos registrados</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">No se encontraron vehículos registrados en la base de datos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4.5">
                {vehiclesList
                  .filter(v => vehicleStatusFilter === 'all' || v.verifiedStatus?.toLowerCase() === vehicleStatusFilter.toLowerCase())
                  .map((vehicle) => {
                    const isSelected = selectedVehicle?.id === vehicle.id;
                    return (
                      <div key={vehicle.id} className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs hover:border-slate-200/85 transition-all text-left space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0 border border-indigo-100/50">
                              <Car size={22} strokeWidth={2} />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-800 text-sm leading-snug">{vehicle.brand} {vehicle.model}</h4>
                                <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5 border border-slate-150">{vehicle.color}</span>
                                <span className="text-[9px] font-black uppercase bg-slate-100 rounded-md px-1.5 py-0.5 tracking-wider border border-slate-150 text-slate-650">{vehicle.type === 'motorcycle' ? 'Moto' : 'Automóvil'}</span>
                              </div>
                              <p className="text-xs text-slate-450 font-bold leading-normal mt-0.5 flex items-center gap-1">
                                <span className="text-slate-700 font-extrabold">{vehicle.ownerName}</span> ({vehicle.ownerEmail})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-xs text-slate-750 bg-slate-50 border border-slate-150/80 rounded-lg px-2.5 py-1.2 select-all tracking-wider">
                              PLACA: <strong className="text-slate-900 font-black">{vehicle.plate?.toUpperCase()}</strong>
                            </span>
                            
                            {vehicle.verifiedStatus === 'approved' ? (
                              <span className="bg-emerald-55 bg-emerald-50 text-emerald-650 border border-emerald-250 px-2.5 py-1.2 text-[10.5px] font-black rounded-lg uppercase tracking-wider">
                                Aprobado
                              </span>
                            ) : vehicle.verifiedStatus === 'rejected' ? (
                              <span className="bg-rose-50 text-rose-650 border border-rose-150 px-2.5 py-1.2 text-[10.5px] font-black rounded-lg uppercase tracking-wider">
                                Rechazado
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-650 border border-amber-150 px-2.5 py-1.2 text-[10.5px] font-black rounded-lg uppercase tracking-wider">
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Associated documents for this vehicle */}
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/80 space-y-3.5">
                          <p className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1.5">
                            <FileCheck size={13} strokeWidth={2.5} /> Documentos de Auditoría Cargados:
                          </p>
                          {vehicle.documents && vehicle.documents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {vehicle.documents.map((doc: any) => (
                                <div key={doc.id} className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between text-xs shadow-xs">
                                  <div className="min-w-0 pr-2">
                                    <p className="text-slate-800 font-extrabold truncate uppercase text-[10.5px] leading-tight flex items-center gap-1">
                                      <FileText size={11} className="text-indigo-500" />
                                      {doc.documentType === 'soat' ? 'SOAT' : doc.documentType === 'property_card' ? 'Tarjeta de Propiedad' : 'Técnico Preventiva'}
                                    </p>
                                    <p className="text-[9px] text-slate-400 mt-1 font-bold">
                                      Estado: <span className={doc.status === 'approved' ? 'text-emerald-600 font-extrabold' : doc.status === 'rejected' ? 'text-rose-600 font-extrabold' : 'text-amber-600 font-extrabold'}>{doc.status?.toUpperCase()}</span>
                                    </p>
                                  </div>
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    referrerPolicy="no-referrer"
                                    className="text-violet-600 hover:text-violet-800 underline text-[10.5px] shrink-0 font-black leading-none"
                                  >
                                    Ver PDF
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 font-semibold italic">Este vehículo no contiene documentos cargados.</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end border-t border-slate-100 pt-3.5">
                          {isSelected ? (
                            <div className="space-y-3.5 w-full animate-in slide-in-from-top-1.5">
                              <label className="text-[10.5px] font-black uppercase text-slate-400">Detallar motivo de rechazo vehicular:</label>
                              <textarea
                                placeholder="Escribe el motivo del rechazo aquí para que el conductor pueda subsanarlo..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-hidden text-slate-800"
                                rows={2}
                              />
                              <div className="flex items-center justify-end gap-2 text-xs font-black">
                                <button
                                  onClick={() => { setSelectedVehicle(null); setRejectReason(''); }}
                                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleVerifyVehicle(vehicle.id, 'rejected')}
                                  disabled={isVerifying}
                                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                  Confirmar Rechazo
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {vehicle.verifiedStatus !== 'approved' && (
                                <button
                                  onClick={() => handleVerifyVehicle(vehicle.id, 'approved')}
                                  disabled={isVerifying}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-4 py-2 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <ThumbsUp size={12} strokeWidth={2.5} /> Aprobar Vehículo
                                </button>
                              )}
                              {vehicle.verifiedStatus !== 'rejected' && (
                                <button
                                  onClick={() => setSelectedVehicle(vehicle)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black px-4 py-2 rounded-lg border border-rose-100 cursor-pointer flex items-center gap-1.5"
                                >
                                  <ThumbsDown size={12} strokeWidth={2.5} /> Rechazar parque vehicular
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {/* 4. Document Verification - FULLY FUNCTIONAL */}
        {activeTab === 'documents' && (
          <section className="space-y-5 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Gestión e Historial Documental</h3>
                <p className="text-xs text-slate-400 font-semibold">Validación del SOAT, licencia de conducción e inspecciones mecánicas preventivas</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter 1: Audit Status */}
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                  <Filter size={12} /> Auditoría:
                </span>
                <select
                  value={docStatusFilter}
                  onChange={(e) => setDocStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 font-bold focus:outline-hidden"
                >
                  <option value="all">Todos (Estatus)</option>
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobados</option>
                  <option value="rejected">Rechazados</option>
                </select>

                {/* Filter 2: Document Type */}
                <span className="text-xs text-slate-400 font-bold ml-1">Tipo:</span>
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 font-bold focus:outline-hidden"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="license">Licencia de Conducción</option>
                  <option value="soat">SOAT</option>
                  <option value="tech_preventive">Tecnomecánica</option>
                </select>

                {/* Filter 3: Compliance/Expiration */}
                <span className="text-xs text-slate-400 font-bold ml-1">Vigencia:</span>
                <select
                  value={docComplianceFilter}
                  onChange={(e) => setDocComplianceFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 font-bold focus:outline-hidden"
                >
                  <option value="all">Cualquier vigencia</option>
                  <option value="AL_DIA">Al Día (Vigentes)</option>
                  <option value="EXPIRING_SOON">Próximos a Vencer (15-30 d)</option>
                  <option value="VENCIDO">Vencidos (Acción Crítica)</option>
                </select>

                {/* Clear Filters Button (If any active) */}
                {(docStatusFilter !== 'all' || docTypeFilter !== 'all' || docComplianceFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setDocStatusFilter('all');
                      setDocTypeFilter('all');
                      setDocComplianceFilter('all');
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-600 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                )}

                <button
                  onClick={fetchDocuments}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 shrink-0 cursor-pointer ml-1"
                  title="Recargar"
                >
                  <RefreshCw size={14} className={dataLoading.documents ? "animate-spin text-indigo-500" : ""} />
                </button>
              </div>
            </div>

            {dataLoading.documents ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-2 shadow-xs">
                <RefreshCw size={24} className="animate-spin text-indigo-500" />
                <span>Cargando documentos reales...</span>
              </div>
            ) : documentsList.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-350 mx-auto">
                  <FileCheck size={24} />
                </div>
                <h4 className="font-bold text-slate-700">No hay documentos registrados</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">No se encontraron documentos en la base de datos para auditar.</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-350 mx-auto">
                  <Filter size={20} className="text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-750">Ningún documento coincide con los filtros</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">No se encontraron documentos que coincidan con los criterios de Auditoría, Tipo y Vigencia seleccionados.</p>
                <button
                  onClick={() => {
                    setDocStatusFilter('all');
                    setDocTypeFilter('all');
                    setDocComplianceFilter('all');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl transition-colors cursor-pointer border border-indigo-100"
                >
                  Restablecer Todos los Filtros
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop View Table */}
                <div className="hidden md:block bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-xs">
                  <div className="overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse min-w-[850px] md:min-w-0">
                      <thead>
                        <tr className="bg-slate-50/55 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Documento / Propietario</th>
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Origen</th>
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Vencimiento</th>
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Estatus</th>
                          <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70">
                        {filteredDocuments
                          .map((doc) => {
                            const isDocSelected = selectedDocument?.id === doc.id && selectedDocument?.sourceType === doc.sourceType;
                            const isExpired = doc.expirationDate ? new Date(doc.expirationDate) < new Date() : false;
                            
                            return (
                              <React.Fragment key={`${doc.sourceType}-${doc.id}`}>
                                <tr className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="text-left space-y-0.5">
                                      <p className="font-extrabold text-slate-800 text-xs uppercase flex items-center gap-1 truncate max-w-xs sm:max-w-md">
                                        <FileText size={12} className="text-indigo-600" strokeWidth={2.5} />
                                        {doc.documentName}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">
                                        Propietario: <span className="text-slate-600 font-black">{doc.ownerName}</span> ({doc.ownerEmail}) {doc.plate && `• Placa: ${doc.plate}`}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded leading-none ${
                                      doc.sourceType === 'vehicle' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {doc.sourceType?.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-left">
                                      <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                        <Calendar size={11} className="text-slate-400" />
                                        {doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : 'No cuenta'}
                                      </p>
                                      {isExpired && (
                                        <span className="text-[8.5px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 mt-0.5 inline-block uppercase tracking-wide">
                                          Vencido
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {doc.status === 'approved' ? (
                                      <span className="inline-block bg-emerald-50 text-emerald-650 px-2 py-0.5 text-[9.5px] font-black rounded uppercase tracking-wider border border-emerald-100">
                                        Aprobado
                                      </span>
                                    ) : doc.status === 'rejected' ? (
                                      <span className="inline-block bg-rose-50 text-rose-650 px-2 py-0.5 text-[9.5px] font-black rounded uppercase tracking-wider border border-rose-100">
                                        Rechazado
                                      </span>
                                    ) : (
                                      <span className="inline-block bg-amber-50 text-amber-650 px-2 py-0.5 text-[9.5px] font-black rounded uppercase tracking-wider border border-amber-100">
                                        Pendiente
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        referrerPolicy="no-referrer"
                                        className="p-1 px-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-md font-bold hover:bg-slate-100 tracking-tight transition-colors inline-flex items-center gap-1 shrink-0"
                                      >
                                        <Eye size={12} /> Abrir Adjunto
                                      </a>
                                      
                                      {doc.status !== 'approved' && (
                                        <button
                                          onClick={() => handleVerifyDocument(doc.id, doc.sourceType, 'approved')}
                                          disabled={isVerifying}
                                          className="p-1.5 bg-emerald-50 text-emerald-650 border border-emerald-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                          title="Aprobar"
                                        >
                                          <ThumbsUp size={12} strokeWidth={2.5} />
                                        </button>
                                      )}
                                      
                                      {doc.status !== 'rejected' && (
                                        <button
                                          onClick={() => { setSelectedDocument(doc); setRejectReason(''); }}
                                          className="p-1.5 bg-rose-50 text-rose-650 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                                          title="Rechazar con motivo"
                                        >
                                          <ThumbsDown size={12} strokeWidth={2.5} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                {isDocSelected && (
                                  <tr className="bg-slate-50/50">
                                    <td colSpan={5} className="px-6 py-3">
                                      <div className="space-y-3 p-3.5 border border-slate-150 rounded-xl bg-white animate-in slide-in-from-top-1">
                                        <p className="text-xs font-bold text-slate-700">Rechazar Documento: <span className="font-extrabold text-slate-900">{doc.documentName}</span></p>
                                        <textarea
                                          placeholder="Escribe el motivo del rechazo del documento aquí..."
                                          value={rejectReason}
                                          onChange={(e) => setRejectReason(e.target.value)}
                                          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-hidden text-slate-800"
                                          rows={2}
                                        />
                                        <div className="flex items-center justify-end gap-2 text-xs font-black">
                                          <button
                                            onClick={() => { setSelectedDocument(null); setRejectReason(''); }}
                                            className="px-3.5 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => handleVerifyDocument(doc.id, doc.sourceType, 'rejected')}
                                            disabled={isVerifying}
                                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                                          >
                                            Rechazar Documento
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile View Card Grid */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filteredDocuments
                    .map((doc) => {
                      const isDocSelected = selectedDocument?.id === doc.id && selectedDocument?.sourceType === doc.sourceType;
                      const isExpired = doc.expirationDate ? new Date(doc.expirationDate) < new Date() : false;
                      
                      return (
                        <div key={`${doc.sourceType}-${doc.id}`} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <FileText size={18} strokeWidth={2.5} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-tight break-all">{doc.documentName}</h4>
                                <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 mt-1 rounded leading-none ${
                                  doc.sourceType === 'vehicle' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {doc.sourceType?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="shrink-0">
                              {doc.status === 'approved' ? (
                                <span className="inline-block bg-emerald-50 text-emerald-650 px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider border border-emerald-100">
                                  Aprobado
                                </span>
                              ) : doc.status === 'rejected' ? (
                                <span className="inline-block bg-rose-50 text-rose-650 px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider border border-rose-100">
                                  Rechazado
                                </span>
                              ) : (
                                <span className="inline-block bg-amber-50 text-amber-650 px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider border border-amber-100">
                                  Pendiente
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-50 pt-3 space-y-3">
                            <div>
                              <span className="text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-0.5">Propietario</span>
                              <p className="text-xs font-bold text-slate-800">{doc.ownerName}</p>
                              <p className="text-[10px] text-slate-500 font-medium break-all">{doc.ownerEmail}</p>
                              {doc.plate && (
                                <span className="inline-block text-[9px] font-black bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mt-1.5 border border-slate-200">
                                  Placa: {doc.plate}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-50/70">
                              <div>
                                <span className="text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-0.5">Vencimiento</span>
                                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                  <Calendar size={11} className="text-slate-400" />
                                  {doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : 'No cuenta'}
                                </p>
                              </div>
                              {isExpired && (
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wide">
                                  Vencido
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-50 pt-3 flex items-center justify-between gap-2.5">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              referrerPolicy="no-referrer"
                              className="flex-1 min-h-[40px] px-3 bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-xl font-bold hover:bg-slate-100 tracking-tight transition-colors inline-flex items-center justify-center gap-1.5"
                            >
                              <Eye size={12} /> Adjunto
                            </a>

                            <div className="flex gap-2 shrink-0">
                              {doc.status !== 'approved' && (
                                <button
                                  onClick={() => handleVerifyDocument(doc.id, doc.sourceType, 'approved')}
                                  disabled={isVerifying}
                                  className="w-10 h-10 bg-emerald-50 text-emerald-650 border border-emerald-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                                  title="Aprobar"
                                >
                                  <ThumbsUp size={14} strokeWidth={2.5} />
                                </button>
                              )}
                              
                              {doc.status !== 'rejected' && (
                                <button
                                  onClick={() => { setSelectedDocument(doc); setRejectReason(''); }}
                                  className="w-10 h-10 bg-rose-50 text-rose-650 border border-rose-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                                  title="Rechazar con motivo"
                                >
                                  <ThumbsDown size={14} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Interactive rejection area inside card for mobile */}
                          {isDocSelected && (
                            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-3 animate-in fade-in duration-200">
                              <p className="text-xs font-bold text-slate-700">Rechazar Documento: <span className="font-extrabold text-slate-900">{doc.documentName}</span></p>
                              <textarea
                                placeholder="Escribe el motivo del rechazo..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-3 focus:outline-hidden text-slate-800"
                                rows={2}
                              />
                              <div className="flex items-center justify-end gap-2 text-xs font-black">
                                <button
                                  onClick={() => { setSelectedDocument(null); setRejectReason(''); }}
                                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleVerifyDocument(doc.id, doc.sourceType, 'rejected')}
                                  disabled={isVerifying}
                                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                  Rechazar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 5. System Moderation & Governance - SPRINT 5 REAL IMPLEMENTATION */}
        {activeTab === 'moderation' && (
          <section className="space-y-6 animate-in fade-in duration-300">
            {/* Header section with real statistics summaries */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <ShieldAlert className="text-rose-500 animate-pulse" size={24} />
                  Moderación & Gobierno de Rivo
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Reserva de paz, auditorías vehiculares, análisis de conducta y gobernanza del ecosistema Rivo.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowCreateReportModal(true)}
                  className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <AlertTriangle size={15} />
                  Registrar Reporte
                </button>
                <button
                  onClick={fetchModerationData}
                  disabled={dataLoading.moderation}
                  className="px-3.5 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={14} className={dataLoading.moderation ? "animate-spin" : ""} />
                  Actualizar Datos
                </button>
              </div>
            </div>

            {/* Moderation sub-navigation tabs */}
            <div className="flex bg-slate-100/70 p-1.5 rounded-2xl gap-1 w-full max-w-2xl">
              <button
                onClick={() => setModerationTabActive('reports')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                  moderationTabActive === 'reports' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-950 hover:bg-white/40'
                }`}
              >
                <AlertCircle size={15} />
                Centro de Reportes
              </button>
              <button
                onClick={() => setModerationTabActive('logs')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                  moderationTabActive === 'logs' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-950 hover:bg-white/40'
                }`}
              >
                <FileText size={15} />
                Bitácora Admin
              </button>
              <button
                onClick={() => setModerationTabActive('incidents')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                  moderationTabActive === 'incidents' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-950 hover:bg-white/40'
                }`}
              >
                <Lock size={15} />
                Panel de Incidentes
              </button>
              <button
                onClick={() => setModerationTabActive('risks')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                  moderationTabActive === 'risks' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-950 hover:bg-white/40'
                }`}
              >
                <ShieldAlert size={15} />
                Alertas de Riesgo
              </button>
            </div>

            {/* --- WORKSPACE LAYOUTS --- */}
            {dataLoading.moderation ? (
              <div className="py-20 text-center space-y-3 bg-white border border-slate-100 rounded-[28px]">
                <RefreshCw size={24} className="animate-spin text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">Cargando base de datos de seguridad...</p>
              </div>
            ) : (
              <>
                {/* 1. Centro de Reportes (Reports Tab) */}
                {moderationTabActive === 'reports' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">Lista de Reportes Corporativos</h4>
                        <span className="text-[11px] font-black bg-rose-50 text-rose-600 px-2.5 py-1 rounded-xl border border-rose-100">
                          {reportsList.filter(r => r.status === 'pending' || r.status === 'reviewing').length} Activos
                        </span>
                      </div>

                      {reportsList.length === 0 ? (
                        <div className="text-center py-12 space-y-2">
                          <CheckCircle className="text-emerald-500 mx-auto" size={28} />
                          <h5 className="font-bold text-slate-800 text-sm">Todo en orden</h5>
                          <p className="text-xs text-slate-400 font-medium">Ningún usuario ha registrado reportes de conducta en el sistema de Rivo.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Reportero</th>
                                <th className="p-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Reportado (Agresor)</th>
                                <th className="p-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Categoría / Razón</th>
                                <th className="p-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Detalles</th>
                                <th className="p-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Fecha / Hora</th>
                                <th className="p-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Estado</th>
                                <th className="p-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {reportsList.map((rep) => {
                                let badgeColor = "bg-amber-50 text-amber-600 border border-amber-100";
                                let stateText = "Pendiente";
                                if (rep.status === "reviewing") {
                                  badgeColor = "bg-blue-50 text-blue-600 border border-blue-100";
                                  stateText = "En Revisión";
                                } else if (rep.status === "resolved") {
                                  badgeColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                                  stateText = "Resuelto";
                                } else if (rep.status === "dismissed") {
                                  badgeColor = "bg-slate-50 text-slate-500 border border-slate-200";
                                  stateText = "Descartado";
                                }

                                return (
                                  <tr key={rep.id} className="hover:bg-slate-50/50 transition">
                                    <td className="p-3">
                                      <p className="text-xs font-black text-slate-800">{rep.reporterName}</p>
                                      <p className="text-[10px] font-bold text-slate-400">{rep.reporterEmail}</p>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                          <p className="text-xs font-black text-slate-800">{rep.reportedName}</p>
                                          <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1 py-0.2 rounded border border-slate-200 uppercase">
                                            {rep.reportedRole === 'driver' ? 'Conductor' : 'Pasajero'}
                                          </span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400">{rep.reportedEmail}</p>
                                      </div>
                                    </td>
                                    <td className="p-3 text-xs font-bold text-slate-600 capitalize">
                                      {rep.reason === 'baja_calificacion' 
                                        ? 'Baja Calificación' 
                                        : rep.reason === 'conducta_inapropiada' 
                                        ? 'Conducta Inapropiada' 
                                        : rep.reason === 'cancelacion_recurrente' 
                                        ? 'Cancelaciones Recurrentes' 
                                        : rep.reason || 'Otro'}
                                    </td>
                                    <td className="p-3 max-w-[200px]">
                                      <p className="text-xs text-slate-500 font-medium line-clamp-2" title={rep.description}>
                                        {rep.description}
                                      </p>
                                    </td>
                                    <td className="p-3 text-[10px] font-black text-slate-400">
                                      {new Date(rep.createdAt).toLocaleString('es-CO')}
                                    </td>
                                    <td className="p-3">
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${badgeColor}`}>
                                        {stateText}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right">
                                      <div className="flex gap-1.5 justify-end">
                                        {(rep.status === 'pending') && (
                                          <button
                                            onClick={() => handleUpdateReportStatus(rep.id, 'reviewing')}
                                            className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-black transition cursor-pointer border border-blue-100"
                                          >
                                            Revisar
                                          </button>
                                        )}
                                        {(rep.status === 'pending' || rep.status === 'reviewing') && (
                                          <>
                                            <button
                                              onClick={() => handleUpdateReportStatus(rep.id, 'resolved')}
                                              className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-black transition cursor-pointer border border-emerald-100"
                                            >
                                              Resolver
                                            </button>
                                            <button
                                              onClick={() => handleUpdateReportStatus(rep.id, 'dismissed')}
                                              className="px-2 py-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg text-[10px] font-black transition cursor-pointer border border-slate-200"
                                            >
                                              Descartar
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Bitácora Administrativa (Admin Audit Log) */}
                {moderationTabActive === 'logs' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black text-slate-800 tracking-tight">Acciones Generadas en el Sistema Rivo</h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Control de auditoría real inalterable sobre la base de datos de Cloud SQL.</p>
                        </div>
                        <span className="text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 rounded-lg px-2.5 py-0.5">
                          {adminLogsList.length} registros
                        </span>
                      </div>

                      {adminLogsList.length === 0 ? (
                        <div className="text-center py-12 space-y-2">
                          <History className="text-slate-300 mx-auto" size={32} />
                          <h5 className="font-bold text-slate-800 text-sm">Bitácora vacía</h5>
                          <p className="text-xs text-slate-400 font-medium">No se han registrado auditorías administrativas recientemente.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                          {adminLogsList.map((log) => {
                            let actBg = "bg-slate-50 text-slate-600 border-slate-200";
                            let actLabel = log.action;
                            
                            switch (log.action) {
                              case 'vehicle_approved':
                                actBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
                                actLabel = "Vehículo Aprobado";
                                break;
                              case 'vehicle_rejected':
                                actBg = "bg-rose-50 text-rose-700 border-rose-100";
                                actLabel = "Vehículo Rechazado";
                                break;
                              case 'user_suspended':
                                actBg = "bg-orange-50 text-orange-700 border-orange-100";
                                actLabel = "Usuario Suspendido";
                                break;
                              case 'user_activated':
                                actBg = "bg-indigo-50 text-indigo-700 border-indigo-100";
                                actLabel = "Usuario Reactivado";
                                break;
                              case 'document_approved':
                                actBg = "bg-blue-50 text-blue-700 border-blue-100";
                                actLabel = "Documento Aprobado";
                                break;
                              case 'document_rejected':
                                actBg = "bg-slate-100 text-slate-700 border-slate-200";
                                actLabel = "Documento Rechazado";
                                break;
                            }

                            return (
                              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-55 hover:border-slate-100 bg-slate-50/30 hover:bg-slate-50 rounded-2xl p-4 gap-4 transition shadow-xs">
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase border ${actBg}`}>
                                      {actLabel}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400">
                                      {new Date(log.createdAt).toLocaleString('es-CO')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">{log.details}</p>
                                </div>
                                <div className="text-left sm:text-right text-[10px] text-slate-400 font-semibold shrink-0">
                                  <p>Realizado por: <span className="font-black text-slate-600">{log.adminName}</span></p>
                                  <p className="font-mono text-[9px]">{log.adminEmail}</p>
                                  <p className="mt-0.5">Target ID: <span className="font-mono font-black text-slate-500 bg-slate-100 rounded px-1">{log.targetId}</span></p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Panel de Incidentes (Incident Stats) */}
                {moderationTabActive === 'incidents' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Sub card 1: Suspended Users */}
                      <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-orange-600 text-[11px] font-black uppercase tracking-wider">
                          <Ban size={14} />
                          Usuarios Suspendidos
                        </div>
                        <p className="text-3xl font-black text-slate-800">
                          {moderationStats.incidents.suspendedUsers.length}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          Inhabilitados temporalmente o bloqueados.
                        </p>
                      </div>

                      {/* Sub card 2: Rejected vehicles */}
                      <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-black uppercase tracking-wider">
                          <Car size={14} />
                          Vehículos Rechazados
                        </div>
                        <p className="text-3xl font-black text-slate-800">
                          {moderationStats.incidents.rejectedVehicles.length}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          No cumplen regulaciones vigentes de Rivo.
                        </p>
                      </div>

                      {/* Sub card 3: Expired documents */}
                      <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-600 text-[11px] font-black uppercase tracking-wider">
                          <Clock size={14} />
                          Documentos Vencidos
                        </div>
                        <p className="text-3xl font-black text-slate-800">
                          {moderationStats.incidents.expiredDocuments.length}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          SOAT, Licencia o Técnico Preventiva vencidos.
                        </p>
                      </div>

                      {/* Sub card 4: Open Reports */}
                      <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-blue-600 text-[11px] font-black uppercase tracking-wider">
                          <AlertCircle size={14} />
                          Reportes Abiertos
                        </div>
                        <p className="text-3xl font-black text-slate-800">
                          {moderationStats.incidents.openReportsCount}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          Requieren intervención u opinión legal admin.
                        </p>
                      </div>
                    </div>

                    {/* Detailed lists for each incident type */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Suspended Users List Details */}
                      <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Ban size={15} className="text-orange-500" />
                          Usuarios Suspendidos ({moderationStats.incidents.suspendedUsers.length})
                        </h4>
                        {moderationStats.incidents.suspendedUsers.length === 0 ? (
                          <p className="text-xs text-slate-400 font-medium py-3 text-center">No hay conductores o pasajeros inhabilitados.</p>
                        ) : (
                          <div className="divide-y divide-slate-50 max-h-[160px] overflow-y-auto pr-1">
                            {moderationStats.incidents.suspendedUsers.map((su: any) => (
                              <div key={su.id} className="py-2.5 flex items-center justify-between text-xs font-medium">
                                <div>
                                  <p className="font-bold text-slate-800">{su.displayName}</p>
                                  <p className="text-[10px] font-bold text-slate-400">{su.email}</p>
                                </div>
                                <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100 uppercase">
                                  {su.role === 'driver' ? 'Conductor' : 'Pasajero'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Rejected Vehicles Details */}
                      <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Car size={15} className="text-rose-500" />
                          Vehículos Rechazados ({moderationStats.incidents.rejectedVehicles.length})
                        </h4>
                        {moderationStats.incidents.rejectedVehicles.length === 0 ? (
                          <p className="text-xs text-slate-400 font-medium py-3 text-center">No hay vehículos rechazados.</p>
                        ) : (
                          <div className="divide-y divide-slate-50 max-h-[160px] overflow-y-auto pr-1">
                            {moderationStats.incidents.rejectedVehicles.map((rv: any) => (
                              <div key={rv.id} className="py-2.5 flex flex-col gap-1 text-xs">
                                <div className="flex items-center justify-between font-bold">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] bg-slate-900 text-white rounded font-black px-1.5 py-0.5">{rv.plate}</span>
                                    <p className="text-slate-800">{rv.brand} {rv.model}</p>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-400">{rv.ownerEmail}</span>
                                </div>
                                <p className="text-[10px] font-semibold text-rose-600 bg-rose-50/50 rounded-lg p-1.5 border border-rose-100/35">
                                  Detalle: {rv.rejectReason || "Carga documental inválida."}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expired documents list detail */}
                      <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs space-y-3 lg:col-span-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={15} className="text-amber-500" />
                          Documentos Vencidos Identificados ({moderationStats.incidents.expiredDocuments.length})
                        </h4>
                        {moderationStats.incidents.expiredDocuments.length === 0 ? (
                          <p className="text-xs text-slate-400 font-medium py-3 text-center">Todos los conductores activos tienen sus licencias, SOAT y técnico preventivas vigentes.</p>
                        ) : (
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                  <th className="p-2.5 font-black text-slate-400 uppercase">Documento / Tipo</th>
                                  <th className="p-2.5 font-black text-slate-400 uppercase">Vehículo / Placa</th>
                                  <th className="p-2.5 font-black text-slate-400 uppercase">Propietario / Email</th>
                                  <th className="p-2.5 font-black text-slate-400 uppercase">Fecha de Vencimiento</th>
                                  <th className="p-2.5 font-black text-slate-400 uppercase text-right">Estado Crítico</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {moderationStats.incidents.expiredDocuments.map((ed: any) => (
                                  <tr key={ed.id} className="hover:bg-slate-50/30">
                                    <td className="p-2.5">
                                      <span className="font-bold text-slate-800">{ed.documentName}</span>
                                      <span className="text-[9px] font-black text-slate-400 bg-slate-100 border rounded px-1 ml-1.5 uppercase">{ed.sourceType}</span>
                                    </td>
                                    <td className="p-2.5">
                                      {ed.plate ? (
                                        <span className="font-mono text-[10px] bg-slate-900 text-white rounded font-black px-1.5 py-0.2">{ed.plate}</span>
                                      ) : (
                                        <p className="text-slate-400 font-semibold italic">N/A (Usuario)</p>
                                      )}
                                    </td>
                                    <td className="p-2.5 font-bold text-slate-600">{ed.ownerEmail}</td>
                                    <td className="p-2.5 font-black text-rose-500">
                                      {new Date(ed.expirationDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </td>
                                    <td className="p-2.5 text-right font-black text-rose-600">
                                      <span className="bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg text-[9px] uppercase">Vencido</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Alertas de Riesgo (Risk Alerts Tab) */}
                {moderationTabActive === 'risks' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Under-rated drivers (< 4.0) */}
                      <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            Conductores Baja Calificación (<span className="text-rose-500">⭐ 4.0</span>)
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400">Conductores corporativos bajo vigilancia por calificaciones bajas de sus pasajeros.</p>
                        </div>
                        {moderationStats.riskAlerts.lowRatedDrivers.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold">Ningún conductor tiene baja calificación.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {moderationStats.riskAlerts.lowRatedDrivers.map((ld: any) => (
                              <div key={ld.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition border border-slate-100/50">
                                <div>
                                  <p className="text-xs font-black text-slate-800">{ld.displayName}</p>
                                  <p className="text-[9px] font-bold text-slate-400">{ld.email}</p>
                                  <p className="text-[9px] font-black text-slate-500 mt-1">{ld.reviewCount} calificaciones recibidas</p>
                                </div>
                                <span className="font-black text-xs text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-xl">
                                  ⭐ {parseFloat(ld.rating || "0").toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Multiple reports gegend user */}
                      <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                            Usuarios Multireportados (≥ 2 Reportes)
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400">Conductores o pasajeros con múltiples quejas de conducta o retrasos.</p>
                        </div>
                        {moderationStats.riskAlerts.usersWithMultipleReports.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold">Ningún usuario tiene múltiples quejas.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {moderationStats.riskAlerts.usersWithMultipleReports.map((um: any) => (
                              <div key={um.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition border border-slate-100/50">
                                <div>
                                  <div className="flex items-center gap-1">
                                    <p className="text-xs font-black text-slate-800">{um.displayName}</p>
                                    <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-black border uppercase">{um.role === 'driver' ? 'Conductor' : 'Pasajero'}</span>
                                  </div>
                                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">{um.email}</p>
                                </div>
                                <span className="font-black text-xs text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-xl">
                                  ⚠️ {um.reportCount} Reportes
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recurring cancelations drivers */}
                      <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                            Cancelaciones Recurrentes (≥ 2 Cancelados)
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400">Conductores exentos que cancelan rutas programadas consecutivamente.</p>
                        </div>
                        {moderationStats.riskAlerts.recurringCancellations.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold">Bajo índice de cancelaciones de viaje.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {moderationStats.riskAlerts.recurringCancellations.map((rc: any) => (
                              <div key={rc.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition border border-slate-100/50">
                                <div>
                                  <p className="text-xs font-black text-slate-800">{rc.displayName}</p>
                                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">{rc.email}</p>
                                </div>
                                <span className="font-black text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-xl">
                                  ❌ Canceló {rc.cancellationCount}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* --- MODAL REGISTRO REPORTE MANUAL --- */}
            {showCreateReportModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white border border-slate-100 rounded-[32px] p-6 w-full max-w-lg shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-55">
                    <h4 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                      <AlertTriangle className="text-rose-500" size={18} />
                      Registrar Reporte de Incidente Manual
                    </h4>
                    <button 
                      onClick={() => setShowCreateReportModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Select Reported User */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Seleccionar Usuario a Reportar (Conductor o Pasajero)</label>
                      <select
                        value={newReport.reportedUserId}
                        onChange={(e) => setNewReport(prev => ({ ...prev, reportedUserId: e.target.value }))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 focus:border-slate-400 outline-none rounded-xl p-2.5"
                      >
                        <option value="">-- Elige un usuario real registrado --</option>
                        {usersList.map((usr: any) => (
                          <option key={usr.id} value={usr.id}>
                            {usr.displayName ? `${usr.displayName} (${usr.email})` : usr.email} - Rol: {usr.role === 'driver' ? 'Conductor' : 'Pasajero'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Report Reason */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Motivo / Tipo de Incidencia</label>
                      <select
                        value={newReport.reason}
                        onChange={(e) => setNewReport(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 focus:border-slate-400 outline-none rounded-xl p-2.5"
                      >
                        <option value="conducta_inapropiada">Conducta Inapropiada / Agresión</option>
                        <option value="baja_calificacion">Comentarios negativos / Calificaciones bajas</option>
                        <option value="cancelacion_recurrente">Cancelación injustificada de viajes recurrentes</option>
                        <option value="otro">Otro tipo de reporte técnico/servicio</option>
                      </select>
                    </div>

                    {/* Report Description */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Descripción de los hechos</label>
                      <textarea
                        value={newReport.description}
                        onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        placeholder="Describe detalladamente el retraso, agresión verbal o incumplimiento..."
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-slate-400 outline-none rounded-xl p-2.5 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-55">
                    <button
                      onClick={() => setShowCreateReportModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateReport}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      Guardar Reporte Real
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminView;
