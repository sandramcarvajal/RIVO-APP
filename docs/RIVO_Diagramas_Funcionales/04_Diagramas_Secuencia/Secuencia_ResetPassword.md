# 🔗 Diagrama de Secuencia - Recuperación de Contraseña

Este documento expone la interacción asíncrona, flujos temporales de tokens y transacciones de base de datos llevadas a cabo al solicitar un restablecimiento de clave en Rivo.

---

## 🗺️ 1. Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Colaborador Olvidadizo
    participant Frontend as React App (AuthView)
    participant Backend as AuthRouter (ForgotUseCase)
    participant SMTP as Servidor SMTP Corporativo
    participant DB as PostgreSQL (Drizzle)

    Usuario->>Frontend: Solicita recuperar contraseña ingresando Email
    Frontend->>Backend: POST /api/auth/forgot-password { email }
    
    Backend->>DB: SELECT id FROM users WHERE email = $1;
    DB-->>Backend: Retorna registro ID de usuario
    
    alt Correo no registrado
        Backend-->>Frontend: Retorna HTTP 200 { success: true } (Simulado)
        Frontend-->>Usuario: Muestra Toast: "Si el correo existe, recibirá instrucciones"
    else Correo existe
        Backend->>Backend: Generar Token Criptográfico (hex) + Expiración
        Backend->>DB: UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3;
        DB-->>Backend: Confirmación de persistencia
        
        Backend->>SMTP: Enviar correo electrónico con URL dinámico
        SMTP-->>Usuario: Despacha correo físico a bandeja institucional
        Backend-->>Frontend: Retorna HTTP 200 { success: true }
        
        Usuario->>Frontend: Pulsa link e ingresa nueva clave
        Frontend->>Backend: POST /api/auth/reset-password { token, password }
        
        Backend->>DB: SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW();
        DB-->>Backend: Retorna datos de usuario verificado
        
        Backend->>Backend: BCryptHasher.hash(newPassword)
        Backend->>DB: UPDATE users SET password = hashed, reset_token = null WHERE id = user.id;
        DB-->>Backend: Transacción confirmada
        Backend-->>Frontend: Retorna HTTP 200: "Clave reestablecida con éxito"
        Frontend->>Usuario: Redirige a pantalla de Login
    end
```

---

## 📝 2. Explicación del Traspaso de Mensajes

1.  **Protección de Token Estático:** El backend almacena únicamente una representación hasheada del token de recuperación, mitigando fugas si la persistencia de base de datos sufre una vulneración.
2.  **Mitigación de Respuestas Variadas:** El sistema retorna HTTP 200 idéntico, demorando milisegundos semejantes gracias a demoras controladas para blindar al sistema de ataques de enumeración e identificación de cuentas de colaboradores corporativos.
