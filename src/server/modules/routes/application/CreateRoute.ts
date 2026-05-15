import { IRouteRepository, RouteEntity } from "../domain/IRouteRepository";

export interface CreateRouteInput {
  driverId: string;
  origin: string;
  originCoords?: string;
  destination: string;
  destinationCoords?: string;
  departureTime: string; // ISO string
  totalSeats: number;
  price: number;
  polyline?: string;
}

export class CreateRouteUseCase {
  constructor(private routeRepository: IRouteRepository) {}

  async execute(input: CreateRouteInput): Promise<RouteEntity> {
    // 1. Validation Logic
    const departureTime = new Date(input.departureTime);
    if (isNaN(departureTime.getTime())) {
      throw new Error("Fecha de salida inválida.");
    }

    if (departureTime < new Date()) {
      throw new Error("La fecha de salida no puede ser en el pasado.");
    }

    if (input.totalSeats <= 0 || input.totalSeats > 10) {
      throw new Error("El número de asientos debe ser entre 1 y 10.");
    }

    if (!input.origin.trim() || !input.destination.trim()) {
      throw new Error("Origen y destino son obligatorios.");
    }

    // 2. Business Rule: A driver can only have one active route at a time
    const activeRoutes = await this.routeRepository.findAll({ 
      driverId: input.driverId,
      status: "scheduled,active,in_progress"
    });

    if (activeRoutes.length > 0) {
      throw new Error("Ya tienes una ruta activa. Debes finalizarla o cancelarla antes de crear una nueva.");
    }

    // 3. Resource persistence
    return await this.routeRepository.create({
      driverId: input.driverId,
      origin: input.origin,
      originCoords: input.originCoords,
      destination: input.destination,
      destinationCoords: input.destinationCoords,
      departureTime,
      totalSeats: input.totalSeats,
      availableSeats: input.totalSeats,
      price: input.price,
      polyline: input.polyline
    });
  }
}
