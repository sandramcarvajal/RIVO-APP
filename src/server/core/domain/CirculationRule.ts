export interface TimeRange {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface CityRule {
  city: string;
  restrictions: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    restrictedDigits: number[];
  }[];
  timeRanges: TimeRange[];
}

export class CirculationEvaluator {
  static canCirculate(plate: string, date: Date, rules: CityRule): boolean {
    const lastDigit = parseInt(plate.slice(-1));
    if (isNaN(lastDigit)) throw new Error("Invalid license plate");

    const day = date.getDay();
    const restriction = rules.restrictions.find(r => r.dayOfWeek === day);

    if (!restriction) return true; // No restrictions for this day

    if (!restriction.restrictedDigits.includes(lastDigit)) return true;

    // It's a restricted day for this plate, check time
    const currentTime = date.getHours() * 60 + date.getMinutes();

    return !rules.timeRanges.some(range => {
      const [startH, startM] = range.start.split(":").map(Number);
      const [endH, endM] = range.end.split(":").map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      return currentTime >= startTotal && currentTime <= endTotal;
    });
  }
}
