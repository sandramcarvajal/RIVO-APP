import { RIVO_CONFIG } from './config';

export interface BogotaParts {
  weekdayShort: string; // "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Returns helper formatting parts for any date under America/Bogota
 */
export function getBogotaParts(date: Date = new Date()): BogotaParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: RIVO_CONFIG.timezone,
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
    second: parseInt(partMap.second, 10),
  };
}

/**
 * Formats a Date to ISO Date string (YYYY-MM-DD) in Bogota timezone
 */
export function formatBogotaDateString(date: Date = new Date()): string {
  const parts = getBogotaParts(date);
  const y = parts.year;
  const m = String(parts.month).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date to HH:MM in Bogota timezone 24h
 */
export function formatBogotaTimeString(date: Date = new Date()): string {
  const parts = getBogotaParts(date);
  const h = String(parts.hour).padStart(2, "0");
  const m = String(parts.minute).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Format a Date object or string to a friendly readable Spanish representation in Bogota timezone
 */
export function formatFriendlyBogotaDateTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const parts = getBogotaParts(date);
  
  const spanishMonths = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const spanishDays: Record<string, string> = {
    Mon: "Lunes",
    Tue: "Martes",
    Wed: "Miércoles",
    Thu: "Jueves",
    Fri: "Viernes",
    Sat: "Sábado",
    Sun: "Domingo"
  };

  const dayLabel = spanishDays[parts.weekdayShort] || parts.weekdayShort;
  const monthLabel = spanishMonths[parts.month - 1];

  const ampm = parts.hour >= 12 ? 'PM' : 'AM';
  const hour12 = parts.hour % 12 || 12;
  const minutesStr = String(parts.minute).padStart(2, '0');

  return `${dayLabel}, ${parts.day} de ${monthLabel} del ${parts.year} a las ${hour12}:${minutesStr} ${ampm}`;
}

/**
 * Parses Bogota input dates (YYYY-MM-DD) and times (HH:MM or HH:MM AM/PM) into absolute Date objects
 */
export function parseBogotaDateTime(dateStr: string, timeStr: string): Date {
  const dateStrTrim = dateStr.trim();
  const timeStrTrim = timeStr.trim().toUpperCase();

  let hour = 0;
  let minute = 0;

  // Check if it's 12h clock format (e.g., "08:30 PM" or "8:30 AM")
  const ampmMatch = timeStrTrim.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let matchedHour = parseInt(ampmMatch[1], 10);
    const matchedMinute = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3];
    
    if (ampm === 'PM' && matchedHour < 12) matchedHour += 12;
    if (ampm === 'AM' && matchedHour === 12) matchedHour = 0;
    
    hour = matchedHour;
    minute = matchedMinute;
  } else {
    // Treat as 24h format (e.g. "20:30" or "08:30")
    const match24 = timeStrTrim.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
      hour = parseInt(match24[1], 10);
      minute = parseInt(match24[2], 10);
    }
  }

  const hStr = String(hour).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  
  // Bogota is UTC-5 hours: -05:00
  const isoStr = `${dateStrTrim}T${hStr}:${mStr}:00-05:00`;
  return new Date(isoStr);
}

/**
 * Returns current Date in America/Bogota as an absolute Date object
 */
export function getNowInBogota(): Date {
  return new Date();
}

/**
 * Checks if a trip's departure time has already arrived or passed in Colombia
 */
export function isPastBogota(departureTime: string | Date, currentReferenceDate: Date = getNowInBogota()): boolean {
  const depDate = typeof departureTime === 'string' ? new Date(departureTime) : departureTime;
  return depDate.getTime() < currentReferenceDate.getTime();
}

/**
 * Checked if departure time + 3 hours has passed to auto-complete a route
 */
export function isReadyForAutoCompletion(departureTime: string | Date, currentReferenceDate: Date = getNowInBogota()): boolean {
  const depDate = typeof departureTime === 'string' ? new Date(departureTime) : departureTime;
  const completionThreshold = depDate.getTime() + RIVO_CONFIG.routes.maxDurationMinutes * 60 * 1000;
  return currentReferenceDate.getTime() >= completionThreshold;
}
