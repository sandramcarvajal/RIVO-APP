# 🗺️ 06 - BPMN: Proceso General Unificado de Rivo

Este diagrama BPMN de nivel horizontal modela el flujo integrado de negocio cruzando los carriles y responsabilidades secuenciales de todos los participantes de Rivo.

---

## 🗺️ 1. Diagrama de Proceso General (Mermaid BPMN)

```mermaid
graph TD
    %% Definición de Carriles/Sectores (Swimlanes) mediante subgraphs
    subgraph Pasajero [carril: Pasajero Corporativo syc]
        P_Start([Suscito registro]) --> P_Explore[Buscar Rutas en Buscador]
        P_Explore --> P_Postulate[Solicitar Unirse a Viaje]
        P_Postulate --> P_Wait{¿Aprobado?}
        P_Wait -- No/Rejected --> P_Explore
        P_Wait -- Sí/Accepted --> P_JoinRoute[Embarcar en Coche]
        P_JoinRoute --> P_Travel[Transitar Trayecto]
        P_Travel --> P_EndRating[Calificar en RatingModal]
        P_EndRating --> P_Finish([Fin del Proceso de Pasajero])
    end

    subgraph Conductor [carril: Conductor de Carpooling]
        C_Start([Inicio]) --> C_Garage[Registrar Coche en MyGarage]
        C_Garage --> C_Upload[Cargar SOAT + Licencia]
        C_Upload --> C_WaitAdmin{¿Aprobado?}
        C_WaitAdmin -- No --> C_Garage
        C_WaitAdmin -- Sí --> C_CreateRoute[Programar Ruta de Carpooling]
        C_CreateRoute --> C_ReceiveReq[Recibir Solicitudes de Socios]
        C_ReceiveReq --> C_Verdict[Aceptar / Rechazar Pasajeros]
        C_Verdict --> C_StartDrive[Prender Marcha e Iniciar Trayecto]
        C_StartDrive --> C_EndDrive[Finalizar Trayecto]
    end

    subgraph Administrador [carril: Administrador / Soporte]
        A_Inbox([Ingreso a Consola]) --> A_AuditVeh[Revisar Registro Vehicular]
        A_AuditVeh --> A_AuditDocs[Revisar SOAT e imágenes físicas]
        A_AuditDocs --> A_Verify{¿Vigente y Correcto?}
        A_Verify -- No --> A_Reject[Registrar Motivo Descarte] --> C_WaitAdmin
        A_Verify -- Sí --> A_Approve[Actualizar status: approved] --> C_WaitAdmin
    end

    %% Conexiones cruzadas entre carriles
    C_Upload --> A_AuditVeh
    A_Approve -.-> C_CreateRoute
    C_CreateRoute -.-> P_Explore
    P_Postulate --> C_ReceiveReq
    C_Verdict -.-> P_Wait
    C_StartDrive -.-> P_JoinRoute
    C_EndDrive -.-> P_EndRating
```

---

## 📝 2. Explicación del Tránsito Corporativo

1.  **Colaboración de Carriles:** El BPMN demuestra visualmente cómo el viaje depende de aprobaciones sistemáticas mutuas para el correcto engranaje de la plataforma de carpooling de SYC.
2.  **Soporte Operativo Activo:** El carril administrativo custodia las precondiciones legales, mientras que las operaciones cotidianas de creación y reserva viales fluyen de extremo a extremo sin demandar intervención sistemática rutinaria.
