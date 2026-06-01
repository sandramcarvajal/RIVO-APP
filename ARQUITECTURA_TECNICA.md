# Documentación Técnica de Arquitectura Maestro — Proyecto RIVO

Este documento constituye la especificación de arquitectura y el reporte de auditoría de código del proyecto **Rivo**, una solución de 
movilidad corporativa y carpooling seguro para empleados. El presente manual detalla la implementación física y lógica del repositorio, 
actuando como la única fuente de verdad técnica para desarrolladores, evaluadores, docentes y futuros mantenedores.

---

## 1. Introducción al Proyecto

### 1.1 ¿Qué es Rivo?
**Rivo** es una plataforma de carpooling corporativo de extremo a extremo diseñada para facilitar que los empleados compartan trayectos 
vehiculares diarios hacia y desde sus áreas de trabajo. Su propósito es optimizar el transporte diario reduciendo costos operativos, 
disminuyendo la huella de carbono de la organización y resolviendo problemáticas de congestión urbana locales.

### 1.2 Problema que Resuelve
*   **Eficiencia en Rutas Urbanas:** Falta de alternativas confiables de transporte directo para empleados corporativos.
*   **Costos Operativos Reales:** Alivio del impacto de la movilización de personal mediante la distribución de gastos de viaje de manera 
colaborativa.
*   **Cumplimiento Normativo Metropolitano:** Superación de restricciones de tránsito locales (como la ordenanza de "Pico y Placa" en el Área
 Metropolitana de Bucaramanga) mediante alertas tempranas y optimización del catastro de rutas admisibles.

### 1.3 Público Objetivo
*   **Conductores:** Empleados que disponen de un vehículo matriculado (automóvil o motocicleta), con documentación válida ante las 
autoridades viales (SOAT, licencia) y que desean compartir sus asientos libres.
*   **Pasajeros:** Colaboradores de la misma colectividad u organización que buscan un trayecto cómodo, monitoreado y directo.
*   **Administradores:** Coordinadores y auditores encargados de validar que toda la documentación cargada (SOAT, licencias de conducir) 
cumpla rigurosamente con los requerimientos viales legales antes de permitir la publicación de viajes.

### 1.4 Alcance del MVP Actual
El producto mínimo viable (MVP) proporciona:
1.  Registro y autenticación robusta mediante tokens JWT con persistencia en el cliente y cookies en el backend.
2.  Gestión documental completa ("Mi Garaje") para vehículos del conductor, con carga y almacenamiento de archivos reales en el sistema de 
archivos del servidor (Multer/`uploads`) y validadores lógicos automáticos.
3.  Gestión de rutas terrestres en tiempo real que integra el SDK de Google Maps para visualización geográfica básica del Área Metropolitana 
de Bucaramanga.
4.  Solicitudes de unión transaccionales con mitigación estricta de condiciones de carrera mediante bloqueos pesimistas (`SELECT FOR UPDATE`)
 para la concurrencia de reserva de cupos.
5.  Motor evaluador de reglas metopolitanas ("Pico y Placa") para Bucaramanga, Floridablanca, Girón y Piedecuesta, con detección analítica de 
restricciones para días de la semana y sábados rotativos.
6.  Sistema descentralizado de notificaciones internas sobre cambios de estados en viajes y solicitudes.
7.  Daemon automático y reconciliaciones JIT (*Just-In-Time*) para la transición de estados de rutas obsoletas de forma proactiva.

---

## 2. Estado Actual del Proyecto

El sistema está segmentado inequívocamente según el nivel de fidelidad técnica implementada en el código fuente actual:

### 2.1 Implementado (100% Funcional en Código)
*   **Autenticación Firme con JWT y bcryptjs:** Registro y Login nativo con hash seguro de contraseñas de 10 rondas en backend y almacenamiento
 local de tokens en cliente (`AuthService.ts`/`LocalStorageManager.ts`).
*   **Drizzle ORM y Pooling PostgreSQL:** Conexión pooling sobre la base de datos PostgreSQL utilizando el driver de `pg` y abstracción tipada
 con mapeo relacional de esquemas rigurosos (`src/db/schema.ts`).
*   **Control Acceso y Middleware de Roles:** Interceptores express `authMiddleware` de extracción y verificación de firma del token, acoplado
 a un `roleGuard` que limita las operaciones viales de creación exclusivamente a conductores autorizados.
*   **Validaciones Automatizadas de Tránsito:** Algoritmos deterministas para la validación de categorías de licencias (A1/A2 para motos;
 B1/B2/B3/C1/C2/C3 para automóviles) y fechas de vencimiento de documentos corporativos (`DocumentValidationService.ts`).
*   **Gestión Transaccional de Cupos (Asientos):** Compras de cupos seguras en base de datos. Si una reserva de pasajero es aprobada 
externamente por el conductor de la ruta, los cupos se decrementan atómicamente empleando transacciones de SQL concurrentes.
*   **Reconciliación JIT de Ciclo de Vida:** Evaluador de rutas en tiempo real (`RouteLifecycleManager`) que actualiza proactivamente viajes
 iniciados (`in_progress`) o completados (`completed` tras 3 horas de partida) y notifica a los implicados al instante.
*   **Carga Física de Documentos:** Almacenamiento local directo de soportes legales (archivos PDF, PNG, JPG hasta 10MB) empleando Multer en
 el directorio físico `./uploads` expuesto estáticamente.
*   **Evaluador de Pico y Placa de Bucaramanga:** Motor lógicamente exhaustivo en zona horaria de Colombia (`America/Bogota`) que bloquea o 
aprueba trayectos dependiendo del último dígito numérico de la placa de vehículos y la fecha/hora de salida configurada.

### 2.2 Parcialmente Implementado
*   **Sistema de Simulación de Mapas:** Se inicializa y consume la instancia oficial del script de `@react-google-maps/api` trayendo la API
 Key mediante un canal seguro `/api/maps/config`. No obstante, el sistema renderiza un mapa urbano del área metropolitana y marcadores 
 reactivos, pero la resolución de polilíneas geodésicas avanzadas está estructurada como un campo persistible (`routes.polyline`) preparado 
 para interactuar con los servicios viales de Directions API de Google, resolviendo actualmente direcciones textuales aportadas por el 
 usuario de forma directa.

### 2.3 Planeado (Futuras Fases)
*   **Procesamiento OCR Inteligente Real:** El procesador actual (`OCRProcessor.ts`) simula la trazabilidad de OCR entregando metadatos 
iniciales del buffer de almacenamiento. La conexión con Google Cloud Vision API, Document AI, o Gemini Pro para la extracción analítica 
física automatizada de textos en SOAT y licencias queda estructurada conceptualmente como una tarea pendiente para la "Fase 2".

### 2.4 Métricas Generales del Sistema (Arquitectura en Números)
Para dar visibilidad al tamaño y la madurez de la solución actual del MVP, se consolidan sus métricas estructurales fundamentales:

*   **Número de Módulos Funcionales:** **7 módulos** unificados horizontalmente a través de fronteras de red (`auth`, `vehicles`, 
`circulation`, `routes`, `requests`, `notifications`, `reviews`).
*   **Número de Tablas en Base de Datos:** **8 tablas físicas** relacionales mapeadas en `src/db/schema.ts` (`users`, `vehicles`, 
`vehicle_documents`, `user_documents`, `routes`, `join_requests`, `ratings`, `notifications`), optimizadas con **5 índices secundarios
 de rendimiento**.
*   **Tecnologías Principales:** **React 19.0.1** (UI), **TypeScript 5.8.2** (Tipado Universal), **Express 4.21.2** (API REST), 
**PostgreSQL 16** (Persistencia ACID) y **Drizzle ORM 0.45.2** (SQL Abstraction).
*   **Dependencias Críticas y de Middleware:**
    *   `jsonwebtoken (v9.0.3)` y `bcryptjs (v3.0.3)` para custodia e interceptación criptográfica.
    *   `multer (v2.1.1)` para la gestión e ingesta binaria de soportes multipart.
    *   `@react-google-maps/api (v2.20.8)` para la renderización de la cartografía interactiva y trazado.
    *   `motion (v12.23.24)` para transiciones dinámicas aceleradas de la SPA.
    *   `@google/genai (v1.29.0)` integrada y lista para automatización OCR en Fase 2.

---

## 3. Arquitectura Real Implementada

Rivo no es un monolito acoplado desordenado; implementa una **Arquitectura en Capas Orientada a Dominios (Modular)** en el Backend y una
 **Arquitectura Basada en Componentes y Fachadas de Estado** en el Frontend.

```
       [ CLIENTE (FRONTEND SPA REACT) ]
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
    [ AppContext ] ◄─── [ AuthContext ]  (React Context API / Gestión Estado)
             │                   │
             └─────────┬─────────┘
                       ▼
            [ SecureHttpClient.ts ]  (Inyección JWT / Headers / Gestión HTTP)
                       │
 ══════════════════════╪════════════════════════ (Límite de Red Rest / JSON)
                       ▼
       [ SERVIDOR (BACKEND EXPRESS NODE) ]
                       │
       ┌───────────────┼────────────────────────┐
       ▼               ▼                        ▼
 [ AuthRouter ]  [ VehicleRouter ]        [ RouteRouter/RequestRouter ]
       │               │                        │
       └───────┬───────┴────────────────────────┘
               ▼
   [ Middlewares: Auth / Role ]
               │
               ▼
   [ Application & Domain Layers ] (Casos de Uso, Validadores, Políticas Pico-Placa)
               │
               ▼
   [ Drizzle ORM / schema.ts ]
               │
               ▼
     [ PostgreSQL Database ]
```

### 3.1 Nivel de Aplicación de Clean Architecture y DDD
*   **Clean Architecture:** Se aplica de forma **Parcial/Modesta pero Efectiva**. Existen límites lógicos marcados. Por ejemplo, en el 
módulo de circulación o vehículos se distingue el dominio corporativo (`BucaramangaMetroPolicy`), la aplicación (`CheckCirculationUseCase`
 o `DocumentValidationService`) y la infraestructura (`CirculationRouter`, `VehicleRouter` instalados en Express). Esta separación de 
 responsabilidades evita la inyección directa de dependencias externas (como Express o Drizzle) dentro del núcleo lógico de validación vial pura.
