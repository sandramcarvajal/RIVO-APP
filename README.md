# 🚗 Progreso y Evolución de Rivo

Rivo nació como una idea enfocada en resolver una necesidad real de movilidad compartida, especialmente en entornos urbanos y corporativos donde 
muchas personas realizan trayectos similares diariamente. Más que crear únicamente una aplicación de transporte, el objetivo desde el inicio fue 
construir una plataforma inteligente, escalable y profesional que permitiera conectar personal de SYC de manera segura, organizada y eficiente.

A medida que el proyecto fue creciendo, Rivo evolucionó de un prototipo básico hacia una arquitectura mucho más sólida y cercana a estándares de 
producción reales. Actualmente, el sistema ya cuenta con funcionalidades operativas como autenticación de usuarios, gestión de perfiles, registro 
de vehículos, publicación y gestión de rutas, solicitudes de pasajeros, notificaciones persistentes, lifecycle completo de viajes, calificaciones 
y una API propia de Pico y Placa enfocada inicialmente en el área metropolitana de Bucaramanga.

Uno de los principales objetivos durante el desarrollo ha sido evitar una arquitectura improvisada. Por esa razón, decidí implementar principios 
de Clean Architecture y Modular Monolith, buscando que cada módulo tenga responsabilidades claras, separación lógica y facilidad de mantenimiento 
a largo plazo. Esto ha permitido que funcionalidades como rutas, solicitudes, notificaciones y calificación puedan evolucionar sin afectar gravemente 
otras partes del sistema.

Para el frontend decidí trabajar con React, TypeScript y Vite. React me permitió construir una interfaz dinámica, reutilizable y moderna, mientras 
que TypeScript aporta tipado fuerte y reduce errores en el desarrollo conforme la aplicación crece en complejidad. Vite fue elegido por su rapidez 
en desarrollo, compilación eficiente y experiencia moderna para proyectos escalables.

En el backend opté por Node.js y Express debido a su flexibilidad, velocidad de desarrollo y excelente integración con aplicaciones modernas basadas 
en JavaScript/TypeScript. Esto también facilita compartir tipos, enums y estructuras entre frontend y backend, logrando una sincronización mucho 
más consistente.

Como sistema de base de datos se eligió PostgreSQL junto con Drizzle ORM. PostgreSQL ofrece robustez, integridad y escalabilidad para manejar 
relaciones complejas y persistencia real de datos. Por su parte, Drizzle ORM permitió trabajar con una arquitectura tipada y cercana al SQL real,
 manteniendo control sobre el esquema y mejorando la mantenibilidad del proyecto.

Durante el desarrollo también se han enfrentado y solucionado múltiples desafíos técnicos reales, como:

* **Sincronización de estados** entre frontend y backend.
* **Persistencia de sesión** mediante JWTs e implementación de flujo de restauración síncrona.
* **Manejo de lifecycle de rutas** de forma determinista mediante transiciones "Just-In-Time" (JIT).
* **Validaciones de negocio** robustas tanto en cliente como en servidor (ej. placa vehicular, licencias compatibles).
* **Protección contra race conditions** y sobreventa de cupos concurrentes.
* **Inconsistencias entre tipos de datos** solucionadas mediante adaptadores y tipado estricto extremo con TypeScript.
* **Estabilización del sistema de notificaciones** contextualizadas e instantáneas para conductores y pasajeros.
* **Eliminación total de datos mock** para usar una base de datos relacional de producción.
* **Integración nativa de Google Maps Platform** con geocodificación, autocompletado y trazado de polilíneas.
* **Manejo de restricciones de Pico y Placa** automatizado con alertas visuales preventivas y bloqueos tácticos en API.

Actualmente, Rivo ya se encuentra en una etapa mucho más madura donde no solo se piensa en “hacer funcionar” una funcionalidad, sino en cómo 
construir un sistema estable, seguro, intuitivo y preparado para crecer en el futuro.

