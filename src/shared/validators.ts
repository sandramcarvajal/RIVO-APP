/**
 * Validator for Colombian license plates.
 * Private/public vehicles: 3 letters and 3 numbers (e.g., AAA123 or AAA-123).
 * Motorcycles: 3 letters, 2 numbers, 1 letter (e.g., AAA12A or AAA-12A).
 */
export function validatePlate(plate: string): { isValid: boolean; normalized: string; isMotorcycle: boolean } {
  if (!plate) return { isValid: false, normalized: "", isMotorcycle: false };
  const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Standard car plate matching (3 letters, 3 numbers)
  const carRegex = /^[A-Z]{3}[0-9]{3}$/;
  // Motorcycle plate matching (3 letters, 2 numbers, 1 letter)
  const motoRegex = /^[A-Z]{3}[0-9]{2}[A-Z]$/;
  
  if (carRegex.test(normalized)) {
    return { isValid: true, normalized, isMotorcycle: false };
  }
  if (motoRegex.test(normalized)) {
    return { isValid: true, normalized, isMotorcycle: true };
  }
  
  return { isValid: false, normalized, isMotorcycle: false };
}
