# 🚗 01 - RIVO: Arquitectura General del Sistema

Este documento describe la arquitectura global, el flujo macro, el ecosistema técnico, los canales de datos y las salvaguardas transaccionales que integran a **Rivo** en su operación unificada con base de datos PostgreSQL.

---

## 📐 1. Diagrama de Capas de Rivo

El siguiente esquema muestra el desacoplamiento de capas del monolito desde la interfaz en React SPA hasta el motor relacional de datos:

```mermaid
graph TD
    subgraph Capa_Cliente [Capa de Cliente - React SPA]
        A[Vistas SPA / Views] --> B[React Hooks & State]
        B --> C[Auth Context & App Store]
        C --> D[SecureHttpClient - Axios]
    end

    subgraph Capa_Servidor [Capa del Servidor - Node.js Express]
        E[HTTP Route Interceptor] --> F[Auth / Role Middleware]
        F --> G[Domain Use Cases / Routers]
        G --> H[Normalization & Validators]
    end

    subgraph Capa_Datos [Capa de Persistencia & Datos]
        I[Drizzle ORM Engine] --> J[(PostgreSQL Database)]
    end

    D -- "Peticiones HTTP REST / JSON" --> E
    H --> I
```

---

## 🔄 2. Flujo Macro de Comunicación y Sincronización

La sincronización de la plataforma opera mediante un **Polling Centralizado** en el frontend que mantiene el estado actualizado de uniones, alertas y viajes sin incurrir en deudas técnicas de conectividad de sockets en infraestructuras restringidas.

```mermaid
sequenceDiagram
    autonumber
    participant Cliente as React SPA (useRoutes / getNotifications)
    participant Backend as Express Engine (API Routes)
    participant Database as PostgreSQL (Drizzle)

    loop Cada 10 Segundos (Frecuencia Polling)
        Cliente->>Backend: GET /api/routes/active-requests (Bearer Token JWT)
        Backend->>Database: SELECT * FROM join_requests WHERE user_id = :id;
        Database-->>Backend: Registros de solicitudes asignadas
        Backend-->>Cliente: Response JSON (Estados: pending, accepted, rejected)
        Note over Cliente: UI se re-dibuja de forma reactiva ante cambios
        
        Cliente->>Backend: GET /api/notifications/unread
        Backend->>Database: SELECT * FROM notifications WHERE user_id = :id AND is_read = false;
        Database-->>Backend: Listado de alertas pendientes
        Backend-->>Cliente: Response JSON con contadores de Toasts
    end
```

---

## 🔒 3. Control de Condiciones de Carrera (Race Conditions)

En sistemas de alta demanda de movilidad, la sobreventa de cupos es una falla que Rivo erradica mediante bloqueos de fila a nivel relacional en PostgreSQL.

```mermaid
sequenceDiagram
    autonumber
    actor PasajeroA as Pasajero A (Último Cupo)
    actor PasajeroB as Pasajero B (Último Cupo)
    participant Servidor as Express Transaction Handler
    participant DB as PostgreSQL Engine

    PasajeroA->>Servidor: POST /api/requests (Unirse a Ruta X)
    PasajeroB->>Servidor: POST /api/requests (Unirse a Ruta X)
    
    Note over Servidor: El Servidor abre dos transacciones concurrentes
    
    Servidor->>DB: BEGIN TRANSACTION (Pasajero A)
    Servidor->>DB: BEGIN TRANSACTION (Pasajero B)
    
    Servidor->>DB: SELECT available_seats FROM routes WHERE id = X FOR UPDATE (Pasajero A)
    Note over DB: PostgreSQL bloquea la fila de la ruta X para cambios externos
    
    Servidor->>DB: SELECT available_seats FROM routes WHERE id = X FOR UPDATE (Pasajero B)
    Note over DB: El Pasajero B entra en fila de espera de liberación del Lock de fila
    
    Note over DB: Pasajero A ve disponible_seats = 1. Procede.
    Servidor->>DB: UPDATE routes SET available_seats = available_seats - 1 WHERE id = X (Pasajero A)
    Servidor->>DB: INSERT INTO join_requests (PassengerA, status='accepted')
    Servidor->>DB: COMMIT (Pasajero A)
    Note over DB: Fila Liberada. El Pasajero B es procesado con el valor actualizado
    
    Note over DB: Pasajero B lee el nuevo valor de available_seats = 0. Error.
    Servidor->>DB: ROLLBACK (Pasajero B)
    Servidor-->>PasajeroB: HTTP 400 - "Vehículo sin cupos disponibles"
    Servidor-->>PasajeroA: HTTP 201 - "Postulación confirmada con éxito"
```

### Explicación del Blindaje Transaccional:
1.  **`FOR UPDATE`:** Esta directiva bloquea las tuplas seleccionadas de la tabla `routes` hasta que termine la transacción en curso.
2.  **Aislamiento:** Evita lecturas sucias (*dirty reads*), garantizando que si dos peticiones entran con milisegundos de diferencia para el último asiento libre, sólo una de ellas alcance a decretar la confirmación del viaje.
