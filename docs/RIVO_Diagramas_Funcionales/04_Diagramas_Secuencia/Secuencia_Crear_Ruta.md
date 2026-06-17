# 🔗 Diagrama de Secuencia - Creación de Ruta

Este diagrama UML describe el flujo temporal, la zona horaria colombiana, las llamadas al caso de uso de verificación de Pico y Placa y la inserción final en la base relacional de datos de las rutas viales en Rivo.

---

## 🗺️ 1. Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Conductor as Conductor Corporativo
    participant Frontend as React App (CreateRouteView)
    participant Backend as RouteRouter / SearchRoutes
    participant Policy as BucaramangaMetroPolicy
    participant DB as PostgreSQL (Drizzle)

    Conductor->>Frontend: Ingresa datos, vehículo y horario de salida
    Frontend->>Frontend: Valida campos completos y fecha futura
    
    Frontend->>Backend: POST /api/routes {origin, destination, vehicleId, departureTime, ...}
    
    Backend->>DB: SELECT * FROM vehicles WHERE id = :vehicleId AND user_id = :userId;
    DB-->>Backend: Registra vehículo (verified_status, plate, type)
    
    alt Vehículo no está aprobadoadministrativamente
        Backend-->>Frontend: Retorna HTTP 400: "Vehículo requiere aprobación previa"
        Frontend->>Conductor: Alerta visual Toast
    else Vehículo aprobado
        Backend->>Policy: evaluateCirculation(plate, departureTime in America/Bogota)
        Note over Policy: Compara dígito final de placa contra calendario metropolitano
        
        alt Infracciona restricción Pico y Placa del AMB
            Policy-->>Backend: Retorna { canCirculate: false, reason: "Pico y Placa Bucaramanga" }
            Backend-->>Frontend: Retorna HTTP 400: "Tránsito restringido por Pico y Placa"
            Frontend->>Conductor: Muestra Dialog de Advertencia vial
        else Permisión de circulación exitosa
            Policy-->>Backend: Retorna { canCirculate: true }
            Backend->>DB: INSERT INTO routes (driver_id, origin, destination, vehicle_id, available_seats, status, departure_time) VALUES ($1,$2,$3,$4,$5,'scheduled',$6) RETURNING id;
            DB-->>Backend: Confirma ID de la Ruta agendada con éxito
            Backend-->>Frontend: Retorna HTTP 201: { success: true, routeId }
            Frontend->>Conductor: Toast: Ruta agendada. Redirige a detalle del viaje
        end
    end
```

---

## 📝 2. Detalle de Integración del Sistema

1.  **Validaciones Tipo Servidor:** Las restricciones estatales no se confían a la capa visual del cliente, debido a que horarios falsificados en la laptop del usuario podrían bypassar localmente los controles. Se validan con precisión de reloj en el micro-motor de la clase `CheckCirculation`.
2.  **Mitigación de Errores de Zonas de Servidores:** El backend traduce JIT los formatos UTC de heroku, aws o nube al huso horario metropolitano (`America/Bogota`) antes de procesar las comparencias de tránsito locales.
