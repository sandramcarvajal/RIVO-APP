import { useState, useCallback } from "react";
import { RouteService, CreateRouteRequest, RouteDTO } from "../services/RouteService";

export function useRoutes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteDTO[]>([]);

  const createRoute = useCallback(async (data: CreateRouteRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await RouteService.create(data);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchRoutes = useCallback(async (origin?: string, destination?: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await RouteService.search(origin, destination);
      setRoutes(results);
      return results;
    } catch (err) {
      setError("No se pudieron cargar las rutas");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    routes,
    createRoute,
    searchRoutes,
    loading,
    error
  };
}
