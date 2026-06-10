import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthView from './views/AuthView';
import HomeView from './views/HomeView';
import ExploreView from './views/ExploreView';
import CreateRouteView from './views/CreateRouteView';
import RequestsView from './views/RequestsView';
import ProfileView from './views/ProfileView';
import PrivacyView from './views/PrivacyView';
import HelpView from './views/HelpView';
import AdminView from './views/AdminView';
import AdminAnalyticsView from './views/AdminAnalyticsView';
import RouteDetailView from './views/RouteDetailView';
import NotificationsView from './views/NotificationsView';
import MainLayout from './components/layout/MainLayout';
import { useAppStore } from './hooks/useAppStore';
import { ToastProvider } from './components/ui/Toast';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './client/modules/auth/context/AuthContext';
import { ProtectedRoute } from './client/modules/auth/components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user } = useAppStore();

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthView />} />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeView />} />
            <Route path="explore" element={<ExploreView />} />
            <Route path="create" element={<CreateRouteView />} />
            <Route path="requests" element={<RequestsView />} />
            <Route path="notifications" element={<NotificationsView />} />
            <Route path="route/:id" element={<RouteDetailView />} />
            <Route path="profile" element={<ProfileView />} />
            <Route path="profile/privacy" element={<PrivacyView />} />
            <Route path="profile/help" element={<HelpView />} />
            <Route 
              path="admin" 
              element={
                <Navigate to="/admin/operation" replace />
              } 
            />
            <Route 
              path="admin/operation" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="admin/analytics" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAnalyticsView />
                </ProtectedRoute>
              } 
            />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
