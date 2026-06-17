# 🗺️ BPMN - Validación Documental (Auditoría Técnica)

Este documento modela las compuertas, tareas secuenciales, control y flujos de mitigación jurídica llevados a cabo al auditar un portafolio documental (SOAT y Licencia de Conducir) en Rivo.

---

## 🗺️ 1. Diagrama del Subproceso (Mermaid BPMN)

```mermaid
graph TD
    %% Flujo de Tareas por Carriles Técnicos
    subgraph AdminConsole [carril: Panel de Administrador / AdminView]
        D_Start([Seleccionar Auditoría Documental]) --> D_ReviewDocs[Cargar Bandeja de Pendientes]
        D_ReviewDocs --> D_OpenLightbox[Abrir Previsualizador Integrado]
        D_OpenLightbox --> D_CheckSOAT{¿Validar Vigencia SOAT?}
        
        D_CheckSOAT -- Expirado --> D_RejectSOAT[Marcar SOAT Rechazado]
        D_CheckSOAT -- Vigente --> D_CheckLic{¿Validar Licencia?}
        
        D_CheckLic -- Expirado / Categoría Errnea --> D_RejectLic[Marcar Licencia Rechazada]
        D_CheckLic -- Vigente --> D_ApproveSet[Aprobar Expediente Unificado]
    end

    subgraph ServerDatabase [carril: Backend Express - PostgreSQL]
        S_UpdateReject[Actualizar Documento status = rejected] --> S_AlertToast[Notificar al Empleado Novedades]
        S_ApproveDoc[Actualizar Documento status = approved] --> S_DriverEvaluation{¿Suficientes Docs Habilitados?}
        
        S_DriverEvaluation -- No --> S_PartialToast[Registrar Aprobado Parcial]
        S_DriverEvaluation -- Sí --> S_UpdateUserRole[Promover users.is_driver_enabled = true]
    end

    %% Conexiones cruzadas corporativas
    D_RejectSOAT --> S_UpdateReject
    D_RejectLic --> S_UpdateReject
    D_ApproveSet --> S_ApproveDoc
    S_UpdateUserRole -.-> D_End([Fin de la Auditoría Técnica])
```

---

## 📝 2. Explicación de las Tareas de Control

1.  **Evaluaciones Secuenciales Mandatorias:** El administrador sigue un orden lógico: primero valida el SOAT del auto (requerido para cobertura en caso de incidentes) y posteriormente la idoneidad legal individual del conductor (Licencia).
2.  **Automatización de Elevación de Rol:** El backend calcula de manera atómica si el nuevo aprobado completa el portafolio, promoviendo al colaborador al rol Conductor al instante sin necesidad de clics complementarios por parte de la mesa de soporte.