*   **DDD (Domain-Driven Design):** Se identifican agregados y entidades bien delimitadas que actúan como límites de coherencia. La política
 de tránsito se hereda de una clase base común (`CirculationPolicy`), lo cual respeta patrones de diseño para el desacoplamiento de lógicas
  independientes. Sin embargo, para agilizar las escrituras concurrentes, ciertos routers consumen directamente el objeto transaccional `db`
   aportado por Drizzle ORM sobre el esquema físico en lugar de pasar siempre por una capa de inversión de repositorios complejos, 
   minimizando el sobreesfuerzo de capas físicas repetitivas.
*   **Modularidad:** Alta en ambos extremos. El backend divide sus responsabilidades en `src/server/modules` (`auth`, `vehicles`, `routes`,
 `requests`, `notifications`, `reviews`, `circulation`), encapsulando allí routers, esquemas de aplicación, casos de uso y lógicas de dominio.
  El frontend imita esta organización dentro de `src/client/modules`, separando servicios HTTP específicos y contextos especializados de 
  persistencia de datos.

### 3.2 Patrones de Diseño y de Arquitectura Identificados en Rivo
El análisis de ingeniería revela la aplicación sistemática y deliberada de múltiples patrones de diseño para resolver problemáticas de 
desacoplamiento, consistencia de estados y extensibilidad:

*   **Arquitectura Basada en Componentes (Component-Based Architecture):** Organiza el frontend en entidades de interfaz reactivas autónomas
 y declarativas (`MyGarage`, `MapContainer`, `RouteCard`). Cada componente encapsula su lógica visual y se comunica mediante props tipadas 
 y eventos locales, maximizando la reusabilidad y simplificando el mantenimiento del DOM.
*   **Patrón Contexto (Context Pattern):** Implementado en `AuthContext.tsx` y `AppContext.tsx` de React para centralizar y emitir el estado
 global (sesión de usuario, rutas activas, cola de solicitudes de reserva, alertas de tránsito) de manera jerárquica a lo largo del árbol 
 visual sin incurrir en acoplamiento secuencial o prop drilling excesivo.
*   **Patrón Fachada (Facade Pattern):** Orquestado a través del gancho personalizado unificado `useAppStore.ts`. Este actúa como una capa 
de abstracción única sobre múltiples contextos y servicios, exponiendo una API unificada hacia los componentes visuales y reduciendo la 
complejidad del consumo de datos.
*   **Patrón Middleware (Middleware Pattern):** Utilizado de manera predominante en Express mediante el encadenamiento jerárquico de filtros
 y preprocesadores (`cors`, `express.json()`, `authMiddleware`, `roleGuard`). El flujo de las peticiones es interceptado, validado 
 criptográficamente y autorizado antes de alcanzar los enrutadores lógicos de negocio.
*   **Patrón Fábrica (Factory Pattern):** Implementado formalmente en el resolvedor y generador `NotificationFactory.ts` del backend. 
Este objeto centraliza la lógica de formateo y construcción de notificaciones parametrizadas por tipo (ej. aprobaciones de viaje, 
cancelaciones, estados de SOAT), generando plantillas de datos coherentes que persisten de inmediato en la base de datos de alertas.
*   **Patrón Estrategia (Strategy Pattern):** Evidenciado en la capa de circulación de tránsito urbano. La estructura expone una firma 
parametrizable base (`CirculationPolicy`) y permite proveer diferentes clases lógicas concretas (ej. `BucaramangaMetroPolicy`) que 
implementan sus propios algoritmos de restricción específicos (dígitos, horas hábiles, rotaciones quincenales de fines de semana), 
facilitando futuras extensiones a múltiples entornos metropolitanos sin fracturar los endpoints públicos de validación.

### 3.3 Diagramas de Despliegue Físico del Sistema
La arquitectura abarca tres estadios de topología operacional y de red perfectamente coordinados:

#### Entorno 1: Desarrollo Local (Sandbox de Ingeniería)
```
  [ Navegador Cliente (Chromium) ]
                 ▲
                 │ (Canal HTTP Rest & Assets local - Puerto 3000)
                 ▼
     [ Express App Host (Node.js/tsx) ] ◄─── (Middleware Vite Inyectado)
                 ▲
                 │ (Pool Conexión local / Migraciones Drizzle)
                 ▼
       [ PostgreSQL Engineed DB ]
```

#### Entorno 2: Producción Unificada (Capa Servidora standalone)
```
  [ Conexiones de Red Cliente ]
                 │
                 ▼ (Ingress HTTPS cifrado)
  [ Servidor Node Express compilado (dist/server.cjs) ]
                 │
      ┌──────────┴──────────┐
      ▼ (Servidor estáticos)▼ (Lógica REST Api)
   [ /dist ]             [ Modules Routers ]
                            │
                            ▼ (Pg Driver Connection Pooling)
                 [ PostgreSQL remota en Cloud SQL ]
```

#### Entorno 3: Cloud Run Serverless (Estructura de Contenedorización)
```
[ Tránsito Público HTTPS ]
          │
          ▼
 [ Nginx Ingress Proxy ] (Centralizador redundante a Puerto 3000)
          │
          ▼ (Redirección nativa de Ingress Cloud Run)
 [ Docker Container (Cloud Run Pod) ] ────► [ Express REST API (server.cjs) ]
          │
          ▼ (TLS Pool Connection)
 [ Cloud SQL PostgreSQL Managed Instance ]
```

---

## 4. Stack Tecnológico

El proyecto se sustenta sobre un conjunto integrado de tecnologías modernas orientadas al tipado estricto y el desarrollo ágil de software:

### 4.1 Frontend (Capa de Interfaz de Usuario)
*   **React (v19.0.1):** Librería declarativa para la construcción de interfaces de usuario interactivas basadas en componentes reactivos
 de alto rendimiento. Controla la vista a través de ganchos del ciclo de vida (`hooks`) estructurados y composición.
*   **TypeScript (v5.8.2):** Superconjunto de JavaScript que introduce tipado estricto en tiempo de compilación. Elimina errores comunes
 de indeterminación y provee un autocompletado avanzado durante el desarrollo de la interfaz de usuario.
*   **Vite (v6.2.3):** Gestor y empaquetador de activos de desarrollo de alta velocidad. Reemplaza herramientas legacy de compilación 
proveyendo construcciones ágiles mediante ESM nativos.
*   **Motion (v12.23.24) (importado desde `motion/react`):** Utilizada para animaciones de interfaz de usuario, microinteracciones, 
retroalimentaciones visuales de cambio de estado y transiciones fluidas de páginas en el enrutamiento.
*   **Lucide React (v0.546.0):** Set de iconos vectoriales ligeros, consistentes y de alto contraste estético.
*   **React Router Dom (v7.14.2):** Enrutador del lado del cliente que gestiona el árbol de pantallas viales (Explore, Profile, Admin, 
Requests, Route Detail) sin requerir recargas totales de página.

### 4.2 Backend (Capa de Servidor y Reglas de Negocio)
*   **Node.js (v22.14.0):** Entorno de ejecución de TypeScript del lado de servidor construido sobre el motor V8.
*   **Express (v4.21.2) con tsx:** Framework de servidor HTTP minimalista encargado del ruteo, parseo de payloads JSON de peticiones y 
aplicación secuencial de middlewares. Al ejecutarse con `tsx` (TypeScript Execute), el backend se ejecuta directamente sin fases de 
traducción estática previa en desarrollo.
*   **Multer (v2.1.1):** Middleware especializado en el manejo de peticiones con formato `multipart/form-data`, esencial para procesar y 
validar cargas físicas concurrentes de archivos legales al directorio `./uploads`.
*   **Cookie Parser (v1.4.7):** Middleware utilizado para leer cookies firmadas de los navegadores, facilitando el refresh de sesiones 
automáticas seguras JWT.

### 4.3 Base de Datos y Persistencia
*   **PostgreSQL (Driver pg v8.20.0):** Servidor de base de datos relacional robusto con soporte nativo de transacciones ACID avanzadas, 
esencial para manejar atomicidad y bloqueos preventivos en reservas paralelas de asientos.
*   **Drizzle ORM (v0.45.2) con Drizzle-Kit (v0.31.10):** ORM de tipado estricto. A diferencia de competidores pesados, provee mapeo 
directo e intuitivo sin sobrecarga en runtime, permitiendo formular queries mediante código limpio con TypeScript altamente transaccional.

### 4.4 Seguridad y Acceso Seguro
*   **JSON Web Token (jsonwebtoken v9.0.3):** Estructura estándar para la emisión de tokens criptográficos firmados de corta duración 
para la autorización segura de peticiones.
*   **bcryptjs (v3.0.3):** Librería para la protección criptográfica (hashing) con salting de 10 iteraciones sobre las contraseñas de la base
 de datos de usuarios locales.

### 4.5 Infraestructura e Integraciones de Red
*   **Vite Dev Server integrado:** El backend de Express levanta el middleware en desarrollo mediante `vite.use(vite.middlewares)` 
interceptando dinámicamente las llamadas del navegador en el puerto único `3000`. En producción, Express asume el control convirtiéndose
 en distribuidor estático del build compilado en la carpeta `/dist`.
*   **Method Override:** Soporte para remapear peticiones `POST` a métodos REST nativos virtuales como `PATCH`, `DELETE` o `PUT` mediante
 cabeceras opcionales `X-HTTP-Method-Override`.

### 4.6 Justificación de Decisiones Tecnológicas (Trade-offs e Ingeniería de Decisiones)
La elección de cada componente del stack tecnológico de Rivo responde a criterios objetivos de ingeniería, balanceando la velocidad de 
desarrollo inicial con el mantenimiento robusto a largo plazo:

