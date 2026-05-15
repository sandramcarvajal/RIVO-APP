import { useState, useCallback } from "react";
import { UserRole } from "../../../../types";
import { useAuthContext } from "../context/AuthContext";

export function useAuth() {
  const { login: contextLogin, register: contextRegister, logout: contextLogout, user, isAuthenticated, isLoading } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password?: string) => {
    setLoading(true);
    setError(null);
    try {
      await contextLogin(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contextLogin]);

  const register = useCallback(async (name: string, email: string, role: UserRole, password?: string, vehicle?: { plate: string, brand: string, color: string }) => {
    setLoading(true);
    setError(null);
    try {
      await contextRegister(name, email, role, password, vehicle);
      // Auto login after registration
      await contextLogin(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error en el registro";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contextRegister, contextLogin]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await contextLogout();
    } finally {
      setLoading(false);
    }
  }, [contextLogout]);

  return {
    login,
    register,
    logout,
    user,
    isAuthenticated,
    isLoading: isLoading || loading,
    error
  };
}
