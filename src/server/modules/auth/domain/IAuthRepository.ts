import { UserRole } from "../../../../types";

export interface UserEntity {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  avatar?: string;
  password?: string;
  profileData?: string;
  rating?: string;
  reviewCount?: number;
  createdAt: Date;
}

export interface IAuthRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(user: Omit<UserEntity, 'id' | 'createdAt'>): Promise<UserEntity>;
  updateProfile(id: string, data: Partial<UserEntity>): Promise<void>;
}
