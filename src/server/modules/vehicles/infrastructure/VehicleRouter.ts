import { Router, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../../../db";
import { vehicles, vehicleDocuments, userDocuments, users } from "../../../../db/schema";
import { authMiddleware, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";
import { DocumentValidationService } from "../application/DocumentValidationService";
import { OCRProcessor } from "../application/OCRProcessor";
import multer from "multer";
import path from "path";
import fs from "fs";

const vehicleRouter = Router();

// Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter validation
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedExts = [".pdf", ".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Formato de archivo no válido. Solo se permiten PDF, JPG, JPEG, PNG."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Real document file upload endpoint
// Handles validation, storage and prepares tracing
// flow: documentUpload -> documentStorage
vehicleRouter.post("/upload", authMiddleware, (req: AuthRequest, res: Response, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("[VehicleRouter] Upload error:", err.message);
      return res.status(400).json({ error: err.message || "Error al subir el archivo" });
    }
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo para subir." });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const uploadedAt = new Date().toISOString();

    console.log(`[documentUpload -> documentStorage] Successfully saved document '${req.file.originalname}' physically to '${fileUrl}'`);

    res.json({
      url: fileUrl,
      documentName: req.file.originalname,
      documentType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: uploadedAt,
    });
  } catch (error: any) {
    console.error("[VehicleRouter] Error registering file physical upload:", error);
    res.status(500).json({ error: "Error en el servidor al cargar el documento" });
  }
});

// Retrieve all vehicles of the logged-in driver, populated with their vehicle documents
vehicleRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdInt = parseInt(req.user!.userId);
    console.log(`[VehicleRouter] Fetching vehicles and documents for userId: ${userIdInt}`);
    
    const userVehicles = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, userIdInt));

    const vehiclesWithDocs = await Promise.all(
      userVehicles.map(async (v) => {
        const docs = await db
          .select()
          .from(vehicleDocuments)
          .where(eq(vehicleDocuments.vehicleId, v.id));

        return {
          ...v,
          id: v.id.toString(),
          userId: v.userId.toString(),
          verifiedBy: v.verifiedBy?.toString() || null,
          documents: docs.map((d) => ({
            ...d,
            id: d.id.toString(),
            vehicleId: d.vehicleId.toString(),
            verifiedBy: d.verifiedBy?.toString() || null,
          })),
        };
      })
    );

    res.json(vehiclesWithDocs);
  } catch (error: any) {
    console.error(`[VehicleRouter] Error getting vehicles:`);
    console.error(`  - User:`, req.user);
    console.error(`  - Error Stack:`, error.stack || error);
    res.status(500).json({ error: "Error al recuperar la lista de vehículos" });
  }
});

// Create/add a new vehicle for the authenticated user, enforcing plate uniqueness
vehicleRouter.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdInt = parseInt(req.user!.userId);
    const { plate, brand, model, color, type } = req.body;

    if (!plate || !brand || !color) {
      return res.status(400).json({ error: "La placa, la marca y el color son obligatorios." });
    }

    const cleanPlate = plate.trim().toUpperCase();

    // Enforce 1 plate = 1 vehicle global uniqueness
    const [existing] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.plate, cleanPlate))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "La placa ingresada ya está registrada por otro conductor en Rivo." });
    }

    // Check if user has other vehicles to determine if this item should be default active
    const userVehicles = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, userIdInt));

    const isFirstVehicle = userVehicles.length === 0;

    const [created] = await db
      .insert(vehicles)
      .values({
        userId: userIdInt,
        plate: cleanPlate,
        brand: brand.trim(),
        model: model ? model.trim() : null,
        color: color.trim(),
        type: type || "car",
        isActive: isFirstVehicle, // Activate automatically if it's their first vehicle
        availabilityStatus: "available",
        verifiedStatus: "pending",
      })
      .returning();

    // Auto-promote user role to 'driver' upon adding their first vehicle
    try {
      await db
        .update(users)
        .set({ role: "driver" })
        .where(eq(users.id, userIdInt));
      console.log(`[VehicleRouter] Automatically promoted user ID ${userIdInt} to 'driver' on first vehicle registration.`);
    } catch (roleErr) {
      console.error(`[VehicleRouter] Error auto-promoting user ID ${userIdInt} to 'driver':`, roleErr);
    }

    res.status(201).json({
      ...created,
      id: created.id.toString(),
      userId: created.userId.toString(),
      documents: [],
    });
  } catch (error) {
    console.error(`[VehicleRouter] Error creating vehicle:`, error);
    res.status(500).json({ error: "Error al registrar el vehículo en la base de datos" });
  }
});

