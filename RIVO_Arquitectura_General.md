# 🚗 RIVO - Arquitectura General (Fase 1)

Rivo es una plataforma de carpooling corporativo de extremo a extremo diseñada para conectar de forma segura, eficiente y organizada a los colaboradores del grupo corporativo SYC, optimizando los trayectos diarios, reduciendo los costos operacionales y disminuyendo la huella de carbono, cumpliendo rigurosamente con las normativas locales de tránsito en el Área Metropolitana de Bucaramanga (AMB).

Este documento especifica la arquitectura general, los flujos operativos de cada rol, la infraestructura de comunicaciones y el sistema de seguridad y autenticación del software.

---

## 📸 1. ¿Qué es Rivo?
Rivo es una solución modular full-stack construida completamente bajo el entorno unificado de **TypeScript**. Opera bajo principios de **Modular Monolith** y **Clean Architecture** parcial para asegurar un desacoplamiento claro entre el dominio de negocio, las APIs de infraestructura y la interfaz de usuario.

### Problemáticas Corporativas y Urbanas que Resuelve:
*   **Movilidad Colaborativa Directa:** Conecta de manera integrada a empleados que viajan solos en sus vehículos con compañeros que realizan rutas superpuestas o idénticas.
*   **Gestión Documental Confiable:** Exige y audita que los conductores posean licencias de tránsito y pólizas de seguro (SOAT) vigentes y aprobadas antes de publicar cualquier oferta de transporte viales.
*   **Cumplimiento Normativo Metropolitano:** Automatiza la validación inteligente de restricciones vehiculares de **Pico y Placa** (Bucaramanga, Floridablanca, Girón y Piedecuesta) para prevenir infracciones de tránsito.
*   **Seguridad Transaccional:** Minimiza el sobrecupo y las condiciones de carrera mediante transacciones blindadas en la base de datos relacional.

---

## 👥 2. Flujo Completo de un Usuario (Pasajero / Colaborador)

El rol de **Pasajero** (Passenger) es el estado por defecto para cualquier colaborador registrado en la plataforma. Su recorrido transcurre a través de las siguientes etapas operativas:

```
[ Registro / Login ] ──► [ Explorar Rutas / Mapa ] ──► [ Solicitar Unirse ]
                                                              │
                                                              ▼
[ Calificar Viaje ] ◄── [ Viaje Completado (JIT) ] ◄── [ Solicitud Aprobada ]
```

1.  **Autenticación e Ingreso:**
    *   Crea una cuenta utilizando su correo corporativo institucional.
    *   Ingresa al dashboard principal en modo **Pasajero** (`HomePassengerView`).
2.  **Exploración y Búsqueda Geográfica (`ExploreView`):**
    *   Interactúa con un mapa centralizado (`MapContainer`) alimentado por Google Maps SDK.
    *   Utiliza un buscador predictivo (Places Autocomplete) para suministrar su destino de transporte.
    *   Filtra rutas disponibles por origen, destino, horario de salida, precio y cupos asignados.
    *   Visualiza banderas informativas que alertan preventivamente si un vehículo seleccionado posee Pico y Placa ese día.
3.  **Proceso de Postulación / Reserva (Transaccional):**
    *   Selecciona una ruta programada y presiona "Solicitar unirse".
    *   La plataforma genera un registro en la tabla `join_requests` con estado inicial `pending`.
    *   Este evento genera al instante una alerta visual de notificación para el Conductor propietario del viaje.
4.  **Confirmación y Aprobación:**
    *   El usuario monitorea pasivamente el estado de su solicitud mediante un **polling automatizado de red** (coordinado cada 10 segundos).
    *   Si el conductor aprueba la postulación, el estado cambia a `accepted`. El sistema decrementa atómicamente un cupo libre de la ruta en la base de datos.
    *   Si es rechazada, cambia a `rejected`, liberando el cupo potencial inmediatamente.
5.  **Ejecución y Seguimiento:**
    *   Al llegar la hora planificada, el trayecto es transicionado automáticamente por el servidor al estado `in_progress`.
    *   El pasajero puede ver los datos de contacto del conductor y la información del vehículo de manera segura en el detalle de la ruta (`RouteDetailView`).
6.  **Cierre y Calificación comunitaria:**
    *   Transcurridas 3 horas desde el inicio de partida, la reconciliación temporal JIT (*Just-In-Time*) interna transiciona el viaje a `completed` sin depender de daemons externos.
    *   El pasajero interactúa con un modal interactivo (`RatingModal`) para calificar al conductor (escala 1-5 estrellas) y aportar un feedback cualitativo.
    *   Esta acción actualiza la puntuación acumuliva y de reputación del conductor en la base de datos de manera atómica.

---

## 🚗 3. Flujo Completo de un Conductor (Driver)

Cualquier empleado que cuente con un vehículo matriculado puede ascender a este rol, pasando por rigurosos controles de seguridad documental y de tránsito locales:

```
[ Registrar Vehículo ] ──► [ Cargar SOAT / Licencia ] ──► [ Aprobación Administrativa ]
                                                              │
                                                              ▼
[ Aceptar Pasajeros ] ◄── [ Iniciar Trayecto ] ◄── [ Publicar Ruta (Check Pico y Placa) ]
```

1.  **Registro y Activación de Vehículos ("Mi Garaje"):**
    *   El usuario accede a su perfil (`ProfileView`) e interactúa con el panel interactivo `MyGarage`.
    *   Registra las características de su parque automotor: tipo (automóvil o motocicleta), marca, modelo, color y placa de tránsito colombiana estandarizada (ej. `XYZ123` o `XYZ12C`).
2.  **Carga Documental Multipart:**
    *   Sube de forma física y directa el archivo correspondiente al SOAT de su vehículo y su licencia de conducción nacional (formatos PDF, PNG o JPG).
    *   Los archivos son asimilados por el middleware de carga en backend, el cual genera rutas físicas seguras en el servidor dentro de `./uploads`.
    *   El sistema pre-valida el documento extrayendo metadatos base y verificando que la categoría registrada (ej. `A2` para motos o `B1` para automóviles) corresponda al tipo de vehículo activo.
    *   El estado inicial de los archivos ingresados es `pending` (pendiente de validación).
3.  **Auditoría y Habilitación:**
    *   El conductor no podrá ofrecer trayectos viales hasta que un usuario con privilegios de Administrador revise físicamente sus documentos cargados y valide que se encuentren aprobados (`approved`).
4.  **Creación de Rutas Seguras (`CreateRouteView`):**
    *   El conductor selecciona su vehículo principal (debe estar aprobado).
    *   Define el origen, destino, precio corporativo sugerido de viaje, cantidad de asientos libres, fecha y hora de partida del viaje.
    *   **Evaluación Preventiva de Pico y Placa (Bucaramanga Policy):**
        *   El backend intercepta la solicitud y evalúa el último dígito de la placa del vehículo activo contra la fecha, sábado rotativo u hora de circulación colombiana deseada en `America/Bogota`.
        *   Si detecta que el vehículo infringe el Pico y Placa metropolitano para ese tramo temporal, el sistema arroja un error transaccional de API bloqueando de forma definitiva la publicación para prevenir multas.
        *   Si está libre, la ruta es instanciada en estado `scheduled`.
5.  **Gestión de Pasajeros:**
    *   El conductor recibe notificaciones constantes ante solicitudes de colaboradores.
    *   Desde su dashboard visual, aprueba o rechaza a los postulantes cuidando de no exceder los límites físicos de asientos de su vehículo.
6.  **Operación del Viaje:**
    *   Utiliza los controles dinámicos de su panel para marcar el inicio del viaje, transitando el estado a `in_progress`.

---

## 👑 4. Flujo Completo de un Administrador (Admin)

El rol de **Administrador** actúa como el supervisor del ecosistema de movilidad corporativa, resguardando la integridad legal y analítica del sistema:

```
[ Acceso Panel Admin ] ──► [ Auditar Documentos (Pendientes) ] ──► [ Aprobar / Rechazar ]
                                                                           │
                                                                           ▼
                                                                [ Visualizar KPIs Analíticos ]
```

1.  **Ingreso al Panel de Control de Control (`AdminView` / `AdminAnalyticsView`):**
    *   El sistema autentica su rol en los tokens corporativos. Si carece de privilegios admin, es expulsado inmediatamente mediante la guardia de enrutamiento frontend y el `roleGuard` del backend.
2.  **Bandeja de Entrada de Auditoría Documental:**
    *   Muestra un listado ordenado de licencias de conducir y SOAT vehiculares cargados por los colaboradores que requieran validación jurídica.
    *   El panel permite al administrador visualizar directamente el archivo adjunto (PDF, JPG, PNG) para constatar la fidelidad de las firmas, fechas de vencimiento expuestas y correspondencia de categorías.
3.  **Resolución Documental:**
    *   El administrador emite un veredicto:
        *   **Aprobar (`approved`):** El vehículo/conductor queda habilitado automáticamente para programar ofertas de carpooling. Se despacha de inmediato una notificación proactiva de felicitación al conductor.
        *   **Rechazar (`rejected`):** Bloquea la operatividad del conductor sobre el vehículo correspondiente. Se notifica al colaborador detallando la inconsistencia con sugerencia de re-carga.
4.  **Monitoreo de Métricas Corporativas (KPIs):**
    *   Analiza el tablero unificado de indicadores operativos del sistema:
        *   Cantidad total de rutas viales programadas, viajes completados, y peticiones activas.
        *   Número de automóviles y motocicletas matriculadas en el clúster.
        *   Tasa media de ocupación de vehículos para calcular impactos y eficiencias.
        *   Estimación matemática del ahorro en la huella ecológica de CO2 por efecto del carpooling corporativo.

---

## 🔄 5. Comunicación Frontend ↔ Backend ↔ PostgreSQL

