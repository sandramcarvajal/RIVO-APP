import { UserRole } from "../../../../types";

export interface UserEntity {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  password?: string;
  profileData?: string;
  rating?: string;
  createdAt: Date;
}

export interface IAuthRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(user: Omit<UserEntity, 'id' | 'createdAt'>): Promise<UserEntity>;
  updateProfile(id: string, data: Partial<UserEntity>): Promise<void>;
}
