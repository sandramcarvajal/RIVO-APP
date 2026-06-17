# ⚙️ Diagrama de Actividad - Aprobación Documental (Auditoría)

Este documento detalla el control, verificación cruzada y aprobación requerida para habilitar las credenciales (SOAT, Licencia y Tecno) de los conductores en Rivo.

---

## 📋 1. Ficha del Proceso de Auditoría Documental

*   **Objetivo:** Garantizar que ningún conductor circule en la plataforma sin contar con documentos estatales aprobados y vigentes.
*   **Actores:** Administrador, Servidor Backend, PostgreSQL.
*   **Tablas involucradas:** `user_documents` y `vehicle_documents`.

---

## 🗺️ 2. Diagrama de Actividad (Mermaid)

```mermaid
flowchart TD
    Start([Conductor sube foto/PDF de documento]) --> OCRStart[Procesar Lectura OCR de Imagen]
    
    OCRStart --> ExtractData[Extraer placa, licencia, vigencia y categorizar]
    ExtractData --> SaveDB[Persistir con estatus pending en PostgreSQL]
    
    SaveDB --> AlertAdmin[Aparece notificación en Tablero de Control de Admin]
    AlertAdmin --> LoadPanel[Administrador ingresa a Control Documental]
    
    LoadPanel --> OpenViewer[Abre Previsualizador de Archivos PDF/Imágenes]
    OpenViewer --> VerifyData{¿Los datos legibles corresponden al formulario físico?}
    
    VerifyData -- No --> RejectDocs[Emitir Rechazo]
    
    VerifyData -- Sí --> DateCheck{¿Fecha de Expiración está vigente en America/Bogota?}
    
    DateCheck -- No --> RejectDocs
    DateCheck -- Sí --> CategoryCheck{¿Categoría de Licencia corresponde al Vehículo registrado?}
    
    CategoryCheck -- No --> RejectDocs
    CategoryCheck -- Sí --> ApproveDocs[Emitir Aprobación]
    
    RejectDocs --> SpecifyReason[Seleccionar código de motivo e ingresar observación]
    SpecifyReason --> SaveReject[Actualizar Documento status = 'rejected']
    SaveReject --> NotifyReject[Despachar alerta de re-carga e inhabilitar conductor] --> End([Fin del Proceso])
    
    ApproveDocs --> SaveApprove[Actualizar Documento status = 'approved']
    SaveApprove --> CheckFullSet{¿Conductor tiene SOAT + Licencia habilitados?}
    
    CheckFullSet -- No --> NotifyApprovePartial[Aviso: Documento aprobado. Faltan complementarios para activar] --> End
    CheckFullSet -- Sí --> EnableDriver[Habilitar rol Conductor - Vehículo activo para programar rutas]
    EnableDriver --> NotifyFullCheck[Notificar: ¡Felicidades! Su perfil vial ha sido activado] --> End
```

---

## 📝 3. Explicación del Flujo Operativo

1.  **Asistencia OCR:** Agiliza el alta de datos leyendo y contrastando fechas clave, minimizando errores de transcripción manual del conductor.
2.  **Seguridad Pasiva:** Las verificaciones viales cruzadas garantizan que si un conductor tiene una moto, su licencia sea de categoría `A2` y no exclusivamente `B1` (que es únicamente apta para automóviles).
3.  **Auditoría de Rechazo:** Todo rechazo exige la entrega obligatoria de una razón descriptiva para guiar al colaborador en la re-carga exitosa de su copia documental.
