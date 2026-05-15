import { CityRule, CirculationEvaluator } from "../../core/domain/CirculationRule";

export interface CheckCirculationInput {
  plate: string;
  date: string; // ISO string or specific format
  city: string;
}

export interface CheckCirculationOutput {
  canCirculate: boolean;
  message: string;
}

// Rules for Bucaramanga (First Quarter 2024 example / rotating)
const CITY_RULES: Record<string, CityRule> = {
  "bucaramanga": {
    city: "Bucaramanga",
    restrictions: [
      { dayOfWeek: 1, restrictedDigits: [1, 2] },
      { dayOfWeek: 2, restrictedDigits: [3, 4] },
      { dayOfWeek: 3, restrictedDigits: [5, 6] },
      { dayOfWeek: 4, restrictedDigits: [7, 8] },
      { dayOfWeek: 5, restrictedDigits: [9, 0] },
    ],
    timeRanges: [
      { start: "06:00", end: "20:00" }, // 6 AM to 8 PM
    ]
  },
  "quito": {
    city: "Quito",
    restrictions: [
      { dayOfWeek: 1, restrictedDigits: [1, 2] },
      { dayOfWeek: 2, restrictedDigits: [3, 4] },
      { dayOfWeek: 3, restrictedDigits: [5, 6] },
      { dayOfWeek: 4, restrictedDigits: [7, 8] },
      { dayOfWeek: 5, restrictedDigits: [9, 0] },
    ],
    timeRanges: [
      { start: "07:00", end: "09:30" },
      { start: "16:00", end: "21:00" },
    ]
  }
};

export class CheckCirculationUseCase {
  async execute(input: CheckCirculationInput): Promise<CheckCirculationOutput> {
    const { plate, date, city = 'bucaramanga' } = input;
    const cityKey = city ? city.toLowerCase() : 'bucaramanga';
    const rule = CITY_RULES[cityKey];

    if (!rule) {
      return {
        canCirculate: true,
        message: `No restrictions found for city: ${city}`
      };
    }

    try {
      const evaluationDate = new Date(date);
      const canCirculate = CirculationEvaluator.canCirculate(plate, evaluationDate, rule);

      return {
        canCirculate,
        message: canCirculate 
          ? "Vehículo puede circular libremente." 
          : "Vehículo tiene restricción de Pico y Placa."
      };
    } catch (error) {
      return {
        canCirculate: false,
        message: error instanceof Error ? error.message : "Internal error evaluate circulation"
      };
    }
  }
}