*   **React:** Se prefirió frente a arquitecturas multi-página clásicas (MPA) o frameworks como Angular/Vue debido a su paradigma declarativo
 basado en componentes, excelente integración con herramientas geoespaciales reactivas (Google Maps) y su ecosistema maduro para la gestión
  de estados unificados. El Virtual DOM y la reconciliación selectiva garantizan que las actualizaciones en la bandeja de notificaciones o 
  en los cupos del mapa se reflejen con latencia ultra-baja en la vista.
*   **TypeScript:** Se implementa de forma transversal en el frontend, backend y esquemas de persistencia. Esto elimina por completo los 
errores de tipo comunes de JavaScript (ej. mutación involuntaria de arrays de pasajeros, llamadas a métodos sobre valores nulos o indefinidos
 en transferencias HTTP). Además, al unificar tipos con Drizzle, se crea un canal autoconsistente donde un cambio en una columna de base de 
 datos se detecta inmediatamente como un error de compilación en el formulario de interfaz de usuario.
*   **Vite:** Reemplaza a empaquetadores clásicos como Webpack gracias a su estrategia de pre-empaquetado con `esbuild` y carga dinámica 
basada en ESM nativos, reduciendo los tiempos de arranque en desarrollo a menos de 100ms. En producción, su configurador integrado basado 
en Rollup permite generar bundles optimizados, minimizando el peso de los recursos descargados en dispositivos móviles de los empleados.
*   **Express:** Se eligió sobre frameworks robustos con opinión estética predefinida (como NestJS) por su diseño minimalista y flexible. 
Express otorga control absoluto sobre el ciclo de vida de la petición HTTP, permitiendo incrustar middlewares de seguridad ligeros y montar 
de forma nativa e integrada el servidor de desarrollo de Vite en hilos de puerto único (intercepción en el puerto 3000), indispensables para
 simplificar el despliegue en entornos virtualizados.
*   **PostgreSQL:** El negocio viales exige atomicidad rigurosa para reservas simultáneas y verificaciones de coincidencia de placas. 
PostgreSQL ofrece un motor transaccional robusto y de nivel industrial que soporta de manera eficiente los bloqueos preventivos de filas
 en concurrencia (`SELECT FOR UPDATE`), garantizando que jamás se consuman el doble de cupos que los disponibles en la ruta viales física.
*   **Drizzle ORM:** Tradicionalmente, los ORM robustos como Prisma introducen una capa pesada en tiempo de ejecución en contenedores 
serverless efímeros (incrementando los tiempos de cold-start). Drizzle elimina esta sobrecarga procesando consultas a velocidad de driver 
SQL nativo (`pg`), al mismo tiempo que provee protección de tipos estática basada en clases y un motor simplificado de migraciones y esquemas
 dinámicos (`drizzle-kit`).
*   **JSON Web Token (JWT):** Para un sistema de movilidad corporativa, las sesiones almacenadas centralmente en memoria 
(ej. Express Session / Redis) aumentan la complejidad de la infraestructura en múltiples pods de Cloud Run. El enfoque de token 
descentralizado de JWT permite autenticar peticiones de manera stateless sin forzar consultas cruzadas de verificación a la base de 
datos en cada petición REST intermedia.
*   **Multer:** Resuelve eficientemente la ingesta física de archivos binarios de tránsito (SOAT y licencias). Al operar a través de 
streams del sistema de archivos, parsea peticiones multipart pesadas limitando el consumo de memoria RAM en el contenedor Docker.
*   **Context API:** El desarrollo de software comúnmente cae en la sobre-ingeniería de introducir librerías de estados pesadas como 
Redux o MobX para almacenar la sesión. Para el alcance actual de Rivo, la Context API de React coordinada con ganchos personalizados 
provistos por la recopilación `useAppStore` proporciona reactividad instantánea con cero boilerplate y una curva de aprendizaje mínima 
para futuros mantenedores.

---

## 5. Anatomía Completa del Proyecto

A continuación se detalla la estructura física real del repositorio de código fuente del proyecto Rivo:

```
rivo/
├── .env.example                     # Lista de variables de entorno requeridas
├── index.html                       # Entrada DOM estática del cliente
├── server.ts                        # Archivo inicial de configuración y arranque de Express, middlewares y API
├── metadata.json                    # Metadatos del applet, permisos de navegador y capacidades
├── package.json                     # Declaración de dependencias del framework, scripts y herramientas
├── tsconfig.json                    # Configuración estricta del compilador de TypeScript
├── vite.config.ts                   # Configuración del compilador y plugins de Vite + Tailwind
├── drizzle.config.ts                # Archivo de sincronización para esquemas físicos de Drizzle-Kit
├── uploads/                         # Directorio físico donde se almacenan los PDFs e imágenes de SOAT/Licencias
├── src/
│   ├── main.tsx                     # Punto de entrada de cliente React y montaje del DOM
│   ├── index.css                    # Definición de Tailwind CSS y tipografía "Inter" global
│   ├── types.ts                     # Declaración universal de interfaces compartidas en el frontend
│   ├── client/                      # Lógica de consumo de API y contextos por el lado del cliente
│   │   └── modules/                 # Módulos del cliente
│   │       ├── auth/                # Módulo de autenticación y garaje del cliente
│   │       │   ├── context/
│   │       │   │   └── AuthContext.tsx    # Contexto React de token, datos de usuario y sesión
│   │       │   └── services/
│   │       │       ├── AuthService.ts     # Cliente HTTP del backend para login, registro y actualización
│   │       │       ├── LocalStorageManager.ts # Manipulación segura de tokens en sessionStorage/localStorage
│   │       │       └── VehicleService.ts  # Cliente de endpoints de vehículos y carga documental
│   │       ├── notifications/       # Módulo cliente de notificaciones
│   │       │   └── services/
│   │       │       └── NotificationService.ts # Consultas viales de estado de notificaciones
│   │       └── routes/              # Módulo de creación y asignación viales
│   │           └── services/
│   │               └── RouteService.ts    # Consumo de endpoints de rutas del driver
│   ├── components/                  # Componentes de UI modulares del cliente
│   │   ├── MapContainer.tsx         # Mapa visual reactivo cargado con la Google API
│   │   ├── MyGarage.tsx             # Panel interactivo de gestión vehicular, alertas de SOAT y carga física
│   │   ├── RouteCard.tsx            # Tarjeta de render de información sobre rutas
│   │   ├── layout/                  # Barra de navegación, encabezados y contenedores estructurales
│   │   └── ui/                      # Elementos modulares reusables (Button, Input, Badge, Toast)
│   ├── context/
│   │   └── AppContext.tsx           # Contexto maestro del flujo de datos de pasajeros (rutas, reservas, opiniones)
│   ├── hooks/
│   │   └── useAppStore.ts           # Fachada agrupadora de contextos (AppContext + AuthContext)
│   ├── lib/
│   │   └── utils.ts                 # Utilitario para concatenación segura de clases de Tailwind (cn)
│   ├── shared/                      # Módulo utilitario de lógica agnóstica compartida (Client + Server)
│   │   ├── config.ts                # Centralización de coordenadas de Bucaramanga, límites y colores
│   │   ├── enums.ts                 # Enumeraciones rigurosas de estados de viajes e hilos
│   │   ├── timezone.ts              # Utilidad de formateo de fechas
│   │   └── validators.ts            # Validadores mecánicos viales (matrículas colombianas)
│   ├── views/                       # Pantallas estructurales de vistas del flujo SPA
│   │   ├── HomeView.tsx             # Enrutador visual principal de vistas según el rol activo
│   │   ├── HomePassengerView.tsx    # Panel principal del rol de Pasajero (buscar rutas activas)
│   │   ├── HomeDriverView.tsx       # Panel principal del rol de Conductor (mis rutas publicadas)
│   │   ├── HomeAdminView.tsx        # Panel de auditor administrativo de aprobación documental
│   │   ├── ExploreView.tsx          # Panel detallado de búsqueda y filtrado geográfico de viajes
│   │   ├── CreateRouteView.tsx      # Formulario integrado del conductor con mapa reactivo y Pico y Placa
│   │   ├── RouteDetailView.tsx      # Visualización detallada de un trayecto (pasajeros, chat, flujos)
│   │   ├── RequestsView.tsx         # Histórico de solicitudes del usuario
│   │   ├── ProfileView.tsx          # Configuración del perfil e incrustación de "Mi Garaje"
│   │   └── AuthView.tsx             # Interfaz unificada de Login y Registro de conductores
│   └── server/                      # Capa lógica del Servidor (Reglas de negocio y endpoints)
│       ├── logger.ts                # Utilitario de registros e hilos
│       ├── application/             # Lógica de transacciones globales
│       ├── core/                    # Componentes base del sistema
│       └── modules/                 # Módulos encapsulados en el Backend
│           ├── auth/                # Módulo de Autenticación de Servidor
│           │   ├── application/     # Casos de uso de login y creación
│           │   ├── domain/          # Entidades de usuarios
│           │   └── infrastructure/  # Enrutador Express y Middleware de seguridad (JWT)
│           ├── circulation/         # Módulo evaluador de Pico y Placa de Servidor
│           │   ├── application/     # Caso de uso de evaluación de placas
│           │   ├── domain/          # Definición de políticas de transitabilidad viales
│           │   │   └── policies/    # Reglas específicas de Bucaramanga y sábados rotativos
│           │   └── infrastructure/  # Endpoint de consulta pública y remapeador
│           ├── notifications/       # Módulo lógico de notificaciones
│           │   ├── domain/          # Definición de eventos de notificaciones
│           │   ├── infrastructure/  # Enrutadores, persistencia y factorías de notificaciones
│           │   └── NotificationFactory.ts # Generado dinámico de plantillas para aprobaciones/cancelaciones
│           ├── requests/            # Módulo de gestión y validaciones concurrentes de cupos
│           │   └── infrastructure/  # Enrutador Express de transacciones ACID y bloqueos selectivos
│           ├── reviews/             # Módulo de calificaciones
│           │   └── infrastructure/  # Endpoint de reviews y agregador matemático de puntuaciones
│           ├── routes/              # Módulo de publicación de viajes en el Servidor
│           │   ├── application/     # Casos de uso de creación y lectura de rutas
│           │   ├── domain/          # Interfaces de repositorios viales
│           │   └── infrastructure/  # Enrutadores Express, auto-finalización y reconciliación de ciclo de vida
│           └── vehicles/            # Módulo de vehículos y documentación de conductores
│               ├── application/     # Casos de uso de validación de licencias y SOAT
│               └── infrastructure/  # Enrutador Express de Multer, cargas y triggers de simulación OCR
```

