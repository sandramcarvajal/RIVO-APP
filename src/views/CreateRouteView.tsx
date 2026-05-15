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

const LIBRARIES: ("places" | "geometry")[] = [];
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

  const activeRoute = routes.find(r => 
    r.driverId === user?.id && 
    ['scheduled', 'active', 'in_progress'].includes(r.status.toLowerCase())
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
    destination: '',
    time: '00:00',
    totalSeats: 1,
    price: 0,
    date: new Date().toISOString().split('T')[0],
    plate: user?.vehicle?.plate || '',
  };

  const [formData, setFormData] = React.useState(initialState);
  
  const [picoPlacaResult, setPicoPlacaResult] = React.useState<{ canCirculate: boolean; message: string } | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    if (user?.vehicle?.plate) {
      setFormData(prev => ({ ...prev, plate: user.vehicle.plate }));
      checkPicoPlaca(user.vehicle.plate, formData.date);
    }
  }, [user?.vehicle?.plate]);

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

    setIsSubmitting(true);
    try {
      await createRoute({
        ...formData,
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
            <div className="flex flex-col gap-2">
              <Input
                label="Placa del Vehículo"
                placeholder="Ej: ABC-123"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                icon={<Car size={20} className="text-primary" />}
                required
                disabled={!!user?.vehicle?.plate}
                className={cn(!!user?.vehicle?.plate && "bg-slate-50 border-slate-100 opacity-80 cursor-not-allowed")}
              />
              {user?.vehicle?.plate && (
                <p className="text-[10px] text-slate-400 font-medium ml-1">
                  Placa vinculada a tu perfil: {user.vehicle.brand} ({user.vehicle.color})
                </p>
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              icon={<Calendar size={20} />}
              required
            />
            <Input
              label="Hora de salida"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              icon={<Clock size={20} />}
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

        <Button 
          type="submit" 
          className="w-full text-lg py-5 shadow-xl shadow-primary/30"
          disabled={isSubmitting || !!activeRoute}
        >
          {isSubmitting ? 'Publicando...' : activeRoute ? 'Ya tienes una ruta activa' : 'Publicar Ruta'}
          <ArrowRight size={22} />
        </Button>
      </form>
    </div>
  );
};

export default CreateRouteView;
