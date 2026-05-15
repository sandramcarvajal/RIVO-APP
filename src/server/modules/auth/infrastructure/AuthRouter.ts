import { Router } from "express";
import { RegisterUserUseCase } from "../application/RegisterUser";
import { LoginUserUseCase } from "../application/LoginUser";
import { RefreshSessionUseCase } from "../application/RefreshSession";
import { DrizzleAuthRepository } from "./DrizzleAuthRepository";
import { BCryptHasher } from "./BCryptHasher";
import { JWTService } from "./JWTService";
import { authMiddleware, AuthRequest } from "./AuthMiddleware";
import { DrizzleVehicleRepository } from "../../vehicles/infrastructure/DrizzleVehicleRepository";

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

authRouter.patch("/me", authMiddleware, async (req: AuthRequest, res) => {
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
});

export { authRouter };