---

## 6. Anatomía del Frontend

El cliente web está diseñado bajo un paradigma modular reactivo basado en flujos de datos perfectamente unidireccionales:

```
[ Capa de Vista (Views / Componentes) ]
                │
                ▼ (Disparador de Acciones)
      [ Fachada useAppStore ]
        │                 │
        ▼ (Rutas/Reservas)▼ (Tokens/Usuario)
  [ AppContext ]   [ AuthContext ]
        │                 │
        ▼                 ▼
     [ SecureHttpClient.ts ] ──► (Establece cabecera Bearer JWT)
```

### 6.1 Gestión y Flujo de Datos
El flujo sigue un curso estrictamente lineal controlado por la **fachada `useAppStore`**, la cual unifica los dos contextos globales:
1.  **AuthContext:** Custodia el usuario verificado actual (`user`), el estado de autenticación (`isAuthenticated`) y provee las acciones 
esenciales de `login`, `register`, `logout` e `updateUserProfile`. Al levantarse el cliente, invoca a `restoreSession` la cual consulta el 
endpoint seguro `/api/auth/me` para resucitar la sesión basándose en los tokens locales.
2.  **AppContext:** Orquesta las transacciones operativas: catálogo de rutas activas viales, listado de solicitudes cruzadas y notificaciones
 pendientes. Ofrece los callbacks descriptivos para interacciones cotidianas: `createRoute`, `requestJoin`, `updateRequestStatus`, 
 `cancelJoinRequest`, `updateRouteStatus`, `getRoutePassengers` y `submitReview`.

Los componentes de interfaz no consumen la red directamente; invocan los métodos expuestos por el store. Esto garantiza que cualquier 
mutación asíncrona sobre la red actualice atómicamente el estado local del contexto reactivo, desencadenando un renderizado ordenado e 
instantáneo de las interfaces involucradas.

### 6.2 Componentes e Interfaces Core
*   **MyGarage (`MyGarage.tsx`):** Un panel interactivo y vistoso para el conductor. Contiene la lógica para agregar múltiples vehículos. 
Permite activar o cambiar de auto principal de viaje, muestra un grid de autos con su placa estandarizada y expone la interfaz de 
drag-and-drop y examinar archivos para subir los soportes legales (archivos PDF/imágenes) mediante integración multipart con el router
 de backend. Muestra badges visuales para documentaciones aprobadas, rechazadas o vencidas en tiempo real.
*   **MapContainer (`MapContainer.tsx`):** Componente aislado de mapa que encapsula el cargado dinámico del objeto global `google` 
desde el script cargador oficial. Recibe dinámicamente la configuración y la API Key del host para instanciar el mapa encuadrado sobre 
coordenadas geográficas preconfiguradas.

---

## 7. Anatomía del Backend

El servidor es una aplicación Node.js controlada por Express estructurada para cumplir con el ruteo semántico estricto de una API RESTful
 y el aislamiento lógico de las consultas de persistencia a través del modelo ORM.

### 7.1 Flujo Operativo de una Petición HTTP
Cuando un cliente emite una petición hacia el servidor, se ejecuta el siguiente cauce lógico:

```
[ Petición de Cliente HTTP ]
             │
             ▼
      [ Middleware CORS ]
             │
             ▼
    [ Express JSON Parser ]
             │
             ▼
  [ Method Override Check ] (Si es POST, verifica si remapea a PATCH/DELETE)
             │
             ▼
   [ Logger Middleware ] (Registra ruta, IP de petición y timestamp inicial)
             │
             ▼
    [ authMiddleware ] (Extrae cookie u Authorization Header -> Verifica JWT)
             │
             ├──────────────────────┐ (Si Token Inválido o Ausente)
             │                      ▼
             │               [ 401 Unauthorized ]
             ▼
  [ roleGuard(allowedRoles) ] (Valida si conductor cumple requerimientos de rol)
             │
             ├──────────────────────┐ (Si Rol No Permitido)
             │                      ▼
             │               [ 403 Forbidden ]
             ▼
    [ Module Router ]
             │
             ▼ (Invoca transacción PostgreSQL con bloqueos transaccionales)
  [ Drizzle ORM Execution ]
             │
             ▼
  [ Payload JSON Response ]
```

---

## 8. Anatomía de los Módulos

A nivel funcional, el backend se particiona en módulos semánticos que encapsulan hilos lógicos de dominio:

### 8.1 Módulo `auth`
*   **Objetivo:** Autenticación estricta, registro seguro de empleados viales y control de sesiones JWT.
*   **Responsabilidades:** Hashear credenciales locales, validar emails corporativos, emitir tokens de acceso y de refresco.
*   **Endpoints:**
    *   `POST /api/auth/register` - Registro estructurado de usuario e inicialización de vehículo opcional.
    *   `POST /api/auth/login` - Verifica credenciales mediante bcryptjs y expide el JWT.
    *   `POST /api/auth/logout` - Invalida localmente las cookies de refresco.
    *   `POST /api/auth/refresh` - Emite un nuevo token a partir de la firma de refresco.
    *   `GET /api/auth/me` - Entrega el perfil de usuario actual autenticado decodificando el sub JWT.
    *   `PATCH /api/auth/profile` - Actualiza la información flexible del perfil (nombre, teléfono, avatar).
*   **Dependencias:** `jsonwebtoken`, `bcryptjs`, `drizzle-orm`.
*   **Entidades:** `users` de la base de datos.

### 8.2 Módulo `vehicles`
*   **Objetivo:** Gestión del portafolio vehicular de conductores y archivo documental.
*   **Responsabilidades:** Registrar vehículos garantizando la unicidad lógica de la placa nacional, gestionar los documentos SOAT y 
licencias en el filesystem e invocar los algoritmos de verificación contra categorías requeridas.
*   **Endpoints:**
    *   `POST /api/vehicles/upload` - Carga física multipart (Multer) retornando URLs relativas estables.
    *   `POST /api/vehicles` - Registro de un nuevo automóvil aportando matrícula y metadatos base.
    *   `GET /api/vehicles` - Listado de vehículos del conductor con sus soportes asociados de SOAT.
    *   `POST /api/vehicles/:id/activate` - Activa el vehículo indicado como el prioritario de uso vial.
    *   `POST /api/vehicles/:vehicleId/documents` - Almacena metadatos del archivo SOAT cargado e invoca validaciones automáticas.
    *   `GET /api/vehicles/user-documents` - Recupera la lista de licencias adjuntas del conductor en sesión.
    *   `POST /api/vehicles/user-documents` - Adjunta la licencia corporal validando su categoría contra el tipo de vehículo primario.
*   **Dependencias:** `multer`, `fs`, `path`, `DocumentValidationService`, `OCRProcessor`.
*   **Entidades:** `vehicles`, `vehicle_documents`, `user_documents`.

### 8.3 Módulo `circulation`
*   **Objetivo:** Supervisar e impedir la circulación de unidades vehiculares restringidas por normativas metropolitanas.
*   **Responsabilidades:** Evaluar si un automóvil o motocicleta puede transitar en Bucaramanga en una fecha y rango horario dados.
*   **Endpoints:**
    *   `POST /api/circulation/evaluate` y `POST /api/pico-placa/evaluate` - Evalúa placa y fecha retornando estados booleanos y razones
     lógicas viales.
*   **Dependencias:** `BucaramangaMetroPolicy`.
*   **Entidades:** Aguda dependencia de lógica de dominio pura (`CirculationPolicy`).

### 8.4 Módulo `routes`
*   **Objetivo:** Publicación y seguimiento de rutas para carpooling corporativo.
*   **Responsabilidades:** Crear viajes válidos verificando previamente que el conductor posea licencia y SOAT aprobados, además de 
coordinar el motor JIT de transición de estados históricos.
*   **Endpoints:**
    *   `POST /api/routes` - Instancia una ruta de transporte aportando coordenadas, hora, precio y asientos libres.
    *   `GET /api/routes/active` - Despliega todas las rutas en estado de agenda vigentes en el sistema para los pasajeros.
    *   `GET /api/routes/me` - Retorna las rutas publicadas históricas del conductor logueado.
    *   `GET /api/routes/:id` - Detalle de un viaje específico.
    *   `GET /api/routes/:id/passengers` - Listado oficial de pasajeros aceptados en el viaje.
    *   `PATCH /api/routes/:id/status` - Transiciona de forma manual la ruta (iniciar viaje/finalizar).
*   **Dependencias:** `RouteLifecycleManager`, `DocumentValidationService`.
*   **Entidades:** `routes`, `users`, `vehicle_documents`, `vehicles`.

### 8.5 Módulo `requests`
*   **Objetivo:** Gestión transaccional y concurrente de cupos para unirse a viajes.
*   **Responsabilidades:** Recibir solicitudes de pasajeros, validar la existencia de asientos, prevenir autouniones de conductores, 
aplicar bloqueos concurrentes y actualizar de forma segura el stock de asientos disponibles.
*   **Endpoints:**
    *   `POST /api/requests` - Instancia una solicitud de unión en estado pendiente.
    *   `GET /api/requests/me` - Listado de solicitudes recibidas o enviadas por el usuario autenticado.
    *   `PATCH /api/requests/:id` - Actualiza el estado de la reserva (Aceptada/Rechazada/Cancelada).
    *   `DELETE /api/requests/:id` o `POST /api/requests/:id/cancel` - Cancela y libera el asiento asignado.
