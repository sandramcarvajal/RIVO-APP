import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { RIVO_CONFIG } from '../shared/config';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = RIVO_CONFIG.map.defaultCenter;

const GOOGLE_MAPS_LIBRARIES: any[] = ["places", "geometry"];

export const MapContainer = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/maps/config')
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      })
      .catch(err => console.error('Error loading map config:', err));
  }, []);

  if (!apiKey) {
    return (
      <div className="h-[400px] w-full bg-slate-50 flex items-center justify-center rounded-xl border border-slate-100 text-slate-400 font-medium">
        Cargando configuración del mapa...
      </div>
    );
  }

  return <MapContent apiKey={apiKey} />;
};

const MapContent = ({ apiKey }: { apiKey: string }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  if (loadError) {
    return (
      <div className="h-[400px] w-full bg-red-50 flex items-center justify-center rounded-xl border border-red-100 text-red-500 font-medium">
        Error al cargar Google Maps
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[400px] w-full bg-slate-50 flex items-center justify-center rounded-xl border border-slate-100 text-slate-400 font-medium">
        Cargando mapa...
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={13}
      >
        <Marker position={defaultCenter} />
      </GoogleMap>
    </div>
  );
};
