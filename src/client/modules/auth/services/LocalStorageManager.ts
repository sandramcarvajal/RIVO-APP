export class LocalStorageManager {
  private static readonly ACCESS_TOKEN_KEY = "rivo_access_token";

  static setAccessToken(token: string) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static removeTokens() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
  }
}
