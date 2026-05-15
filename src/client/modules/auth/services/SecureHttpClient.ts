import { LocalStorageManager } from "./LocalStorageManager";

export class SecureHttpClient {
  static async request(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = LocalStorageManager.getAccessToken();
    
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized (Token expired)
    if (response.status === 401 && !url.includes("/api/auth/refresh")) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry original request with new token
        headers.set("Authorization", `Bearer ${LocalStorageManager.getAccessToken()}`);
        return await fetch(url, { ...options, headers });
      } else {
        // Session expired completely
        window.dispatchEvent(new CustomEvent("rivo_unauthorized"));
      }
    }

    return response;
  }

  private static async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/refresh", { 
        method: "POST",
        credentials: "include" 
      });
      if (!response.ok) return false;

      const { accessToken } = await response.json();
      LocalStorageManager.setAccessToken(accessToken);
      return true;
    } catch {
      return false;
    }
  }
}
