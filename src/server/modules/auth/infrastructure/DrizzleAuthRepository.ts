import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { IAuthRepository, UserEntity } from "../domain/IAuthRepository";

export class DrizzleAuthRepository implements IAuthRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`[DrizzleAuthRepository] Finding user by email: ${normalizedEmail}`);
      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));

      if (!user) {
        console.log(`[DrizzleAuthRepository] User not found: ${normalizedEmail}`);
        return null;
      }
      
      let name = "";
      let avatar = undefined;
      if (user.profileData) {
        try {
          const profile = JSON.parse(user.profileData);
          name = profile.name || "";
          avatar = profile.avatar || undefined;
        } catch (e) {
          console.error(`[DrizzleAuthRepository] Error parsing profileData for ${email}:`, e);
        }
      }

      return {
        id: user.id.toString(),
        email: user.email,
        password: user.password || undefined,
        role: (user.email.toLowerCase().trim() === 'admin@syc.com.co' ? 'admin_master' : user.role) as any,
        name: name,
        avatar: avatar,
        profileData: user.profileData || undefined,
        rating: user.rating || undefined,
        reviewCount: user.reviewCount ?? 0,
        createdAt: user.createdAt || new Date()
      };
    } catch (error) {
      console.error(`[DrizzleAuthRepository] DATABASE ERROR in findByEmail:`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    try {
      console.log(`[DrizzleAuthRepository] Finding user by id: ${id}`);
      const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
      if (!user) {
        console.log(`[DrizzleAuthRepository] User not found id: ${id}`);
        return null;
      }

      let name = "";
      let avatar = undefined;
      if (user.profileData) {
        try {
          const profile = JSON.parse(user.profileData);
          name = profile.name || "";
          avatar = profile.avatar || undefined;
        } catch (e) {
          console.error(`[DrizzleAuthRepository] Error parsing profileData for id ${id}:`, e);
        }
      }

      return {
        id: user.id.toString(),
        email: user.email,
        password: user.password || undefined,
        role: (user.email.toLowerCase().trim() === 'admin@syc.com.co' ? 'admin_master' : user.role) as any,
        name: name,
        avatar: avatar,
        profileData: user.profileData || undefined,
        rating: user.rating || undefined,
        reviewCount: user.reviewCount ?? 0,
        createdAt: user.createdAt || new Date()
      };
    } catch (error) {
      console.error(`[DrizzleAuthRepository] DATABASE ERROR in findById:`, error);
      throw error;
    }
  }

  async create(user: Omit<UserEntity, 'id' | 'createdAt'>): Promise<UserEntity> {
    try {
      const normalizedEmail = user.email.toLowerCase().trim();
      console.log(`[DrizzleAuthRepository] Creating user: ${normalizedEmail}`);
      const profileData = JSON.stringify({ name: user.name });
      const [created] = await db.insert(users).values({
        email: normalizedEmail,
        password: user.password,
        role: user.role as string,
        profileData: profileData
      }).returning();

      return {
        id: created.id.toString(),
        email: created.email,
        password: created.password || undefined,
        role: (created.email.toLowerCase().trim() === 'admin@syc.com.co' ? 'admin_master' : created.role) as any,
        name: user.name,
        profileData: created.profileData || undefined,
        rating: created.rating || undefined,
        reviewCount: created.reviewCount ?? 0,
        createdAt: created.createdAt || new Date()
      };
    } catch (error) {
      console.error(`[DrizzleAuthRepository] DATABASE ERROR in create user:`, error);
      throw error;
    }
  }

  async updateProfile(id: string, data: Partial<UserEntity>): Promise<void> {
    try {
      console.log(`[DrizzleAuthRepository] Updating profile for user: ${id}`);
      
      const updateData: any = {};
      
      if (data.profileData) {
         updateData.profileData = data.profileData;
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.update(users)
          .set(updateData)
          .where(eq(users.id, parseInt(id)));
      }
    } catch (error) {
      console.error(`[DrizzleAuthRepository] DATABASE ERROR in updateProfile:`, error);
      throw error;
    }
  }
}
