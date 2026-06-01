export interface CirculationPart {
  weekdayShort: string; // "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface CirculationEvaluation {
  canCirculate: boolean;
  reason?: string;
  restrictedDigits?: number[];
  applicableHours?: { start: string; end: string }[];
}

export abstract class CirculationPolicy {
  abstract getName(): string;
  abstract getCities(): string[];
  abstract evaluate(plate: string, date: Date): CirculationEvaluation;

  /**
   * Safe extraction of date components in the America/Bogota timezone
   */
  public getBogotaParts(date: Date): CirculationPart {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const part of parts) {
      partMap[part.type] = part.value;
    }

    return {
      weekdayShort: partMap.weekday || "Sun",
      year: parseInt(partMap.year, 10),
      month: parseInt(partMap.month, 10),
      day: parseInt(partMap.day, 10),
      hour: parseInt(partMap.hour, 10),
      minute: parseInt(partMap.minute, 10),
    };
  }

  /**
   * Helper to format a Date as a date-only string in Bogota timezone (YYYY-MM-DD)
   */
  public getBogotaDateString(date: Date): string {
    const parts = this.getBogotaParts(date);
    const y = parts.year;
    const m = String(parts.month).padStart(2, "0");
    const d = String(parts.day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /**
   * Helper to extract the last numeric digit of a license plate
   */
  public getLastNumericDigit(plate: string): number | null {
    if (!plate) return null;
    const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (let i = normalized.length - 1; i >= 0; i--) {
      const char = normalized[i];
      if (char >= "0" && char <= "9") {
        return parseInt(char, 10);
      }
    }
    return null;
  }
}
