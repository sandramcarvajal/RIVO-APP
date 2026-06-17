# 🔗 Diagrama de Secuencia - Aprobación Documental (Auditoría)

Este diagrama UML describe el flujo de peticiones, consumo de binarios y reconciliaciones lógicas requeridas para que la mesa de auditoría del administrador apruebe cargues de documentos viales en Rivo.

---

## 🗺️ 1. Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador de Rivo
    participant Frontend as React App (AdminView)
    participant Backend as ProfileRouter / DocumentValidation
    participant DB as PostgreSQL (Drizzle)

    Admin->>Frontend: Accede a pestaña "Control Documental"
    Frontend->>Backend: GET /api/admin/documents/pending (JWT Bearer)
    
    Backend->>DB: SELECT * FROM user_documents WHERE status = 'pending';
    DB-->>Backend: Colección de licencias de conducir pendientes
    Backend-->>Frontend: Retorna listado estructurado de documentos
    Note over Frontend: Renderiza grilla con enlaces directos a ./uploads
    
    Admin->>Frontend: Presiona verificar y abre visor de imagen/PDF
    Admin->>Frontend: Pulsa botón "Aprobar Documento"
    
    Frontend->>Backend: POST /api/admin/documents/user/:id/verify { action: 'approved' }
    
    Backend->>DB: UPDATE user_documents SET status = 'approved', verified_at = NOW(), verified_by = :adminId WHERE id = :id;
    DB-->>Backend: Fila actualizada con éxito
    
    Backend->>DB: SELECT count(*) FROM user_documents WHERE user_id = :userId AND status != 'approved';
    DB-->>Backend: Conteo de documentos restantes
    
    alt Juego de documentos del Conductor aprobado y completo
        Backend->>DB: UPDATE users SET is_driver_enabled = true WHERE id = :userId;
        DB-->>Backend: Estado de cuenta unificado
        Backend->>DB: INSERT INTO notifications { type: 'driver_active', user_id: :userId }
    end
    
    Backend-->>Frontend: Retorna HTTP 200 { success: true, userDriverStatus: 'enabled' }
    Frontend->>Admin: Actualiza grilla JIT y despacha Toast de éxito
```

---

## 📝 2. Explicación de la Lógica de Negocio

1.  **Doble Entrada de Seguridad:** La base de datos guarda por separado la fecha en la que se habilitó la documentación (`verified_at`) y el identificador administrativo (`verified_by`) responsable del visto bueno para simplificar auditorías de riesgos internos organizacionales.
2.  **Habilitación en Cascada:** Al aprobarse la última credencial obligatoria pendiente de un colaborador, el backend actualiza de manera autogestionada el estatus global del perfil para permitir la creación inmediata de rutas metropolitanas compartidas.
