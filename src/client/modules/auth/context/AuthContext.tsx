import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "../../../../types";
import { AuthService } from "../services/AuthService";
import { LocalStorageManager } from "../services/LocalStorageManager";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, role: string, password?: string, vehicle?: { plate: string, brand: string, color: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const token = await AuthService.refresh();
      if (token) {
        // Fetch full profile from server using the new /me endpoint
        const currentUser = await AuthService.me();
        setUser(currentUser);
        localStorage.setItem("rivo_user", JSON.stringify(currentUser));
      }
    } catch (err) {
      console.error("[AuthContext] Restore session failed:", err);
      LocalStorageManager.removeTokens();
      localStorage.removeItem("rivo_user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
    
    // Listen for unauthorized events from SecureHttpClient
    const handleUnauthorized = () => {
      setUser(null);
      LocalStorageManager.removeTokens();
      localStorage.removeItem("rivo_user");
    };

    window.addEventListener("rivo_unauthorized", handleUnauthorized);
    return () => window.removeEventListener("rivo_unauthorized", handleUnauthorized);
  }, [restoreSession]);

  const login = async (email: string, password?: string) => {
    const { user: loggedUser } = await AuthService.login({ email, password });
    setUser(loggedUser);
    localStorage.setItem("rivo_user", JSON.stringify(loggedUser));
  };

  const register = async (name: string, email: string, role: string, password?: string, vehicle?: { plate: string, brand: string, color: string }) => {
    await AuthService.register({ name, email, role, password, vehicle });
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (err) {
      console.error("[AuthContext] Logout error:", err);
    } finally {
      setUser(null);
      LocalStorageManager.removeTokens();
      localStorage.removeItem("rivo_user");
      // Force hard redirect to ensure all contexts are cleared
      window.location.href = "/auth";
    }
  };

  const refreshSession = async () => {
    const token = await AuthService.refresh();
    return !!token;
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;
    try {
      await AuthService.updateProfile(data);
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem("rivo_user", JSON.stringify(updatedUser));
    } catch (err) {
      console.error("[AuthContext] Error updating profile:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      register, 
      logout,
      refreshSession,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
