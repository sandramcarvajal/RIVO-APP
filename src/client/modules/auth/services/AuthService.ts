import { User } from "../../../../types";
import { LocalStorageManager } from "./LocalStorageManager";
import { SecureHttpClient } from "./SecureHttpClient";

export interface RegisterDTO {
  name: string;
  email: string;
  password?: string;
  role: string;
  vehicle?: {
    plate: string;
    brand: string;
    color: string;
  };
}

export interface LoginDTO {
  email: string;
  password?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export class AuthService {
  static async register(data: RegisterDTO): Promise<User> {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error en el registro");
    }

    return await response.json();
  }

  static async login(data: LoginDTO): Promise<LoginResponse> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Credenciales inválidas");
    }

    const result = await response.json();
    LocalStorageManager.setAccessToken(result.accessToken);
    return result;
  }

  static async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    LocalStorageManager.removeTokens();
  }

  static async getProfile(email: string): Promise<User> {
    const response = await SecureHttpClient.request(`/api/auth/me/${email}`);
    if (!response.ok) throw new Error("No se pudo obtener el perfil");
    return await response.json();
  }

  static async refresh(): Promise<string | null> {
    const response = await fetch("/api/auth/refresh", { 
      method: "POST",
      credentials: "include" 
    });
    if (!response.ok) return null;
    const { accessToken } = await response.json();
    LocalStorageManager.setAccessToken(accessToken);
    return accessToken;
  }

  static async me(): Promise<User> {
    const response = await SecureHttpClient.request("/api/auth/me");
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "No se pudo recuperar la sesión");
    }
    return await response.json();
  }

  static async updateProfile(data: any): Promise<any> {
    const response = await SecureHttpClient.request("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al actualizar perfil");
    }

    return await response.json();
  }
}
