import { db } from "../../../../db";
import { vehicles, users, vehicleDocuments, userDocuments } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

export interface SOATValidationData {
  plate: string;
  expirationDate: string;
}

export interface LicenseValidationData {
  category: string;
  expirationDate: string;
}

export interface ValidationResult {
  status: "approved" | "pending" | "rejected";
  rejectReason: string | null;
  ocrExtractedData: string | null;
  ocrConfidence: string | null;
}

export class SOATValidator {
  static async validate(
    vehiclePlate: string,
    expirationDate: string | null
  ): Promise<ValidationResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!expirationDate) {
      return {
        status: "rejected",
        rejectReason: "Fecha de vencimiento del SOAT no proporcionada.",
        ocrExtractedData: null,
        ocrConfidence: null,
      };
    }

    const expDate = new Date(expirationDate);
    if (expDate < today) {
      return {
        status: "rejected",
        rejectReason: "SOAT vencido.",
        ocrExtractedData: null,
        ocrConfidence: null,
      };
    }

    // Standard check to confirm plate is present
    if (!vehiclePlate) {
      return {
        status: "rejected",
        rejectReason: "El vehículo no tiene una placa registrada.",
        ocrExtractedData: null,
        ocrConfidence: null,
      };
    }

    return {
      status: "approved",
      rejectReason: null,
      ocrExtractedData: null,
      ocrConfidence: null,
    };
  }
}

export class LicenseValidator {
  static async validate(
    vehicleType: string,
    category: string,
    expirationDate: string | null
  ): Promise<ValidationResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!expirationDate) {
      return {
        status: "rejected",
        rejectReason: "Fecha de vencimiento de la licencia no proporcionada.",
        ocrExtractedData: null,
        ocrConfidence: null,
      };
    }

    const expDate = new Date(expirationDate);
    if (expDate < today) {
      return {
        status: "rejected",
        rejectReason: "Licencia vencida.",
        ocrExtractedData: null,
        ocrConfidence: null,
      };
    }

    const vType = (vehicleType || "car").trim().toLowerCase();
    const cat = (category || "").trim().toUpperCase();

    if (vType === "car") {
      const isCarCategory = ["B1", "B2", "B3", "C1", "C2", "C3"].includes(cat);
      if (!isCarCategory) {
        return {
          status: "rejected",
          rejectReason: `La categoría seleccionada (${cat}) no autoriza la conducción de automóviles. Se requiere una categoría del grupo B o C.`,
          ocrExtractedData: null,
          ocrConfidence: null,
        };
      }
    } else if (vType === "motorcycle") {
      const isMotoCategory = ["A1", "A2"].includes(cat);
      if (!isMotoCategory) {
        return {
          status: "rejected",
          rejectReason: `La categoría seleccionada (${cat}) no autoriza la conducción de motocicletas. Se requiere categoría A1 o A2.`,
          ocrExtractedData: null,
          ocrConfidence: null,
        };
      }
    }

    return {
      status: "approved",
      rejectReason: null,
      ocrExtractedData: null,
      ocrConfidence: null,
    };
  }
}

export class DocumentValidationService {
  static async validateSOAT(
    vehiclePlate: string,
    expirationDate: string | null
  ): Promise<ValidationResult> {
    return SOATValidator.validate(vehiclePlate, expirationDate);
  }

  static async validateLicense(
    vehicleType: string,
    category: string,
    expirationDate: string | null
  ): Promise<ValidationResult> {
    return LicenseValidator.validate(vehicleType, category, expirationDate);
  }
}
