import { Router } from "express";
import { RegisterUserUseCase } from "../application/RegisterUser";
import { LoginUserUseCase } from "../application/LoginUser";
import { RefreshSessionUseCase } from "../application/RefreshSession";
import { DrizzleAuthRepository } from "./DrizzleAuthRepository";
import { BCryptHasher } from "./BCryptHasher";
import { JWTService } from "./JWTService";
import { authMiddleware, AuthRequest } from "./AuthMiddleware";
import { DrizzleVehicleRepository } from "../../vehicles/infrastructure/DrizzleVehicleRepository";
import { eq, and, lt } from "drizzle-orm";
import { db } from "../../../../db";
import { users, passwordResetTokens } from "../../../../db/schema";
import crypto from "crypto";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";

const authRouter = Router();

// Manual DI
const authRepository = new DrizzleAuthRepository();
const vehicleRepository = new DrizzleVehicleRepository();
const hasher = new BCryptHasher();
const tokenService = new JWTService();

const registerUserUseCase = new RegisterUserUseCase(authRepository, hasher, vehicleRepository);
const loginUserUseCase = new LoginUserUseCase(authRepository, hasher, tokenService, vehicleRepository);
const refreshSessionUseCase = new RefreshSessionUseCase(tokenService);

authRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, vehicle } = req.body;
    const user = await registerUserUseCase.execute({ name, email, password, role, vehicle });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Error" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await loginUserUseCase.execute({ email, password });
    
    // Refresh token in secure cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ user, accessToken: tokens.accessToken });
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Error" });
  }
});

authRouter.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new Error("No refresh token");

    const tokens = await refreshSessionUseCase.execute(refreshToken);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    res.status(401).json({ error: "Sesión expirada" });
  }
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Sesión cerrada" });
});

authRouter.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const user = await authRepository.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    // Aggregate vehicle if driver
    let vehicle = null;
    if (user.role === 'driver') {
      vehicle = await vehicleRepository.findByUserId(user.id);
    }

    const { password, ...safeUser } = user;
    res.json({ ...safeUser, vehicle });
  } catch (error) {
    console.error(`[AuthRouter] Error fetching me:`, error);
    res.status(500).json({ error: "Error al recuperar sesión" });
  }
});

authRouter.get("/me/:email", async (req, res) => {
  try {
    const user = await authRepository.findByEmail(req.params.email);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    // Aggregate vehicle if driver
    let vehicle = null;
    if (user.role === 'driver') {
      vehicle = await vehicleRepository.findByUserId(user.id);
    }

    const { password, ...safeUser } = user;
    res.json({ ...safeUser, vehicle });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar usuario" });
  }
});

