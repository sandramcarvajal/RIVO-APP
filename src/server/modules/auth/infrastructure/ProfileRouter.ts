import { Router, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../../../db";
import { users, vehicles } from "../../../../db/schema";
import { authMiddleware, AuthRequest } from "./AuthMiddleware";
import { normalizeName } from "../../../core/utils/normalization";

const profileRouter = Router();

// GET /api/profile - Fetch authenticated user profile details safely
profileRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Identificador de usuario inválido." });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    let profileObj: any = {};
    if (user.profileData) {
      try {
        profileObj = JSON.parse(user.profileData);
      } catch (parseErr) {
        console.error(`[ProfileRouter] Error parsing profileData for user id ${userId}:`, parseErr);
        profileObj = {};
      }
    }

    // Try to load any active vehicle registered in real SQL vehicles table
    let activeVehicle: any = null;
    try {
      const [v] = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.userId, userId), eq(vehicles.isActive, true)))
        .limit(1);
      activeVehicle = v;
    } catch (e) {
      console.error("[ProfileRouter] Error fetching active vehicle for profile:", e);
    }

    // Build responsive safe profile object merging database user fields
    return res.json({
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      name: profileObj.name || "",
      firstName: profileObj.firstName || "",
      secondName: profileObj.secondName || "",
      firstLastName: profileObj.firstLastName || "",
      secondLastName: profileObj.secondLastName || "",
      phoneNumber: profileObj.phoneNumber || "",
      alternativeNumber: profileObj.alternativeNumber || "",
      city: profileObj.city || "",
      state: profileObj.state || "",
      country: profileObj.country || "Colombia",
      jobTitle: profileObj.jobTitle || "",
      department: profileObj.department || "",
      company: profileObj.company || "",
      bio: profileObj.bio || "",
      birthDate: profileObj.birthDate || "",
      gender: profileObj.gender || "",
      address: profileObj.address || "",
      avatar: profileObj.avatar || "",

      // Emergency Contact Fields (Sprint 8.7.6)
      emergencyContactName: profileObj.emergencyContactName || "",
      emergencyContactPhone: profileObj.emergencyContactPhone || "",
      emergencyContactRelation: profileObj.emergencyContactRelation || "",

      // Conductor Profile Specs (Sprint 8.7.6)
      drivingExperience: profileObj.drivingExperience || "",
      licenseType: profileObj.licenseType || "",
      licenseExpiry: profileObj.licenseExpiry || "",
      habitualAvailability: profileObj.habitualAvailability || "",
      preferredSchedule: profileObj.preferredSchedule || "",
      driverBio: profileObj.driverBio || "",

      // Vehicle Properties (Sprint 8.7.6)
      vehicleBrand: profileObj.vehicleBrand || (activeVehicle ? (activeVehicle.brand || "") : ""),
      vehicleModel: profileObj.vehicleModel || (activeVehicle ? (activeVehicle.model || "") : ""),
      vehicleYear: profileObj.vehicleYear || "",
      vehicleColor: profileObj.vehicleColor || (activeVehicle ? (activeVehicle.color || "") : ""),
      vehiclePlate: profileObj.vehiclePlate || (activeVehicle ? (activeVehicle.plate || "") : ""),
      vehiclePassengerCapacity: profileObj.vehiclePassengerCapacity || "",
      vehicleFuelType: profileObj.vehicleFuelType || ""
    });
  } catch (error: any) {
    console.error("[ProfileRouter] Error picking user profile detail:", error);
    return res.status(500).json({ error: "Error interno al recuperar el perfil.", details: error.message });
  }
});

