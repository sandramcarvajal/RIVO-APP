import { SecureHttpClient } from "../../auth/services/SecureHttpClient";

export interface RouteDTO {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  status: string;
  polyline?: string;
}

export interface CreateRouteRequest {
  origin: string;
  destination: string;
  departureTime: string;
  totalSeats: number;
  price: number;
  originCoords?: string;
  destinationCoords?: string;
  polyline?: string;
}

export class RouteService {
  static async create(data: CreateRouteRequest): Promise<RouteDTO> {
    const response = await SecureHttpClient.request("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al crear la ruta");
    }

    return await response.json();
  }

  static async search(origin?: string, destination?: string): Promise<RouteDTO[]> {
    const params = new URLSearchParams();
    if (origin) params.append("origin", origin);
    if (destination) params.append("destination", destination);

    const response = await SecureHttpClient.request(`/api/routes/search?${params.toString()}`);
    if (!response.ok) throw new Error("Error al buscar rutas");
    
    return await response.json();
  }

  static async getById(id: string): Promise<RouteDTO> {
    const response = await SecureHttpClient.request(`/api/routes/${id}`);
    if (!response.ok) throw new Error("No se pudo obtener la ruta");
    return await response.json();
  }
}
