# 🗺️ BPMN - Ejecución de Viaje Completo (Viaje Seguro)

Este subproceso modela de manera exhaustiva el recorrido y coordinación de un trayecto desde que el vehículo se encuentra con tripulación asignada hasta su arribo de destino corporativo en Rivo.

---

## 🗺️ 1. Diagrama del Subproceso (Mermaid BPMN)

```mermaid
graph TD
    %% Carriles de Coordinación Vial
    subgraph PasajeroCorp [carril: Pasajero Corporativo aboard]
        P_AtPickup([Llega a punto de encuentro]) --> P_Board[Abordar Carro]
        P_Board --> P_AlertSecurity[Monitorear Detalles del Vehículo y de Contacto]
        P_AlertSecurity --> P_Arrive[Llega a su destino de trayecto]
        P_Arrive --> P_OpenRatingModal[Ejecutar Evaluación de la Comunidad]
        P_OpenRatingModal --> P_SubmitStars[Someter Calificación 1-5 estrellas] --> P_EndViaje([Fin del Viaje])
    end

    subgraph ConductorCarpool [carril: Conductor de Carpooling]
        C_CheckBoard([Llega a punto de encuentro]) --> C_StartDrive[Confirmar Abordajes e Iniciar Viaje]
        C_StartDrive --> C_Transit[Circular Rutas Metropolitanas]
        C_Transit --> C_EndDrive[Marcar Ruta Finalizada]
    end

    subgraph BackendRivo [carril: Backend Express - Engine]
        B_WaitTransit[status = in_progress] --> B_CloseReserves[Cerrar de forma rígida cancelaciones y uniones]
        B_CloseReserves --> B_AutoFinalizer{¿Rebasó límite de tiempo 3 horas?}
        B_AutoFinalizer -- Sí / Conductor olvidó marcar fin --> B_ForceCompleted[Auto-Finalizar status = completed]
        B_AutoFinalizer -- No --> B_WaitManualFinish[Esperar llamado Finalizar Conductor]
        B_WaitManualFinish --> B_StoreMetrics[Computar CO2 Mitigado, Ocupación y Rating]
        B_ForceCompleted --> B_StoreMetrics
    end

    %% Enlaces de Coordinación
    C_StartDrive --> B_WaitTransit
    C_EndDrive --> B_WaitManualFinish
    B_StoreMetrics -.-> P_OpenRatingModal
```

---

## 📝 2. Explicación del Tránsito Compartido

1.  **Cierre Inmediato de Reservas:** Al cambiar el viaje al estado `in_progress`, el sistema blinda al vehículo de reservas tardías no coordinadas en el tramo de circulación vial de SYC.
2.  **Resiliencia Analítica (Auto-Finalizer):** Para evitar que viajes queden estancados de forma indeterminada distorsionando las estadísticas ejecutivas corporativas de carpooling, el auto-finalizador JIT concilia el trayecto de manera autónoma.
3.  **Encadenamiento de Evaluación:** Sanciona o fortalece la reputación comunitaria de los choferes mediante la acumulación de ponderados de estrellas recogidos por el `RatingModal`.
