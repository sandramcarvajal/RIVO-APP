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
  AlertOctagon,
  Phone,
  Award,
  UploadCloud,
  AlertCircle,
  Check,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { cn, normalizeName } from '../lib/utils';
import { COUNTRIES, DEPARTMENTS, CITIES } from '../data/locations';
import { AutocompleteSelect } from '../components/ui/AutocompleteSelect';
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

  // Load and edit state variables matching Sprint 8.7.6
  const [loadingProfile, setLoadingProfile] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'personal' | 'contacto' | 'conductor' | 'vehiculo' | 'reputacion' | 'foto'>('personal');

  const [formData, setFormData] = React.useState({
    name: user?.name || '',
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
    phoneNumber: user?.phone || '',
    alternativeNumber: '',
    city: '',
    state: '',
    country: 'Colombia',
    address: '',
    // Contacto
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    // Conductor
    drivingExperience: '',
    licenseType: '',
    licenseExpiry: '',
    habitualAvailability: '',
    preferredSchedule: '',
    driverBio: '',
    // Vehículo
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    vehiclePlate: '',
    vehiclePassengerCapacity: '',
    vehicleFuelType: '',
    // Foto
    avatar: user?.avatar || ''
  });

  const [originalData, setOriginalData] = React.useState({ ...formData });

  // Calculation of Stats
  const myRoutes = routes.filter(r => String(r.driverId) === String(user?.id));
  const myTotalPasajeros = requests.filter(req => {
    const route = routes.find(r => String(r.id) === String(req.routeId));
    return String(route?.driverId) === String(user?.id) && String(req.status).toLowerCase() === String(JoinRequestStatus.ACCEPTED).toLowerCase();
  }).length;

  const handleLoadProfile = async () => {
    setLoadingProfile(true);
    setErrorMsg('');
    try {
      const res = await SecureHttpClient.request('/api/profile');
      if (res.ok) {
        const data = await res.json();
        const loadedForm = {
          name: data.name || user?.name || '',
          firstName: data.firstName || '',
          secondName: data.secondName || '',
          firstLastName: data.firstLastName || '',
          secondLastName: data.secondLastName || '',
          phoneNumber: data.phoneNumber || user?.phone || '',
          alternativeNumber: data.alternativeNumber || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'Colombia',
          address: data.address || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactPhone: data.emergencyContactPhone || '',
          emergencyContactRelation: data.emergencyContactRelation || '',
          drivingExperience: data.drivingExperience || '',
          licenseType: data.licenseType || '',
          licenseExpiry: data.licenseExpiry || '',
          habitualAvailability: data.habitualAvailability || '',
          preferredSchedule: data.preferredSchedule || '',
          driverBio: data.driverBio || '',
          vehicleBrand: data.vehicleBrand || '',
          vehicleModel: data.vehicleModel || '',
          vehicleYear: data.vehicleYear || '',
          vehicleColor: data.vehicleColor || '',
          vehiclePlate: data.vehiclePlate || '',
          vehiclePassengerCapacity: data.vehiclePassengerCapacity || '',
          vehicleFuelType: data.vehicleFuelType || '',
          avatar: data.avatar || user?.avatar || ''
        };
        setFormData(loadedForm);
        setOriginalData(loadedForm);
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'No se pudo precargar la información del perfil del conductor.');
      }
    } catch (err) {
      console.error("[DriverProfile] Error loading profile details:", err);
      setErrorMsg('Error de conexión al cargar el perfil del conductor.');
    } finally {
      setLoadingProfile(false);
    }
  };

  React.useEffect(() => {
    if (isEditing) {
      handleLoadProfile();
    }
  }, [isEditing]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedImage(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedImage(file);
    }
  };

  const processSelectedImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecciona un archivo de imagen válido.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no debe superar los 5MB de tamaño.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setFormData(prev => ({ ...prev, avatar: base64Data }));
      showToast('Foto cargada en vista previa. Recuerda guardar los cambios.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAllChanges = async () => {
    if (savingProfile) return;

    // VALIDATION 1: Primer Nombre & Primer Apellido
    if (!formData.firstName.trim()) {
      showToast('El primer nombre es obligatorio', 'error');
      setActiveTab('personal');
      return;
    }
    if (!formData.firstLastName.trim()) {
      showToast('El primer apellido es obligatorio', 'error');
      setActiveTab('personal');
      return;
    }

    // VALIDATION 2: Celular principal (mínimo 7 dígitos, números)
    if (formData.phoneNumber.trim()) {
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        showToast('El celular principal no es válido (mínimo 7 dígitos, solo números)', 'error');
        setActiveTab('contacto');
        return;
      }
    }

    // VALIDATION 3: Placa de Colombia (opcional pero si se ingresa, debe ser válida)
    if (formData.vehiclePlate.trim()) {
      const plate = formData.vehiclePlate.trim().toUpperCase();
      if (plate.length < 5 || plate.length > 7) {
        showToast('La placa debe tener entre 5 y 7 caracteres', 'error');
        setActiveTab('vehiculo');
        return;
      }
    }

    setSavingProfile(true);
    setErrorMsg('');

    try {
      const finalNameValue = normalizeName(formData.name.trim() || `${formData.firstName.trim()} ${formData.firstLastName.trim()}`);
      const submissionData = {
        ...formData,
        firstName: normalizeName(formData.firstName),
        secondName: normalizeName(formData.secondName),
        firstLastName: normalizeName(formData.firstLastName),
        secondLastName: normalizeName(formData.secondLastName),
        city: normalizeName(formData.city),
        state: normalizeName(formData.state),
        country: normalizeName(formData.country),
        name: finalNameValue
      };

      const res = await SecureHttpClient.request('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (res.ok) {
        const resJson = await res.json();
        // Propagate basic details globally
        await updateUserProfile({
          name: finalNameValue,
          avatar: formData.avatar,
          phone: formData.phoneNumber
        });
        showToast('¡Perfil de conductor guardado exitosamente en Postgres!', 'success');
        setIsEditing(false);
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'Error al guardar los cambios en la base de datos.');
        showToast(errJson.error || 'Ocurrió un error al guardar cambios', 'error');
      }
    } catch (err: any) {
      console.error("[DriverProfile] Error saving profile:", err);
      setErrorMsg('Error de red al sincronizar con el servidor.');
      showToast('No se puede conectar con el servidor', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEditing = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
    showToast('Edición cancelada.', 'info');
  };

  const formattedJoinDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Sin información disponible';

  const driverStats = [
    { label: 'Viajes creados', value: myRoutes.length.toString(), icon: Car, color: 'text-indigo-500' },
    { label: 'Pasajeros confirmados', value: myTotalPasajeros.toString(), icon: Users, color: 'text-emerald-500' },
    { label: 'Rating promedio', value: (!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? 'Sin información disponible' : parseFloat(user.rating.toString()).toFixed(1), icon: Star, color: 'text-amber-500' },
  ];

  if (isEditing) {
    return (
      <div className="card-rivo bg-white border border-slate-100 shadow-xl rounded-[32px] overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Editar Perfil Profesional de Conductor 🚙</h2>
            <p className="text-xs text-slate-400 font-medium">Sprint 8.7.6 • Gestione sus datos de movilidad de forma segura en Postgres.</p>
          </div>
          <span className="bg-primary/10 text-primary uppercase text-[10px] font-black tracking-wider px-3 py-1 rounded-full">
            Rol: Conductor Rivo
          </span>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 text-rose-600 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {loadingProfile ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-bold animate-pulse">Sincronizando con base de datos real...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Horizontal Scrollable Tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto scroller-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'personal' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <UserIcon size={14} /> Personal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contacto')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'contacto' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Phone size={14} /> Contacto
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('conductor')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'conductor' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Compass size={14} /> Perfil Conductor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vehiculo')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'vehiculo' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Car size={14} /> Vehículo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reputacion')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'reputacion' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Star size={14} /> Reputación
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('foto')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'foto' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Camera size={14} /> Foto Perfil
              </button>
            </div>

            {/* Tab Contents */}
            <div className="py-2 min-h-[300px]">
              {/* TAB 1: Información Personal */}
              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Primer Nombre *"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, firstName: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Sandra"
                  />
                  <Input
                    label="Segundo Nombre"
                    value={formData.secondName}
                    onChange={(e) => setFormData({ ...formData, secondName: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, secondName: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Milena"
                  />
                  <Input
                    label="Primer Apellido *"
                    value={formData.firstLastName}
                    onChange={(e) => setFormData({ ...formData, firstLastName: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, firstLastName: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Carvajal"
                  />
                  <Input
                    label="Segundo Apellido"
                    value={formData.secondLastName}
                    onChange={(e) => setFormData({ ...formData, secondLastName: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, secondLastName: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Gutiérrez"
                  />
                  <Input
                    label="Nombre de visualización pública (Alias/Visible)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, name: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Sandra Carvajal"
                  />
                  <Input
                    label="Fecha de Nacimiento"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="rounded-2xl"
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Género</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full text-slate-700 bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl p-4 text-sm transition-all outline-none"
                    >
                      <option value="">Selecciona género</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                      <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                    </select>
                  </div>
                  <AutocompleteSelect
                    label="País"
                    options={COUNTRIES}
                    value={formData.country}
                    onChange={(val) => {}}
                    disabled={true}
                    placeholder="Colombia"
                  />
                  <AutocompleteSelect
                    label="Departamento"
                    options={formData.country ? (DEPARTMENTS[formData.country] || []) : []}
                    value={formData.state}
                    onChange={(val) => setFormData({ ...formData, state: val, city: '' })}
                    disabled={!formData.country}
                    placeholder={!formData.country ? 'Selecciona primero el País' : 'Seleccionar departamento...'}
                  />
                  <AutocompleteSelect
                    label="Ciudad"
                    options={formData.state ? (CITIES[formData.state] || []) : []}
                    value={formData.city}
                    onChange={(val) => setFormData({ ...formData, city: val })}
                    disabled={!formData.state}
                    placeholder={!formData.state ? 'Selecciona primero el Departamento' : 'Seleccionar ciudad...'}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Dirección de Domicilio"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. Calle 36 # 12-45 Apto 402"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Contacto */}
              {activeTab === 'contacto' && (
                <div className="space-y-6">
                  <div className="text-sm font-bold text-slate-500 border-b border-slate-50 pb-2">📟 Datos de Comunicación Directa</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Celular Principal *"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 3001234567"
                    />
                    <Input
                      label="Celular Alternativo"
                      value={formData.alternativeNumber}
                      onChange={(e) => setFormData({ ...formData, alternativeNumber: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 3159876543"
                    />
                  </div>

                  <div className="text-sm font-bold text-slate-500 border-b border-slate-50 pb-2 mt-4">🚨 Contacto de Emergencia</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <Input
                        label="Nombre Completo del Contacto"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. Juan Pérez"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Input
                        label="Celular del Contacto"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. 3108889988"
                      />
                    </div>
                    <div className="md:col-span-1 border-none">
                      <Input
                        label="Relación / Parentesco"
                        value={formData.emergencyContactRelation}
                        onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. Esposo / Hermano"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Perfil de Conductor */}
              {activeTab === 'conductor' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Años de Experiencia Conduciendo"
                      type="number"
                      min="0"
                      value={formData.drivingExperience}
                      onChange={(e) => setFormData({ ...formData, drivingExperience: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 5"
                    />
                    <Input
                      label="Tipo de Licencia (Categoría)"
                      value={formData.licenseType}
                      onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. B1 o C1"
                    />
                    <Input
                      label="Vencimiento de Licencia"
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                      className="rounded-2xl"
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Disponibilidad Habitual de Mobilidad"
                        value={formData.habitualAvailability}
                        onChange={(e) => setFormData({ ...formData, habitualAvailability: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. Lunes a Viernes (Viajes de Oficina)"
                      />
                    </div>
                    <Input
                      label="Horario de Preferencia"
                      value={formData.preferredSchedule}
                      onChange={(e) => setFormData({ ...formData, preferredSchedule: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 7:00 AM - 9:00 AM"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Biografía Profesional del Conductor</label>
                      <span className="text-[10px] text-slate-400 font-bold">{formData.driverBio.length}/500</span>
                    </div>
                    <textarea
                      maxLength={500}
                      rows={4}
                      value={formData.driverBio}
                      onChange={(e) => setFormData({ ...formData, driverBio: e.target.value })}
                      className="w-full text-slate-700 bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl p-4 text-sm transition-all outline-none resize-none"
                      placeholder="Preséntate como conductor corporativo. Comparte tu estilo de conducción tranquila, de respeto y buena vibra..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: Vehículo */}
              {activeTab === 'vehiculo' && (
                <div className="space-y-4">
                  <div className="bg-amber-50/60 border border-amber-200/50 rounded-2xl p-4 flex gap-3 text-xs text-amber-700 font-medium">
                    <Car size={16} className="shrink-0 mt-0.5" />
                    <p>Estos campos se sincronizan bidireccionalmente con la tabla <strong>vehicles</strong> en Postgres para asegurar concordancia con tus rutas publicadas.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Marca"
                      value={formData.vehicleBrand}
                      onChange={(e) => setFormData({ ...formData, vehicleBrand: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. Mazda"
                    />
                    <Input
                      label="Modelo / Línea"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 3 o Grand Touring"
                    />
                    <Input
                      label="Año del Vehículo"
                      type="number"
                      value={formData.vehicleYear}
                      onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 2021"
                    />
                    <Input
                      label="Color"
                      value={formData.vehicleColor}
                      onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. Rojo Perlado"
                    />
                    <Input
                      label="Placa *"
                      value={formData.vehiclePlate}
                      onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. ABC123"
                    />
                    <Input
                      label="Cupos Totales (Pasajeros)"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.vehiclePassengerCapacity}
                      onChange={(e) => setFormData({ ...formData, vehiclePassengerCapacity: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 4"
                    />
                    <div className="md:col-span-3 space-y-1.5 border-none">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Tipo de Combustible</label>
                      <select
                        value={formData.vehicleFuelType}
                        onChange={(e) => setFormData({ ...formData, vehicleFuelType: e.target.value })}
                        className="w-full text-slate-700 bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl p-4 text-sm transition-all outline-none"
                      >
                        <option value="">Selecciona combustible</option>
                        <option value="Gasolina">Gasolina</option>
                        <option value="ACPM / Diésel">ACPM / Diésel</option>
                        <option value="Gas Natural Vehicular">Gas Natural Vehicular (GNV)</option>
                        <option value="Híbrido">Híbrido (HEV/MHEV)</option>
                        <option value="Eléctrico">100% Eléctrico (BEV)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Reputación (Solo lectura) */}
              {activeTab === 'reputacion' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-4 text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Award size={15} className="text-slate-400" />
                    HOJA DE VIDA DE CONDUCCIÓN RIVO (HISTÓRICO PERMANENTE)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100">
                      <div>
                        <Car size={18} className="text-indigo-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Viajes Completados</h4>
                      </div>
                      <p className="text-2xl font-black text-slate-800 mt-2">{myRoutes.length}</p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100">
                      <div>
                        <Star size={18} className="text-amber-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Calificación Promedio</h4>
                      </div>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {(!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? 'Sin información disponible' : `${parseFloat(user.rating.toString()).toFixed(1)} ⭐`}
                      </p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100">
                      <div>
                        <Users size={18} className="text-emerald-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Pasajeros Transportados</h4>
                      </div>
                      <p className="text-2xl font-black text-slate-800 mt-2">{myTotalPasajeros} pasajeros</p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100">
                      <div>
                        <MessageSquare size={18} className="text-sky-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Número de Reseñas</h4>
                      </div>
                      <p className="text-2xl font-black text-slate-800 mt-2">{user?.reviewCount || 0} recibidas</p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100 sm:col-span-2 lg:col-span-1">
                      <div>
                        <Calendar size={18} className="text-violet-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Registro en Rivo</h4>
                      </div>
                      <p className="text-sm font-extrabold text-slate-800 mt-2">{formattedJoinDate}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">※ Las estadísticas de reputación se deducen automáticamente de tus servicios aprobados e interacciones auditadas en Postgres.</p>
                </div>
              )}

              {/* TAB 6: Foto de Perfil */}
              {activeTab === 'foto' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      {formData.avatar ? (
                        <img
                          src={formData.avatar}
                          alt="Previsualización"
                          referrerPolicy="no-referrer"
                          className="w-32 h-32 rounded-[40px] border-4 border-slate-50 shadow-2xl object-cover"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-[40px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                          <UserIcon size={44} />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <Camera size={14} />
                      </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="w-full max-w-md border-2 border-dashed border-slate-200 hover:border-primary rounded-3xl p-6 text-center transition-all cursor-pointer bg-slate-55/10 bg-slate-50/50 flex flex-col items-center justify-center gap-2 group relative overflow-hidden"
                    >
                      <UploadCloud size={30} className="text-slate-400 group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                      <div>
                        <p className="text-xs font-black text-slate-700 tracking-wide">Arrastra tu foto corporativa aquí</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">o haz clic para explorar tus archivos</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>

                    <div className="text-xs text-slate-400 font-bold flex items-center gap-1">
                      <Lock size={12} className="text-slate-400" />
                      <span>Soporta archivos PNG, JPG, JPEG en formato Base64 persistible (Máx: 5MB).</span>
                    </div>

                    {/* Direct image link override option */}
                    <div className="w-full max-w-md">
                      <Input
                        label="O ingresa un enlace directo a la imagen"
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. https://mi-empresa.com/foto.jpg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Read-only locked email & save/cancel buttons */}
            <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 text-slate-500 border border-slate-100/50 px-4 py-2.5 rounded-2xl w-full md:w-auto text-xs font-medium">
                <span className="text-slate-400">🔒</span>
                <div className="leading-tight">
                  <p className="font-bold">Correo permanente: <strong className="text-slate-700 text-xs">{user?.email}</strong></p>
                  <p className="text-[10px] text-slate-400 font-semibold italic mt-0.5">"El correo electrónico es un identificador permanente del sistema."</p>
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <Button
                  variant="secondary"
                  onClick={handleCancelEditing}
                  disabled={savingProfile}
                  className="rounded-2xl py-5 font-bold text-xs uppercase px-6 tracking-wide"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAllChanges}
                  disabled={savingProfile}
                  className="rounded-2xl py-5 font-bold text-xs uppercase px-10 tracking-wide shrink-0"
                >
                  {savingProfile ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
                <p className="text-[10px] sm:text-xs uppercase font-black text-slate-400 tracking-wider tracking-widest leading-tight">{stat.label}</p>
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
  setIsEditing: (val: boolean) => void;
  isEditing: boolean;
}

const PassengerProfile = ({ user, setIsEditing, isEditing }: PassengerProfileProps) => {
  const { updateUserProfile, requests, routes } = useAppStore();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Load and edit state variables matching Passenger SPRINT 8.7.7
  const [loadingProfile, setLoadingProfile] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'personal' | 'contacto' | 'corporativo' | 'perfil' | 'reputacion' | 'foto'>('personal');

  // Rich fields aligned with database schema mapping
  const [formData, setFormData] = React.useState({
    name: user?.name || '',
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
    phoneNumber: user?.phone || '',
    alternativeNumber: '',
    city: '',
    state: '',
    country: 'Colombia',
    address: '',
    // Corp
    company: '',
    department: '',
    jobTitle: '',
    // Biography / Profile
    bio: '',
    // Contact Detail
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    // Foto
    avatar: user?.avatar || '',
    birthDate: '',
    gender: ''
  });

  const [originalData, setOriginalData] = React.useState({ ...formData });

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

  // Calculate passenger statistics from real Postgres entries
  const totalViajesFinalizados = history.filter(h => h.status === JoinRequestStatus.ACCEPTED && routes.find(r => r.id === h.routeId)?.status === RouteStatus.COMPLETED).length;

  const handleLoadProfile = async () => {
    setLoadingProfile(true);
    setErrorMsg('');
    try {
      const res = await SecureHttpClient.request('/api/profile');
      if (res.ok) {
        const data = await res.json();
        const loadedForm = {
          name: data.name || user?.name || '',
          firstName: data.firstName || '',
          secondName: data.secondName || '',
          firstLastName: data.firstLastName || '',
          secondLastName: data.secondLastName || '',
          phoneNumber: data.phoneNumber || user?.phone || '',
          alternativeNumber: data.alternativeNumber || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'Colombia',
          address: data.address || '',
          company: data.company || '',
          department: data.department || '',
          jobTitle: data.jobTitle || '',
          bio: data.bio || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactPhone: data.emergencyContactPhone || '',
          emergencyContactRelation: data.emergencyContactRelation || '',
          avatar: data.avatar || user?.avatar || '',
          birthDate: data.birthDate || '',
          gender: data.gender || ''
        };
        setFormData(loadedForm);
        setOriginalData(loadedForm);
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'No se pudo precargar la información del perfil corporativo.');
      }
    } catch (err) {
      console.error("[PassengerProfile] Error loading profile details:", err);
      setErrorMsg('Error de conexión al cargar la información de tu perfil de pasajero.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Safe lazy load on mount & when state matches edit mode transitions
  React.useEffect(() => {
    handleLoadProfile();
  }, [user]);

  React.useEffect(() => {
    if (isEditing) {
      handleLoadProfile();
    }
  }, [isEditing]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedImage(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedImage(file);
    }
  };

  const processSelectedImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecciona un archivo de imagen válido.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('La foto de perfil no debe superar los 5MB de tamaño.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setFormData(prev => ({ ...prev, avatar: base64Data }));
      showToast('Foto cargada en vista previa. Recuerda guardar los cambios.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAllChanges = async () => {
    if (savingProfile) return;

    // VALIDATION 1: Primer Nombre & Primer Apellido Obligatorios
    if (!formData.firstName.trim()) {
      showToast('El primer nombre es obligatorio', 'error');
      setActiveTab('personal');
      return;
    }
    if (!formData.firstLastName.trim()) {
      showToast('El primer apellido es obligatorio', 'error');
      setActiveTab('personal');
      return;
    }

    // VALIDATION 2: Celular principal (mínimo 7 dígitos, números)
    if (formData.phoneNumber.trim()) {
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        showToast('El celular principal no es válido (mínimo 7 dígitos, solo números)', 'error');
        setActiveTab('contacto');
        return;
      }
    }

    setSavingProfile(true);
    setErrorMsg('');

    try {
      const finalNameValue = normalizeName(formData.name.trim() || `${formData.firstName.trim()} ${formData.firstLastName.trim()}`);
      const submissionData = {
        ...formData,
        firstName: normalizeName(formData.firstName),
        secondName: normalizeName(formData.secondName),
        firstLastName: normalizeName(formData.firstLastName),
        secondLastName: normalizeName(formData.secondLastName),
        city: normalizeName(formData.city),
        state: normalizeName(formData.state),
        country: normalizeName(formData.country),
        company: normalizeName(formData.company),
        jobTitle: normalizeName(formData.jobTitle),
        name: finalNameValue
      };

      const res = await SecureHttpClient.request('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (res.ok) {
        // Propagate changes globally
        await updateUserProfile({
          name: finalNameValue,
          avatar: formData.avatar,
          phone: formData.phoneNumber
        });
        showToast('¡Perfil de pasajero guardado exitosamente en Postgres!', 'success');
        setIsEditing(false);
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'Error al guardar los cambios en tu perfil.');
        showToast(errJson.error || 'Ocurrió un error al guardar cambios', 'error');
      }
    } catch (err) {
      console.error("[PassengerProfile] Error saving passenger profile:", err);
      setErrorMsg('Error de red al sincronizar con el servidor.');
      showToast('No se puede conectar con el servidor', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEditing = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
    showToast('Edición cancelada.', 'info');
  };

  const formattedJoinDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Sin información disponible';

  const getAntiquityString = () => {
    if (!user?.createdAt) return 'Sin información disponible';
    const start = new Date(user.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
    }
    const diffYears = Math.floor(diffMonths / 12);
    const remainingMonths = diffMonths % 12;
    if (remainingMonths === 0) {
      return `${diffYears} ${diffYears === 1 ? 'año' : 'años'}`;
    }
    return `${diffYears} ${diffYears === 1 ? 'año' : 'años'} y ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
  };

  if (isEditing) {
    return (
      <div className="card-rivo bg-white border border-slate-100 shadow-xl rounded-[32px] overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Editar Perfil Corporativo de Pasajero 🙋‍♂️</h2>
            <p className="text-xs text-slate-400 font-medium">Sprint 8.7.7 • Gestione sus datos profesionales de movilidad en Postgres.</p>
          </div>
          <span className="bg-primary/10 text-primary uppercase text-[10px] font-black tracking-wider px-3 py-1 rounded-full">
            Rol: Pasajero Corativo
          </span>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 text-rose-600 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {loadingProfile ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-bold animate-pulse">Sincronizando con base de datos real...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Horizontal Scrollable Tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto scroller-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'personal' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <UserIcon size={14} /> Personal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contacto')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'contacto' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Phone size={14} /> Contacto
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('corporativo')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'corporativo' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Briefcase size={14} /> Corp. Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('perfil')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'perfil' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Clock size={14} /> Biografía
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reputacion')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'reputacion' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Star size={14} /> Reputación
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('foto')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2",
                  activeTab === 'foto' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Camera size={14} /> Foto Perfil
              </button>
            </div>

            {/* Tab Contents */}
            <div className="py-2 min-h-[300px]">
              {/* TAB 1: Información Personal */}
              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Primer Nombre *"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, firstName: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Sandra"
                  />
                  <Input
                    label="Segundo Nombre"
                    value={formData.secondName}
                    onChange={(e) => setFormData({ ...formData, secondName: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, secondName: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Milena"
                  />
                  <Input
                    label="Primer Apellido *"
                    value={formData.firstLastName}
                    onChange={(e) => setFormData({ ...formData, firstLastName: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, firstLastName: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Carvajal"
                  />
                  <Input
                    label="Segundo Apellido"
                    value={formData.secondLastName}
                    onChange={(e) => setFormData({ ...formData, secondLastName: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, secondLastName: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Gutiérrez"
                  />
                  <Input
                    label="Nombre de visualización pública (Alias/Visible)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, name: normalizeName(e.target.value) })}
                    className="rounded-2xl"
                    placeholder="Ej. Sandra Carvajal"
                  />
                  <Input
                    label="Fecha de Nacimiento"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="rounded-2xl"
                  />
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Género</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full text-slate-700 bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl p-4 text-sm transition-all outline-none"
                    >
                      <option value="">Selecciona género</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                      <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 2: Contacto */}
              {activeTab === 'contacto' && (
                <div className="space-y-6">
                  <div className="text-sm font-bold text-slate-500 border-b border-slate-50 pb-2">📟 Datos de Comunicación Directa</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Celular Principal *"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 3001234567"
                    />
                    <Input
                      label="Celular Alternativo"
                      value={formData.alternativeNumber}
                      onChange={(e) => setFormData({ ...formData, alternativeNumber: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. 3159876543"
                    />
                  </div>

                  <div className="text-sm font-bold text-slate-500 border-b border-slate-50 pb-2 mt-4">🚨 Contacto de Emergencia</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <Input
                        label="Nombre Completo del Contacto"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. Juan Pérez"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Input
                        label="Celular del Contacto"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. 3108889988"
                      />
                    </div>
                    <div className="md:col-span-1 border-none">
                      <Input
                        label="Relación / Parentesco"
                        value={formData.emergencyContactRelation}
                        onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. Esposo / Hermano"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Información Corporativa */}
              {activeTab === 'corporativo' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Empresa *"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      onBlur={(e) => setFormData({ ...formData, company: normalizeName(e.target.value) })}
                      className="rounded-2xl"
                      placeholder="Ej. Rivo Technologies"
                    />
                    <Input
                      label="Área / Departamento"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="rounded-2xl"
                      placeholder="Ej. Ingeniería de Software"
                    />
                    <Input
                      label="Cargo corporativo"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      onBlur={(e) => setFormData({ ...formData, jobTitle: normalizeName(e.target.value) })}
                      className="rounded-2xl"
                      placeholder="Ej. Líder de QA"
                    />
                    <AutocompleteSelect
                      label="País"
                      options={COUNTRIES}
                      value={formData.country}
                      onChange={(val) => {}}
                      disabled={true}
                      placeholder="Colombia"
                    />
                    <AutocompleteSelect
                      label="Departamento / Provincia"
                      options={formData.country ? (DEPARTMENTS[formData.country] || []) : []}
                      value={formData.state}
                      onChange={(val) => setFormData({ ...formData, state: val, city: '' })}
                      disabled={!formData.country}
                      placeholder={!formData.country ? 'Selecciona primero el País' : 'Seleccionar departamento...'}
                    />
                    <AutocompleteSelect
                      label="Ciudad"
                      options={formData.state ? (CITIES[formData.state] || []) : []}
                      value={formData.city}
                      onChange={(val) => setFormData({ ...formData, city: val })}
                      disabled={!formData.state}
                      placeholder={!formData.state ? 'Selecciona primero el Departamento' : 'Seleccionar ciudad...'}
                    />
                    <div className="md:col-span-3">
                      <Input
                        label="Dirección"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. Calle 56 # 23-44 Apto 301"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Perfil del Pasajero (Biografía) */}
              {activeTab === 'perfil' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Biografía Personal del Pasajero</label>
                      <span className="text-[10px] text-slate-400 font-bold">{formData.bio.length}/500</span>
                    </div>
                    <textarea
                      maxLength={500}
                      rows={5}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full text-slate-700 bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl p-4 text-sm transition-all outline-none resize-none"
                      placeholder="Comparte un poco sobre ti, tus horarios habituales de viaje o lo que valoras de compartir ruta corporativa..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: Reputación (Solo lectura) */}
              {activeTab === 'reputacion' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-4 text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Award size={15} className="text-slate-400" />
                    REPUTACIÓN Y MÉTRICAS CORPORATIVAS DE PASAJERO RIVO
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100">
                      <div>
                        <CheckCircle2 size={18} className="text-indigo-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Viajes Realizados</h4>
                      </div>
                      <p className="text-2xl font-black text-slate-800 mt-2">{totalViajesFinalizados}</p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100">
                      <div>
                        <Star size={18} className="text-amber-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Calificación Promedio</h4>
                      </div>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {(!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? 'Sin información disponible' : `${parseFloat(user.rating.toString()).toFixed(1)} ⭐`}
                      </p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100">
                      <div>
                        <MessageSquare size={18} className="text-sky-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Límite de Reseñas</h4>
                      </div>
                      <p className="text-2xl font-black text-slate-800 mt-2">{user?.reviewCount || 0} recibidas</p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100">
                      <div>
                        <Calendar size={18} className="text-violet-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Miembro Desde</h4>
                      </div>
                      <p className="text-sm font-extrabold text-slate-800 mt-2">{formattedJoinDate}</p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between border border-dashed border-slate-100 sm:col-span-2 lg:col-span-1">
                      <div>
                        <Clock size={18} className="text-emerald-500 mb-2" />
                        <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Antigüedad en Rivo</h4>
                      </div>
                      <p className="text-sm font-extrabold text-slate-800 mt-2">{getAntiquityString()}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">※ Las estadísticas se obtienen automáticamente de interacciones reales auditadas en la base de datos PostgreSQL.</p>
                </div>
              )}

              {/* TAB 6: Foto de Perfil */}
              {activeTab === 'foto' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      {formData.avatar ? (
                        <img
                          src={formData.avatar}
                          alt="Previsualización avatar"
                          referrerPolicy="no-referrer"
                          className="w-32 h-32 rounded-[40px] border-4 border-slate-50 shadow-2xl object-cover"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-[40px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                          <UserIcon size={44} />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <Camera size={14} />
                      </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="w-full max-w-md border-2 border-dashed border-slate-200 hover:border-primary rounded-3xl p-6 text-center transition-all cursor-pointer bg-slate-50/50 flex flex-col items-center justify-center gap-2 group relative overflow-hidden"
                    >
                      <UploadCloud size={30} className="text-slate-400 group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                      <div>
                        <p className="text-xs font-black text-slate-700 tracking-wide">Arrastra tu foto corporativa aquí</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">o haz clic para explorar tus archivos</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>

                    <div className="text-xs text-slate-400 font-bold flex items-center gap-1">
                      <Lock size={12} className="text-slate-400" />
                      <span>Soporta archivos PNG, JPG, JPEG en formato Base64 persistible (Máx: 5MB).</span>
                    </div>

                    {/* Direct image link override option */}
                    <div className="w-full max-w-md">
                      <Input
                        label="O ingresa un enlace directo a la imagen"
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                        className="rounded-2xl"
                        placeholder="Ej. https://mi-empresa.com/foto.jpg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Read-only locked email & save/cancel buttons */}
            <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 text-slate-500 border border-slate-100/50 px-4 py-2.5 rounded-2xl w-full md:w-auto text-xs font-medium">
                <span className="text-slate-400">🔒</span>
                <div className="leading-tight">
                  <p className="font-bold">Correo permanente: <strong className="text-slate-700 text-xs">{user?.email}</strong></p>
                  <p className="text-[10px] text-slate-400 font-semibold italic mt-0.5">El correo electrónico es un identificador permanente del sistema.</p>
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <Button
                  variant="secondary"
                  onClick={handleCancelEditing}
                  disabled={savingProfile}
                  className="rounded-2xl py-5 font-bold text-xs uppercase px-6 tracking-wide"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAllChanges}
                  disabled={savingProfile}
                  className="rounded-2xl py-5 font-bold text-xs uppercase px-10 tracking-wide shrink-0"
                >
                  {savingProfile ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STANDARD VIEW MODE
  return (
    <div className="space-y-8">
      {/* 1. Mi reputación como pasajero */}
      <section className="px-2 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">Mi reputación como pasajero</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-rivo p-5 border-none bg-slate-50/50 flex flex-col justify-between">
            <div>
              <CheckCircle2 size={18} className="text-indigo-500 mb-2" />
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-tight">Viajes Realizados</p>
            </div>
            <p className="text-xl font-black text-slate-800 mt-2">{totalViajesFinalizados}</p>
          </div>
          <div className="card-rivo p-5 border-none bg-slate-50/50 flex flex-col justify-between">
            <div>
              <Star size={18} className="text-amber-500 mb-2" />
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-tight">Rating promedio</p>
            </div>
            <p className="text-xl font-black text-slate-800 mt-2">
              {(!user?.reviewCount || user.reviewCount === 0 || !user?.rating) ? 'Sin información disponible' : parseFloat(user.rating.toString()).toFixed(1)}
            </p>
          </div>
          <div className="card-rivo p-5 border-none bg-slate-50/50 flex flex-col justify-between">
            <div>
              <MessageSquare size={18} className="text-sky-500 mb-2" />
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-tight">Reseñas recibidas</p>
            </div>
            <p className="text-xl font-black text-slate-800 mt-2">{user?.reviewCount || 0}</p>
          </div>
          <div className="card-rivo p-5 border-none bg-slate-50/50 flex flex-col justify-between">
            <div>
              <Clock size={18} className="text-emerald-500 mb-2" />
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-tight">Antigüedad</p>
            </div>
            <p className="text-xl font-black text-slate-800 mt-2">{getAntiquityString()}</p>
          </div>
        </div>
      </section>

      {/* 2. Mi perfil corporativo y personal */}
      <section className="px-2 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Briefcase size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">Mi credencial corporativa</h2>
        </div>
        
        {loadingProfile ? (
          <div className="py-10 text-center text-xs text-slate-400 font-bold animate-pulse">Cargando credencial corporativa real...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identity & Biography Card */}
            <div className="card-rivo p-6 bg-slate-50/50 border-none space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                👤 Ficha de Identidad
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Nombre completo</span>
                  <span className="font-extrabold text-slate-800">
                    {formData.firstName || formData.firstLastName ? `${formData.firstName} ${formData.secondName || ''} ${formData.firstLastName} ${formData.secondLastName || ''}`.replace(/\s+/g, ' ').trim() : 'Sin información disponible'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Fecha de nacimiento</span>
                  <span className="font-extrabold text-slate-800">{formData.birthDate || 'Sin información disponible'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium font-medium">Género</span>
                  <span className="font-extrabold text-slate-800">{formData.gender || 'Sin información disponible'}</span>
                </div>
                <div className="pt-2">
                  <span className="text-slate-400 font-medium text-xs block mb-1">Acerca de mí</span>
                  <p className="text-slate-700 bg-white/70 p-3 rounded-xl border border-slate-100 text-xs leading-relaxed italic">
                    {formData.bio ? `"${formData.bio}"` : 'Sin información disponible'}
                  </p>
                </div>
              </div>
            </div>

            {/* Corporate & Contacts Info Card */}
            <div className="card-rivo p-6 bg-slate-50/50 border-none space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                🏢 Información Corporativa & Contacto
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Empresa</span>
                  <span className="font-extrabold text-slate-800">{formData.company || 'Sin información disponible'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Área</span>
                  <span className="font-extrabold text-slate-800">{formData.department || 'Sin información disponible'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Cargo</span>
                  <span className="font-extrabold text-slate-800">{formData.jobTitle || 'Sin información disponible'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Celular principal</span>
                  <span className="font-extrabold text-slate-800">{formData.phoneNumber || 'Sin información disponible'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Contacto de Emergencia</span>
                  <span className="font-extrabold text-slate-800">
                    {formData.emergencyContactName ? `${formData.emergencyContactName} (${formData.emergencyContactRelation || 'Contacto'})` : 'Sin información disponible'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Ubicación</span>
                  <span className="font-extrabold text-slate-800">
                    {formData.city || formData.country ? `${formData.city || ''}, ${formData.country || ''}`.trim().replace(/^,|,$/g, '') : 'Sin información disponible'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. Historial de viajes */}
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
  
  // Rich editable profile states aligned with Sprint 8.7.5
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [loadingProfile, setLoadingProfile] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'personal' | 'contacto' | 'profesional' | 'adicional'>('personal');
  const { showToast } = useToast();

  const [formData, setFormData] = React.useState({
    name: user?.name || '',
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
    phoneNumber: '',
    alternativeNumber: '',
    city: '',
    state: '',
    country: 'Colombia',
    jobTitle: '',
    department: '',
    company: '',
    bio: '',
    birthDate: '',
    gender: '',
    address: '',
    avatar: user?.avatar || ''
  });

  const [originalData, setOriginalData] = React.useState({ ...formData });

  const handleOpenEditModal = async () => {
    setIsEditModalOpen(true);
    setLoadingProfile(true);
    setErrorMsg('');
    setActiveTab('personal');
    try {
      const res = await SecureHttpClient.request('/api/profile');
      if (res.ok) {
        const data = await res.json();
        const loadedForm = {
          name: data.name || '',
          firstName: data.firstName || '',
          secondName: data.secondName || '',
          firstLastName: data.firstLastName || '',
          secondLastName: data.secondLastName || '',
          phoneNumber: data.phoneNumber || '',
          alternativeNumber: data.alternativeNumber || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'Colombia',
          jobTitle: data.jobTitle || '',
          department: data.department || '',
          company: data.company || '',
          bio: data.bio || '',
          birthDate: data.birthDate || '',
          gender: data.gender || '',
          address: data.address || '',
          avatar: data.avatar || ''
        };
        setFormData(loadedForm);
        setOriginalData(loadedForm);
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || 'No se pudo cargar la información del perfil.');
      }
    } catch (err) {
      console.error("[ProfileView] Error loading admin profile details:", err);
      setErrorMsg('Error de red al conectar con el servidor.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({ ...originalData });
    setIsEditModalOpen(false);
    setErrorMsg('');
  };

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

  const handleSaveProfile = async () => {
    // Validations:
    if (!formData.firstName.trim()) {
      showToast('El primer nombre es obligatorio.', 'error');
      return;
    }
    if (!formData.firstLastName.trim()) {
      showToast('El primer apellido es obligatorio.', 'error');
      return;
    }

    // Phone validation
    const cleanPhone = formData.phoneNumber.trim();
    if (cleanPhone) {
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        showToast('El número de celular celular no es válido (ej: 3001234567).', 'error');
        return;
      }
    }

    // Alt phone validation
    const cleanAltPhone = formData.alternativeNumber.trim();
    if (cleanAltPhone) {
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (!phoneRegex.test(cleanAltPhone)) {
        showToast('El número celular alternativo no es válido.', 'error');
        return;
      }
    }

    // Bio length restriction
    if (formData.bio && formData.bio.length > 500) {
      showToast('La biografía corta no puede superar los 500 caracteres.', 'error');
      return;
    }

    // Date validation
    if (formData.birthDate) {
      const parsedDate = Date.parse(formData.birthDate);
      if (isNaN(parsedDate)) {
        showToast('La fecha de nacimiento tiene un formato incorrecto.', 'error');
        return;
      }
    }

    setSavingProfile(true);
    setErrorMsg('');

    try {
      const computedName = normalizeName(formData.name.trim() || `${formData.firstName.trim()} ${formData.firstLastName.trim()}`);
      
      const res = await SecureHttpClient.request('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          firstName: normalizeName(formData.firstName),
          secondName: normalizeName(formData.secondName),
          firstLastName: normalizeName(formData.firstLastName),
          secondLastName: normalizeName(formData.secondLastName),
          city: normalizeName(formData.city),
          state: normalizeName(formData.state),
          country: normalizeName(formData.country),
          company: normalizeName(formData.company),
          jobTitle: normalizeName(formData.jobTitle),
          name: computedName
        })
      });

      const resData = await res.json();
      if (res.ok) {
        showToast('¡Perfil directivo actualizado con éxito!', 'success');
        setIsEditModalOpen(false);
        // Sync with local context state so updates show instantly
        updateUserProfile({
          name: computedName,
          avatar: formData.avatar
        });
      } else {
        setErrorMsg(resData.error || 'Error al actualizar el perfil.');
        showToast(resData.error || 'Error al actualizar el perfil.', 'error');
      }
    } catch (err: any) {
      console.error("[ProfileView] Error updating admin profile:", err);
      setErrorMsg('Error de conexión al servidor al actualizar.');
      showToast('Error de red al actualizar.', 'error');
    } finally {
      setSavingProfile(false);
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
              onClick={handleOpenEditModal}
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
        onClose={handleCancelEdit}
        title="Editar Cuenta - Servidor Corporativo SyC"
        footer={
          <div className="flex gap-2 w-full">
            <Button 
              variant="secondary" 
              onClick={handleCancelEdit} 
              className="flex-1 rounded-xl py-4 text-xs font-bold text-slate-550 border-slate-100"
              disabled={savingProfile}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProfile} 
              className="flex-1 rounded-xl py-4 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white flex items-center justify-center"
              disabled={loadingProfile || savingProfile}
            >
              {savingProfile ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        }
      >
        <div className="text-left">
          {loadingProfile ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest animate-pulse">Sincronizando Consola de Perfil...</p>
            </div>
          ) : (
            <div>
              {/* Tab selectors */}
              <div className="flex border-b border-slate-100 mb-5 overflow-x-auto pb-1 scrollbar-none gap-1.5 pt-1">
                {[
                  { id: 'personal', label: 'Personal', icon: UserIcon },
                  { id: 'contacto', label: 'Contacto', icon: MapPin },
                  { id: 'profesional', label: 'Profesional', icon: Briefcase },
                  { id: 'adicional', label: 'Adicional', icon: Settings }
                ].map((tab) => {
                  const IconComponent = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all border whitespace-nowrap",
                        isSelected 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                          : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                      )}
                    >
                      <IconComponent size={12} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 mb-4">
                  <span>⚠️</span> {errorMsg}
                </div>
              )}

              {/* Tab 1: Personal */}
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Información Personal</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Introduce tu nombre oficial y apellidos corporativos.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Primer Nombre <span className="text-red-500 font-black">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        onBlur={(e) => setFormData({ ...formData, firstName: normalizeName(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 font-semibold"
                        placeholder="Ej: Liliana"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Segundo Nombre
                      </label>
                      <input
                        type="text"
                        value={formData.secondName}
                        onChange={(e) => setFormData({ ...formData, secondName: e.target.value })}
                        onBlur={(e) => setFormData({ ...formData, secondName: normalizeName(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 font-semibold"
                        placeholder="Ej: María"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Primer Apellido <span className="text-red-500 font-black">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstLastName}
                        onChange={(e) => setFormData({ ...formData, firstLastName: e.target.value })}
                        onBlur={(e) => setFormData({ ...formData, firstLastName: normalizeName(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 font-semibold"
                        placeholder="Ej: Gómez"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Segundo Apellido
                      </label>
                      <input
                        type="text"
                        value={formData.secondLastName}
                        onChange={(e) => setFormData({ ...formData, secondLastName: e.target.value })}
                        onBlur={(e) => setFormData({ ...formData, secondLastName: normalizeName(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 font-semibold"
                        placeholder="Ej: Cardona"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Nombre Completo (Visualización Pública)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      onBlur={(e) => setFormData({ ...formData, name: normalizeName(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-black text-indigo-750 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      placeholder="Ej: Liliana Gómez Cardona"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
                      Se auto-reemplaza por tu nombre y apellido si se deja en blanco o define un alias corporativo oficial.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Contacto */}
              {activeTab === 'contacto' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Información de Contacto</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Información detallada para comunicación operativa.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Número Celular
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        placeholder="Ej: 3001234567"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Número Alternativo / Oficina
                      </label>
                      <input
                        type="tel"
                        value={formData.alternativeNumber}
                        onChange={(e) => setFormData({ ...formData, alternativeNumber: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        placeholder="Ej: 6012345678"
                      />
                    </div>
                    
                    <div className="col-span-1 sm:col-span-2">
                      <AutocompleteSelect
                        label="País"
                        options={COUNTRIES}
                        value={formData.country}
                        onChange={(val) => {}}
                        disabled={true}
                        placeholder="Colombia"
                      />
                    </div>
                    <div>
                      <AutocompleteSelect
                        label="Departamento"
                        options={formData.country ? (DEPARTMENTS[formData.country] || []) : []}
                        value={formData.state}
                        onChange={(val) => setFormData({ ...formData, state: val, city: '' })}
                        disabled={!formData.country}
                        placeholder={!formData.country ? 'Selecciona primero el País' : 'Seleccionar departamento...'}
                      />
                    </div>
                    <div>
                      <AutocompleteSelect
                        label="Ciudad"
                        options={formData.state ? (CITIES[formData.state] || []) : []}
                        value={formData.city}
                        onChange={(val) => setFormData({ ...formData, city: val })}
                        disabled={!formData.state}
                        placeholder={!formData.state ? 'Selecciona primero el Departamento' : 'Seleccionar ciudad...'}
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        placeholder="Ej: Calle 36 #12-24 Piso 4"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Profesional */}
              {activeTab === 'profesional' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Información Profesional</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Identificación institucional y perfil.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Cargo
                      </label>
                      <input
                        type="text"
                        value={formData.jobTitle}
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                        onBlur={(e) => setFormData({ ...formData, jobTitle: normalizeName(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        placeholder="Ej: Analista de Seguridad"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Área / Departamento
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        placeholder="Ej: Logística e Infraestructura"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Empresa
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        onBlur={(e) => setFormData({ ...formData, company: normalizeName(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        placeholder="Ej: Sistemas y Computadores SYC"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Biografía Corta
                        </label>
                        <span className="text-[9px] font-black text-slate-400">
                          {(formData.bio || '').length}/500
                        </span>
                      </div>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 500) })}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none font-sans"
                        placeholder="Redacta un breve sumario sobre ti..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Adicional */}
              {activeTab === 'adicional' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Información Adicional</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Seguridad, género y parametrizaciones adicionales.</p>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Correo Electrónico (Solo Lectura)
                    </label>
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3 py-2.5 text-xs font-bold cursor-not-allowed">
                      <span>🔒</span>
                      <span>{user?.email}</span>
                    </div>
                    <p className="text-[10px] text-red-500 font-semibold mt-1">
                      El correo electrónico es un identificador permanente y no puede modificarse.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Género
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                      >
                        <option value="">No especificado</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Foto de Perfil (Avatar)
                    </label>
                    <div className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-150">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                        {formData.avatar ? (
                          <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-300 font-black text-[9px] uppercase">Sin Foto</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={formData.avatar}
                          onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                          className="w-full bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                          placeholder="URL o enlace base64 de imagen corporativa..."
                        />
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-750 px-2.5 py-1.5 rounded-lg inline-block shadow-sm">
                            Examinar Imagen...
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) {
                                  showToast('La imagen no debe superar los 2MB', 'error');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setFormData({ ...formData, avatar: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                          {formData.avatar && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, avatar: '' })}
                              className="text-[10px] font-bold text-red-500 hover:underline"
                            >
                              Eliminar Directamente
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* Conditionally Render Profile Content */}
      {user?.role === UserRole.DRIVER ? (
        <DriverProfile user={user} setIsEditing={setIsEditing} isEditing={isEditing} />
      ) : isAdminUser(user?.role) ? (
        <AdminProfile user={user} />
      ) : (
        <PassengerProfile user={user} setIsEditing={setIsEditing} isEditing={isEditing} />
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
