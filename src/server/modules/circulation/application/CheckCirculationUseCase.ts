import { BucaramangaMetroPolicy } from "../domain/policies/BucaramangaMetroPolicy";

export interface CheckCirculationInput {
  plate: string;
  date: string; // ISO or date string
}

export interface CheckCirculationOutput {
  canCirculate: boolean;
  reason: string;
  restrictedDigits?: number[];
  applicableHours?: { start: string; end: string }[];
}

export class CheckCirculationUseCase {
  private policy = new BucaramangaMetroPolicy();

  public async execute(input: CheckCirculationInput): Promise<CheckCirculationOutput> {
    const { plate, date } = input;
    if (!plate) {
      throw new Error("La placa del vehículo es obligatoria.");
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Fecha de circulación inválida: ${date}`);
    }

    const result = this.policy.evaluate(plate, parsedDate);

    return {
      canCirculate: result.canCirculate,
      reason: result.reason || (result.canCirculate ? "El vehículo puede circular libremente." : "El vehículo tiene restricción de Pico y Placa."),
      restrictedDigits: result.restrictedDigits,
      applicableHours: result.applicableHours,
    };
  }
}
