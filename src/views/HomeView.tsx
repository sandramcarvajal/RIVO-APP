import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import { UserRole } from '../shared/enums';
import { HomePassengerView } from './HomePassengerView';
import { HomeDriverView } from './HomeDriverView';

/**
 * Rivo Home Page Router View (Premium Decoupled Architecture)
 * Delegates rendering loops based on exact User Roles.
 */
const HomeView = () => {
  const { user, routes, requests } = useAppStore();
  const navigate = useNavigate();
  const [picoPlaca, setPicoPlaca] = React.useState<{ canCirculate: boolean; message: string } | null>(null);

  React.useEffect(() => {
    if (user?.role === UserRole.DRIVER && user.vehicle?.plate) {
      const checkPicoPlaca = async () => {
        try {
          const response = await fetch('/api/pico-placa/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              plate: user.vehicle.plate, 
              date: new Date().toISOString(), 
              city: 'Bucaramanga' 
            })
          });
          const data = await response.json();
          setPicoPlaca(data);
        } catch (err) {
          console.error('Error fetching Pico y Placa:', err);
        }
      };
      checkPicoPlaca();
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col space-y-7 pb-12 bg-background animate-in fade-in duration-500">
      {user.role === UserRole.DRIVER ? (
        <HomeDriverView 
          user={user} 
          routes={routes} 
          requests={requests} 
          navigate={navigate} 
          picoPlaca={picoPlaca} 
        />
      ) : user.role === UserRole.ADMIN ? (
        <Navigate to="/admin/operation" replace />
      ) : (
        <HomePassengerView 
          user={user} 
          routes={routes} 
          requests={requests} 
          navigate={navigate} 
        />
      )}
    </div>
  );
};

export default HomeView;