*   **Dependencias:** `Drizzle DIs`, `NotificationFactory`.
*   **Entidades:** `join_requests`, `routes`, `users`.

### 8.6 Módulo `notifications`
*   **Objetivo:** Almacenamiento, distribución y marcado de notificaciones del ecosistema de carpooling.
*   **Endpoints:**
    *   `GET /api/notifications` - Historial de notificaciones viales del usuario autenticado.
    *   `POST /api/notifications/:id/read` - Marca una notificación como leída.
    *   `POST /api/notifications/read-all` - Marca todas las alertas del usuario como leídas en una sola query.
*   **Entidades:** `notifications`.

### 8.7 Módulo `reviews`
*   **Objetivo:** Sistema de evaluación cruzada de reputación post-viaje.
*   **Endpoints:**
    *   `POST /api/reviews` - Almacena una puntuación (1 a 5) y comentario relacional, recalculando de forma matemática y atómica el 
    promedio de calificación y el recuento total de opiniones del usuario calificado en la tabla `users`.
*   **Entidades:** `ratings`, `users`.

---

## 9. Base de Datos

El diseño físico de la base de datos se implementa relacionalmente en PostgreSQL mediante el mapeo formal tipado en `src/db/schema.ts`.

### 9.1 Diagrama del Modelo Relacional Explicado
```
      ┌───────────────┐
      │     users     │◄─────────────────────────────┐
      └───────┬───────┘                              │
              │ (1:N)                                │ (1:N)
              ├─────────────────────────┐            │
              ▼ (1:N)                   ▼ (1:N)      │
       ┌─────────────┐           ┌──────────────┐    │
       │  vehicles   │           │user_documents│    │
       └──────┬──────┘           └──────────────┘    │
              │ (1:N)                                │
              ▼                                      │
  ┌───────────────────┐                              │
  │ vehicle_documents │                              │
  └───────────────────┘                              │
                                                     │
              ┌──────────────────────────────────────┤
              │ (1:N Driver)                         │ (1:N Passenger)
              ▼                                      ▼
      ┌───────────────┐  (1:N Route)  ┌───────────────┐
      │    routes     │◄──────────────┤ join_requests │
      └───────┬───────┘               └───────────────┘
              │ (1:N Route)
              ▼
      ┌───────────────┐
      │    ratings    │ (Apunta From/To Users)
      └───────────────┘
```

### 9.2 Definición de Tablas del Sistema de Base de Datos
Aquí se mapean las columnas físicas reales de cada objeto persistido:

#### Tabla: `users`
*   **Propósito:** Almacena la cabecera corporativa de cuentas.
*   **Columnas:**
    *   `id` (serial, Clave Primaria).
    *   `email` (text, No nulo, Único).
    *   `password` (text, Nulo para OAuth eventual, requerido en autenticación local).
    *   `role` (text, Por defecto 'passenger', valores lógicos: 'passenger', 'driver', 'admin').
    *   `profileData` (text, JSON serializado que almacena información extendida como nombre, teléfono y avatar).
    *   `rating` (text, Puntuación promedio del empleado).
    *   `reviewCount` (integer, Total de reviews acumulados, indispensable para promedios rápidos).
    *   `createdAt` (timestamp).

#### Tabla: `vehicles`
*   **Propósito:** Modelos vehiculares pertenecientes a conductores.
*   **Relaciones:** El campo `userId` referencia con llave foránea a `users.id` (1 usuario puede poseer N vehículos catalogados).
*   **Columnas:**
    *   `id` (serial, Clave Primaria).
    *   `userId` (integer, FK, No nulo).
    *   `plate` (text, No nulo, Único absoluto a nivel nacional en la base de datos).
    *   `brand`, `model`, `color`, `type` (text, 'car' | 'motorcycle').
    *   `isActive` (boolean, Para denotar el auto principal en uso de publicaciones locales).
    *   `availabilityStatus` (text, 'available' | 'unavailable' | 'maintenance').
    *   `verifiedStatus` (text, 'pending' | 'approved' | 'rejected').
    *   `rejectReason` (text).
    *   `verifiedAt` (timestamp).
    *   `verifiedBy` (integer, FK a `users.id`).
*   **Índices:**
    *   `vehicles_user_id_idx` sobre `userId` para agilizar búsquedas de garaje de conductores.
    *   `vehicles_is_active_idx` sobre `isActive`.

#### Tabla: `vehicle_documents`
*   **Propósito:** Soportes documentales de cada vehículo (e.g., SOAT).
*   **Relaciones:** El campo `vehicleId` une relacionalmente con llave foránea a `vehicles.id`.
*   **Columnas:**
    *   `id` (serial).
    *   `vehicleId` (integer, FK).
    *   `documentType` (text, e.g. "soat").
    *   `fileUrl` (text, URL al archivo adjunto).
    *   `status` (text, 'pending' | 'approved' | 'rejected').
    *   `expirationDate` (timestamp).
    *   `expirationStatus` (text, 'valid' | 'expiring_soon' | 'expired').
    *   `rejectReason` (text).
    *   `ocrConfidence`, `ocrPlate`, `ocrExtractedData` (Campos listos para persistencia OCR).
*   **Índices:** `vehicle_documents_vehicle_id_idx` sobre `vehicleId`.

#### Tabla: `user_documents`
*   **Propósito:** Soportes documentales individuales de tránsito (e.g. licencia de conducir del chofer).
*   **Relaciones:** El campo `userId` une físicamente con llave foránea a `users.id`.
*   **Columnas:** Idénticas especificaciones a `vehicle_documents` pero acopladas a la cuenta humana del colaborador.
*   **Índices:** `user_documents_user_id_idx` sobre `userId`.

#### Tabla: `routes`
*   **Propósito:** Cabecera de trayectos viales publicados.
*   **Relaciones:**
    *   `driverId` (integer, FK a `users.id`, No nulo).
    *   `vehicleId` (integer, FK a `vehicles.id`).
*   **Columnas:**
    *   `id` (serial, Primary Key).
    *   `origin`, `destination` (text, Direcciones tipadas para geodecodificación).
    *   `originCoords`, `destinationCoords` (text).
    *   `polyline` (text, Cadena de geocódigo decodificable en el mapa front).
    *   `departureTime` (timestamp, No nulo).
    *   `totalSeats`, `availableSeats` (integer, Control transaccional de cupos).
    *   `price` (integer, Costo de trayecto).
    *   `status` (text, 'scheduled' | 'in_progress' | 'completed' | 'cancelled').
    *   `isActive` (boolean).
*   **Índices:** `routes_vehicle_id_idx` sobre `vehicleId`.

#### Tabla: `join_requests`
*   **Propósito:** Relación transaccional N a N entre Pasajeros y Rutas de Viajes.
*   **Relaciones:**
    *   `routeId` (integer, FK a `routes.id`).
    *   `passengerId` (integer, FK a `users.id`).
*   **Columnas:**
    *   `id` (serial).
    *   `routeId`, `passengerId` (No nulos).
    *   `status` (text, 'pending' | 'accepted' | 'rejected' | 'cancelled').

#### Tabla: `ratings`
*   **Propósito:** Auditoría y reputación interna.
*   **Relaciones:** FKs cruzadas a `routes.id` y `users.id` para emisor (`fromUserId`) y receptor (`toUserId`).

#### Tabla: `notifications`
*   **Propósito:** Registro persistido de alertas para consumo del usuario.
*   **Índices:** Optimización con índice compuesto `notifications_user_id_is_read_idx` sobre `(userId, isRead)` para maximizar el 
desempeño en bandejas de entrada móviles.

---

## 10. Seguridad

La protección del ecosistema Rivo se orquesta cruzando metodologías criptográficas y políticas de control viales en red:

### 10.1 Criptografía y AuthMiddleware
La seguridad inicia en el backend. Toda contraseña se procesa usando **bcryptjs** con 10 rondas de hashing salado.
El backend levanta el middleware estricto `authMiddleware` en rutas declaradas con protección obligatoria. Este middleware realiza 
las siguientes validaciones concurrentes:
1.  Busca cabeceras HTTP de tipo `Authorization: Bearer <JWT_TOKEN>`.
2.  De manera complementaria, rastrea cookies firmadas con nombre `accessToken` para admitir sesiones cruzadas por navegadores.
3.  Utilizando la firma criptográfica secreta, ejecuta `jwt.verify()`. Si el token expiró, fue alterado o carece de firma auténtica, 
se detiene la ejecución inmediatamente, denegando la petición con un código HTTP `401 Unauthorized` formal.
4.  Si el token es auténtico, inyecta en el objeto `req` la variable local `user` de tipado exacto, proveyendo a los routers del ID del
 deudor en sesión con fiabilidad matemática.

### 10.2 RoleGuard y SecureHttpClient
*   **`roleGuard(allowedRoles: string[])`:** Validador de privilegios restrictivos. Protege los enrutadores operacionales de creación 
de rutas. Si un colaborador registrado con rol llano de pasajero (`passenger`) intenta realizar un request de publicación directa a 
`/api/routes`, el interceptor detecta que su perfil no coincide con los privilegios requeridos (`'driver'` o `'admin'`), abortando 
instantáneamente la ejecución física y respondiendo un código de error `403 Forbidden` directo.
*   **`SecureHttpClient` (Establecido en cliente Frontend):** Interceptor Axios/Fetch encapsulado sobre la red. Monitorea y extrae el
 token alojado en el almacenamiento local del navegador, inyectándolo automáticamente en cada petición saliente como una cabecera de 
 cabecera formal. Si el servidor retorna cualquier error `401 Unauthorized` por vencimiento de sesión, el cliente lo intercepta 
 dinámicamente y emite un evento global de desacoplamiento `rivo_unauthorized`. Esto purga instantáneamente los tokens locales, 
 cierra sesión en React, limpia la memoria y desvía al usuario de manera fluida hacia el login corporativo protegiendo la confidencialidad
  en máquinas de uso compartido.

