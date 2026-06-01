import { CirculationPolicy, CirculationEvaluation } from "../CirculationPolicy";

export class BucaramangaMetroPolicy extends CirculationPolicy {
  getName(): string {
    return "Metrópoli Bucaramanga — Pico y Placa";
  }

  getCities(): string[] {
    return ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"];
  }

  evaluate(plate: string, date: Date): CirculationEvaluation {
    const lastDigit = this.getLastNumericDigit(plate);
    if (lastDigit === null) {
      return {
        canCirculate: true,
        reason: "No se pudo extraer ningún dígito numérico de la placa.",
      };
    }

    const parts = this.getBogotaParts(date);
    const day = parts.weekdayShort; // "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
    const currentMinutes = parts.hour * 60 + parts.minute;

    // Sundays have no restrictions
    if (day === "Sun") {
      return {
        canCirculate: true,
        reason: "Domingo libre de restricciones de Pico y Placa.",
      };
    }

    // Weekday evaluation
    if (day !== "Sat") {
      const weekdayRestrictions: Record<string, number[]> = {
        Mon: [9, 0],
        Tue: [1, 2],
        Wed: [3, 4],
        Thu: [5, 6],
        Fri: [7, 8],
      };

      const restrictedDigits = weekdayRestrictions[day];
      if (!restrictedDigits) {
        return {
          canCirculate: true,
          reason: "Día de la semana sin restricciones registradas.",
        };
      }

      const isRestrictedTime = currentMinutes >= 6 * 60 && currentMinutes <= 20 * 60;
      const isPlateRestricted = restrictedDigits.includes(lastDigit);

      if (isPlateRestricted && isRestrictedTime) {
        return {
          canCirculate: false,
          restrictedDigits,
          applicableHours: [{ start: "06:00", end: "20:00" }],
          reason: `El vehículo de placa terminada en ${lastDigit} tiene restricción de Pico y Placa en el Área Metropolitana de Bucaramanga los ${this.translateDay(day)} de 06:00 AM a 08:00 PM (Dígitos restringidos: ${restrictedDigits.join("-")}).`,
        };
      }

      return {
        canCirculate: true,
        reason: isPlateRestricted
          ? `Hoy es día de restricción (${restrictedDigits.join("-")}), pero el horario seleccionado está fuera de la restricción activa (06:00 AM - 08:00 PM).`
          : `El vehículo puede circular hoy (los ${this.translateDay(day)} restringen ${restrictedDigits.join("-")}).`,
      };
    }

    // Saturday math (anchor based)
    // Anchor date: April 11, 2026 (restricted: [7, 8])
    const saturdaySequence = [
      [7, 8], // Index 0 (April 11)
      [9, 0], // Index 1 (April 18)
      [1, 2], // Index 2 (April 25)
      [3, 4], // Index 3 (May 2)
      [5, 6], // Index 4 (May 9)
    ];

    const targetStr = this.getBogotaDateString(date);
    const anchorDateObj = new Date("2026-04-11T00:00:00Z");
    const targetDateObj = new Date(`${targetStr}T00:00:00Z`);
    
    const diffMs = targetDateObj.getTime() - anchorDateObj.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    // Divide strictly by 7 to find how many weeks since anchor
    const diffWeeks = Math.floor(diffDays / 7);
    const index = ((diffWeeks % 5) + 5) % 5;

    const restrictedDigits = saturdaySequence[index];
    const isRestrictedTime = currentMinutes >= 9 * 60 && currentMinutes <= 13 * 60;
    const isPlateRestricted = restrictedDigits.includes(lastDigit);

    if (isPlateRestricted && isRestrictedTime) {
      return {
        canCirculate: false,
        restrictedDigits,
        applicableHours: [{ start: "09:00", end: "13:00" }],
        reason: `El vehículo de placa terminada en ${lastDigit} tiene restricción de Pico y Placa metropolitano este sábado ${targetStr} de 09:00 AM a 01:00 PM (Dígitos restringidos para hoy: ${restrictedDigits.join("-")}).`,
      };
    }

    return {
      canCirculate: true,
      reason: isPlateRestricted
        ? `Sábado rotativo de restricción (${restrictedDigits.join("-")}), pero la hora está fuera de la restricción activa (09:00 AM - 01:00 PM).`
        : `El vehículo puede circular este sábado rotativo (Restricción: ${restrictedDigits.join("-")}).`,
    };
  }

  private translateDay(day: string): string {
    const translation: Record<string, string> = {
      Mon: "Lunes",
      Tue: "Martes",
      Wed: "Miércoles",
      Thu: "Jueves",
      Fri: "Viernes",
      Sat: "Sábado",
      Sun: "Domingo",
    };
    return translation[day] || day;
  }
}
