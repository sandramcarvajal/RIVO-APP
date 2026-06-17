# ⚙️ Diagrama de Actividad - Moderación de Reportes

Este documento aborda las políticas de gobernanza, resolución de incidentes metropolitanos y logs de auditoría interna de control en el ecosistema Rivo.

---

## 📋 1. Ficha de Moderación y Gobernanza

*   **Objetivo:** Solucionar y catalogar controversias de uso, comportamientos inadecuados o imprudencias de conducción reportadas de forma directa.
*   **Actores:** Pasajero/Conductor denunciante, Administrador, Sistema de Auditoría.
*   **Entidades base:** `reports` y `admin_logs`.

---

## 2. Diagrama de Actividad (Mermaid)

```mermaid
flowchart TD
    Start([Colaborador decide reportar conducta]) --> SubmitReport[Suministrar contraparte, tipo y alegato en el formulario]
    SubmitReport --> InsertReport[Registrar fila en reports status = 'pending']
    
    InsertReport --> AlertNotify[Alerta visual al Administrador en la pestaña Moderación]
    AlertNotify --> OpenReport[Administrador selecciona caso para investigar]
    
    OpenReport --> UpdateReviewing[Cambiar report status = 'reviewing']
    UpdateReviewing --> CheckEvidence[Analizar historial, calificaciones y comentarios del acusado]
    
    CheckEvidence --> Resolution{¿Veredicto final?}
    
    Resolution -- Descartar Denuncia --> DismissCase[Cambiar report status = 'dismissed']
    DismissCase --> CreateAuditLogD[Insertar admin_logs: Incidencia desestimada] --> ClosedState
    
    Resolution -- Sancionar Usuario --> PenalizeUser[Proceder con Sanción]
    PenalizeUser --> SetSeverity{¿Severidad de la infracción?}
    
    SetSeverity -- Advertencia --> WarnUser[Mantener cuenta activa, restar puntos del rating]
    WarnUser --> ResolveCase
    
    SetSeverity -- Bloqueo Permanente --> SuspendUser[Cambiar users.is_disabled = true]
    SuspendUser --> TerminateRutas[Cancelar JIT de rutas que el suspendido ofrezca]
    TerminateRutas --> ResolveCase
    
    ResolveCase[Cambiar report status = 'resolved']
    ResolveCase --> CreateAuditLogS[Insertar admin_logs: Sanción impuesta] --> ClosedState
    
    ClosedState([Fin del incidente: Caso cerrado])
```

---

## 📝 3. Explicación de la Gobernanza Rivo

1.  **Transparencia de Auditoría (`admin_logs`):** Cualquier veredicto administrativo queda registrado de forma indeleble en una bitácora de auditoría inalterable del backend, documentando qué administrador resolvió qué caso y qué sanciones fueron impuestas.
2.  **Mitigación de Efecto Cascada:** Si un conductor problemático es desactivado administrativamente, el motor de Rivo cancela condicional y atómicamente todos sus viajes agendados en estado `scheduled`, notificando instantáneamente a los pasajeros postulados para que agenden rutas alternas de inmediato.