### 10.3 Flujo Secuencial Completo de Seguridad
```
[ USUARIO LOGIN ]
       │
       ▼
[ Servidor valida contraseña con bcryptjs ]
       │
       ▼ (Si OK)
[ Servidor genera JWT firmado e inyecta Cookies ]
       │
       ▼
[ Cliente recibe JWT, almacena en localStorage ]
       │
       ▼
[ Cliente realiza llamados con SecureHttpClient ] ──► (Inyecta "Authorization: Bearer <JWT>")
       │
       ▼
[ Servidor authMiddleware extrae y decodifica el JWT ]
       │
       ▼ (Si es correcto)
[ roleGuard valida si rol del usuario tiene permiso ]
       │
       ▼ (Si cumple rol)
[ Ejecución Segura de Lógica Operacional ]
```

---

## 11. Gestión de Rutas y Cupos (Evitación Estricta de Race Conditions)

El control de preventa en reservas de carpooling es una sección crítica que exige atomicidad a nivel transaccional. Si múltiples 
pasajeros concurren de forma simultánea a reservar el último asiento disponible en una ruta, el sistema debe garantizar que 
**exclusivamente uno** obtenga el cupo, evitando cancelaciones e inconsistencias físicas en la base de datos de cupos.

Rivo resuelve este problema aplicando **Control de Concurrencia a nivel de Base de Datos mediante Transacciones ACID con Bloqueos
 Preventivos (Pessimistic Locking)**. El flujo real detallado es el siguiente:

```
[ PASAJERO emite solicitud de unirse ]
                   │
                   ▼ (Llamado a /api/requests)
       [ Abre db.transaction ]
                   │
                   ▼
  [ SELECT * FROM routes WHERE id = ? FOR UPDATE ]  ◄─── (Bloquea la fila en PostgreSQL)
                   │
                   ├──────────────────────┐ (Si otra transacción posee la fila, espera)
                   ▼                      ▼
  [ Valida límites lógicos ]  ───────►  [ availableSeats > 0 ? ]
                   │
                   ├──────────────────────┐ (Si seats <= 0, revierte transacción)
                   ▼                      ▼
  [ Inserta join_requests con state "pending" ]
                   │
                   ▼
       [ Cierra db.transaction ] (Libera bloqueo de fila en routes)
```

Posteriormente, cuando el Conductor procede a **Aprobar** una solicitud de unión, el sistema repite esta protección de forma 
exhaustiva para garantizar la consistencia en el decremento final de asientos:

```
[ CONDUCTOR aprueba solicitud ]
                   │
                   ▼ (Llamado a PATCH /api/requests/:id)
       [ Abre db.transaction ]
                   │
                   ▼
  [ SELECT * FROM join_requests FOR UPDATE ] ───────► (Aísla la solicitud concurrente)
                   │
                   ▼
  [ SELECT * FROM routes FOR UPDATE ] ──────────────► (Aísla la ruta viales)
                   │
                   ▼
[ ¿Transiciona de no-aceptado a aceptado? ]
                   │
                   ▼ (Si SÍ)
[ UPDATE routes SET availableSeats = availableSeats - 1 WHERE id = ? AND availableSeats > 0 ]
                   │
                   ├──────────────────────┐ (Si retorno de update tiene longitud 0)
                   ▼                      ▼
  [ Lanza Excepción: NO_SEATS ]  ───►  [ Transacción Revierte Automáticamente (Abort) ]
                   │
                   ▼ (Si se descuenta asiento con éxito)
[ UPDATE join_requests SET status = "accepted" WHERE id = ? ]
                   │
                   ▼
       [ Cierra db.transaction ] (Consolida cambios en disco y libera bloqueos)
```

Este mecanismo asegura que:
1.  **SELECT ... FOR UPDATE** bloquea físicamente las filas de la ruta de forma exclusiva. Ningún lector transaccional concurrente
 puede alterar la capacidad de asientos ni los estados de reserva de forma simultánea.
2.  La sentencia **UPDATE ... WHERE availableSeats > 0** evalúa la restricción lógica en el motor SQL de forma atómica. Si por 
alguna razón la fila tenía un valor inconsistente de 0, la consulta física retorna 0 registros modificados, lanzando una excepción
 controlada de negocio que aborta la transacción y garantiza cero sobreventas accidentales.

---

## 12. Lifecycle JIT (*Just-In-Time*)

Es común que los conductores o creadores de viajes olviden marcar manualmente el inicio de sus viajes o la conclusión de sus rutas 
una vez que el destino ha sido alcanzado. Rivo implementa un **Motor Automático de Sincronización de Ciclos de Vida viales 
(*RouteLifecycleManager.ts*)** que se ejecuta de forma Just-In-Time (JIT) e incremental en el servidor.

```
                  ┌──────────────────────────────────────────────┐
                  │ Lanzamiento de Petición HTTP al Servidor      │
                  │ (Cualquier consulta sobre rutas o solicitudes)│
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Invoca RouteLifecycleManager.performJit()     │
                 └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Abre Transacción ACID en Base de Datos        │
                 └──────────────────────┬───────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
            [ CHEQUEO 1: AUTO-COMPLETADO ]     [ CHEQUEO 2: AUTO-INICIADO ]
            Si fechaHora actual >=             Si hora actual >= departureTime
            departureTime + 3 horas            y viaje está "scheduled"
                         │                               │
                         ▼                               ▼
            [ Set STATUS = "COMPLETED" ]       [ Set STATUS = "IN_PROGRESS" ]
                         │                               │
            Genera alertas TRIP_COMPLETED                │
            para pasajeros aceptados                      │
                         │                               │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Cierra Transacción y Retorna Flujo HTTP       │
                 └───────────────────────────────────────────────┘
```

### 12.1 Flujo y Momentos de Ejecución
El `RouteLifecycleManager` evita la sobrecarga permanente de recursos de red mediante un modelo híbrido extremadamente eficiente:
1.  **Ejecución JIT Reactiva (Paso de Guardia):** Cada vez que un usuario (Conductor o Pasajero) interactúa con los endpoints 
operativos clave (`GET /api/requests/me`, `POST /api/requests`, `GET /api/routes/active`, etc.), el backend invoca preventivamente
 el llamado asíncrono `RouteLifecycleManager.performJitTransitions()`. El sistema procesa y reconcilia todas las rutas obsoletas 
 del sistema **antes** de retornar la data al cliente. Esto garantiza que el consumidor final siempre visualice un catálogo de viajes
  consistente, limpio y actualizado sin necesidad de cronjobs externos rígidos.
2.  **Daemon de Seguridad en Background:** Complementariamente, el servidor inicializa un fallback constante cada 5 minutos 
(`initRouteAutoFinalizer()`), ejecutando limpiezas periódicas para mantener las alertas sincronizadas para empleados que se encuentren 
inactivos en la app móvil.

---

## 13. Sistema Documental de Tránsito y Simulación OCR

El sistema de documentos valida que los colaboradores cumplan con las habilitaciones viales legales antes de permitirles compartir rutas
 viales activas.

### 13.1 Estado de Implementación Técnica del Flujo de Soportes
El sistema documental se organiza físicamente en tres estadios:

#### Implementado (100% Real en Backend y Cliente)
*   Formularios modulares completos de registro y carga física para **SOAT** de cada vehículo de la flota y **Licencias de conducción**
 del chofer corporativo.
*   Manipulador y validador físico de archivos con soporte multipart y almacenamiento seguro local en `/uploads/` de archivos de hasta 
10 megabytes.
*   Algoritmo automatizado de validación lógica de soporte de licencias: el sistema cruza la categoría seleccionada por el conductor 
(e.g. B1, A2) contra el tipo físico del auto principal de viaje (`car` o `motorcycle`). Si un chofer con auto registrado carga una 
licencia de categoría para motocicletas (`A1`/`A2`), el sistema rechaza atómicamente el documento y bloquea la creación de rutas, 
detallando una alerta descriptiva.

#### Parcialmente Implementado
*   **Triggers de Tránsito Simulado:** En el enrutador físico `/src/server/modules/vehicles/infrastructure/VehicleRouter.ts` 
(líneas 366-373 y 560-567), después de guardar exitosamente un soporte, el backend dispara en background una llamada asíncrona a
 `OCRProcessor.processDocument(fileUrl, documentType)`. Este simulador registra un log de inicio formal, simulando la preparación para
  la lectura óptica en la nube de forma paralela.

#### Planeado (Para Fase 2)
*   **Integración Física OCR Cloud:** El procesador actual (`OCRProcessor.ts`) retorna una confianza inicial estructurada de `0` y 
respuestas neutrales vacías:
    ```typescript
    return {
      extractedPlate: "",
      extractedExpirationDate: "",
      extractedCategory: "",
      confidence: 0,
      rawOcrText: "OCR processor is set up and pending integration in Phase 2."
    };
    ```
    La sustitución por servicios listos de visión en la nube (como Google Cloud Vision, Document AI o Gemini) está planificada lógicamente
     de forma que no requiera reestructurar los endpoints, ya que los esquemas de bases de datos de `vehicle_documents.ocrExtractedData` 
     y tablas asociadas ya cuentan con las columnas físicas preparadas.

---

## 14. Integraciones Externas

El proyecto integra servicios viales de mapas e información de circulación de forma coordinada con la API de Google:

### 14.1 Integración Real con Google Maps Platform
1.  **Canal Segura de Configuración:** El backend de Express expone el endpoint `/api/maps/config` el cual actúa como intermediario para 
custodiar y extraer de manera limpia la clave de red `VITE_GOOGLE_MAPS_API_KEY` alojada bajo variables secretas del contenedor de Cloud Run.
2.  **JS API Loading:** El frontend React consume e importa el conector declarativo `@react-google-maps/api` e interactúa con el gancho 
inicializador seguro `useJsApiLoader` inyectando dinámicamente las dependencias requeridas de geocodificación viales (`"places"`, `"geometry"`).
3.  **Encapsulamiento del iFrame de Desarrollo:** Debido a restricciones rígidas de seguridad referenciales impuestas por Google Cloud 
Console sobre credenciales públicas en dominios dev dinámicos, el componente de mapa cuenta con un sistema centinela robusto en 
`CreateRouteView.tsx` (líneas 306-326) que detalla guías de configuración paso a paso en caso de lanzar un error referencial de carga
 por bloqueos de dominio (*referer error*).