const handleUpdateProfile = async (req: AuthRequest, res: any) => {
  try {
    const userId = req.user!.userId;
    const { name, avatar, bio } = req.body;
    
    // Fetch current user data
    const user = await authRepository.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Build profileData object
    let currentProfile: any = {};
    if (user.profileData) {
      try {
        currentProfile = JSON.parse(user.profileData);
      } catch (e) {}
    }

    const newProfile = {
      ...currentProfile,
      name: name || currentProfile.name,
      avatar: avatar !== undefined ? avatar : currentProfile.avatar,
      bio: bio !== undefined ? bio : currentProfile.bio
    };

    await authRepository.updateProfile(userId, { 
      profileData: JSON.stringify(newProfile) 
    });

    res.json({ success: true, profile: newProfile });
  } catch (error) {
    console.error(`[AuthRouter] Error updating profile:`, error);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
};

authRouter.patch("/me", authMiddleware, handleUpdateProfile);
authRouter.post("/me", authMiddleware, handleUpdateProfile);

// Diagnostic route to check if SMTP variables are loaded in the Express server
authRouter.get("/smtp-diagnostic", (req, res) => {
  const smtpIsConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  res.json({
    SMTP_HOST_loaded: !!process.env.SMTP_HOST,
    SMTP_PORT_loaded: !!process.env.SMTP_PORT,
    SMTP_USER_loaded: !!process.env.SMTP_USER,
    SMTP_PASS_loaded: !!process.env.SMTP_PASS,
    SMTP_FROM_loaded: !!process.env.SMTP_FROM,
    SMTP_HOST_value: process.env.SMTP_HOST || "undefined",
    SMTP_USER_value: process.env.SMTP_USER || "undefined",
    SMTP_FROM_value: process.env.SMTP_FROM || "undefined",
    smtpStatus: smtpIsConfigured ? "SMTP ENABLED" : "SMTP DISABLED"
  });
});

// Route to trigger a test SMTP mail send and return nodemailer response
authRouter.post("/smtp-test-send", async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: "El correo destinatario es requerido" });
  }

  const smtpIsConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  if (!smtpIsConfigured) {
    return res.status(400).json({
      error: "SMTP no está configurado en el servidor",
      SMTP_HOST_loaded: !!process.env.SMTP_HOST,
      SMTP_USER_loaded: !!process.env.SMTP_USER,
      SMTP_PASS_loaded: !!process.env.SMTP_PASS
    });
  }

  try {
    const fromAddress = process.env.SMTP_FROM || `"Rivo Support" <${process.env.SMTP_USER}>`;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    let verifyResult = "N/A";
    try {
      await transporter.verify();
      verifyResult = "SUCCESS: SMTP port connection & auth verification complete";
    } catch (vErr: any) {
      verifyResult = `FAILED: ${vErr.message || vErr}`;
    }

    let info: any = null;
    let mailErrorObj: any = null;
    try {
      info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: "Rivo SMTP Test - Prueba de Envío",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Prueba de Conexión SMTP Exitosa</h2>
            <p>Este es un correo de prueba enviado por el servidor de Rivo para validar que la configuración SMTP funciona perfectamente.</p>
            <hr/>
            <p style="font-size: 12px; color: #666;">Enviado el: ${new Date().toLocaleString()}</p>
          </div>
        `
      });
    } catch (mErr: any) {
      mailErrorObj = mErr;
    }

    if (mailErrorObj) {
      return res.status(500).json({
        success: false,
        verifyResult,
        sendMailSuccessful: false,
        error: mailErrorObj.message || mailErrorObj,
        code: mailErrorObj.code,
        command: mailErrorObj.command
      });
    }

    res.json({
      success: true,
      verifyResult,
      sendMailSuccessful: true,
      message: "Correo enviado exitosamente",
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope
    });
  } catch (error: any) {
    console.error("[SMTP-Test] Error sending test mail:", error);
    res.status(500).json({
      success: false,
      verifyResult: "N/A - Critical failure outside SMTP send setup",
      sendMailSuccessful: false,
      error: error.message || error,
      details: error.stack
    });
  }
});

// Rate limiting configurations
const forgotIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: "Demasiadas solicitudes de recuperación de contraseña desde esta IP. Intente de nuevo en una hora." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res, next, options) => {
    console.warn(`[AUDIT] [RateLimit-IP] Blocked forgot-password request from IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

const forgotEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => {
    const email = req.body?.email || "";
    return email.toLowerCase().trim();
  },
  skip: (req) => {
    return !req.body?.email;
  },
  message: { error: "Demasiadas solicitudes de recuperación para este correo electrónico. Intente de nuevo en una hora." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res, next, options) => {
    const email = req.body?.email || "";
    console.warn(`[AUDIT] [RateLimit-Email] Blocked forgot-password request for email: ${email} from IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  skipSuccessfulRequests: true, // Only count responses with status >= 400
  message: { error: "Demasiados intentos fallidos. Tu dirección IP ha sido bloqueada temporalmente por 10 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res, next, options) => {
    console.warn(`[AUDIT] [RateLimit-Reset] Blocked reset-password attempt from IP: ${req.ip} after 5 failed attempts`);
    res.status(429).json(options.message);
  }
});

// Periodic background cleaning task for expired space recovery tokens
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

async function cleanupExpiredTokens() {
  try {
    const now = new Date();
    const deletedRecords = await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, now))
      .returning({ id: passwordResetTokens.id });
    
    if (deletedRecords.length > 0) {
      console.log(`[AUDIT] [TokenCleanup] Purged ${deletedRecords.length} expired password recovery tokens.`);
    }
  } catch (error) {
    console.error(`[TokenCleanup] Critical error during automatic token cleanup:`, error);
  }
}

// Start periodic cleanup interval
setInterval(() => {
  cleanupExpiredTokens().catch(err => console.error("[TokenCleanup] Async interval execution failed:", err));
}, CLEANUP_INTERVAL);

// Run one safe-delayed cleanup check on server boot
setTimeout(() => {
  cleanupExpiredTokens().catch(err => console.error("[TokenCleanup] Initial safe boot execution failed:", err));
}, 5000);

// Password recovery and reset routes
authRouter.post("/forgot-password", forgotIpLimiter, forgotEmailLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "El correo electrónico es requerido." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[ForgotPassword] Request received for: ${normalizedEmail}`);
    console.log(`[RECOVERY] Email recibido: ${normalizedEmail}`);

    // Look up user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const userFound = !!user;
    console.log(`[RECOVERY] Usuario encontrado: ${userFound}`);
    console.log(`[RECOVERY] Usuario activo: ${userFound ? "true (N/A - no existe columna is_active en la tabla users)" : "false"}`);

    if (!user) {
      console.log(`[RECOVERY] Token generado: false`);
      console.log(`[RECOVERY] sendMail ejecutado: false`);
      console.log(`[RECOVERY] sendMail exitoso: false`);
      // Security: do not confirm user existence
      return res.json({
        success: true,
        message: "Si el correo está registrado, se enviará un enlace de recuperación."
      });
    }

    // Generate secure token (client-facing)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Ensure we invalidate previous unused tokens for this user
    await db
      .update(passwordResetTokens)
      .set({ isUsed: true })
      .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.isUsed, false)));

    // Generate SHA-256 secure hash to save in database
    const hashedTokenValue = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Insert hashed token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: hashedTokenValue, // Guardamos únicamente el hash
      expiresAt: expiry,
      isUsed: false
    });

    console.log(`[RECOVERY] Token generado: true`);

    // Build absolute URL for resetting password
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const resetUrl = `${protocol}://${host}/auth?action=reset-password&token=${resetToken}`;

    console.log(`[ForgotPassword] Hashed secure token generated and saved for user ID: ${user.id}.`);

    // Check if SMTP is fully configured with credentials
    const smtpIsConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    // Try to send real email
    let emailSent = false;
    let mailErrorObj: any = null;
    let sendMailExecuted = false;

    if (process.env.SMTP_HOST) {
      sendMailExecuted = true;
      try {
        const fromAddress = process.env.SMTP_FROM || `"Rivo Support" <${process.env.SMTP_USER || "no-reply@syc.com.co"}>`;
        
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          } : undefined,
          tls: {
            rejectUnauthorized: false
          }
        });

        console.log(`[RECOVERY] sendMail ejecutado: true`);

        await transporter.sendMail({
          from: fromAddress,
          to: normalizedEmail,
          subject: "Restablecer contraseña de tu cuenta Rivo",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 0;">Recuperación de Contraseña - Rivo</h2>
              <p>Hola,</p>
              <p>Hemos recibido una solicitud para cambiar tu contraseña en Rivo. Para proceder, haz clic en el siguiente botón:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reestablecer Contraseña</a>
              </div>
              <p style="color: #64748b; font-size: 13px;">Si no has solicitado este cambio, por favor ignora este correo. Tu contraseña original seguirá siendo válida.</p>
              <p style="color: #94a3b8; font-size: 11px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px;">Este enlace es temporal y expirará automáticamente en 1 hora. Solo puede utilizarse una vez.</p>
            </div>
          `
        });
        emailSent = true;
        console.log(`[ForgotPassword] Real mail successfully dispatched to ${normalizedEmail}`);
        console.log(`[RECOVERY] sendMail exitoso: true`);
      } catch (mailError: any) {
        mailErrorObj = mailError;
        console.error(`[ForgotPassword] Failed to dispatch real SMTP mail:`, mailError);
        console.log(`[RECOVERY] sendMail exitoso: false`);
      }
    } else {
      console.log(`[RECOVERY] sendMail ejecutado: false`);
      console.log(`[RECOVERY] sendMail exitoso: false`);
      console.log(`\n=======================================================\n[DEVELOPMENT FALLBACK] recovery link logs:\nTo: ${normalizedEmail}\nLink: ${resetUrl}\n=======================================================\n`);
    }

    // Return message. If SMTP is fully configured, disable devLink on the frontend (meaning we do not return devLink), fulfilling the rule "no mostrar enlace en pantalla"
    res.json({
      success: true,
      message: "Si el correo está registrado, se enviará un enlace de recuperación.",
      devLink: !smtpIsConfigured ? resetUrl : undefined,
      recoveryDebug: {
        userFound,
        tokenGenerated: true,
        sendMailExecuted,
        sendMailSuccessful: emailSent,
        mailError: mailErrorObj ? {
          message: mailErrorObj.message || String(mailErrorObj),
          code: mailErrorObj.code,
          command: mailErrorObj.command
        } : null
      }
    });
  } catch (error) {
    console.error("[ForgotPassword] Critical handler error:", error);
    res.status(500).json({ error: "Error al procesar la solicitud." });
  }
});

authRouter.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "El token de recuperación y la nueva contraseña son requeridos." });
    }

    // Compute SHA-256 hash of incoming token to perform comparison
    const hashedIncoming = crypto.createHash("sha256").update(token).digest("hex");

    // Find valid token matching the hashed value
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, hashedIncoming), eq(passwordResetTokens.isUsed, false)))
      .limit(1);

    if (!tokenRecord) {
      return res.status(400).json({ error: "El token de recuperación es inválido o ya ha sido utilizado." });
    }

    // Check expiration
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return res.status(400).json({ error: "El enlace de recuperación ha expirado." });
    }

    // Hash the new password
    const hashedPassword = await hasher.hash(password);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, tokenRecord.userId));

    // Mark current and ALL OTHER pending reset tokens of this user as used
    await db
      .update(passwordResetTokens)
      .set({ isUsed: true })
      .where(eq(passwordResetTokens.userId, tokenRecord.userId));

    console.log(`[AUDIT] Password reset event. User ID: ${tokenRecord.userId} has updated their password using token ID: ${tokenRecord.id}`);

    res.json({ success: true, message: "Contraseña restablecida exitosamente." });
  } catch (error) {
    console.error("[ResetPassword] Critical handler error:", error);
    res.status(500).json({ error: "Error al restablecer la contraseña." });
  }
});

export { authRouter };
