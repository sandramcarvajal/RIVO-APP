import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Route, JoinRequest, UserRole, Notification } from '../types';
import { JoinRequestStatus } from '../shared/enums';
import { useAuthContext } from '../client/modules/auth/context/AuthContext';
import { SecureHttpClient } from '../client/modules/auth/services/SecureHttpClient';
import { NotificationService } from '../client/modules/notifications/services/NotificationService';

interface AppContextType {
  user: User | null;
  routes: Route[];
  requests: JoinRequest[];
  notifications: Notification[];
  isLoading: boolean;
  createRoute: (data: any) => Promise<void>;
  requestJoin: (routeId: string) => Promise<void>;
  updateRequestStatus: (id: string, status: JoinRequestStatus.ACCEPTED | JoinRequestStatus.REJECTED) => Promise<void>;
  cancelJoinRequest: (id: string) => Promise<void>;
  updateRouteStatus: (id: string, status: string) => Promise<void>;
  getRoutePassengers: (id: string) => Promise<any[]>;
  submitReview: (data: { routeId: string, toUserId: string, score: number, comment?: string }) => Promise<void>;
  getMyReviewsForRoute: (routeId: string) => Promise<{ ratedUserIds: number[] }>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const NEUTRAL_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRoutes = useCallback(async () => {
    try {
      const response = await SecureHttpClient.request('/api/routes/active');
      if (response.ok) {
        const data = await response.json();
        console.log(`[AppContext] Fetched ${data.length} active routes:`, data.map((r: any) => ({ id: r.id, status: r.status })));
        setRoutes(prev => {
          const activeIds = new Set(data.map((r: any) => r.id));
          const filteredPrev = prev.filter(r => {
            const isMyRoute = String(r.driverId) === String(user?.id);
            const isStillActive = activeIds.has(r.id);
            // Non-driver routes that are scheduled/in_progress but no longer in the active routes payload are removed
            if (!isMyRoute && !isStillActive && ['scheduled', 'in_progress'].includes(r.status.toLowerCase())) {
              return false;
            }
            return true;
          });
          const map = new Map(filteredPrev.map(r => [r.id, r]));
          data.forEach((r: any) => map.set(r.id, r));
          return Array.from(map.values());
        });
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  }, [user]);

  const fetchMyRoutes = useCallback(async () => {
    try {
      const response = await SecureHttpClient.request('/api/routes/me');
      if (response.ok) {
        const data = await response.json();
        console.log(`[AppContext] Fetched ${data.length} personal routes:`, data.map((r: any) => ({ id: r.id, status: r.status })));
        // Merge with existing routes to avoid duplicates if possible, or handle specifically
        setRoutes(prev => {
          const map = new Map(prev.map(r => [r.id, r]));
          data.forEach((r: any) => map.set(r.id, r));
          return Array.from(map.values());
        });
      }
    } catch (error) {
      console.error('Error fetching personal routes:', error);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await SecureHttpClient.request('/api/requests/me');
      if (response.ok) {
        const data = await response.json();
        console.log(`[AppContext] Fetched ${data.length} requests:`, data.map((r: any) => ({ id: r.id, status: r.status })));
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await NotificationService.getNotifications();
      console.log(`[AppContext] Fetched ${data.items.length} notifications`);
      setNotifications(data.items);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRoutes();
      if (user.role === 'driver') {
        fetchMyRoutes();
      }
      fetchRequests();
      fetchNotifications();

      // Poll for updates every 10 seconds
      const pollInterval = setInterval(() => {
        fetchNotifications();
        fetchRequests();
        fetchRoutes();
        if (user.role === 'driver') {
          fetchMyRoutes();
        }
      }, 10000);

      return () => clearInterval(pollInterval);
    } else {
      setRoutes([]);
      setRequests([]);
      setNotifications([]);
    }
  }, [user, fetchRoutes, fetchMyRoutes, fetchRequests, fetchNotifications]);

  const lockRef = React.useRef<Record<string, boolean>>({});

  const createRoute = async (routeData: any) => {
    if (!user) return;
    const lockKey = `createRoute`;
    if (lockRef.current[lockKey]) {
      console.warn(`[AppContext] Blocked duplicate createRoute call`);
      return;
    }
    lockRef.current[lockKey] = true;

    const body = {
      ...routeData,
      departureTime: new Date(`${routeData.date}T${routeData.time}`).toISOString(),
    };
    console.log(`[AppContext] Creating route: POST /api/routes`, body);

    try {
      const response = await SecureHttpClient.request('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      console.log(`[AppContext] Create route response status: ${response.status}`);
      if (response.ok) {
        fetchRoutes();
      } else {
        let errorMessage = "Error al crear la ruta";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const textContent = await response.text();
            console.error('Non-JSON error response:', textContent.substring(0, 500));
            errorMessage = `Error del servidor (${response.status}).`;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating route:', error);
      throw error;
    } finally {
      lockRef.current[lockKey] = false;
    }
  };

  const requestJoin = async (routeId: string) => {
    if (!user) throw new Error("Debe iniciar sesión para solicitar unirse.");
    const lockKey = `requestJoin-${routeId}`;
    if (lockRef.current[lockKey]) {
      console.warn(`[AppContext] Blocked duplicate requestJoin call for route ${routeId}`);
      return;
    }
    lockRef.current[lockKey] = true;

    try {
      const response = await SecureHttpClient.request('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: parseInt(routeId, 10) })
      });
      if (response.ok) {
        await Promise.all([fetchRequests(), fetchNotifications()]);
      } else {
        let errorMessage = "No se pudo enviar la solicitud para unirse al viaje";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const textContent = await response.text();
            console.error('Non-JSON error response in requestJoin:', textContent.substring(0, 500));
            errorMessage = `Error del servidor (${response.status}).`;
          }
        } catch (e) {
          console.error('Failed to parse requestJoin error response:', e);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error in requestJoin:', error);
      throw error;
    } finally {
      lockRef.current[lockKey] = false;
    }
  };

  const updateRequestStatus = async (requestId: string, status: JoinRequestStatus.ACCEPTED | JoinRequestStatus.REJECTED) => {
    const lockKey = `updateRequestStatus-${requestId}`;
    if (lockRef.current[lockKey]) {
      console.warn(`[AppContext] Blocked duplicate updateRequestStatus for request ${requestId}`);
      return;
    }
    lockRef.current[lockKey] = true;

    const currentUser = user;
    console.log("[CLIENT USER]");
    console.log(currentUser);

    console.log("[REQUEST STATUS UPDATE]");
    console.log(requestId);
    console.log(status);

    try {
      const response = await SecureHttpClient.request(`/api/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        let errorMsg = 'No se pudo actualizar la solicitud';
        try {
          const clone = response.clone();
          const errData = await clone.json().catch(() => null);
          if (errData && errData.error) {
            errorMsg = errData.error;
          } else {
            const txt = await response.text().catch(() => '');
            if (txt) {
              errorMsg = txt;
            }
          }
        } catch (readErr) {
          console.error('[AppContext] Error reading response body:', readErr);
        }
        throw new Error(errorMsg);
      }
      await Promise.all([
        fetchRequests(),
        fetchRoutes(),
        fetchNotifications()
      ]);
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    } finally {
      lockRef.current[lockKey] = false;
    }
  };

  const cancelJoinRequest = async (requestId: string) => {
    const lockKey = `cancelJoinRequest-${requestId}`;
    if (lockRef.current[lockKey]) {
      console.warn(`[AppContext] Blocked duplicate cancelJoinRequest for request ${requestId}`);
      return;
    }
    lockRef.current[lockKey] = true;

    try {
      const response = await SecureHttpClient.request(`/api/requests/${requestId}/cancel`, {
        method: 'POST'
      });
      if (response.ok) {
        await Promise.all([
          fetchRequests(),
          fetchRoutes()
        ]);
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    } finally {
      lockRef.current[lockKey] = false;
    }
  };

  const updateRouteStatus = async (routeId: string, status: string) => {
    const lockKey = `updateRouteStatus-${routeId}`;
    if (lockRef.current[lockKey]) {
      console.warn(`[AppContext] Blocked duplicate updateRouteStatus for route ${routeId}`);
      return;
    }
    lockRef.current[lockKey] = true;

    try {
      const response = await SecureHttpClient.request(`/api/routes/${routeId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        let errorMsg = 'No se pudo actualizar el estado de la ruta';
        try {
          const clone = response.clone();
          const errData = await clone.json().catch(() => null);
          if (errData && errData.error) {
            errorMsg = errData.error;
          } else {
            const txt = await response.text().catch(() => '');
            if (txt) {
              errorMsg = txt;
            }
          }
        } catch (readErr) {
          console.error('[AppContext] Error reading route status update error response:', readErr);
        }
        throw new Error(errorMsg);
      }
      const updatedRoute = await response.json();
      setRoutes(prev => prev.map(r => r.id === updatedRoute.id ? updatedRoute : r));
      
      await fetchRoutes();
      if (user?.role === 'driver') {
        await fetchMyRoutes();
      }
    } catch (error) {
      console.error('Error updating route status:', error);
      throw error;
    } finally {
      lockRef.current[lockKey] = false;
    }
  };

  const getRoutePassengers = async (routeId: string) => {
    try {
      const response = await SecureHttpClient.request(`/api/routes/${routeId}/passengers`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching passengers:', error);
      return [];
    }
  };

  const submitReview = async (reviewData: { routeId: string, toUserId: string, score: number, comment?: string }) => {
    try {
      const response = await SecureHttpClient.request('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };

  const getMyReviewsForRoute = async (routeId: string) => {
    try {
      const response = await SecureHttpClient.request(`/api/reviews/route/${routeId}/my-reviews`);
      if (response.ok) {
        return await response.json();
      }
      return { ratedUserIds: [] };
    } catch (error) {
      console.error('Error fetching my reviews for route:', error);
      return { ratedUserIds: [] };
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      const success = await NotificationService.markAsRead(id);
      if (success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const success = await NotificationService.markAllAsRead();
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      user, routes, requests, notifications, isLoading: isAuthLoading || isLoading,
      createRoute, requestJoin, updateRequestStatus, cancelJoinRequest,
      updateRouteStatus, getRoutePassengers, submitReview, getMyReviewsForRoute,
      markNotificationAsRead, markAllNotificationsAsRead
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
