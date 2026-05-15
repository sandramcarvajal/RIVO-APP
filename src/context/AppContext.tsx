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
        setRoutes(data);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  }, []);

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

      // Poll for updates every 30 seconds
      const pollInterval = setInterval(() => {
        fetchNotifications();
        fetchRequests();
        if (user.role === 'driver') {
          fetchMyRoutes();
        }
      }, 30000);

      return () => clearInterval(pollInterval);
    } else {
      setRoutes([]);
      setRequests([]);
      setNotifications([]);
    }
  }, [user, fetchRoutes, fetchMyRoutes, fetchRequests, fetchNotifications]);

  const createRoute = async (routeData: any) => {
    if (!user) return;
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
    }
  };

  const requestJoin = async (routeId: string) => {
    if (!user) return;
    try {
      const response = await SecureHttpClient.request('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: parseInt(routeId) })
      });
      if (response.ok) {
        fetchRequests();
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error requesting join:', error);
    }
  };

  const updateRequestStatus = async (requestId: string, status: JoinRequestStatus.ACCEPTED | JoinRequestStatus.REJECTED) => {
    try {
      const response = await SecureHttpClient.request(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchRequests();
        fetchRoutes();
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  const cancelJoinRequest = async (requestId: string) => {
    try {
      const response = await SecureHttpClient.request(`/api/requests/${requestId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchRequests();
        fetchRoutes();
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const updateRouteStatus = async (routeId: string, status: string) => {
    try {
      const response = await SecureHttpClient.request(`/api/routes/${routeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchRoutes();
      }
    } catch (error) {
      console.error('Error updating route status:', error);
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
      updateRouteStatus, getRoutePassengers, submitReview,
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