// PUT /api/profile - Update the authenticated user's profile with restricted attributes
profileRouter.put("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Identificador de usuario inválido." });
    }

    // Retrieve original user to ensure profileData keys are preserved and reuse existing keys
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const {
      name,
      firstName,
      secondName,
      firstLastName,
      secondLastName,
      phoneNumber,
      alternativeNumber,
      city,
      state,
      country,
      jobTitle,
      department,
      company,
      bio,
      birthDate,
      gender,
      address,
      avatar,

      // Emergency Contact Fields
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,

      // Conductor Profile Specs
      drivingExperience,
      licenseType,
      licenseExpiry,
      habitualAvailability,
      preferredSchedule,
      driverBio,

      // Vehicle Properties
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      vehiclePlate,
      vehiclePassengerCapacity,
      vehicleFuelType
    } = req.body;

    // VALIDATIONS:
    // 1) First Name / Name is mandatory
    const finalFirstName = normalizeName(String(firstName || ""));
    const finalFirstLastName = normalizeName(String(firstLastName || ""));
    const finalName = normalizeName(String(name || "") || `${finalFirstName} ${finalFirstLastName}`);

    if (!finalName && !finalFirstName) {
      return res.status(400).json({ error: "El nombre completo o primer nombre es obligatorio." });
    }
    if (!finalFirstName) {
      return res.status(400).json({ error: "El primer nombre es obligatorio." });
    }
    if (!finalFirstLastName) {
      return res.status(400).json({ error: "El primer apellido es obligatorio." });
    }

    // 2) Phone validation: celular must be valid
    const cleanPhone = String(phoneNumber || "").trim();
    if (cleanPhone) {
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ error: "El número celular ingresado no es válido (ej. 3001234567, mínimo 7 dígitos, solo números)." });
      }
    }

    // 3) Bio validation
    const cleanBio = String(bio || "").trim();
    if (cleanBio && cleanBio.length > 500) {
      return res.status(400).json({ error: "La biografía corta no puede superar los 500 caracteres." });
    }

    const cleanDriverBio = String(driverBio || "").trim();
    if (cleanDriverBio && cleanDriverBio.length > 500) {
      return res.status(400).json({ error: "La biografía del conductor no puede superar los 500 caracteres." });
    }

    // 4) Date format validation for birthDate if provided
    const cleanBirthDate = String(birthDate || "").trim();
    if (cleanBirthDate) {
      const parsedDate = Date.parse(cleanBirthDate);
      if (isNaN(parsedDate)) {
        return res.status(400).json({ error: "El formato de fecha de nacimiento es incorrecto." });
      }
    }

    // Parse existing profileData to make sure we modify only allowed fields and reuse remaining items
    let existingProfile: any = {};
    if (user.profileData) {
      try {
        existingProfile = JSON.parse(user.profileData);
      } catch (parseErr) {
        existingProfile = {};
      }
    }

    // Merge allowed fields into existing profileData structure
    const updatedProfile = {
      ...existingProfile,
      name: finalName,
      firstName: finalFirstName,
      secondName: normalizeName(String(secondName || "")),
      firstLastName: finalFirstLastName,
      secondLastName: normalizeName(String(secondLastName || "")),
      phoneNumber: cleanPhone,
      alternativeNumber: String(alternativeNumber || "").trim(),
      city: normalizeName(String(city || "")),
      state: normalizeName(String(state || "")),
      country: normalizeName(String(country || "Colombia")),
      jobTitle: normalizeName(String(jobTitle || "")),
      department: String(department || "").trim(),
      company: normalizeName(String(company || "")),
      bio: cleanBio,
      birthDate: cleanBirthDate,
      gender: String(gender || "").trim(),
      address: String(address || "").trim(),
      avatar: String(avatar || "").trim() || existingProfile.avatar || "",

      // Emergency Contact
      emergencyContactName: String(emergencyContactName || "").trim(),
      emergencyContactPhone: String(emergencyContactPhone || "").trim(),
      emergencyContactRelation: String(emergencyContactRelation || "").trim(),

      // Conductor Specs
      drivingExperience: String(drivingExperience || "").trim(),
      licenseType: String(licenseType || "").trim(),
      licenseExpiry: String(licenseExpiry || "").trim(),
      habitualAvailability: String(habitualAvailability || "").trim(),
      preferredSchedule: String(preferredSchedule || "").trim(),
      driverBio: cleanDriverBio,

      // Vehicle specs
      vehicleBrand: String(vehicleBrand || "").trim(),
      vehicleModel: String(vehicleModel || "").trim(),
      vehicleYear: String(vehicleYear || "").trim(),
      vehicleColor: String(vehicleColor || "").trim(),
      vehiclePlate: String(vehiclePlate || "").trim().toUpperCase(),
      vehiclePassengerCapacity: String(vehiclePassengerCapacity || "").trim(),
      vehicleFuelType: String(vehicleFuelType || "").trim()
    };

    // Save profileData to users table
    await db.update(users)
      .set({ profileData: JSON.stringify(updatedProfile) })
      .where(eq(users.id, userId));

    // SYNCHRONIZATION WITH POSTGRES 'vehicles' TABLE
    const cleanPlate = String(vehiclePlate || "").trim().toUpperCase();
    if (cleanPlate) {
      try {
        const [existingActive] = await db
          .select()
          .from(vehicles)
          .where(and(eq(vehicles.userId, userId), eq(vehicles.isActive, true)))
          .limit(1);

        if (existingActive) {
          // Update existing vehicle
          await db
            .update(vehicles)
            .set({
              plate: cleanPlate,
              brand: String(vehicleBrand || "Vehículo").trim(),
              model: String(vehicleModel || "").trim() || null,
              color: String(vehicleColor || "Gris").trim(),
              updatedAt: new Date()
            })
            .where(eq(vehicles.id, existingActive.id));
          console.log(`[ProfileRouter] Successfully synced active vehicle ID ${existingActive.id} with core driver edits.`);
        } else {
          // Confirm global plate uniqueness before inserting a physical record
          const [globalExisting] = await db
            .select()
            .from(vehicles)
            .where(eq(vehicles.plate, cleanPlate))
            .limit(1);

          if (!globalExisting) {
            await db
              .insert(vehicles)
              .values({
                userId,
                plate: cleanPlate,
                brand: String(vehicleBrand || "Vehículo").trim(),
                model: String(vehicleModel || "").trim() || null,
                color: String(vehicleColor || "Gris").trim(),
                type: "car",
                isActive: true,
                availabilityStatus: "available",
                verifiedStatus: "approved"
              });
            console.log(`[ProfileRouter] Successfully created new active vehicle for driver ID ${userId} corresponding to updated details.`);
          }
        }
      } catch (vehicleSyncErr) {
        console.error("[ProfileRouter] Non-blocking warning: failed syncing vehicle table data:", vehicleSyncErr);
      }
    }

    return res.json({
      success: true,
      message: "Perfil de conductor actualizado correctamente en Postgres.",
      profile: {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        ...updatedProfile
      }
    });

  } catch (error: any) {
    console.error("[ProfileRouter] Error updating user profile details:", error);
    return res.status(500).json({ error: "Error interno al actualizar el perfil.", details: error.message });
  }
});

export { profileRouter };
