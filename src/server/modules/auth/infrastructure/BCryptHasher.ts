import bcrypt from "bcryptjs";
import { IHasher } from "../domain/ISecurityService";

export class BCryptHasher implements IHasher {
  private readonly SALT_ROUNDS = 12;

  async hash(payload: string): Promise<string> {
    return await bcrypt.hash(payload, this.SALT_ROUNDS);
  }

  async compare(payload: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(payload, hashed);
  }
}
