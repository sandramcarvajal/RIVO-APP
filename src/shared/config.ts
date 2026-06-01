export const RIVO_CONFIG = {
  timezone: "America/Bogota",
  ocr: {
    minConfidence: 0.70, // 70% threshold
  },
  map: {
    defaultCenter: { lat: 7.1193, lng: -73.1227 }, // Bucaramanga
    defaultZoom: 13,
    metropolitanCities: ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "SYC"],
  },
  routes: {
    maxDurationMinutes: 180, // 3 hours limit considered for heavy urban traffic
    maxPassengers: 4,
  },
  colors: {
    status: {
      scheduled: { bg: "bg-amber-50 text-amber-700 border-amber-200/60", badge: "amber" },
      in_progress: { bg: "bg-blue-50 text-blue-700 border-blue-200/60", badge: "blue" },
      completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", badge: "emerald" },
      cancelled: { bg: "bg-rose-50 text-rose-700 border-rose-200/60", badge: "rose" },
    },
    requests: {
      pending: "bg-amber-50 text-amber-700 border-amber-200/60",
      accepted: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      rejected: "bg-rose-50 text-rose-700 border-rose-200/60",
    }
  }
};
