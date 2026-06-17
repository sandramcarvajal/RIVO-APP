# 🔗 Diagrama de Secuencia - Inicio de Sesión (Login)

Este diagrama UML de secuencia detalla el mapa cronológico, traspaso de cabeceras de red, desencadenamiento de middlewares de seguridad y la persistencia de cookies en el proceso de autenticación de Rivo.

---

## 🗺️ 1. Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Auxiliar / Empleado
    participant Frontend as React Single Page App
    participant Middleware as AuthMiddleware (Express)
    participant Backend as AuthRouter / JWTService
    participant DB as PostgreSQL (Drizzle)

    Usuario->>Frontend: Ingresa correo corporativo y contraseña
    Frontend->>Frontend: Valida formato local correo @syc.com.co
    
    Frontend->>Middleware: POST /api/auth/login {email, password}
    
    Note over Middleware: Verifica logs base de IP e inyecciones
    
    Middleware->>Backend: Ejecuta caso de uso LoginUser
    Backend->>DB: SELECT * FROM users WHERE email = $1;
    DB-->>Backend: Registra usuario (id, password_hash, is_disabled, role)
    
    alt Usuario no existe o contraseña incorrecta
        Backend-->>Frontend: Retorna HTTP 401: "Credenciales Incorrectas"
        Frontend->>Usuario: Muestra Toasts de Alerta
    else El usuario está marcado como is_disabled === true
        Backend-->>Frontend: Retorna HTTP 403: "Acceso denegado: Cuenta Suspendida"
        Frontend->>Usuario: Muestra modal de contacto de soporte corporativo
    else Credenciales válidas y cuenta activa
        Backend->>Backend: BCryptHasher.compare(password, password_hash)
        Backend->>Backend: JWTService.generateAccessToken(userPayload)
        Backend->>Backend: JWTService.generateRefreshToken(userPayload)
        
        Backend-->>Frontend: Retorna HTTP 200: { user, accessToken } con cookie HTTP-Only RefreshToken
        Note over Frontend: Almacena accessToken en memoria del AuthContext
        
        Frontend->>Usuario: Carga Dashboard de acuerdo a su rol (Redirect)
    end
```

---

## 📝 2. Puntos Clave de Seguridad en la Secuencia

1.  **Aislamiento de Refresh Tokens:** Al custodiarse los tokens de refresco bajo directiva de seguridad **HTTP-Only**, se previene cualquier robo por inyección de código cruzado (XSS) en la interfaz del cliente.
2.  **Mantenimiento Stateless:** Las peticiones consiguientes consumen el token de acceso directo desde las cabeceras REST, sorteando la exigencia de consultar persistentemente la base para validar los accesos a los recursos del sistema.
