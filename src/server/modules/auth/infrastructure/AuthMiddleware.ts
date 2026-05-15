import { Request, Response, NextFunction } from "express";
import { JWTService } from "./JWTService";

const tokenService = new JWTService();

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No se proporcionó token de acceso." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = payload;
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

    if (!req.user || !userRole || !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ 
        error: "No tienes permisos para acceder a este recurso.",
        requiredRoles: allowedRoles,
        userRole: userRole || 'none'
      });
    }
    next();
  };
};
