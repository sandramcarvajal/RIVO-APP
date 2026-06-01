import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timeInput: string) {
  if (!timeInput) return '';
  try {
    let dateObj: Date;
    if (timeInput.includes('T') || timeInput.includes('-') || timeInput.length > 8) {
      dateObj = new Date(timeInput);
    } else {
      dateObj = new Date(`2000-01-01T${timeInput}`);
    }
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  } catch (err) {
    console.warn("[utils.ts] Error formatting time:", err);
    return timeInput;
  }
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(price);
}
