import { CheckCirculationUseCase as NewCheckCirculationUseCase } from "../../modules/circulation/application/CheckCirculationUseCase";

export interface CheckCirculationInput {
  plate: string;
  date: string; // ISO string
  city?: string;
}

export interface CheckCirculationOutput {
  canCirculate: boolean;
  message: string;
}

export class CheckCirculationUseCase {
  private delegate = new NewCheckCirculationUseCase();

  async execute(input: CheckCirculationInput): Promise<CheckCirculationOutput> {
    try {
      const result = await this.delegate.execute({
        plate: input.plate,
        date: input.date,
      });

      return {
        canCirculate: result.canCirculate,
        message: result.reason,
      };
    } catch (error: any) {
      return {
        canCirculate: false,
        message: error?.message || "Error al verificar la restricción de Pico y Placa.",
      };
    }
  }
}
