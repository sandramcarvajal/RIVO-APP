import { Request, Response, NextFunction } from "express";
import { JWTService } from "./JWTService";
import { logDiagnostic } from "../../../logger";

const tokenService = new JWTService();

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  logDiagnostic("[AUTH MIDDLEWARE HIT]", { method: req.method, url: req.originalUrl, headers: req.headers });
  console.log("[AUTH MIDDLEWARE HIT]", req.method, req.originalUrl);
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No se proporcionó token de acceso." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = tokenService.verifyAccessToken(token);
    if (payload && payload.email && payload.email.toLowerCase().trim() === "admin@syc.com.co") {
      payload.role = "admin_master";
    }
    req.user = payload;

    console.log("[JWT RECEIVED]");
    console.log("userId:", req.user?.userId);
    console.log("email:", req.user?.email);
    console.log("role:", req.user?.role);

    next();
  } catch (error) {
    res.status(401).json({ error: "Token de acceso inválido o expirado." });
  }
};

export const roleGuard = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role?.toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    
    console.log(`[roleGuard] Checking role: ${userRole} against ${normalizedAllowed}`);

    const isAllowed = req.user && userRole && (
      normalizedAllowed.includes(userRole) ||
      (userRole === "admin_master" && normalizedAllowed.includes("admin"))
    );

    if (!isAllowed) {
      return res.status(403).json({ 
        error: "No tienes permisos para acceder a este recurso.",
        requiredRoles: allowedRoles,
        userRole: userRole || 'none'
      });
    }
    next();
  };
};
