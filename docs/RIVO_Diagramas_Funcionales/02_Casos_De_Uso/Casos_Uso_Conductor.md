# 🚗 Casos de Uso del Rol - Conductor (Driver)

Este documento detalla de manera estructurada los casos de uso específicos del colaborador que utiliza Rivo en calidad de **Conductor**,
 publicando sus vehículos y programando trayectos viales para sus compañeros de SYC.

---

## 🎭 1. Casos de Uso de Conductor en Rivo

```mermaid
fcg [Casos de Uso - Conductor]
left to right direction

actor Conductor as "Conductor Corporativo"

rectangle "Sistema Rivo (Módulo de Conductores)" {
    usecase UC_RegVehicle as "Registrar Vehículos"
    usecase UC_UploadDocs as "Cargar SOAT / Licencia / Tecno"
    usecase UC_CreateRoute as "Crear e Instanciar Ruta"
    usecase UC_ManageJoin as "Gestionar Solicitudes (Aceptar/Rechazar)"
    usecase UC_StartRoute as "Iniciar Trayecto de Viaje"
    usecase UC_History as "Visualizar Historial de Ofrecidos"
    usecase UC_Profile as "Gestionar Perfil e Información"
    
    usecase UC_CheckPicoYPlaca as "Validación Cruce de Pico y Placa"
    usecase UC_CheckStatus as "Verificación Vial Administrativa"
}

Conductor --> UC_RegVehicle
Conductor --> UC_UploadDocs
Conductor --> UC_CreateRoute
Conductor --> UC_ManageJoin
Conductor --> UC_StartRoute
Conductor --> UC_History
Conductor --> UC_Profile

UC_CreateRoute ..> UC_CheckPicoYPlaca : <<include>>
UC_CreateRoute ..> UC_CheckStatus : <<include>>
```

---

## 📋 2. Detalle de Casos de Uso Críticos

### UC-CON-01: Registrar Vehículos y Cargar Documentación
*   **Actor Principal:** Conductor Corporativo.
*   **Precondiciones:** Acceso al panel de perfil del colaborador.
*   **Efecto en Sistema:** Registra datos del carro/moto en la tabla `vehicles`. Se suben licencias e imágenes físicas de 
SOAT/Tecnomecánica archivándose en `./uploads`. Los estados inician en `pending`.
*   **Restricción Operativa:** El conductor no podrá ofrecer rutas viales asociadas a un vehículo que se encuentre en estado 
`pending` o `rejected`.

### UC-CON-02: Crear e Instanciar Ruta (Check Pico y Placa)
*   **Actor Principal:** Conductor Corporativo.
*   **Precondiciones:** Registro de vehículo con estatus `approved` y al menos un documento del conductor verificado positivamente.
*   **Flujo de Verificaciones Automáticas:**
    1. El conductor suministra coordenadas de traza, hora (`America/Bogota`) y fecha de salida del carpooling.
    2. El sistema extrae el último dígito de la placa del vehículo activo.
    3. **Evaluación de Restricciones (Bucaramanga, Floridablanca, Girón, Piedecuesta):** Si el dígito califica con prohibición para
     la zona metropolitana ese día y franja horaria colombiana, se cancela la inserción retornando una alerta restrictiva.
    4. Si está libre de Pico y Placa, la ruta es registrada exitosamente en estado `scheduled`.

### UC-CON-03: Gestionar Solicitudes de Unión
*   **Actor Principal:** Conductor Corporativo.
*   **Precondiciones:** Recibo de notificaciones de colaboradores para unirse a un viaje agendado.
*   **Acciones:**
    *   **Aprobar:** Cambia la solicitud del pasajero a `accepted`. El sistema actualiza en Drizzle el campo restándole una plaza libre
     a la ruta (`available_seats = available_seats - 1`).
    *   **Rechazar:** Cambia el estado del caso a `rejected`. El cupo potencial se mantiene liberado para ser agendado por otro 
    usuario corporativo.
