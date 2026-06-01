import { LocalStorageManager } from "./LocalStorageManager";

export class SecureHttpClient {
  static async request(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = LocalStorageManager.getAccessToken();

    console.log("[JWT TOKEN]");
    console.log(accessToken);

    if (accessToken) {
      try {
        const parts = accessToken.split(".");
        if (parts.length === 3) {
          const payloadPart = parts[1];
          const decodedPayload = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")));
          console.log("[JWT DECODED FRONTEND]");
          console.log("userId:", decodedPayload.userId);
          console.log("email:", decodedPayload.email);
          console.log("role:", decodedPayload.role);
        }
      } catch (err) {
        console.error("Failed to decode JWT in frontend:", err);
      }
    }
    
    let method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (method === "PATCH" || method === "DELETE") {
      headers.set("X-HTTP-Method-Override", method);
      method = "POST";
    }

    let fetchOptions = { ...options, method, headers };

    console.log("[HTTP OUTGOING]");
    console.log("URL:", url);
    console.log("METHOD:", method);
    console.log("HEADERS:", [...headers.entries()]);
    console.log("BODY:", options.body);

    let response = await fetch(url, fetchOptions);

    console.log("[HTTP RESPONSE]");
    console.log("STATUS:", response.status);
    console.log("STATUS TEXT:", response.statusText);
    console.log("CONTENT-TYPE:", response.headers.get("content-type"));

    // Handle 401 Unauthorized (Token expired)
    if (response.status === 401 && !url.includes("/api/auth/refresh")) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry original request with new token
        console.log(`[SECURE_HTTP_RETRY] Retrying request for ${url} after token refresh`);
        headers.set("Authorization", `Bearer ${LocalStorageManager.getAccessToken()}`);
        response = await fetch(url, { ...fetchOptions, headers });
      } else {
        // Session expired completely
        window.dispatchEvent(new CustomEvent("rivo_unauthorized"));
      }
    }

    let parsedResponse: any = null;
    let isHtmlProxy = false;
    try {
      const clone = response.clone();
      const contentType = clone.headers.get("content-type");
      if (contentType && contentType.toLowerCase().includes("application/json")) {
        parsedResponse = await clone.json();
      } else {
        parsedResponse = await clone.text();
        const isApi = url.includes("/api/");
        const isHtmlContentType = contentType && contentType.toLowerCase().includes("text/html");
        
        const lowerResponse = typeof parsedResponse === "string" ? parsedResponse.toLowerCase() : "";
        const containsHtmlTags = lowerResponse.includes("<!doctype") || 
                                 lowerResponse.includes("<html") || 
                                 lowerResponse.includes("<body") ||
                                 lowerResponse.includes("<div") ||
                                 lowerResponse.includes("action required to load your app") ||
                                 lowerResponse.includes("verifycansetcookies");

        const looksLikeHtml = isHtmlContentType || containsHtmlTags;
        if (isApi && looksLikeHtml) {
          isHtmlProxy = true;
        }
      }
    } catch (e) {
      parsedResponse = "[Error reading response]";
    }

    if (isHtmlProxy) {
      console.warn(`[SecureHttpClient] Detected AI Studio security proxy interception for ${url}. Dispatching 'rivo_cookie_blocked' event.`);
      window.dispatchEvent(new CustomEvent("rivo_cookie_blocked"));
      return new Response(JSON.stringify({ error: "Cookie de seguridad de AI Studio bloqueada. Abre en una nueva pestaña." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let parsedBody: any = undefined;
    if (options.body) {
      try {
        parsedBody = JSON.parse(String(options.body));
      } catch (e) {
        parsedBody = options.body;
      }
    }

    console.log({
      method,
      url,
      body: parsedBody,
      status: response.status,
      response: parsedResponse
    });

    // Wrapper to ensure that calling .json() on response NEVER throws a syntax/Format error if payload is html or invalid json
    const originalJson = response.json.bind(response);
    response.json = async () => {
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.toLowerCase().includes("application/json")) {
          return await originalJson();
        }
        const text = await response.clone().text();
        try {
          return JSON.parse(text);
        } catch {
          const fallback: any = [];
          fallback.items = [];
          fallback.total = 0;
          return fallback;
        }
      } catch (err) {
        console.warn(`[SecureHttpClient] Safe json extraction failed for ${url}:`, err);
        const fallback: any = [];
        fallback.items = [];
        fallback.total = 0;
        return fallback;
      }
    };

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