### 14.2 Módulo de Pico y Placa Metropolitano en Bucaramanga
Rivo cuenta con un motor evaluador completo e inteligente que calcula programáticamente la viabilidad de trayectos terrestres basándose
 en regulaciones viales reales:

*   **Alcance Geográfico:** Configurado formalmente bajo la constante `RIVO_CONFIG.map.metropolitanCities` cubriendo Bucaramanga,
 Floridablanca, Girón y Piedecuesta.
*   **Evaluación de Días Hábiles:**
    *   **Lunes:** Restricción para placas terminadas en **9 y 0**.
    *   **Martes:** Restricción para placas terminadas en **1 y 2**.
    *   **Miércoles:** Restricción para placas terminadas en **3 y 4**.
    *   **Jueves:** Restricción para placas terminadas en **5 y 6**.
    *   **Viernes:** Restricción para placas terminadas en **7 y 8**.
    *   **Horario de Restricción Activo:** Lunes a Viernes de **06:00 AM a 08:00 PM** (calculado de forma centralizada en minutos en 
    `BucaramangaMetroPolicy.ts`). Fuera de esta ventana, el vehículo puede circular libremente.
*   **Evaluación de Sábados Rotativos (Lógica basada en Anclas de Tiempo):**
    Los sábados en Bucaramanga rotan en secuencia quincenal de dígitos. Rivo implementa una solución matemática consistente de anclaje 
    fijo para proyectar la restricción del día con rigor matemático:
    *   **Fecha Ancla Inequívoca:** Sábado **11 de abril de 2026** (Dígitos restringidos asignados de inicio: **7 y 8**).
    *   **Metodología de Cálculo:** El sistema toma la fecha propuesta para circulación, la transiciona temporalmente a la zona horaria 
    de Colombia (`America/Bogota`) para evitar saltos horarios internacionales dañinos de UTC, y calcula estrictamente el diferencial de 
    semanas transcurridas desde el hito anclado:
        ```typescript
        const diffMs = targetDateObj.getTime() - anchorDateObj.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffDays / 7);
        const index = ((diffWeeks % 5) + 5) % 5;
        ```
    *   **Mapeo de la Secuencia Quincenal de Sábados:**
        *   Índice 0: **7 y 8**
        *   Índice 1: **9 y 0**
        *   Índice 2: **1 y 2**
        *   Índice 3: **3 y 4**
        *   Índice 4: **5 y 6**
    *   **Horario de Restricción los Sábados:** Ventana única matutina desde las **09:00 AM hasta la 01:00 PM (13:00 Hrs)**. Durante 
    domingos y días festivos viales, la regulación está libre de controles.

---

## 15. Flujo Completo del Negocio

El ciclo operacional de vida del carpooling de Rivo recorre las siguientes fases de forma integrada:

```
[ Registro de Usuario ] ──► [ Login JWT ] ──► [ Registrar Vehículo ] ──► [ Subir Documento ]
                                                                                │
                                                                                ▼
[ Aprobación de Documentos (Admin) ] ◄──────────────────────────────────────────┘
       │
       ▼ (Si Aprobado)
[ Conductor Crea Ruta ] ──► [ Pasajero Solicita Unión ] ──► [ Conductor Aprueba Solicitud ]
                                                                                │
                                                                                ▼ (Asasiento Reservado)
[ Inicio de Viaje ] ──► [ Fin de Viaje ] ──► [ Calificación de Servicio ]  ◄────┘
```

1.  **Registro (`AuthView.tsx` / `AuthRouter.ts`):** El colaborador crea su cuenta eligiendo su rol de preferencia (`passenger` o `driver`).
2.  **Login (`AuthView.tsx`):** Autenticación de credenciales, emitiendo cookies de refresco firmadas en backend y tokens JWT portables 
en cliente.
3.  **Registro Vehicular (`MyGarage.tsx` / `VehicleRouter.ts`):** Un conductor registra su automóvil aportando marca, modelo, color y 
matrícula exclusiva. Se deniega el registro si otra cuenta ingresó previamente la misma placa en Rivo.
4.  **Registro Documental (`MyGarage.tsx`):** El conductor carga físicamente el archivo PDF/imagen de su SOAT y de su licencia nacional de
 conducir. Los documentos quedan en cola con estado de verificación inicial en `pending`.
5.  **Aprobación Documental (`AdminView.tsx`):** Un empleado corporativo con rol administrativo (`admin`) valida de forma digital los 
oportes viales adjuntos aprobándolos o denegándolos con su correspondiente justificación por rechazo.
6.  **Creación de Ruta viales (`CreateRouteView.tsx`):** Una vez aprobado su SOAT y Licencia, el conductor puede publicar una ruta. El 
formulario calcula previamente que no exista un viaje pendiente activo, que posea seguros aprobados vigentes no expirados y corre la 
validación de Pico y Placa para la fecha/hora seleccionada sobre Bucaramanga bloqueando la inserción si el automóvil tiene restricción
 activa de tránsito.
7.  **Solicitud de Pasajero (`ExploreView.tsx`):** Un pasajero busca viajes disponibles, analiza detalles de equipaje y precio, e ingresa
 su solicitud de unión.
8.  **Aprobación Concurrente de Asiento (`RequestsView.tsx`):** El conductor analiza los postulantes y decide aceptar la reserva. 
El sistema encapsula la acción bajo bloqueos pesimistas incrementando de forma segura la reserva y restando un asiento de la ruta viales 
previniendo colisiones lógicas de carrera concurrentes de red.
9.  **Inicio de Viaje (`HomeDriverView.tsx`):** El conductor marca el inicio del trayecto cambiando el estado de la ruta a `in_progress`.
10. **Finalización del Trayecto (`HomeDriverView.tsx`/ JIT reconciliador):** Una vez alcanzado el destino, el conductor marca el cierre 
de la ruta a `completed`. De forma robusta, si el chofer olvida dar de baja el viaje, el daemon JIT de actualización viales detecta la 
obsolescencia tras transcurrir 3 horas del inicio proyectado, finalizando la ruta de forma atómica y remitiendo una alerta física de 
ompletado a los colaboradores implicados.
11. **Calificación (`RouteDetailView.tsx`):** Concluido el trayecto, los integrantes califican de forma anónima el servicio con métricas 
de 1 a 5 estrellas y comentarios viales locales, lo cual alimenta los promedios globales acumulados de cuentas del staff.

---

## 16. Instalación y Ejecución

Guía de configuración técnica para la instalación local limpia e implementación en producción:

### 16.1 Requisitos Previos e Instalación de Dependencias
Asegúrese de poseer instalado Node.js (v20+) y PostgreSQL corriendo en su máquina host.
```bash
# Sincronización e instalación limpia de todas las dependencias
npm install
```

### 16.2 Variables de Entorno Requeridas (`.env`)
Genere un archivo físico `.env` en la raíz del entorno:
```env
# URL de conexión directa a PostgreSQL
DATABASE_URL=postgresql://usuario:password@localhost:5432/rivodb

# Clave secreta criptográfica para la firma segura de JWT Tokens
JWT_SECRET=tu_clave_secreta_super_robusta_para_jwt

# Credenciales de API de Google Maps opcionales
VITE_GOOGLE_MAPS_API_KEY=AIzaSy_tu_google_maps_key_valida
```

### 16.3 Gestión del Esquema de Persistencia (Base de Datos)
El sistema encapsula scripts listos para consolidar la persistencia sin configuraciones manuales engorrosas:
```bash
# Levanta la interfaz interactiva de Drizzle-Kit Studio para auditar tablas físicamente
npx drizzle-kit studio

# Generar y aplicar migraciones locales en el motor PostgreSQL si realiza mutaciones de columna
npx drizzle-kit generate
npx drizzle-kit push
```

### 16.4 Comandos de Ejecución y Build
```bash
# Iniciar servidor de desarrollo unificado (Express + Vite de forma simultánea en puerto 3000)
npm run dev

# Generar compilación y empaquetado optimizado de producción
# El compilador empaqueta el backend en un CommonJS unificado (dist/server.cjs) usando esbuild
# y los archivos estáticos HTML/JS optimizados en dist/
npm run build

# Levantar el servidor empaquetado en puerto 3000 con configuración de producción estable
npm run start
```

---

## 17. Fortalezas Técnicas del Proyecto

Sustentadas estrictamente por evidencia directa identificada en el repositorio de código:

1.  **Garantía Transaccional e Inmunidad a Race Conditions:** Uso de la sentencia nativa `FOR UPDATE` y transacciones encapsuladas SQL 
ACID de Drizzle en las reservas cruzadas de asientos. Esto erradica con fiabilidad matemática cualquier condición de carrera concurrente 
en procesos de congestión simultánea de peticiones.
2.  **Sincronización en Background a Bajo Costo:** La reconciliación híbrida de estados Just-In-Time 
(`RouteLifecycleManager.performJitTransitions`) elimina la necesidad de contar con daemons hiperactivos o infraestructura de colas de
 eventos costosas. Actualiza de manera oportuna la información al interactuar contra rutas sensibles sin consumo extra de cómputo inactivo.
3.  **Estructura de Compilación Optimizado de Producción:** El script de compilación utiliza **esbuild** para empaquetar el servidor
 del backend en un único archivo físico portable (`dist/server.cjs`) con resolución de dependencias por bundle. Bypassa las complejas 
 comprobaciones relativistas de ESM y asegura inicios instantáneos en la nube.
4.  **Rigurosidad en Regulaciones Locales de Tránsito:** La lógica robusta implementada para Pico y Placa de Bucaramanga y la rotación 
sabática determinista elimina errores de calendarización y de zona horaria internacional calculando en minutos dentro de la zona fiscal 
horaria de Colombia.

