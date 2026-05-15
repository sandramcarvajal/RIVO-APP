import { IAuthRepository } from "../domain/IAuthRepository";
import { IHasher, ITokenService, AuthTokens } from "../domain/ISecurityService";
import { IVehicleRepository } from "../../vehicles/domain/IVehicleRepository";
import { normalizeEmail } from "../../../core/utils/normalization";

export interface LoginUserInput {
  email: string;
  password?: string;
}

export interface LoginUserOutput {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    vehicle?: {
      plate: string;
      brand: string;
      color: string;
    } | null;
  };
  tokens: AuthTokens;
}

export class LoginUserUseCase {
  constructor(
    private authRepository: IAuthRepository,
    private hasher: IHasher,
    private tokenService: ITokenService,
    private vehicleRepository: IVehicleRepository
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    try {
      const normalizedEmail = normalizeEmail(input.email);
      console.log(`[LoginUserUseCase] Attempting login for email: ${normalizedEmail}`);
      const user = await this.authRepository.findByEmail(normalizedEmail);
      
      if (!user) {
        console.warn(`[LoginUserUseCase] Login failed: User not found for email ${normalizedEmail}`);
        throw new Error("Credenciales inválidas.");
      }

      // Compare passwords
      if (input.password && user.password) {
        const isMatch = await this.hasher.compare(input.password, user.password);
        if (!isMatch) {
          console.warn(`[LoginUserUseCase] Login failed: Password mismatch for ${input.email}`);
          throw new Error("Credenciales inválidas.");
        }
      } else if (input.password || user.password) {
        console.warn(`[LoginUserUseCase] Login failed: Password missing in logic for ${input.email}`);
        throw new Error("Credenciales inválidas.");
      }

      // Fetch vehicle if driver
      let vehicle = null;
      if (user.role === 'driver') {
        vehicle = await this.vehicleRepository.findByUserId(user.id);
      }

      const tokens = this.tokenService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      console.log(`[LoginUserUseCase] Login successful for: ${input.email}`);
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          vehicle
        },
        tokens
      };
    } catch (error) {
      console.error(`[LoginUserUseCase] ERROR during login for ${input.email}:`, error);
      throw error;
    }
  }
}
