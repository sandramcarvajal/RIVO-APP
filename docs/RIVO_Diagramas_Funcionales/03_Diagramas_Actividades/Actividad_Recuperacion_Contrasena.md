# ⚙️ Diagrama de Actividad - Recuperación de Contraseña

Este documento modela el flujo ordenado y seguro de restablecimiento de contraseñas de las cuentas de colaboradores en Rivo.

---

## 📋 1. Ficha del Restablecimiento de Credenciales

*   **Objetivo:** Permitir al colaborador reestablecer su contraseña mediante tokens seguros y verificar la titularidad del correo corporativo registrado.
*   **Actores:** Colaborador Corporativo, Interface Rivo, Base de Datos PostgreSQL.
*   **Rutas de API:** `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`.

---

## 🗺️ 2. Diagrama de Actividad (Mermaid)

```mermaid
flowchart TD
    Start([Inicio: Recuperar Clave]) --> EnterEmail[Solicitar Correo Corporativo]
    EnterEmail --> ValidateForm{¿Cumple patrón corporativo @syc.com.co?}
    
    ValidateForm -- No --> ShowError[Alerta: Email no válido] --> EnterEmail
    ValidateForm -- Sí --> FindUser[Consultar en PostgreSQL]
    
    FindUser --> UserCheck{¿Existe usuario registrado?}
    
    UserCheck -- No --> ToastSuccess[Notificar: Si el email es correcto, recibirá correo] --> EndPath([Paso Finalizado])
    
    UserCheck -- Sí --> GenerateToken[Generar Token Restablecimiento HMAC-SHA256 con Expiración de 1 Hora]
    GenerateToken --> SaveToken[Persistir Token Hasheado y Tiempo Límite en Tabla users]
    
    SaveToken --> SendMail[Despachar Correo con Link de Reset en America/Bogota]
    SendMail --> ToastSuccess
    
    ToastSuccess --> ClickLink[Colaborador pulsa enlace de correo]
    ClickLink --> PresentResetForm[Mostrar Pantalla de Nueva Clave]
    
    PresentResetForm --> InputClave[Ingresar nueva contraseña y confirmación]
    InputClave --> ComparaClave{¿Las contraseñas coinciden?}
    
    ComparaClave -- No --> MisMatchError[Mostrar alerta: Claves no son idénticas] --> InputClave
    
    ComparaClave -- Sí --> CheckExpirado{¿Token coincide con PostgreSQL y vigencia activa?}
    
    CheckExpirado -- No --> InvalidTokenError[Token Caducado/Invalido. Re-solicite recuperación] --> Start
    
    CheckExpirado -- Sí --> HashearPassword[Hashear Clave con Bcryptjs]
    HashearPassword --> UpdatePassword[Actualizar users.password, borrar password_reset_token]
    UpdatePassword --> ClearSession[Forzar cierre de sesiones viejas]
    ClearSession --> FinalSuccess[Alerta: Clave restablecida. Inicie Sesión] --> EndPath
```

---

## 📝 3. Explicación del Flujo Operativo

1.  **Prevención de Exposición (Privacy Principle):** Si el email no existe, el sistema retorna un Toast genérico de éxito simulado para evitar que atacantes externos descubran correos válidos por fuerza de peticiones sistemáticas.
2.  **Expiración Forzada:** El token expira automáticamente transcurridos 60 minutos desde su generación, evitando vulnerabilidades si el buzón corporativo permanece desatendido.
3.  **Sanitización Completa:** Tras un cambio exitoso, el sistema invalida y borra permanentemente el token del registro para prevenir dobles ejecuciones.
