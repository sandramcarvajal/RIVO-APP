import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Check, 
  AlertCircle,
  X, 
  Clock, 
  Car, 
  Bike, 
  FileText, 
  UploadCloud, 
  ShieldCheck, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { Vehicle, VehicleDocument, UserDocument } from "../types";
import { VehicleService } from "../client/modules/auth/services/VehicleService";
import { useToast } from "./ui/Toast";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { validatePlate } from "../shared/validators";

export default function MyGarage() {
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [userDocs, setUserDocs] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // App control states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  // Document Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{
    vehicleId: string | null; // null if account/user level doc like licence
    documentType: string;
    label: string;
  } | null>(null);
  
  const [fileUrl, setFileUrl] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("B1");

  // Real File Upload States
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // New Vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    plate: "",
    brand: "",
    model: "",
    color: "",
    type: "car" // car or motorcycle
  });

  // Fetch all vehicles and user documents on mount
  const loadGarageData = async () => {
    setIsLoading(true);
    try {
      const vehiclesList = await VehicleService.getVehicles();
      const userDocsList = await VehicleService.getUserDocuments();
      setVehicles(vehiclesList);
      setUserDocs(userDocsList);
      
      // Select the first or active vehicle by default to show details
      if (vehiclesList.length > 0 && !selectedVehicleId) {
        const active = vehiclesList.find(v => v.isActive);
        setSelectedVehicleId(active ? active.id : vehiclesList[0].id);
      }
    } catch (err: any) {
      console.error("[MyGarage] Error rendering garage:", err);
      showToast(err.message || "Error al sincronizar datos de tu garaje", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGarageData();
  }, []);

  // Handle setting a vehicle as active principal
  const handleActivateVehicle = async (id: string) => {
    try {
      await VehicleService.activateVehicle(id);
      showToast("Vehículo principal actualizado", "success");
      await loadGarageData();
    } catch (err: any) {
      showToast(err.message || "Error al activar vehículo", "error");
    }
  };

  // Handle adding a new vehicle
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate || !newVehicle.brand || !newVehicle.color) {
      showToast("La placa, marca y color son campos obligatorios", "error");
      return;
    }

    const plateCheck = validatePlate(newVehicle.plate);
    if (!plateCheck.isValid) {
      showToast("Por favor ingresa una placa colombiana válida (e.g. ABC123 o ABC12A)", "error");
      return;
    }
    // Set type based on vehicle category
    const finalVehicle = {
      ...newVehicle,
      plate: plateCheck.normalized,
      type: plateCheck.isMotorcycle ? "motorcycle" : "car"
    };

    setIsSubmitting(true);
    try {
      const added = await VehicleService.createVehicle(finalVehicle);
      showToast(`Vehículo ${added.plate} agregado exitosamente`, "success");
      setShowAddModal(false);
      
      // Reset form
      setNewVehicle({
        plate: "",
        brand: "",
        model: "",
        color: "",
        type: "car"
      });
      
      setSelectedVehicleId(added.id);
      await loadGarageData();
    } catch (err: any) {
      showToast(err.message || "Error al agregar vehículo", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openUploadModalFor = (vehicleId: string | null, documentType: string, label: string) => {
    setUploadTarget({ vehicleId, documentType, label });
    setFileUrl("");
    setUploadedFileName("");
    setUploadedFileSize(null);
    setUploadStatus("idle");
    setErrorMessage("");
    setShowUploadModal(true);
  };

  // Pre-populate simulated documentation files for ease of testing
  const prefillSimulation = (docType: string) => {
    const randomNum = Math.floor(Math.random() * 900000) + 100000;
    let url = "";
    let name = "";

    if (docType === "license") {
      url = `https://rivo.app/uploads/licenses/LIC-${randomNum}.pdf`;
      name = `LIC-${randomNum}.pdf`;
    } else if (docType === "soat") {
      url = `https://rivo.app/uploads/soat/SOAT-${randomNum}.pdf`;
      name = `SOAT-${randomNum}.pdf`;
    } else if (docType === "property_card") {
      url = `https://rivo.app/uploads/propiedad/CARD-${randomNum}.pdf`;
      name = `PROPIEDAD-${randomNum}.pdf`;
    } else {
      url = `https://rivo.app/uploads/prev/PREV-${randomNum}.pdf`;
      name = `TECNOMECANICA-${randomNum}.pdf`;
    }

    setFileUrl(url);
    setUploadedFileName(name);
    setUploadedFileSize(1250320); // 1.25 MB simulated size
    setUploadStatus("success");
    setErrorMessage("");

    // Set expiration date 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    setExpirationDate(oneYearFromNow.toISOString().split("T")[0]);
  };

  // Real physical document upload handling
  const uploadFileToServer = async (file: File) => {
    // Validations: type and size
    const allowedTypes = [
      "application/pdf", 
      "image/jpeg", 
      "image/jpg", 
      "image/png"
    ];
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus("error");
      setErrorMessage("Formato no permitido. Solo se permiten archivos PDF, JPG, JPEG, PNG.");
      showToast("Formato de archivo inválido. Utilice PDF, JPG, JPEG o PNG.", "error");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadStatus("error");
      setErrorMessage("El archivo excede el tamaño máximo permitido (10 megabytes).");
      showToast("El archivo excede el límite de 10MB.", "error");
      return;
    }

    setUploadStatus("uploading");
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    setErrorMessage("");

    try {
      const result = await VehicleService.uploadFile(file);
      setFileUrl(result.url);
      setUploadedFileName(result.documentName);
      setUploadedFileSize(result.size);
      setUploadStatus("success");
      showToast("Archivo cargado y almacenado correctamente en Rivo", "success");
    } catch (err: any) {
      console.error("[MyGarage] Error uploading file:", err);
      setUploadStatus("error");
      setErrorMessage(err.message || "Fallo en la comunicación con el servidor");
      showToast("Error al cargar el archivo de soporte físico", "error");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileToServer(file);
  };

  // Handle document upload submit
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTarget) return;

    if (!fileUrl) {
      showToast("Por favor carga un archivo de soporte (PDF, JPG, JPEG o PNG)", "error");
      return;
    }

    console.log(`[UPLOAD_START] Registering ${uploadTarget.documentType} for vehicle ID: ${uploadTarget.vehicleId || "user-level"}`, { fileUrl, expirationDate, uploadedFileName });

    setIsSubmitting(true);
    try {
      if (uploadTarget.vehicleId) {
        // Vehicle-level document
        await VehicleService.uploadVehicleDocument(
          uploadTarget.vehicleId,
          uploadTarget.documentType,
          fileUrl,
          expirationDate || undefined,
          undefined, // ocrValidationData
          uploadedFileName || undefined,
          new Date().toISOString()
        );
        showToast("SOAT y datos de validación guardados para revisión", "success");
      } else {
        // User-level document
        await VehicleService.uploadUserDocument(
          uploadTarget.documentType,
          fileUrl,
          expirationDate || undefined,
          { category: licenseCategory },
          uploadedFileName || undefined,
          new Date().toISOString()
        );
        showToast("Licencia de conducir y datos de validación guardados para revisión", "success");
      }
      
      console.log(`[UPLOAD_SUCCESS] Successfully registered ${uploadTarget.documentType} for vehicle ID: ${uploadTarget.vehicleId || "user-level"}`);

      setShowUploadModal(false);
      setFileUrl("");
      setUploadedFileName("");
      setUploadedFileSize(null);
      setUploadStatus("idle");
      setExpirationDate("");
      setUploadTarget(null);
      await loadGarageData();
    } catch (err: any) {
      console.error(`[UPLOAD_FAILED] Failed upload registration:`, err.message || err);
      showToast(err.message || "Error al guardar el documento en el servidor", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string | undefined, docType?: string, rejectReason?: string, expirationDate?: string | Date) => {
    let normalized = (status || "not_uploaded").toLowerCase();
    const isSoat = docType === "soat";
    const isLicense = docType === "license";
    
    if (normalized === "approved" && expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(expirationDate);
      if (expDate < today) {
        normalized = "expired";
      }
    }
    
    switch (normalized) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 size={13} className="text-emerald-500" />
            {isSoat ? "SOAT Aprobado" : isLicense ? "Licencia Aprobada" : "Vigente / Aprobado"}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-xs uppercase tracking-wider">
            <Clock size={13} className="text-amber-500 animate-pulse" />
            {isSoat ? "SOAT Pendiente" : isLicense ? "Licencia Pendiente" : "En verificación"}
          </span>
        );
      case "rejected":
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-bold text-xs uppercase tracking-wider">
              <AlertTriangle size={13} className="text-red-500" />
              {isSoat ? "SOAT Rechazado" : isLicense ? "Licencia Rechazada" : "Rechazado"}
            </span>
            {rejectReason && (
              <p className="text-[10px] text-red-600 font-semibold mt-0.5 max-w-xs italic">
                Motivo: "{rejectReason}"
              </p>
            )}
          </div>
        );
      case "expired":
      case "vencido":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-xs uppercase tracking-wider">
            <AlertTriangle size={13} className="text-rose-500" />
            {isSoat ? "SOAT Vencido" : isLicense ? "Licencia Vencida" : "Vencido"}
          </span>
         );
       default:
         return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-full font-bold text-xs uppercase tracking-wider">
            <AlertCircle size={13} className="text-slate-400" />
            {isSoat ? "SOAT Sin Cargar" : isLicense ? "Licencia Sin Cargar" : "Sin cargar"}
          </span>
        );
    }
  };

  const vehicleDetails = vehicles.find(v => v.id === selectedVehicleId);

  // Helper lists for dynamic documents status rendering
  const requiredVehicleDocs = [
    { type: "soat", label: "SOAT Vigente", desc: "Seguro Obligatorio de Accidentes de Tránsito" },
    { type: "property_card", label: "Tarjeta de Propiedad", desc: "Licencia de Tránsito del Vehículo" },
    { type: "tech_preventive", label: "Preventiva Mecánica", desc: "Revisión preventivo mecánica vigente" }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-500">Cargando tu garaje Rivo...</p>
      </div>
    );
  }

  return (
    <div id="div_my_garage_root" className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Mi Garaje Rivo</h2>
          <p className="text-xs text-slate-500">Administra tus vehículos y documentos oficiales</p>
        </div>
        <Button 
          id="btn_add_vehicle_open"
          size="sm" 
          onClick={() => setShowAddModal(true)}
          className="rounded-xl flex items-center gap-1.5 text-xs font-bold"
        >
          <Plus size={15} />
          Agregar Vehículo
        </Button>
      </div>

      <div className="space-y-6">
        {/* Vehicles Column */}
        <div className="space-y-3">
          {vehicles.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No tienes vehículos registrados</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                Registra al menos un vehículo tipo auto o moto para poder programar tus viajes como conductor.
              </p>
              <Button 
                onClick={() => setShowAddModal(true)}
                size="sm"
                className="rounded-xl font-bold"
              >
                Registrar primer vehículo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4.5 w-full">
              {vehicles.map((v) => {
                const isSelected = selectedVehicleId === v.id;
                return (
                  <div 
                    key={v.id} 
                    id={`vehicle_card_${v.id}`}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`p-6 cursor-pointer border-2 transition-all duration-300 rounded-[28px] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                      isSelected 
                        ? "border-primary bg-gradient-to-br from-indigo-50/20 to-white shadow-xl shadow-indigo-100/30" 
                        : "border-slate-100 hover:border-slate-200 bg-white shadow-sm hover:shadow"
                    }`}
                  >
                    {/* Visual left glowing strip for the active vehicle */}
                    {v.isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-r" />
                    )}

                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      {/* Circle Vehicle Icon */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        v.isActive 
                          ? "bg-primary text-white shadow-lg shadow-primary/25" 
                          : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                      }`}>
                        {v.type === "motorcycle" ? <Bike size={26} /> : <Car size={26} />}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 bg-slate-900 text-white rounded-lg font-mono text-xs tracking-widest font-black uppercase shadow-xs border border-slate-950">
                            {v.plate}
                          </span>
                          {v.isActive && (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Principal Activo
                            </span>
                          )}
                        </div>

                        <p className="font-extrabold text-slate-900 text-lg leading-tight truncate">
                          {v.brand}
                        </p>
                        
                        <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                          <span>Modelo: {v.model || "Sin especificar"}</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            Color: <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: v.color?.toLowerCase() === 'blanco' ? '#fff' : v.color?.toLowerCase() === 'negro' ? '#000' : v.color?.toLowerCase() === 'rojo' ? '#ef4444' : v.color?.toLowerCase() === 'azul' ? '#3b82f6' : '#94a3b8' }} /> {v.color}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Right Block: Status Indicator & Quick Active Button */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          v.verifiedStatus === "approved" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                          v.verifiedStatus === "pending" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                        }`} />
                        <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                          {v.verifiedStatus === "approved" ? "Aprobado" :
                           v.verifiedStatus === "pending" ? "En Revisión" : "Verificaciones"}
                        </span>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        {!v.isActive ? (
                          <button
                            id={`btn_activate_${v.id}`}
                            onClick={() => handleActivateVehicle(v.id)}
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-xl transition-all duration-200 active:scale-95 text-center shadow-2xs cursor-pointer"
                          >
                            Activar como principal
                          </button>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Preestablecido
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Detail & Document Administration */}
        {vehicleDetails && (
          <div className="w-full" id="div_vehicle_documents_section">
            <div className="card-rivo p-6 space-y-6 bg-slate-50/50 border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/60 pb-4 gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Administrar documentos: {vehicleDetails.brand} ({vehicleDetails.plate})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sube y mantén vigentes los requerimientos regulatorios para evitar restricciones de servicio.
                  </p>
                </div>
                {vehicleDetails.verifiedStatus === "pending" && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 max-w-sm">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-900 leading-tight font-medium">
                      Tu vehículo está en revisión. Se habilitará completamente tan pronto aprobemos su documentación reglamentaria.
                    </p>
                  </div>
                )}
              </div>

              {/* Required vehicle document grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Documentación del vehículo</h4>
                <div className="flex flex-col gap-4 w-full">
                  {requiredVehicleDocs.map((reqDoc) => {
                    const document = (vehicleDetails as any).documents?.find(
                      (d: any) => d.documentType === reqDoc.type
                    ) as VehicleDocument | undefined;

                    return (
                      <div 
                        key={reqDoc.type} 
                        id={`doc_block_${reqDoc.type}`}
                        className="bg-white border border-slate-100 p-6 rounded-[24px] flex flex-col md:flex-row md:items-center justify-between gap-5 relative hover:border-slate-200 hover:shadow-xs transition-all"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="p-2.5 bg-indigo-50/70 text-indigo-700 rounded-xl shrink-0">
                              <FileText size={18} />
                            </span>
                            <span className="font-extrabold text-base text-slate-900">
                              {reqDoc.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                            {reqDoc.desc}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 border-t md:border-t-0 border-slate-100/60 pt-3 md:pt-0">
                          <div className="flex flex-col gap-1.5 md:items-end">
                            {getStatusBadge(document?.status, reqDoc.type, document?.rejectReason, document?.expirationDate)}
                            
                            {document && document.expirationDate && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-extrabold">
                                <Calendar size={13} />
                                Vence {new Date(document.expirationDate).toISOString().split("T")[0]}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                            {document?.fileUrl && (
                              <a 
                                href={document.fileUrl} 
                                target="_blank" 
                                referrerPolicy="no-referrer"
                                className="px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-black text-slate-600 flex items-center gap-1.5 justify-center transition-colors min-w-[80px] flex-1 sm:flex-initial"
                              >
                                <ExternalLink size={13} />
                                Copia
                              </a>
                            )}
                            <Button
                              id={`btn_upload_${reqDoc.type}`}
                              variant={document ? "ghost" : "primary"}
                              size="sm"
                              onClick={() => openUploadModalFor(vehicleDetails.id, reqDoc.type, reqDoc.label)}
                              className={`rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-wider min-w-[100px] flex-1 sm:flex-initial ${
                                document ? "text-primary hover:bg-indigo-50/40" : ""
                              }`}
                            >
                              {document ? "Cambiar" : "Cargar"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User General Documents (Licencia de Conducción) */}
        <div className="w-full" id="div_account_documents_section">
          <div className="card-rivo p-6 space-y-6 bg-white border-slate-150">
            <div>
              <h3 className="text-base font-black text-slate-900">
                🪪 Documentos Generales de la Cuenta
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                La licencia de conducción es única por conductor y obligatoria para todos tus vehículos registrados en Rivo.
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-150 p-5 sm:p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 w-full shadow-sm">
              <div className="flex gap-4 items-start flex-1 min-w-0">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div className="space-y-1 pr-2 flex-1 min-w-0">
                  <h4 className="font-extrabold text-slate-800 text-sm">Licencia de Conducción (Pase)</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                    Debe ser de categoría vigente para operar vehículos de servicio o particulares. Sube una foto o copia PDF.
                  </p>
                  
                  {userDocs[0] && userDocs[0].expirationDate && (
                    <div className="mt-2">
                      <p className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-150/60 rounded-xl px-2.5 py-1 inline-flex">
                        <Calendar size={11} className="text-indigo-500" />
                        Vencimiento: {new Date(userDocs[0].expirationDate).toISOString().split("T")[0]}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 w-full md:w-auto border-t md:border-t-0 border-slate-200/60 pt-4 md:pt-0">
                <div className="flex justify-start sm:justify-end shrink-0">
                  {getStatusBadge(userDocs[0]?.status, "license", userDocs[0]?.rejectReason, userDocs[0]?.expirationDate)}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  {userDocs[0]?.fileUrl && (
                    <a 
                      href={userDocs[0].fileUrl} 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-600 flex items-center justify-center shadow-sm shrink-0 transition-all duration-200"
                      title="Ver copia digital del pase"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}

                  <Button
                    id="btn_upload_license"
                    size="default"
                    onClick={() => openUploadModalFor(null, "license", "Licencia de Conducción (Pase)")}
                    className="rounded-2xl font-black text-xs uppercase tracking-wider px-6 flex-1 sm:flex-initial whitespace-nowrap h-11 flex items-center justify-center shadow-md shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 bg-primary text-white"
                  >
                    {userDocs[0] ? "Reemplazar Pase" : "Cargar Pase"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Add Vehicle */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden w-full max-w-md relative z-10 p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Agregar Vehículo</h3>
                  <p className="text-xs text-slate-500">Agrega un auto o una moto a tu garaje corporal</p>
                </div>
                <button 
                  id="btn_add_vehicle_close"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddVehicle} id="form_add_vehicle" className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                      Tipo de vehículo
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewVehicle({...newVehicle, type: "car"})}
                        className={`py-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
                          newVehicle.type === "car" 
                            ? "border-primary bg-indigo-50/10 text-primary" 
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <Car size={18} />
                        <span className="text-xs font-black uppercase tracking-wider">Carro</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewVehicle({...newVehicle, type: "motorcycle"})}
                        className={`py-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
                          newVehicle.type === "motorcycle" 
                            ? "border-primary bg-indigo-50/10 text-primary" 
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <Bike size={18} />
                        <span className="text-xs font-black uppercase tracking-wider">Moto</span>
                      </button>
                    </div>
                  </div>

                  <Input 
                    id="input_add_plate"
                    label="Placa de tránsito"
                    placeholder="E.g. JKA789"
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})}
                    maxLength={10}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    id="input_add_brand"
                    label="Marca"
                    placeholder="E.g. Mazda, Suzuki"
                    value={newVehicle.brand}
                    onChange={(e) => setNewVehicle({...newVehicle, brand: e.target.value})}
                    required
                  />
                  <Input 
                    id="input_add_color"
                    label="Color"
                    placeholder="E.g. Gris, Negro"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({...newVehicle, color: e.target.value})}
                    required
                  />
                </div>

                <Input 
                  id="input_add_model"
                  label="Modelo / Versión (Opcional)"
                  placeholder="E.g. Mazda 3 Grand Touring, GSX-R 150"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                />

                <div className="pt-4 flex gap-3">
                  <Button 
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-2xl py-6"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    id="btn_add_vehicle_submit"
                    type="submit"
                    className="flex-1 rounded-2xl py-6"
                    loading={isSubmitting}
                  >
                    Guardar Vehículo
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Upload Document */}
      <AnimatePresence>
        {showUploadModal && uploadTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden w-full max-w-md relative z-10 p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Cargar {uploadTarget.label}</h3>
                  <p className="text-xs text-slate-500">Completa o simula tu verificación documental</p>
                </div>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Simulation Quick Trigger */}
              <div className="p-4 bg-primary/5 rounded-[2rem] border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <UploadCloud size={16} />
                  <span className="font-extrabold text-xs uppercase tracking-wider">Asistente de Carga</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Rivo te permite simular instantáneamente copias reglamentarias en PDF con fechas de vigencia aleatorias.
                </p>
                <button
                  type="button"
                  id="btn_simulate_document"
                  onClick={() => prefillSimulation(uploadTarget.documentType)}
                  className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-wider text-primary rounded-xl transition-colors mt-1"
                >
                  ⚡ Simular copia digital escaneada
                </button>
              </div>

              <form onSubmit={handleUploadDocument} id="form_upload_document" className="space-y-4 pt-1">
                {/* Visual Drag-and-Drop and File Selection Component */}
                <div className="space-y-1.5" id="document_upload_zone">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Soporte Físico o Archivo Relacionado
                  </label>
                  
                  <div
                    id="document_dropzone"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-primary", "bg-primary/5");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        await uploadFileToServer(file);
                      }
                    }}
                    onClick={() => document.getElementById("input_document_file")?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-primary/60 hover:bg-slate-50/50 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 relative group flex flex-col items-center justify-center space-y-2.5 min-h-[140px]"
                  >
                    <input 
                      type="file"
                      id="input_document_file"
                      accept=".pdf, .jpg, .jpeg, .png"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {uploadStatus === "idle" && (
                      <>
                        <div className="p-3 bg-slate-100 rounded-full text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <UploadCloud size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 leading-tight">
                            Arrastra y suelta tu archivo, o <span className="text-primary hover:underline">explora</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-extrabold mt-1">
                            PDF, JPG, JPEG, PNG (MÁXIMOS 10MB)
                          </p>
                        </div>
                      </>
                    )}

                    {uploadStatus === "uploading" && (
                      <div className="flex flex-col items-center space-y-2.5 w-full">
                        <div className="w-8 h-8 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-extrabold text-primary animate-pulse uppercase tracking-wider">
                            Subiendo documento...
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold truncate max-w-[280px]">
                            {uploadedFileName}
                          </p>
                        </div>
                      </div>
                    )}

                    {uploadStatus === "success" && (
                      <div className="flex flex-col items-center space-y-2.5 w-full">
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                          <CheckCircle2 size={24} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">
                            Cargado con éxito en Rivo
                          </p>
                          <p className="text-[11px] font-bold text-slate-700 truncate max-w-[240px]" title={uploadedFileName}>
                            {uploadedFileName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black">
                            {uploadedFileSize ? `${(uploadedFileSize / (1024 * 1024)).toFixed(2)} MB` : "Soporte Escaneado"} • Almacenado
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadStatus("idle");
                            setFileUrl("");
                            setUploadedFileName("");
                            setUploadedFileSize(null);
                          }}
                          className="text-[10px] font-black text-primary uppercase tracking-wider hover:underline pt-1"
                        >
                          Reemplazar archivo
                        </button>
                      </div>
                    )}

                    {uploadStatus === "error" && (
                      <div className="flex flex-col items-center space-y-2.5 w-full">
                        <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-1 px-4">
                          <p className="text-xs font-black text-rose-600 uppercase tracking-wider">
                            Fallo en la carga
                          </p>
                          <p className="text-[10px] text-rose-500 font-bold leading-normal">
                            {errorMessage}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadStatus("idle");
                          }}
                          className="text-[10px] font-black text-primary uppercase tracking-wider hover:underline pt-0.5"
                        >
                          Reintentar de nuevo
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Keep a hidden input containing the url to bind form validation safely */}
                <input 
                  type="hidden" 
                  id="input_document_url"
                  value={fileUrl}
                  required
                />

                <Input 
                  id="input_document_expiration"
                  label="Fecha de Vencimiento de Tránsito"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />

                {uploadTarget.documentType === "license" && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Categoría de Licencia de Conducción
                    </label>
                    <select
                      id="select_license_category"
                      value={licenseCategory}
                      onChange={(e) => setLicenseCategory(e.target.value)}
                      className="w-full text-xs font-bold bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="A1">A1 (Motocicletas &lt;= 125 c.c.)</option>
                      <option value="A2">A2 (Motocicletas &gt; 125 c.c.)</option>
                      <option value="B1">B1 (Automóviles, camperos particulares)</option>
                      <option value="B2">B2 (Camiones, busetas particulares)</option>
                      <option value="B3">B3 (Vehículos articulados particulares)</option>
                      <option value="C1">C1 (Automóviles o camperos de servicio público)</option>
                      <option value="C2">C2 (Busetas/Camiones público)</option>
                      <option value="C3">C3 (Articulados públicos)</option>
                    </select>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <Button 
                    type="button"
                    variant="secondary"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 rounded-2xl py-6"
                    disabled={isSubmitting}
                  >
                    Atrás
                  </Button>
                  <Button 
                    id="btn_upload_document_submit"
                    type="submit"
                    className="flex-1 rounded-2xl py-6"
                    loading={isSubmitting}
                  >
                    Guardar para Revisión
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