// Set a specific vehicle as active (principal) and deactivate all other vehicles of the driver
vehicleRouter.post("/:id/activate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdInt = parseInt(req.user!.userId);
    const vehicleId = parseInt(req.params.id);

    const result = await db.transaction(async (tx) => {
      // Verify vehicle exists and belongs to requesting user
      const [vehicle] = await tx
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId))
        .limit(1);

      if (!vehicle || vehicle.userId !== userIdInt) {
        return { error: "Vehículo no encontrado o no pertenece a tu cuenta.", status: 404 };
      }

      // Set all other vehicles for this user as inactive
      await tx
        .update(vehicles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(vehicles.userId, userIdInt));

      // Set selected vehicle as active
      const [updated] = await tx
        .update(vehicles)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(vehicles.id, vehicleId))
        .returning();

      return { success: true, vehicle: updated };
    });

    if ("error" in result) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Vehículo principal actualizado con éxito.",
      vehicle: {
        ...result.vehicle,
        id: result.vehicle.id.toString(),
        userId: result.vehicle.userId.toString(),
      },
    });
  } catch (error) {
    console.error(`[VehicleRouter] Error activating vehicle:`, error);
    res.status(500).json({ error: "Error al activar el vehículo como principal" });
  }
});

// Upload or update a vehicle document (SOAT, property card, tech preventive, etc.)
vehicleRouter.post("/:id/documents", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdInt = parseInt(req.user!.userId);
    const vehicleId = parseInt(req.params.id);
    const { documentType, fileUrl, expirationDate, ocrValidationData, documentName, uploadedAt } = req.body;

    if (!documentType || !fileUrl) {
      return res.status(400).json({ error: "El tipo de documento y el archivo son obligatorios." });
    }

    // Verify ownership
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (!vehicle || vehicle.userId !== userIdInt) {
      return res.status(404).json({ error: "Vehículo no encontrado o no pertenece a tu cuenta." });
    }

    // Toggle/update existing element if already exists
    const [existing] = await db
      .select()
      .from(vehicleDocuments)
      .where(
        and(
          eq(vehicleDocuments.vehicleId, vehicleId),
          eq(vehicleDocuments.documentType, documentType)
        )
      )
      .limit(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedExpDate = expirationDate ? new Date(expirationDate) : null;
    const isExpired = parsedExpDate ? parsedExpDate < today : false;
    const expStatus = isExpired ? "expired" : "valid";

    let finalStatus = "pending";
    let finalRejectReason: string | null = null;
    let finalOcrExtractedData: string | null = null;
    let finalOcrConfidence: string | null = null;
    let finalVerifiedAt: Date | null = null;
    let finalVerifiedBy: number | null = null;

    if (documentType === "soat") {
      const validation = await DocumentValidationService.validateSOAT(
        vehicle.plate,
        expirationDate || null
      );
      finalStatus = validation.status;
      finalRejectReason = validation.rejectReason;
      finalOcrExtractedData = validation.ocrExtractedData;
      finalOcrConfidence = validation.ocrConfidence;
      if (validation.status === "approved") {
        finalVerifiedAt = new Date();
        finalVerifiedBy = 1; // 1 = Auto-Aprobadora System Admin
      }
    } else {
      // Auto-approve other vehicle documents if expiration date is valid/future
      if (!isExpired) {
        finalStatus = "approved";
        finalVerifiedAt = new Date();
        finalVerifiedBy = 1;
      } else {
        finalStatus = "rejected";
        finalRejectReason = "El documento está vencido.";
      }
    }

    let resultDoc;

    if (existing) {
      const [updated] = await db
        .update(vehicleDocuments)
        .set({
          fileUrl,
          status: finalStatus,
          expirationDate: parsedExpDate,
          expirationStatus: expStatus,
          rejectReason: finalRejectReason,
          ocrConfidence: finalOcrConfidence,
          ocrExtractedData: finalOcrExtractedData,
          verifiedAt: finalVerifiedAt,
          verifiedBy: finalVerifiedBy,
          documentName: documentName || null,
          uploadedAt: uploadedAt ? new Date(uploadedAt) : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(vehicleDocuments.id, existing.id))
        .returning();
      resultDoc = updated;
    } else {
      const [inserted] = await db
        .insert(vehicleDocuments)
        .values({
          vehicleId,
          documentType,
          fileUrl,
          status: finalStatus,
          expirationDate: parsedExpDate,
          expirationStatus: expStatus,
          rejectReason: finalRejectReason,
          ocrConfidence: finalOcrConfidence,
          ocrExtractedData: finalOcrExtractedData,
          verifiedAt: finalVerifiedAt,
          verifiedBy: finalVerifiedBy,
          documentName: documentName || null,
          uploadedAt: uploadedAt ? new Date(uploadedAt) : new Date(),
        })
        .returning();
      resultDoc = inserted;
    }

    // Trigger prepared phase 2 OCR trace in the background
    // flow: documentUpload -> documentStorage -> documentValidation -> ocrProcessor(pendiente)
    OCRProcessor.processDocument(fileUrl, documentType)
      .then((ocrRes) => {
        console.log(`[OCRProcessor] [Trace] Successfully completed simulated OCR processing for: ${fileUrl}`);
      })
      .catch((err) => {
        console.error("[OCRProcessor] Error running background OCR simulation trace:", err);
      });

    // Check if three required documents are all approved to update vehicle overall verification status
    try {
      const allDocs = await db
        .select()
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.vehicleId, vehicleId));

      const docMap = new Map<string, string>();
      allDocs.forEach(d => {
        docMap.set(d.documentType, d.status);
      });
      // Ensure current document's finalStatus is included in check in case database read is async cached
      docMap.set(documentType, finalStatus);

      const hasApprovedSoat = docMap.get("soat") === "approved";
      const hasApprovedPropCard = docMap.get("property_card") === "approved";
      const hasApprovedTechPrev = docMap.get("tech_preventive") === "approved";

      if (hasApprovedSoat && hasApprovedPropCard && hasApprovedTechPrev) {
        await db
          .update(vehicles)
          .set({ 
            verifiedStatus: "approved",
            verifiedAt: new Date(),
            verifiedBy: 1
          })
          .where(eq(vehicles.id, vehicleId));
        console.log(`[VehicleRouter] Automatically approved vehicle ID ${vehicleId} because all 3 required documents are approved.`);
      } else {
        await db
          .update(vehicles)
          .set({ verifiedStatus: "pending" })
          .where(eq(vehicles.id, vehicleId));
      }
    } catch (err) {
      console.error("[VehicleRouter] Error auto-verifying vehicle overall status:", err);
    }

    res.status(200).json({
      ...resultDoc,
      id: resultDoc.id.toString(),
      vehicleId: resultDoc.vehicleId.toString(),
      verifiedBy: resultDoc.verifiedBy?.toString() || null,
    });
  } catch (error: any) {
    console.error(`[VehicleRouter] Error registering vehicle document:`);
    console.error(`  - Params:`, req.params);
    console.error(`  - Body:`, JSON.stringify(req.body, null, 2));
    console.error(`  - User:`, req.user);
    console.error(`  - Error Stack:`, error.stack || error);
    res.status(500).json({ error: "Error al registrar el documento del vehículo" });
  }
});

