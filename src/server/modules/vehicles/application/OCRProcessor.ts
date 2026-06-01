import { ValidationResult } from "./DocumentValidationService";

export interface OCRResult {
  extractedPlate?: string;
  extractedExpirationDate?: string;
  extractedCategory?: string;
  confidence: number; // 0 to 100
  rawOcrText: string;
}

/**
 * OCRProcessor (ARCHITECTURE PENDING PHASE 2 EN RIVO)
 * Implements the placeholder for OCR automatic document analyses.
 * Following Flow:
 * documentUpload -> documentStorage -> documentValidation -> ocrProcessor (PENDING)
 */
export class OCRProcessor {
  /**
   * Processes a stored file for metadata retrieval and future AI-based OCR analysis.
   * @param fileUrl The storage URL where the document is physically saved.
   * @param documentType Type of document (e.g., "soat", "property_card", "license").
   * @returns Promise containing the mock or future OCR analysis results.
   */
  static async processDocument(
    fileUrl: string,
    documentType: string
  ): Promise<OCRResult> {
    console.log(`[OCRProcessor] [PENDIENTE] Initiating automatic OCR analysis on document: ${fileUrl} of type: ${documentType}`);
    
    // In Phase 2, this will make a call to Google Cloud Vision API, Gemini Pro, or Document AI.
    // For now, it returns neutral/empty confidence and text.
    return {
      extractedPlate: "",
      extractedExpirationDate: "",
      extractedCategory: "",
      confidence: 0,
      rawOcrText: "OCR processor is set up and pending integration in Phase 2.",
    };
  }

  /**
   * Generates a complete verification report based on manual input and OCR analysis.
   * Used as the transition step between documentValidation and ocrProcessor.
   */
  static analyzeConflict(manualData: any, ocrData: OCRResult): {
    hasConflict: boolean;
    conflictFields: string[];
  } {
    console.log("[OCRProcessor] [PENDIENTE] Analyzing conflicts between manual metadata and OCR response.");
    return {
      hasConflict: false,
      conflictFields: [],
    };
  }
}
