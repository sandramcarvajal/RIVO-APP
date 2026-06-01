import { IAuthRepository } from "../domain/IAuthRepository";
import { IHasher, ITokenService, AuthTokens } from "../domain/ISecurityService";
import { IVehicleRepository } from "../../vehicles/domain/IVehicleRepository";
import { normalizeEmail } from "../../../core/utils/normalization";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Credenciales inválidas.");
    this.name = "InvalidCredentialsError";
  }
}

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
    rating?: string;
    reviewCount?: number;
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
    const normalizedEmail = normalizeEmail(input.email);
    try {
      console.log(`[LoginUserUseCase] Attempting login for email: ${normalizedEmail}`);
      const user = await this.authRepository.findByEmail(normalizedEmail);
      
      if (!user) {
        throw new InvalidCredentialsError();
      }

      // Compare passwords
      if (input.password && user.password) {
        const isMatch = await this.hasher.compare(input.password, user.password);
        if (!isMatch) {
          throw new InvalidCredentialsError();
        }
      } else if (input.password || user.password) {
        throw new InvalidCredentialsError();
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

      console.log(`[LoginUserUseCase] Login successful for: ${normalizedEmail}`);
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          rating: user.rating,
          reviewCount: user.reviewCount,
          vehicle
        },
        tokens
      };
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        console.warn(`[LoginUserUseCase] Invalid credentials for ${normalizedEmail}`);
      } else {
        console.error(`[LoginUserUseCase] ERROR during login for ${normalizedEmail}:`, error);
      }
      throw error;
    }
  }
}
