import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Clock, Users, CircleDollarSign, ArrowRight, Calendar, Car } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAppStore } from '../hooks/useAppStore';
import { useToast } from '../components/ui/Toast';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { cn } from '../lib/utils';
import { VehicleService } from '../client/modules/auth/services/VehicleService';

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];
const MAP_OPTIONS = {
  restriction: {
    latLngBounds: {
      north: 13.5,
      south: -4.5,
      west: -82.0,
      east: -66.0,
    },
    strictBounds: false,
  }
};
const DEFAULT_CENTER = { lat: 7.1193, lng: -73.1227 };

const CreateRouteView = () => {
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/maps/config')
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
        setConfigLoaded(true);
      })
      .catch(err => {
        console.error("Error fetching map config:", err);
        setConfigLoaded(true);
      });
  }, []);

  if (!configLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium italic">Preparando formulario...</p>
      </div>
    );
  }

  // If we have an API key (even empty for now, but ideally we should have one)
  // We render the form with the maps logic
  return <CreateRouteForm apiKey={apiKey || ''} />;
};

const CreateRouteForm = ({ apiKey }: { apiKey: string }) => {
  const { user, createRoute, routes } = useAppStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [userDocs, setUserDocs] = React.useState<any[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>("");

  React.useEffect(() => {
    let active = true;
    const fetchVehiclesDocs = async () => {
      try {
        const [vehiclesList, userDocsList] = await Promise.all([
          VehicleService.getVehicles(),
          VehicleService.getUserDocuments()
        ]);
        if (active) {
          setVehicles(vehiclesList);
          setUserDocs(userDocsList);
          const activeV = vehiclesList.find((v: any) => v.isActive);
          if (activeV) {
            setSelectedVehicleId(activeV.id);
          } else if (vehiclesList.length > 0) {
            setSelectedVehicleId(vehiclesList[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching vehicles and user docs in CreateRouteForm:", err);
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    };
    fetchVehiclesDocs();
    return () => { active = false; };
  }, []);

  const selectedVehicle = React.useMemo(() => {
    return vehicles.find((v: any) => String(v.id) === String(selectedVehicleId));
  }, [vehicles, selectedVehicleId]);

  const soatDocument = React.useMemo(() => {
    return selectedVehicle?.documents?.find((d: any) => d.documentType === 'soat');
  }, [selectedVehicle]);
  
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

  const activeRoute = routes.find(r => 
    String(r.driverId) === String(user?.id) && 
    ['scheduled', 'in_progress'].includes(r.status.toLowerCase())
  );

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null);

  const onMapLoad = React.useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onMapUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  const initialState = {
    origin: '',
    destination: new URLSearchParams(window.location.search).get('destination') || '',
    time: (() => {
      const d = new Date();
      d.setHours(d.getHours() + 1);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    })(),
    totalSeats: 1,
    price: 0,
    date: (() => {
      const d = new Date();
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - (offset * 60 * 1000));
      return local.toISOString().split('T')[0];
    })(),
    plate: user?.vehicle?.plate || '',
  };

  const [formData, setFormData] = React.useState(initialState);
  
  const [picoPlacaResult, setPicoPlacaResult] = React.useState<{ canCirculate: boolean; message: string } | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    if (selectedVehicle?.plate) {
      setFormData(prev => ({ ...prev, plate: selectedVehicle.plate }));
    }
  }, [selectedVehicle]);

  const checkPicoPlaca = async (plate: string, date: string) => {
    if (plate.length < 6) return;
    setIsValidating(true);
    try {
      const response = await fetch('/api/pico-placa/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate, date, city: 'Bucaramanga' })
      });
      const data = await response.json();
      setPicoPlacaResult(data);
    } catch (err) {
      console.error('Error checking Pico y Placa:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (formData.plate && formData.date) {
      const timer = setTimeout(() => {
        checkPicoPlaca(formData.plate, formData.date);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.plate, formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeRoute) {
      showToast('Ya tienes una ruta activa. Debes finalizarla antes de crear una nueva.', 'error');
      return;
    }

    if (!selectedVehicleId) {
      showToast('Debes configurar y seleccionar un vehículo para publicar la ruta.', 'error');
      return;
    }

    if (!loadingData && (!hasApprovedLicense || !hasApprovedSoat)) {
      if (!hasApprovedLicense) {
        if (isLicenseExpired) {
          showToast('Tu licencia de conducción está vencida. Actualízala para continuar publicando.', 'error');
        } else {
          showToast('No puedes publicar rutas. Debes cargar tu licencia de conducción.', 'error');
        }
      } else if (!hasApprovedSoat) {
        if (isSoatExpired) {
          showToast('El SOAT del vehículo seleccionado está vencido. Actualízalo para publicar rutas.', 'error');
        } else {
          showToast('No puedes publicar rutas. Debes cargar y aprobar el SOAT del vehículo seleccionado.', 'error');
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await createRoute({
        ...formData,
        vehicleId: selectedVehicleId,
        availableSeats: formData.totalSeats,
      });
      setFormData(initialState);
      showToast('¡Tu ruta ha sido publicada con éxito!');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'Error al publicar la ruta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSoatBadge = (status: string, expDate?: string) => {
    const formattedDate = expDate ? new Date(expDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200 mt-1">
            ✓ SOAT Aprobado {formattedDate && `(Vence: ${formattedDate})`}
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 mt-1">
            ✗ SOAT Vencido {formattedDate && `(${formattedDate})`}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 mt-1">
            ✗ SOAT Rechazado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 mt-1">
            ⏳ SOAT Pendiente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200 mt-1">
            ⚠ Sin SOAT Cargado
          </span>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">Publicar Ruta</h1>
        <p className="text-slate-500 font-medium">Comparte tu ruta, a tu ritmo</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-bold text-slate-700 ml-1">Ubicación de la ruta</label>
          <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-100 shadow-sm relative">
            {loadError ? (
              <div className="absolute inset-0 bg-rose-50 flex flex-col items-center justify-center text-rose-500 p-6 text-center gap-3">
                <div className="bg-rose-100 p-3 rounded-full">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">Error de configuración de Google Maps</p>
                  <p className="text-sm text-rose-600 mt-1">
                    La URL de este sitio no está autorizada en las restricciones de tu API Key.
                  </p>
                  <div className="mt-4 p-3 bg-white rounded-lg border border-rose-200 text-xs text-left font-mono break-all space-y-2">
                    <p className="font-bold text-rose-700">Para solucionar esto:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Ve a Google Cloud Console (APIs &amp; Services &gt; Credentials)</li>
                      <li>Edita tu API Key</li>
                      <li>En "Website restrictions", añade este dominio completo:</li>
                      <li className="bg-rose-50 p-1 select-all font-bold">https://ais-dev-ry2acczyjpy5p7w3krzzpl-69275553057.us-west2.run.app/*</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : !isLoaded ? (
              <div className="absolute inset-0 bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
                Cargando mapa...
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={DEFAULT_CENTER}
                zoom={13}
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                }}
              />
            )}
          </div>
        </div>

        <div className="card-rivo space-y-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <label id="lbl_vehicle_picker" className="block text-sm font-bold text-slate-700">
                Selecciona tu Vehículo para este viaje
              </label>

              {loadingData ? (
                <div className="flex items-center gap-2 py-3 text-sm text-slate-500 italic animate-pulse">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Cargando tus vehículos y documentos...
                </div>
              ) : vehicles.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
                  <p className="text-xs font-semibold text-amber-800">
                    ⚠ No tienes vehículos registrados en tu perfil. Registra e ingresa la documentación de uno primero.
                  </p>
                  <Button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="py-2.5 px-4 text-xs font-bold"
                  >
                    Ir a Mi Garaje
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full" id="vehicle_picker_grid">
                  {vehicles.map((v) => {
                    const isSelected = String(v.id) === String(selectedVehicleId);
                    const vSoat = v.documents?.find((d: any) => d.documentType === 'soat');
                    const isVSoatExpired = vSoat?.expirationDate ? (new Date(vSoat.expirationDate) < new Date()) : false;
                    const vSoatStatus = vSoat
                      ? (vSoat.status?.toLowerCase() === 'approved'
                          ? (isVSoatExpired ? 'expired' : 'approved')
                          : vSoat.status?.toLowerCase() || 'pending')
                      : 'missing';

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVehicleId(v.id)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-2xl border transition-all duration-250 flex items-center justify-between cursor-pointer group",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-[0_4px_12px_rgba(79,70,229,0.06)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        )}
                        id={`btn_vehicle_select_${v.id}`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200",
                            isSelected 
                              ? "bg-primary/10 border-primary/20 text-primary scale-102" 
                              : "bg-slate-50 border-slate-100 text-slate-500 group-hover:bg-slate-100"
                          )}>
                            {v.type === 'motorcycle' ? (
                              <span className="text-xl">🛵</span>
                            ) : (
                              <Car size={20} className={isSelected ? "text-primary" : "text-slate-500"} />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-xs tracking-wider uppercase bg-slate-100 rounded-lg px-2 py-0.5 border border-slate-200/80">
                                {v.plate}
                              </span>
                              <span className="text-[11px] font-bold text-slate-600 truncate uppercase max-w-[150px] sm:max-w-none">
                                {v.brand} {v.color && `(${v.color})`}
                              </span>
                            </div>
                            <div className="flex items-center">
                              {renderSoatBadge(vSoatStatus, vSoat?.expirationDate)}
                            </div>
                          </div>
                        </div>

                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ml-3",
                          isSelected ? "border-primary bg-primary shadow-sm" : "border-slate-300 bg-white group-hover:border-slate-400"
                        )}>
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1.5 h-1.5 bg-white rounded-full" 
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {picoPlacaResult && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-3 rounded-xl text-sm font-medium",
                  picoPlacaResult.canCirculate 
                    ? "bg-green-50 text-green-700 border border-green-100" 
                    : "bg-red-50 text-red-700 border border-red-100"
                )}
              >
                {picoPlacaResult.message}
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <Input
                  label="Origen"
                  placeholder="Ej: Carrera 27 #36-20..."
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  icon={<MapPin size={20} className="text-primary" />}
                  required
                />
              </div>
              <div className="w-full">
                <Input
                  label="Destino"
                  placeholder="¿A dónde vas?"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  icon={<MapPin size={20} className="text-accent" />}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 min-[395px]:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Fecha"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              icon={<Calendar size={18} className="text-slate-400" />}
              className="text-xs xs:text-sm"
              required
            />
            <Input
              label="Hora de salida"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              icon={<Clock size={18} className="text-slate-400" />}
              className="text-xs xs:text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-rivo space-y-4">
            <div className="flex items-center gap-3 text-slate-800 font-bold">
              <Users size={20} className="text-primary" />
              Cupos disponibles
            </div>
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFormData({ ...formData, totalSeats: num })}
                  className={cn(
                    "w-10 h-10 rounded-xl font-bold transition-all",
                    formData.totalSeats === num
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="card-rivo space-y-4">
            <div className="flex items-center gap-3 text-slate-800 font-bold">
              <CircleDollarSign size={20} className="text-accent" />
              Valor por pasajero
            </div>
            <div className="relative">
              <Input
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="pl-8 text-xl font-bold text-slate-800"
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
            </div>
          </div>
        </div>

        {!loadingData && (!hasApprovedLicense || !hasApprovedSoat) && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-800 text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <span>
              {!hasApprovedLicense ? (
                isLicenseExpired 
                  ? 'Tu licencia de conducción está vencida. Actualízala para continuar publicando.' 
                  : 'No puedes publicar rutas. Debes cargar tu licencia de conducción.'
              ) : (
                isSoatExpired 
                  ? 'El SOAT del vehículo seleccionado está vencido. Actualízalo para publicar rutas.' 
                  : 'No puedes publicar rutas. Debes cargar y aprobar el SOAT del vehículo seleccionado.'
              )}
            </span>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="bg-red-650 shrink-0 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all self-start sm:self-auto hover:bg-red-700"
              style={{ backgroundColor: '#DC2626' }}
            >
              Ir a Mi Garaje
            </button>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full text-lg py-5 shadow-xl shadow-primary/30"
          disabled={isSubmitting || !!activeRoute || (!loadingData && (!hasApprovedLicense || !hasApprovedSoat))}
        >
          {isSubmitting 
            ? 'Publicando...' 
            : activeRoute 
              ? 'Ya tienes una ruta activa' 
              : (!loadingData && (!hasApprovedLicense || !hasApprovedSoat))
                ? (!hasApprovedLicense 
                    ? (isLicenseExpired ? 'Licencia Vencida' : 'Licencia Requerida')
                    : (isSoatExpired ? 'SOAT Vencido' : 'SOAT Requerido')
                  )
                : 'Publicar Ruta'}
          <ArrowRight size={22} />
        </Button>
      </form>
    </div>
  );
};

export default CreateRouteView;