### 17.1 Buenas Prácticas de Ingeniería Realizadas
El desarrollo técnico del MVP de Rivo destaca por la adopción rigurosa de metodologías modernas de desarrollo de software que reducen 
la deuda técnica temprana y mejoran el ciclo de mantenimiento:

*   **Tipado Extremo de Contratos de Datos (Shared Types & Enums):** Toda comunicación en la red y almacenamiento físico se rige por 
enumeraciones e interfaces estrictas unificadas en `src/types.ts` y `src/shared/enums.ts`. Esto previene desalineaciones lógicas en 
momentos de transiciones de estados (ej. estados de solicitud como `'pending'`, `'accepted'`).
*   **Abstracción de Lógica Visual e Inversión de Control:** Los componentes visuales no contienen llamadas imperativas ni manipulan
 directamente la red. Acceden de forma exclusiva a través de ganchos adaptadores (`useAppStore`), delegando la lógica asíncrona a los 
 servicios de infraestructura especializados (`AuthService`, `RouteService`).
*   **Seguridad por Defecto mediante Encapsulamiento de Configuraciones:** La custodia de variables sensibles como las credenciales del
 mapa (`GOOGLE_MAPS_API_KEY`) se realiza de manera aislada en el servidor bajo variables de entorno ocultas. El cliente consume del backend
 únicamente la clave de forma parametrizada y temporal, evitando fugas en repositorios públicos.
*   **Gestión Centralizada de la Configuración del Sistema:** Factores de diseño como delimitaciones geográficas, nombres de municipios 
del área metropolitana, colores de interfaces y límites máximos de carga se unifican en el archivo de políticas universal 
`src/shared/config.ts`, permitiendo alterar el comportamiento del ecosistema modificando parámetros simples sin alterar el código de
 los enrutadores.
*   **Manejo Elegante del Ciclo de Vida y Reconciliaciones No Invasivas:** La lógica híbrida de `RouteLifecycleManager` realiza 
actualizaciones amortizadas (JIT) que se ejecutan en background sobre peticiones cotidianas, evitando la saturación por polling 
innecesario de sockets o hilos bloqueantes en sistemas integrados.

---

## 18. Limitaciones Actuales

Sustentadas estrictamente por evidencia directa identificada en el repositorio de código:

1.  **Conexión Virtual OCR en Fase 1:** El proceso inteligente de OCR actual entrega datos base neutrales, funcionando como un andamiaje
 técnico y mock listo para la sustitución transparente por APIs reales viales de visión artificial.
2.  **Dependencia de la Hora del Servidor en daemon JIT:** La sincronización de estados depende de la coherencia del reloj del servidor 
de base de datos. Eventuales desfases de sistema en la nube podrían demorar o anticipar de forma milimétrica la actualización de viajes activos.
3.  **Geodecodificación Textual Directa:** El mapeo actual de trayectorias se nutre de cadenas tipadas por el usuario, sin validación 
viales cruzadas avanzadas por georreferencia poligonal real que certifique de forma estricta que las calles ingresadas pertenezcan 
físicamente de principio a fin a los municipios asignados fuera de la base textual provista.

---

## 19. Deuda Técnica Detectada

1.  **Carga Local de Archivos sin CDN de Almacenamiento:** El módulo de Multer escribe los soportes directamente en el disco duro efímero
 local (`./uploads`). En entornos distribuidos y escalables en la nube (como servidores Cloud Run de balanceo dinámico sin discos 
 persistentes adjuntos), los soportes almacenados localmente de esta manera podrían borrarse tras re-inicializaciones de contenedores 
 aleatorias, requiriendo su migración a repositorios remotos dedicados como Amazon S3 o Google Cloud Storage.
2.  **Repetición en lógicas de parseo relacional:** Ciertas porciones de routers ejecutan de forma recursiva bloques lógicos de 
deserialización manual `JSON.parse` de cadenas tipo `profileData` de usuarios, lo que en alto volumen de listados recurrentes de red 
podría consolidar costes de CPU marginales repetidos. Es aconsejable abstraer estas tareas bajo transformadores en hooks adaptables del ORM.
3.  **Falta de Pruebas Unitarias Automatizadas:** No se visualizan archivos declaratorios de Jest o Vitest para blindar matemáticamente
 algoritmos sensibles (como el evaluador quincenal de sábados rotativos de Pico y Placa o las exclusiones ACID de transacciones), 
 quedando expuesto a eventuales roturas funcionales silenciosas si se modifican lógicas de dominio en el futuro sin auditoría presencial.

### 19.1 Riesgos Arquitectónicos Futuros e Impactos de Negocio
Identificar los puntos de fractura tecnológica es indispensable para proyectar la aplicación de un MVP robusto hacia una solución 
empresarial de alta escala:

*   **Riesgo 1: Pérdida de Archivos por Almacenamiento Efímero Local (Disk Vulnerability):** Al depender del sistema de archivos local 
(`./uploads`) del contenedor para el SOAT y la licencia de conducir, cada reinicio del pod de Cloud Run debido a inactividad o balanceo 
de cargas borrará los documentos cargados físicamente. Esto resultará en que los administradores visualicen enlaces rotos y obligará a los
 conductores a volver a subir toda su documentación de tránsito para poder circular.
*   **Riesgo 2: Cuello de Botella y Saturación de Conexiones a PostgreSQL (Database Pooling):** En horas pico corporativas 
(ej. salida de las 5:00 PM), cuando miles de empleados interactúen con el mapa para buscar rutas y realicen solicitudes de cupos, el 
pool del driver básico `pg` de NodeJS puede sobrecargarse, incrementando drásticamente la latencia de las transacciones ACID y bloqueando
 hilos por timeout en sistemas Cloud Run.
*   **Riesgo 3: Inconsistencias de Sincronización JIT por Desfase de Relojes de Red (Lifecycle Out-of-sync):** La reconciliación automática
 de viajes se apoya completamente en los relojes de tiempo de Express y de la instancia administrada de PostgreSQL. Si el reloj de hilos 
 experimenta drift o microsegundos de desalineación horaria, las transiciones de estados de scheduled a `in_progress` o `completed` 
 podrían ocurrir antes de tiempo o fallar silenciosamente en transacciones en caliente.
*   **Riesgo 4: Fallos Silenciosos en Procesamiento Síncrono de OCR Virtual:** Procesar la lectura óptica simulada (u real) directamente
 en el hilo principal de ejecución Express expone al servidor a caídas por falta de memoria RAM ante ráfagas concurrentes de carga masiva
  de archivos pdf pesados, en ausencia de colas distribuidas no bloqueantes de tareas.
*   **Riesgo 5: Desconexiones Silenciosas de WebSockets en Entornos Multicluster:** La habilitación futura de comunicación instantánea
 (chats intermedios y mapas reactivos) con WebSockets requerirá una capa central de sincronización (ej. Redis Adapter) para evitar el 
 aislamiento de usuarios conectados a contenedores físicos distintos debido al balanceo aleatorio de Cloud Run.

---

## 20. Recomendaciones para una Versión 2.0

Para proyectar el sistema hacia un producto corporativo e internacionalizado de alta escala, se exponen estas mejoras específicas 
estructuradas por capas operacionales:

### Mejoras Prioritarias
1.  **Habilitación de Canales Reales de Vision OCR:** Sustituir la simulación de `OCRProcessor.ts` asociando el buffer de Multer con la
 API de Google Vision o Amazon Textract. Esto extraerá de manera automática la matrícula, vigencia del SOAT y categoría de la licencia 
 cargada físicamente y los contrastará automáticamente con los campos manuales.
2.  **Migración hacia Almacenamiento Remoto de Archivos (Object Storage):** Desarrollar un adaptador en Multer para remitir los archivos
 de SOAT de inmediato a Google Cloud Storage mediante un canal cifrado. Esto asegurará la persistencia perpetua de archivos y mantendrá 
 el contenedor local Docker completamente sin estados transitorios.

### Mejoras de Arquitectura
1.  **Implementación del Patrón Unit of Work / Repository Pattern completo:** Abstraer las consultas de transacciones y sentencias 
pesimistas de SQL directas que se ejecutan inline en los routers viales hacia repositorios modulares de dominio, facilitando el 
cambio de proveedor de base de datos o el testing paralelo con mocks.
2.  **Adición de validaciones vía DTOs y esquemas Zod rigurosos globales:** Ampliar las tipificaciones corporativas con validadores 
tipo DTO (Data Transfer Objects) tanto en red de entrada como de salida usando Zod de manera uniforme en la API, protegiendo al backend
 de payloads desestructurados de forma automática.

### Mejoras de Experiencia de Usuario
1.  **Optimización Rutas Terrestres Geodésicas en Mapa:** Integrar plenamente el servicio interactivo de Directions API de Google 
sobre la capa reactiva en el componente creador de rutas. Esto permitirá trazar visualmente el trayecto sugerido por calles óptimas
 metopolitanas y estimará de forma automatizada los minutos y la hora de arribo real basados en el tráfico metropolitano concurrente.
2.  **Notificaciones Websockets en Tiempo Real:** Reemplazar el ruteo pasivo clásico HTTP de alertas mediante un canal WebSocket 
estable (coordinado de acuerdo a los lineamientos estandarizados en las políticas del ecosistema). Propagará de manera instantánea y
 sonora las aprobaciones, cancelaciones de viajes o mensajería de chat internos mientras el colaborador conduzca el automóvil.

### Mejoras de Infraestructura
1.  **Integración de Test Runner Automatizados (CI/CD Pipelines):** Añadir Vitest o Jest configurado en un workflow de GitHub Actions
 que audite cada Pull Request enviado, validando la compilación, la adherencia a tipos estrictos de TypeScript y la integridad lógica
  de las variables climáticas de Pico y Placa antes de permitir cualquier implementación en producción.
2.  **Clustering de Conexiones de Base de Datos:** Configurar sistemas intermedios de pooling robustos como PgBouncer para optimizar
 el soporte recurrente y evitar cuellos de botella ante el incremento masivo de solicitudes concurrentes hechas por cientos de 
 colaboradores simultáneos de la organización.
