import jwt from "jsonwebtoken";
import { ITokenService, AuthTokens, TokenPayload } from "../domain/ISecurityService";

const ACCESS_SECRET = process.env.JWT_SECRET || "access_secret_123";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_123";

export class JWTService implements ITokenService {
  generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    
    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }
}