La visión final de Rivo es convertirse en una plataforma inteligente de movilidad corporativa, integrando automatización, calificación, análisis 
de movilidad, validaciones de tránsito y una experiencia premium tanto para conductores como pasajeros.

---

## 🛠️ Estructura Completa del Sistema

La arquitectura global de Rivo está dividida bajo un concepto full-stack unificado por TypeScript, lo que reduce la fricción en la compartición 
de modelos de negocio y tipos. Se compone de cuatro ejes fundamentales bien estructurados:

### 1. El Frontend (Cliente React SPA)
Construido como una Single Page Application (SPA), está diseñado para reaccionar fluidamente a los cambios de estado en el backend sin sobrecargar 
la red corporativa.

* **Capa de Interfaces de Usuario (Views & Components):** Pantallas modulares como `ExploreView`, `CreateRouteView`, `ProfileView`, `RouteDetailView`
 y `Dashboard`. Cuenta con un set rico de componentes atómicos en `/src/components/ui/` (tarjetas, botones, selectores, toast de avisos, popups de
  reviews) y estructuras completas como `MapContainer` y `MyGarage`.
* **Capa de Estado y Sincronización (Context API + Polling):** Centralizado en `AppContext.tsx` y `AuthContext.tsx`. Para resolver la latencia en
 redes móviles y garantizar que los usuarios conozcan el estado de su viaje o notificaciones de inmediato, el cliente implementa un sistema 
 de **polling coordinado cada 10 segundos** que actualiza las rutas activas, solicitudes y notificaciones en segundo plano.
* **Control de Doble Envío (Exclusión Visual y Mutable):** Los componentes visuales bloquean los botones de acción mediante estados `isLoading` 
o `isSubmitting`. De forma complementaria, el proveedor global emplea locks mutables en memoria (`lockRef`) para evitar el solapamiento o duplicación
 de peticiones de red simultáneas ante un doble click rápido.
* **Consumo Encapsulado (`SecureHttpClient`):** Interceptor Axios/Fetch que extrae el JWT del almacenamiento del cliente, inyectándolo de manera 
transparente en las cabeceras HTTP de autenticación (`Authorization: Bearer <token>`).

### 2. El Backend (Servidor Express & Modular Monolith)
Implementa un diseño modular por dominios de negocio localizado en `src/server/modules`, promoviendo un desacoplamiento claro y la implementación 
de casos de uso consistentes.

* **Estructura por Dominios Lógicos:**
  * **`auth`:** Gestión de inicio de sesión, registro corporativo y asignación de JWTs.
  * **`vehicles`:** Gestión del garaje del colaborador, estados de SOAT, vigencias y activaciones.
  * **`routes`:** Creación de viajes, búsqueda geográfica, geocodificación y lógica de trazado vial de Google.
  * **`requests`:** Ciclo transaccional de postulación de pasajeros, cobro de asientos y estado de aprobación.
  * **`reviews`:** Evaluaciones comunitarias con cálculo de promedios para incentivar el buen comportamiento.
  * **`notifications`:** Envío y persistencia de avisos contextualizados para alertas de viaje.
* **Seguridad y Acceso Filtrado:** Middlewares robustos como `authMiddleware` (interceptor y verificador de firmas de tokens JWT) y `roleGuard`
 (evaluador jerárquico de permisos de usuario, ej. chóferes/administradores).
* **Manejo Centralizado de la Zona Horaria Colombiana (`America/Bogota`):** Las discrepancias horarias entre servidores de producción 
(ej. nubes configuradas en UTC-0) y celulares de pasajeros se resuelven centralizando el cálculo temporal. Toda fecha/hora ingresada por el 
conductor o calculada por el servidor se manipula a través de `Intl.DateTimeFormat` configurado para Colombia en `src/shared/timezone.ts`, 
garantizando consistencia absoluta.

### 3. Persistencia de Datos (PostgreSQL + Drizzle ORM)
Rivo utiliza un motor de almacenamiento relacional de alta fidelidad, asegurando transacciones ACID y la protección de datos históricos.