// Retrieve user-level documents (such as driver's license) for current driver user
vehicleRouter.get("/user-documents", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdInt = parseInt(req.user!.userId);
    console.log(`[VehicleRouter] Fetching user-level documents for userId: ${userIdInt}`);

    const docs = await db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.userId, userIdInt));

    res.json(
      docs.map((d) => ({
        ...d,
        id: d.id.toString(),
        userId: d.userId.toString(),
        verifiedBy: d.verifiedBy?.toString() || null,
      }))
    );
  } catch (error: any) {
    console.error(`[VehicleRouter] Error getting user documents:`);
    console.error(`  - User:`, req.user);
    console.error(`  - Error Stack:`, error.stack || error);
    res.status(500).json({ error: "Error al recuperar los documentos de la cuenta" });
  }
});

// Upload or update user documents (e.g. driver's license)
vehicleRouter.post("/user-documents", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdInt = parseInt(req.user!.userId);
    const { documentType, fileUrl, expirationDate, ocrValidationData, documentName, uploadedAt } = req.body;

    if (!documentType || !fileUrl) {
      return res.status(400).json({ error: "El tipo de documento y el archivo son obligatorios." });
    }

    const [existing] = await db
      .select()
      .from(userDocuments)
      .where(
        and(
          eq(userDocuments.userId, userIdInt),
          eq(userDocuments.documentType, documentType)
        )
      )
      .limit(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedExpDate = expirationDate ? new Date(expirationDate) : null;
    const isExpired = parsedExpDate ? parsedExpDate < today : false;
    const expStatus = isExpired ? "expired" : "valid";

    let finalStatus = "pending";
    let finalRejectReason: string | null = null;
    let finalOcrExtractedData: string | null = null;
    let finalOcrConfidence: string | null = null;
    let finalVerifiedAt: Date | null = null;
    let finalVerifiedBy: number | null = null;

    if (documentType === "license") {
      const [activeVehicle] = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.userId, userIdInt), eq(vehicles.isActive, true)))
        .limit(1);

      const vehicleType = activeVehicle?.type || "car";
      const userCategory = (ocrValidationData?.category || "B1").toUpperCase();

      const validation = await DocumentValidationService.validateLicense(
        vehicleType,
        userCategory,
        expirationDate || null
      );
      finalStatus = validation.status;
      finalRejectReason = validation.rejectReason;
      finalOcrExtractedData = validation.ocrExtractedData;
      finalOcrConfidence = validation.ocrConfidence;
      if (validation.status === "approved") {
        finalVerifiedAt = new Date();
        finalVerifiedBy = 1;
      }
    }

    let resultDoc;

    if (existing) {
      const [updated] = await db
        .update(userDocuments)
        .set({
          fileUrl,
          status: finalStatus,
          expirationDate: parsedExpDate,
          expirationStatus: expStatus,
          rejectReason: finalRejectReason,
          ocrConfidence: finalOcrConfidence,
          ocrExtractedData: finalOcrExtractedData,
          verifiedAt: finalVerifiedAt,
          verifiedBy: finalVerifiedBy,
          documentName: documentName || null,
          uploadedAt: uploadedAt ? new Date(uploadedAt) : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userDocuments.id, existing.id))
        .returning();
      resultDoc = updated;
    } else {
      const [inserted] = await db
        .insert(userDocuments)
        .values({
          userId: userIdInt,
          documentType,
          fileUrl,
          status: finalStatus,
          expirationDate: parsedExpDate,
          expirationStatus: expStatus,
          rejectReason: finalRejectReason,
          ocrConfidence: finalOcrConfidence,
          ocrExtractedData: finalOcrExtractedData,
          verifiedAt: finalVerifiedAt,
          verifiedBy: finalVerifiedBy,
          documentName: documentName || null,
          uploadedAt: uploadedAt ? new Date(uploadedAt) : new Date(),
        })
        .returning();
      resultDoc = inserted;
    }

    // Trigger prepared phase 2 OCR trace in the background
    // flow: documentUpload -> documentStorage -> documentValidation -> ocrProcessor(pendiente)
    OCRProcessor.processDocument(fileUrl, documentType)
      .then((ocrRes) => {
        console.log(`[OCRProcessor] [Trace] Successfully completed simulated OCR processing for: ${fileUrl}`);
      })
      .catch((err) => {
        console.error("[OCRProcessor] Error running background OCR simulation trace user doc:", err);
      });

    res.status(200).json({
      ...resultDoc,
      id: resultDoc.id.toString(),
      userId: resultDoc.userId.toString(),
      verifiedBy: resultDoc.verifiedBy?.toString() || null,
    });
  } catch (error: any) {
    console.error(`[VehicleRouter] Error registering user document:`);
    console.error(`  - Params:`, req.params);
    console.error(`  - Body:`, JSON.stringify(req.body, null, 2));
    console.error(`  - User:`, req.user);
    console.error(`  - Error Stack:`, error.stack || error);
    res.status(500).json({ error: "Error al registrar el documento del usuario" });
  }
});

export { vehicleRouter };
