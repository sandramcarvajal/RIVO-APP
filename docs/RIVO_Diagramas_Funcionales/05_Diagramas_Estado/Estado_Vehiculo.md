# 🔄 Diagrama de Estado - Vehículo (Vehicles)

Este documento modela el ciclo de vida de los vehículos que los conductores registran e inscriben en el garaje general corporativo de Rivo.

---

## 🗺️ 1. Máquina de Estados del Vehículo (Mermaid)

```mermaid
stateDiagram-v2
    [*] --> Pendiente : Registro inicial en "Mi Garaje" (Plate, Brand, Model, Type)
    
    Pendiente --> EnAuditoria : Sube imágenes/PDF de SOAT viales
    
    state EnAuditoria {
        [*] --> EvaluandoPlaca : Validador Regex de Matrícula Colombiana
        EvaluandoPlaca --> EvaluandoSOAT : Cotejo visual del documento cargado
    }
    
    EnAuditoria --> Aprobado : Documentación completa, legible y vigente (verified_status = 'approved')
    EnAuditoria --> Rechazado : Inconsistencia o SOAT vencido (verified_status = 'rejected')
    
    Aprobado --> RutaAsociada : Conductor crea trayecto con este vehículo
    RutaAsociada --> Aprobado : Viaje concluido, vehículo regresa al Garaje
    
    Rechazado --> Pendiente : Re-carga de tarjeta de propiedad o SOAT corregido
    
    Aprobado --> Obsoleto : Póliza de seguro expira en America/Bogota o venta de coche
    Obsoleto --> Pendiente : Actualización y re-validación administrativa
    
    Rechazado --> [*] : Vehículo desvinculado por eliminación del usuario
    Obsoleto --> [*]
```

---

## 📝 2. Explicación de los Estados Viales

1.  **Pendiente (`pending`):** Estado inicial temporal de registro. Mientras persista bajo esta condición en base, Rivo invalida en backend cualquier llamado REST para programar trayectos con este vehículo.
2.  **Aprobado (`approved`):** El coche es certificado por el administrador. Habilita los llamados del creador de rutas lógicas y desactiva las alarmas de flota del dashboard del colaborador.
3.  **Rechazado (`rejected`):** Almacena de manera obligatoria una justificación técnica o de legibilidad de pólizas, informando al usuario en su sección de garaje para corregir su estatus de tránsito corporativo.
