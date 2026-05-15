import { IAuthRepository, UserEntity } from "../domain/IAuthRepository";
import { IHasher } from "../domain/ISecurityService";
import { IVehicleRepository } from "../../vehicles/domain/IVehicleRepository";
import { normalizeName, normalizeEmail } from "../../../core/utils/normalization";

export interface RegisterUserInput {
  name: string;
  email: string;
  password?: string;
  role: 'passenger' | 'driver';
  vehicle?: {
    plate: string;
    brand: string;
    color: string;
    model?: string;
  };
}

export class RegisterUserUseCase {
  constructor(
    private authRepository: IAuthRepository,
    private hasher: IHasher,
    private vehicleRepository: IVehicleRepository
  ) {}

  async execute(input: RegisterUserInput): Promise<UserEntity> {
    try {
      console.log(`[RegisterUserUseCase] Attempting registration for email: ${input.email}`);
      
      // 1. Normalization
      const normalizedName = normalizeName(input.name);
      const normalizedEmail = normalizeEmail(input.email);
      
      // 1.1 Email Domain validation
      if (!normalizedEmail.endsWith("@syc.com.co")) {
        console.warn(`[RegisterUserUseCase] Registration failed: Invalid email domain ${normalizedEmail}`);
        throw new Error("Solo se permiten correos corporativos @syc.com.co");
      }

      // 2. Check if user already exists
      const existingUser = await this.authRepository.findByEmail(normalizedEmail);
      if (existingUser) {
        console.warn(`[RegisterUserUseCase] Registration failed: User already exists ${normalizedEmail}`);
        throw new Error("El usuario ya existe con este correo electrónico.");
      }

      // 3. Hash password
      let hashedPassword = undefined;
      if (input.password) {
        hashedPassword = await this.hasher.hash(input.password);
      }

      // 4. Create user
      const user = await this.authRepository.create({
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        role: input.role as any
      });

      // 5. Create vehicle if user is a driver
      if (input.role === 'driver' && input.vehicle) {
        console.log(`[RegisterUserUseCase] Creating vehicle for new driver: ${user.id}`);
        await this.vehicleRepository.create({
          userId: user.id,
          plate: input.vehicle.plate.toUpperCase().trim(),
          brand: normalizeName(input.vehicle.brand),
          color: normalizeName(input.vehicle.color),
          model: input.vehicle.model ? normalizeName(input.vehicle.model) : undefined
        });
      }

      console.log(`[RegisterUserUseCase] Registration successful for: ${input.email} (ID: ${user.id})`);
      return user;
    } catch (error) {
      console.error(`[RegisterUserUseCase] ERROR during registration for ${input.email}:`, error);
      throw error;
    }
  }
}
