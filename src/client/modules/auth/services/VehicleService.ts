import { Vehicle, VehicleDocument, UserDocument } from "../../../../types";
import { SecureHttpClient } from "./SecureHttpClient";

async function handleResponseError(response: Response, defaultMsg: string): Promise<never> {
  const status = response.status;
  const statusText = response.statusText;
  let errMsg = defaultMsg;
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      errMsg = data.error || data.message || defaultMsg;
    } else {
      const text = await response.text();
      const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";
      errMsg = title ? `Error (${status}): ${title}` : `Error en el servidor (${status} ${statusText})`;
    }
  } catch (e) {
    errMsg = `Error en el servidor o de red (${status} ${statusText})`;
  }
  throw new Error(errMsg);
}

async function handleResponseJson(response: Response): Promise<any> {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      const text = await response.text();
      const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";
      throw new Error(title ? `Respuesta no válida del servidor (${response.status}): ${title}` : `Respuesta de servidor no válida (${response.status})`);
    }
  } catch (e: any) {
    throw new Error(e.message || "Error al procesar la respuesta del servidor");
  }
}

export class VehicleService {
  static async uploadFile(file: File): Promise<{ url: string; documentName: string; documentType: string; size: number; uploadedAt: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await SecureHttpClient.request("/api/vehicles/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      await handleResponseError(response, "Error al subir el archivo físico al servidor");
    }

    return await handleResponseJson(response);
  }

  static async getVehicles(): Promise<Vehicle[]> {
    const response = await SecureHttpClient.request("/api/vehicles");
    if (!response.ok) {
      await handleResponseError(response, "Error al obtener la lista de vehículos");
    }
    return await handleResponseJson(response);
  }

  static async createVehicle(data: {
    plate: string;
    brand: string;
    color: string;
    model?: string;
    type?: string;
  }): Promise<Vehicle> {
    const response = await SecureHttpClient.request("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await handleResponseError(response, "Error al agregar vehículo");
    }

    return await handleResponseJson(response);
  }

  static async activateVehicle(id: string): Promise<any> {
    const response = await SecureHttpClient.request(`/api/vehicles/${id}/activate`, {
      method: "POST",
    });

    if (!response.ok) {
      await handleResponseError(response, "Error al activar el vehículo como principal");
    }

    return await handleResponseJson(response);
  }

  static async uploadVehicleDocument(
    vehicleId: string,
    documentType: string,
    fileUrl: string,
    expirationDate?: string,
    ocrValidationData?: any,
    documentName?: string,
    uploadedAt?: string
  ): Promise<VehicleDocument> {
    const response = await SecureHttpClient.request(`/api/vehicles/${vehicleId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType, fileUrl, expirationDate, ocrValidationData, documentName, uploadedAt }),
    });

    if (!response.ok) {
      await handleResponseError(response, "Error al registrar el documento del vehículo");
    }

    return await handleResponseJson(response);
  }

  static async getUserDocuments(): Promise<UserDocument[]> {
    const response = await SecureHttpClient.request("/api/vehicles/user-documents");
    if (!response.ok) {
      await handleResponseError(response, "Error al obtener los documentos del usuario");
    }
    return await handleResponseJson(response);
  }

  static async uploadUserDocument(
    documentType: string,
    fileUrl: string,
    expirationDate?: string,
    ocrValidationData?: any,
    documentName?: string,
    uploadedAt?: string
  ): Promise<UserDocument> {
    const response = await SecureHttpClient.request("/api/vehicles/user-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType, fileUrl, expirationDate, ocrValidationData, documentName, uploadedAt }),
    });

    if (!response.ok) {
      await handleResponseError(response, "Error al registrar el documento del usuario");
    }

    return await handleResponseJson(response);
  }
}
