# ⚙️ Diagrama de Actividad - Solicitud de Viaje (Reserva)

Este documento describe la lógica de postulación, control de competencia de cupos, asignación atómica de puestos y notificaciones fluidas para coordinar solicitudes de viajes corporativos en Rivo.

---

## 📋 1. Ficha del Proceso de Reserva de Puestos

*   **Objetivo:** Conectar a un pasajero solicitante con el coche del conductor, gestionar las aprobaciones/rechazos y descontar asientos de forma íntegra.
*   **Actores:** Pasajero, Conductor, Servidor, Base de Datos PostgreSQL.
*   **Tablas afectadas:** `join_requests` y `routes`.

---

## 🗺️ 2. Diagrama de Actividad (Mermaid)

```mermaid
flowchart TD
    Start([Pasajero ve ruta y pulsa Reservar]) --> SeatsCheck{¿Hay asientos disponibles en routes?}
    
    SeatsCheck -- No --> AlertNoSeats[Alerta: Sin cupos disponibles] --> End([Proceso Finalizado])
    SeatsCheck -- Sí --> DuplicateCheck{¿Tiene solicitud previa registrada en este viaje?}
    
    DuplicateCheck -- Sí --> AlertDuplicate[Alerta: Ya cuenta con una postulación activa] --> End
    DuplicateCheck -- No --> TransactionStart[Iniciar Transacción SQL con FOR UPDATE]
    
    TransactionStart --> InsertRequest[Insertar fila en join_requests status = 'pending']
    InsertRequest --> LockUnlock[Finalizar Transacción SQL y liberar lock de fila]
    
    LockUnlock --> AlertDriver[Despachar Notificación Toasts al Conductor]
    AlertDriver --> ConductorReview[Conductor ingresa a su panel de control de solicitudes]
    
    ConductorReview --> Veredicto{¿Acepta al colaborador a bordo?}
    
    Veredicto -- No --> RejectAction[Actualizar join_requests status = 'rejected']
    RejectAction --> NotifyPassengerReject[Enviar Toast al Pasajero y notificar estado] --> End
    
    Veredicto -- Sí --> FinalSeatsCheck{¿Aún hay asientos libres en la ruta?}
    
    FinalSeatsCheck -- No --> AutoRejectAndCancel[Marcar estado 'rejected' por sobreventa y alertar] --> End
    
    FinalSeatsCheck -- Sí --> AcceptAction[Actualizar join_requests status = 'accepted']
    AcceptAction --> DecrementSeats[Actualizar routes.available_seats = available_seats - 1]
    DecrementSeats --> NotifyPassengerSuccess[Enviar alerta: Viaje aprobado y programado] --> End
```

---

## 📝 3. Explicación del Flujo Operativo

1.  **Doble Validación:** Se evalúan los cupos disponibles una vez antes de registrar la petición (para dar visual fluida) y una última vez de forma estricta al presionar "Aprobar", blindando al sistema contra sobrecupos eventuales.
2.  **Mitigación de Competencias de Red:** El uso de transacciones con aislamiento y bloqueos a nivel de fila garantiza una sincronización libre de race conditions cotidianas en bases de datos concurrentes.
