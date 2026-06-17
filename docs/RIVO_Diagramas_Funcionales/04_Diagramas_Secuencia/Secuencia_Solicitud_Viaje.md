# 🔗 Diagrama de Secuencia - Solicitud de Viaje (Reserva)

Este diagrama UML detalla el flujo de interacciones, pasos atómicos para mitigar la sobreventa concurrente de sillas, control de estados de solicitudes y sincronización posterior mediante polling en Rivo.

---

## 🗺️ 1. Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Pasajero as Pasajero Corporativo
    actor Conductor as Conductor Responsable
    participant Frontend as React App (RouteDetailView)
    participant Backend as RequestRouter / RouteLifecycle
    participant DB as PostgreSQL (Drizzle)

    Pasajero->>Frontend: Presiona "Solicitar Unirse" a Ruta X
    Frontend->>Backend: POST /api/requests { routeId }
    
    Backend->>DB: SELECT available_seats, status FROM routes WHERE id = :routeId FOR UPDATE;
    DB-->>Backend: Retorna datos de ruta con bloqueo de fila
    
    alt Ruta inprogress, completed o cancelada
        Backend-->>Frontend: Retorna HTTP 400: "El viaje ya no está disponible para unirse"
        Frontend->>Pasajero: Alerta Toast
    else Ruta sin asientos disponibles (available_seats <= 0)
        Backend-->>Frontend: Retorna HTTP 400: "Vehículo sin cupos disponibles"
        Frontend->>Pasajero: Alerta Toast
    else Ruta apta para postulación con cupos
        Backend->>DB: INSERT INTO join_requests (route_id, passenger_id, status) VALUES (:routeId, :userId, 'pending');
        DB-->>Backend: Confirma solicitud ingresada
        Backend->>DB: INSERT INTO notifications { type: 'join_requested', user_id: :driverId }
        Backend-->>Frontend: Retorna HTTP 201: { success: true, status: 'pending' }
        Pasajero->>Frontend: Monitorea estado mediante Polling persistente cada 10s
    end
    
    Conductor->>Frontend: Abre bandeja y presiona "Aceptar Silla" del Colaborador
    Frontend->>Backend: POST /api/requests/:requestId/verify { action: 'accept' }
    
    Backend->>DB: Iniciar Transacción con Aislamiento Serializable
    Backend->>DB: SELECT r.available_seats FROM routes r JOIN join_requests j ON j.route_id = r.id WHERE j.id = :requestId FOR UPDATE;
    DB-->>Backend: Retorna asientos disponibles (ej. 2)
    
    alt Asientos disminuyeron a cero por reserva paralela
        Backend->>DB: UPDATE join_requests SET status = 'rejected' WHERE id = :requestId;
        Backend-->>Frontend: Retorna HTTP 400: "Cupos agotados paralelamente"
    else Cupos disponibles confirmados
        Backend->>DB: UPDATE join_requests SET status = 'accepted' WHERE id = :requestId;
        Backend->>DB: UPDATE routes SET available_seats = available_seats - 1 WHERE id = :routeId;
        Backend->>DB: INSERT INTO notifications { type: 'join_approved', user_id: :passengerId }
        Backend->>DB: COMMIT TRANSACTION;
        DB-->>Backend: Transacción confirmada JIT en PostgreSQL
        Backend-->>Frontend: Retorna HTTP 200: { success: true }
        Frontend->>Conductor: Toast de éxito y actualización de UI
    end
```

---

## 📝 2. Explicación de la Lógica Sincronizada

1.  **Bloqueo de Fila Transaccional:** Al forzar un aislamiento estricto en la base Postgres, Rivo erradica inconsistencias que surgen cuando dos pasajeros pujan de manera simultánea por el último boleto libre, garantizando un cupo justo por orden de llegada.
2.  **Notificaciones Proactivas:** Las uniones exitosas disparan la persistencia en las tablas coordinadoras de alertas para que el pasajero reciba la confirmación visible en su siguiente ciclo de polling automático en el frontend.