El sistema Rivo funciona mediante un flujo continuo de tres capas tecnológicas desacopladas pero fuertemente sincronizadas:

```
┌─────────────────────────────────┐
│     CLIENTE (React SPA)        │
│                                 │
│  [ UI/Mapas ] ◄─► [ AppContext ]│
└────────────────┬────────────────┘
                 │
                 │ (Peticiones HTTPS REST / Carga Multipart / Polling 10s)
                 ▼
┌─────────────────────────────────┐
│    SERVIDOR (Express API)       │
│                                 │
│  [ Middlewares ] ◄► [ Routers ] │
└────────────────┬────────────────┘
                 │
                 │ (Consultas SQL Transaccionales con Bloqueos / No-Mocks)
                 ▼
┌─────────────────────────────────┐
│     PERSISTENCIA (PostgreSQL)   │
│                                 │
│  [ Drizzle ORM ] ◄─► [ Motor ]  │
└─────────────────────────────────┘
```

### Mecánica del Canal de Datos:

1.  **Consumo de API Segura (`SecureHttpClient`):**
    *   El frontend interactúa con el servidor consumiendo endpoints serializados en formato **JSON**.
    *   El motor HTTP del cliente extrae el token del persistente y lo inyecta firmemente en la cabecera `Authorization: Bearer <JWT_TOKEN>` en cada llamada.
2.  **Procesamiento REST unificado en Express:**
    *   Las peticiones entrantes atraviesan filtros encadenados (CORS, JSON Parser, Logger de peticiones).
    *   Los routers específicos mapeados en `src/server/modules/` controlan los llamados de negocio correspondientes a cada dominio.
3.  **Persistencia Transaccional ACID robusta (Drizzle ORM + Pg):**
    *   El servidor interactúa directamente con PostgreSQL abstrayendo el SQL mediante Drizzle ORM sobre contratos tipados físicamente (`src/db/schema.ts`).
    *   **Mitigación de Race Conditions (Doble Reserva):** Ante intentos de reserva pesada y concurrente del último cupo libre de un carro, el backend instrumenta una transacción SQL que efectúa un bloqueo temporal de fila mediante un `FOR UPDATE` seguido de una disminución controlada y segura:
        ```sql
        UPDATE routes SET available_seats = available_seats - 1 
        WHERE id = :routeId AND available_seats > 0;
        ```
        Si la base de datos retorna cero filas afectadas, se ejecuta un *ROLLBACK* manual, protegiendo al sistema de la sobreventa.
4.  **Sincronización de Estado por Polling Coordinado:**
    *   Al carecer de WebSockets tradicionales, el cliente de Rivo implementa un **polling estructurado y centralizado cada 10 segundos** que invoca en segundo plano a las consultas de rutas vigentes, estado de uniones, y lista de notificaciones pendientes del colaborador, mitigando la latencia en las redes internas.

---

## 🔒 6. Cómo funciona la Autenticación

Rivo implementa un esquema de seguridad descentralizado y de arquitectura **Stateless** basado en estándares recomendados para la industria:

```
1. Login/Registro ──► Procesa en Bcrypt (10 rounds) ──► Valida Email Único
                                                              │
                                                              ▼
2. Genera Tokens Access/Refresh ◄── Identifica Rol ◄── Genera Criptografía JWT 
```

### Core del Mecanismo Criptográfico:

*   **Custodia de Contraseñas Locales:** Almacena contraseñas hasheadas en base de datos implementando el algoritmo **bcryptjs** con una salting de 10 iteraciones criptográficas, previniendo ciberataques de diccionario o fuerza bruta.
*   **Tokens Descentralizados (JWT):** El servidor expide credenciales mediante firmas HMAC-SHA256 utilizando la llave secreta local:
    *   **Access Token:** Token de corta expiración que contiene las credenciales de identificación base del colaborador (ID, email corporativo, y rol específico de acceso).
    *   **Refresh Token:** Token de larga duración custodiado persistentemente a través de cookies HTTP-Only seguras, facilitando que el cliente de React restaure sincronizadamente su sesión ante un reinicio del navegador o pérdida del estado temporal.
*   **Aislamiento mediante Middlewares de Ruta:**
    *   **`authMiddleware`:** Interceptor encargado de leer cabeceras o cookies del colaborador, verificar la validez y firma temporal del JWT utilizando el secreto de autenticación, y poblar el objeto `req.user` para uso seguro de los endpoints posteriores.
    *   **`roleGuard`:** Filtro de seguridad que evalúa que el rol del colaborador autenticado (Passenger, Driver, Admin) corresponda estrictamente con los privilegios e hilos requeridos para interactuar con el endpoint. Por ejemplo, la creación física de rutas o el registro de vehículos están cerrados con llave exclusivas para roles habilitados en el sistema.

---
*Este documento constituye el entregable de la Fase 1: Arquitectura General de Rivo, elaborado para el conocimiento y entendimiento de la solución de movilidad corporativa antes del abordaje del código.*