* **Esquema Relacional Establecido (`src/db/schema.ts`):**
  * `users`: Cuentas de colaboradores de SYC con email único indexado y campos tipados.
  * `vehicles` y `vehicle_documents`: Parque automotor del conductor y documentos reglamentarios de tránsito (SOAT).
  * `user_documents`: Licencias dadas de alta por conductores con categoría y vigencia controlada.
  * `routes`: Ofertas viales con coordenadas de trazado, polilíneas de dibujo de mapa y cupos libres.
  * `join_requests`: Historial de asignación y postulaciones de pasajeros con estados tipados (`pending`, `accepted`, `rejected`, `cancelled`).
  * `notifications`: Historial persistente de avisos útiles para el usuario con control de lectura.
  * `ratings`: Almacena el feedback y puntuación otorgada por los usuarios para cada trayecto completado.
* **Garantía ACID contra el Bypass de Doble Reserva (Race Conditions):** Cuando dos pasajeros postulan concurrentemente por el último puesto 
disponible de un vehículo, el sistema utiliza aislamiento transaccional y bloqueos físicos de fila en base de datos. Se ejecuta un `FOR UPDATE`
 sobre la ruta y se aplica un decremento atómico seguro:
  `UPDATE routes SET available_seats = available_seats - 1 WHERE id = :routeId AND available_seats > 0`
  Si la fila no es modificada (cupos agotados justo antes por una reserva competidora), la transacción causa un **ROLLBACK** e informa al cliente,
   impidiendo la sobreventa.
* **Desactivación Lógica (`is_active`):** Para proteger la integridad referencial y las llaves foráneas (`Foreign Keys`), los vehículos no se 
eliminan físicamente de la base de datos al ser cancelados por un usuario. Rivo aplica un borrado lógico permutando la bandera `isActive` a `false`.
 Esto previene fallos por registros huérfanos en rutas históricas mientras los quita del menú de selección futura del garaje.

### 4. APIs Integradas
* **Google Maps Platform:** La clave privada del SDK se resguarda de forma segura en el archivo de entorno del backend. El cliente la solicita al
 montarse (`GET /api/maps/config`) usando un canal autenticado. Integra:
  * *Places Autocomplete:* Formulario con predicciones de direcciones en el Área Metropolitana de Bucaramanga.
  * *Geocoding API:* Resolución de textos a coordenadas espaciales `lat` y `lng`.
  * *Directions API:* Trazado inteligente del camino vial que genera un string polilínea. El cliente de Rivo recibe esta polilínea y la dibuja 
  dinámicamente sobre el plano interactivo.
* **API de Pico y Placa Metropolitano (`BucaramangaMetroPolicy.ts`):** Rutina inteligente que extrae descriptivamente el último dígito numérico 
de la patente (independiente de si es carro particular o motocicleta) y contrasta los días de la semana (Lunes a Viernes de 06:00 AM a 08:00 PM). 
Si detecta restricción, despliega advertencias interactivas en frontend y cancela con un error `400` cualquier intento de publicación física en 
base de datos.

---

## 📂 Organización de Carpetas y Código Fuente

El proyecto sigue una estructura limpia, ordenada y modular basada en la separación estricta de responsabilidades:

```
Rivo/
├── drizzle/                  # Migraciones SQL autogeneradas por Drizzle ORM
├── src/                      # Carpeta raíz del desarrollo principal
│   ├── client/               # Capa Frontend - Controladores y servicios HTTP
│   │   ├── hooks/            # Gancho de llamadas React reutilizables
│   │   └── services/         # Encapsulamiento de peticiones API (SecureHttpClient)
│   ├── components/           # Componentes React de interfaz
│   │   ├── layout/           # Estructuras visuales globales (Header, Sidebar)
│   │   ├── ui/               # Botones, tarjetas, badges, popups, inputs
│   │   ├── MapContainer.tsx  # Componente unificado de Google Maps
│   │   └── MyGarage.tsx      # Panel dinámico de administración de vehículos
│   ├── context/              # Sostenedores del estado de React (AppContext, AuthContext)
│   ├── db/                   # Capa del modelo y ORM
│   │   ├── index.ts          # Inicializador de la conexión a PostgreSQL con Drizzle
│   │   └── schema.ts         # Contrato formal de tablas, relaciones y llaves
│   ├── hooks/                # Hooks globales y gestores de tamaño de DOM
│   ├── lib/                  # Utilidades comunes y selectores de coincidencia
│   ├── server/               # Capa de Backend Express estructurada por módulos
│   │   └── modules/          # Carpetas de dominio: auth, routes, requests, reviews, etc.
│   ├── shared/               # Lógica, constantes y validadores compartidos por cliente/servidor
│   │   ├── config.ts         # Coordenadas Bucaramanga, esquemas cromáticos, OCR umbral
│   │   ├── timezone.ts       # Orquestador estricto de fechas (timezone America/Bogota)
│   │   └── validators.ts     # Regex y formatters de patentes vehiculares colombianas
│   ├── views/                # Pantallas principales del flujo SPA
│   └── types.ts              # Declaraciones formales de Tipos globales
├── server.ts                 # Archivo de inicio del servidor web Express (punto de entrada)
├── package.json              # Manifiesto de dependencias, scripts de build y ejecución
└── vite.config.ts            # Configurador del compilador y assets de Vite
```

---

## 📈 Ciclo de Vida de Trayectos (Lifecycle JIT)

Las rutas de Rivo avanzan deterministamente a través de cuatro estados definidos en la máquina de estados: `scheduled` ➔ `in_progress` 
➔ `completed` o `cancelled`.

Para actualizar de forma robusta los trayectos sin arriesgarse a que los temporizadores tradicionales (ej. CRON) de un contenedor inactivo en la 
nube se congelen, se implementa el **Lifecycle JIT (Just-In-Time):**

1. Antes de realizar cualquier consulta sensible a base de datos (listar rutas, solicitar unión, rechazar pasajeros), el servidor invoca en 
cascada a `RouteLifecycleManager.performJitTransitions()`.
2. El sistema calcula en milisegundos la hora local colombiana actual de Bogotá contra el tiempo planificado de salida del viaje.
3. Si la fecha actual superó la hora del viaje programado, se actualiza el estado a `in_progress` en base de datos.
4. Si la fecha actual superó la hora del viaje más un margen urbano protector de 3 horas, el trayecto se actualiza a `completed`, liberando de 
forma determinista el flujo para que los pasajeros emitan sus calificaciones viales, sin depender de un daemon cron continuo en segundo plano.

---

## 🚀 Guía de Instalación y Uso Rápido

Siga estos sencillos pasos para tener la infraestructura de Rivo corriendo localmente en su máquina en pocos instantes:

### 1. Clonar e Instalar Dependencias
Instale todos los componentes y librerías de Node declaradas en el manifiesto ejecutando:
```bash
npm install
```

### 2. Configurar Variables de Entorno `.env`
Duplique el archivo de variables demostrativas de la raíz:
```bash
cp .env.example .env
```
Y configure las credenciales correspondientes a su base de datos local y API Keys externas:
```env
DATABASE_URL=postgresql://usuario:clave@localhost:5432/rivo_db
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key_privada
GEMINI_API_KEY=tu_gemini_api_key_personal
```

### 3. Iniciar en Modo de Desarrollo
Lance el servidor Express y el middleware reactivo de Vite en paralelo, sirviendo de manera nativa sobre el puerto configurable oficial 3000:
```bash
npm run dev
```

### 4. Compilar y Arrancar para Producción
Vite transpila y comprime el frontend en `/dist`, mientras que un script automatizado unifica e integra el servidor TypeScript en un único módulo 
optimizado en formato CommonJS (`dist/server.cjs`):
```bash
npm run build
npm run start
```

---

*Proyecto diseñado y desarrollado por Sandra Carvajal.
.*
