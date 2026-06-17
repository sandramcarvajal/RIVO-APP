# 👑 Casos de Uso del Rol - Administrador / Admin Master

Este documento examina las acciones facultadas para los roles administrativos en Rivo, diferenciando los límites operativos normales
 de las prerrogativas reservadas al **Admin Master**.

---

## 🎭 1. Casos de Uso Administrativos en Rivo

```mermaid
flowchart LR
    Admin["👤 Administrador Estándar"]
    Master["👑 Administrador Master"]

    subgraph Sistema ["Sistema Rivo (Módulo de Administración)"]
        UC_CreateUser(["Alta Directa de Usuarios"])
        UC_EditUser(["Editar Datos de Colaboradores"])
        UC_SuspUser(["Suspender / Reactivar Cuentas"])
        UC_VerifyVeh(["Aprobar / Rechazar Vehículos"])
        UC_AuditDocs(["Auditoría de SOAT y Licencias"])
        UC_Moderate(["Moderar Denuncias e Incidentes"])
        UC_Analytics(["Monitorear Analítica Metropolitana"])
        UC_Reports(["Exportar Reportes Ejecutivos (PDF/Excel)"])
        UC_RoleElevation(["Elevación y Asignación de Roles"])
    end

    Admin --> UC_CreateUser
    Admin --> UC_EditUser
    Admin --> UC_SuspUser
    Admin --> UC_VerifyVeh
    Admin --> UC_AuditDocs
    Admin --> UC_Moderate
    Admin --> UC_Analytics
    Admin --> UC_Reports

    Master --> Admin
    Master --> UC_RoleElevation
```

---

## 📋 2. Detalle de Casos de Uso Críticos

### UC-ADM-01: Audit Documental (Aprobar / Rechazar SOAT y Licencias)
*   **Actor Principal:** Administrador Estándar / Master.
*   **Precondiciones:** Existencia de documentos cargados por conductores en estatus `pending`.
*   **Efecto en Sistema:** El administrador visualiza físicamente el archivo cargado en un modal web dedicado. Si presiona aprobar, actualiza la base a `approved` permitiendo habilitar la oferta del conductor. Si rechaza, provee la observación, notificando al empleado de inmediato por Toasts y bandeja física.

### UC-ADM-02: Alta Directa y Edición de Colaboradores
*   **Actor Principal:** Administrador Estándar / Master.
*   **Precondiciones:** El administrador debe contar con los privilegios comprobados en el Bearer.
*   **Características:**
    *   Permite sortear el auto-registro normal registrando directamente cuentas corporativas validadas.
    *   Modifica nombres, credenciales y estados a nivel de la entidad `users`.

### UC-ADM-03: Elevación y Asignación de Roles (Exclusivo Master)
*   **Actor Principal:** Administrador Master (email: `admin@syc.com.co`).
*   **Precondiciones:** Cuenta validada por código rígido.
*   **Flujo Especial de Negocio:**
    *   Un administrador ordinario **NO** puede convertir a un pasajero en administrador o cambiar privilegios de otros coordinadores de sistema.
    *   Sólo el **Admin Master** tiene el control para delegar responsabilidades administrativas o suspender cuentas de administradores
     pares dentro de Rivo sin restricciones.
