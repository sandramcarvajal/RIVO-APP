# 🗺️ BPMN - Registro del Conductor (Habilitación Vial)

Este documento detalla el subproceso BPMN para registrar y dar de alta a un Conductor Corporativo en Rivo, incorporando las tareas, compuertas lógicas y controles cruzados de seguridad y tránsito.

---

## 🗺️ 1. Diagrama del Subproceso (Mermaid BPMN)

```mermaid
graph TD
    %% Roles y Responsabilidades Representadas por Flujos Horizontales
    subgraph Colaborador [carril: Colaborador Registrado syc]
        T_RegUser([Inicio]) --> T_OpenProfile[Ingresar a Perfil de Cuenta]
        T_OpenProfile --> T_RegMotoCar[Completar Datos del Vehículo]
        T_RegMotoCar --> T_UploadLic[Adjuntar Licencia de Conducción]
        T_UploadLic --> T_UploadSOAT[Adjuntar SOAT Vigente]
        T_UploadSOAT --> T_WaitFeedback{¿Recibió aprobado?}
        T_WaitFeedback -- No / Rechazado --> T_Correction[Revisar motivo y re-subir documento] --> T_OpenProfile
        T_WaitFeedback -- Sí / Aprobado --> T_ActiveDriver[Habilitado para Publicar Rutas] --> T_EndCond([Fin del Registro])
    end

    subgraph BackendRivo [carril: Motor Correlacional Backend]
        B_OCR[Escanear Doc mediante OCR] --> B_PlateValidation{¿Placa Cumple Regex?}
        B_PlateValidation -- No --> B_AutoReject[Auto-Rechazo Formato Placa] --> T_WaitFeedback
        B_PlateValidation -- Sí --> B_PersistPending[Persistir Documentos con status pending]
    end

    subgraph Administrador [carril: Coordinadora de Seguridad SYC]
        A_Notify([Recibe Notificación]) --> A_OpenDoc[Visualizar Copia en Panel de Control]
        A_OpenDoc --> A_VerifyDocs{¿Legible, Válido y Vigente?}
        A_VerifyDocs -- No --> A_RejectClick[Presionar Rechazar e Ingresar Novedad] --> T_WaitFeedback
        A_VerifyDocs -- Sí --> A_ApproveClick[Presionar Aprobar Documento] --> T_WaitFeedback
    end

    %% Flujos de Control entre Carriles
    T_UploadSOAT --> B_OCR
    B_PersistPending -.-> A_Notify
    A_RejectClick -.-> B_PersistPending
    A_ApproveClick -.-> B_PersistPending
```

---

## 📝 2. Explicación de los Elementos del Subproceso

1.  **Validaciones Tipo Regex:** Reduce la carga al evitar que placas inexistentes o que no correspondan con la nomenclatura colombiana viales colapsen el buzón de la mesa de control del administrador.
2.  **Transparencia de Feedback:** En caso de rechazo, se interrumpe la transición del rol del colaborador, evitando que ofrezca plazas viales hasta que se realicen las acciones correctivas pertinentes.
