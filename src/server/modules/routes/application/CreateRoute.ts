import { IRouteRepository, RouteEntity } from "../domain/IRouteRepository";

export interface CreateRouteInput {
  driverId: string;
  vehicleId?: string;
  origin: string;
  originCoords?: string;
  destination: string;
  destinationCoords?: string;
  departureTime: string; // ISO string
  totalSeats: number;
  price: number;
  polyline?: string;
}

export interface CreateRouteSuccess {
  success: true;
  route: RouteEntity;
}

export interface CreateRouteValidationError {
  success: false;
  type: "validation";
  field: string;
  message: string;
}

export type CreateRouteResult = CreateRouteSuccess | CreateRouteValidationError;

export class CreateRouteUseCase {
  constructor(private routeRepository: IRouteRepository) {}

  async execute(input: CreateRouteInput): Promise<CreateRouteResult> {
    // 1. Validation Logic
    const departureTime = new Date(input.departureTime);
    if (isNaN(departureTime.getTime())) {
      return {
        success: false,
        type: "validation",
        field: "departureTime",
        message: "Fecha de salida inválida."
      };
    }

    // Set seconds and milliseconds to 0 to align matching minute representations
    const departureTimeNormalized = new Date(departureTime);
    departureTimeNormalized.setSeconds(0, 0);

    // Apply a 15-minute grace period to 'now' to handle network latency, script delays, or minor clock differences.
    const nowNormalized = new Date(Date.now() - 15 * 60 * 1000);
    nowNormalized.setSeconds(0, 0);

    console.log("[CreateRouteValidation]", {
      originalDepartureTime: departureTime.toISOString(),
      normalizedDepartureTime: departureTimeNormalized.toISOString(),
      originalNow: new Date().toISOString(),
      nowWithGraceNormalized: nowNormalized.toISOString(),
      comparisonResult: departureTimeNormalized < nowNormalized ? "rejected" : "allowed"
    });

    if (departureTimeNormalized < nowNormalized) {
      return {
        success: false,
        type: "validation",
        field: "departureTime",
        message: "La fecha de salida no puede ser en el pasado."
      };
    }

    if (input.totalSeats <= 0 || input.totalSeats > 10) {
      return {
        success: false,
        type: "validation",
        field: "totalSeats",
        message: "El número de asientos debe ser entre 1 y 10."
      };
    }

    if (!input.origin?.trim() || !input.destination?.trim()) {
      return {
        success: false,
        type: "validation",
        field: !input.origin?.trim() ? "origin" : "destination",
        message: "Origen y destino son obligatorios."
      };
    }

    // 2. Business Rule: A driver can only have one active route at a time
    const activeRoutes = await this.routeRepository.findAll({ 
      driverId: input.driverId,
      status: "scheduled,in_progress"
    });

    if (activeRoutes.length > 0) {
      return {
        success: false,
        type: "validation",
        field: "driver",
        message: "Ya tienes una ruta activa. Debes finalizarla o cancelarla antes de crear una nueva."
      };
    }

    // 3. Resource persistence
    const route = await this.routeRepository.create({
      driverId: input.driverId,
      vehicleId: input.vehicleId,
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

    return {
      success: true,
      route
    };
  }
}
