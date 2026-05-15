import { ITokenService, AuthTokens } from "../domain/ISecurityService";

export class RefreshSessionUseCase {
  constructor(private tokenService: ITokenService) {}

  async execute(refreshToken: string): Promise<AuthTokens> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    
    // Aquí se podría validar si el usuario sigue activo en DB
    // O si el token no ha sido revocado en una lista negra
    
    return this.tokenService.generateTokens({
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });
  }
}
