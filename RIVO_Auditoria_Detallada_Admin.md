# 🚗 RIVO - Auditoría Funcional Detallada (Fase 2)
### Panel de Administrador de Rivo (Operaciones, Analítica y Gobernanza)

Esta auditoría técnica y funcional describe minuciosamente el funcionamiento del módulo administrativo de Rivo. Aquí se analiza de qué 
manera el software gestiona la gobernanza del carpooling corporativo para la flota de colaboradores en Sistemas y Computadores SYC S.A.,
 garantizando la optimización de rutas, la validación documental y el control preventivo de riesgos.

---

## 🗺️ 1. Diagrama de Navegación del Administrador

La interfaz administrativa está protegida y se divide en dos grandes interfaces web (`AdminView` y `AdminAnalyticsView`), cada una con
 un sub-enrutamiento condicional basado en pestañas y pilares operativos:

```
                  [ Autenticación / JWT Secure Session ]
                             │ (Role Guard Check)
                             ▼
     ┌───────────────────────┴───────────────────────┐
     │                                               │
     ▼                                               ▼
[ PANEL DE OPERACIONES ]                    [ PANEL DE ANALÍTICA ]
(AdminView.tsx)                             (AdminAnalyticsView.tsx)
 ├── Tablero de Control                      ├── Vista Consolidada (Overview)
 ├── Monitoreo de Rutas                      ├── Crecimiento (Growth)
 ├── Gestión de Usuarios                     ├── Adopción (Adoption)
 ├── Registro de Vehículos                   ├── Cumplimiento (Compliance)
 ├── Auditoría de Documentos                 ├── Gobernanza (Governance)
 └── Moderación e Incidentes                 └── Reportes (Descarga PDF/Excel)
```

---

## 💼 2. Mapa de Responsabilidades del Rol Administrador

El sistema contempla una gradación de privilegios para salvaguardar acciones críticas y evitar errores de escala en el sistema corporativo.

| Responsabilidad / Acción | Pasajero | Conductor | Admin Estándar | Admin Master (admin@syc.com.co) |
| :--- | :---: | :---: | :---: | :---: |
| Registrar vehículo propio | Sí | Sí | No | No |
| Cargar SOAT / Licencia | Sí | Sí | No | No |
| Ver/Buscar rutas viales | Sí | Sí | Sí | Sí |
| Aprobar/Rechazar solicitudes de unión | No | Sí | No | No |
| Crear y registrar nuevos usuarios | No | No | Sí | Sí |
| Cambiar roles a otros usuarios | No | No | Parcial (solo Pasajero/Conductor) | **Sí (Todos, incluso promover a Admin)** |
| Suspender / Activar cuentas | No | No | Sí | **Sí (Inmune a ser suspendido)** |
| Aprobar / Rechazar SOAT y Licencias | No | No | Sí | Sí |
| Moderar / Resolver incidentes y reportes | No | No | Sí | Sí |
| Descargar Informes Ejecutivos Alta Dirección | No | No | Sí | Sí |

---

## 🛠️ 3. Auditoría de Pantallas: Panel de Operaciones (`AdminView.tsx`)

### PANTALLA 3.1: Tablero de Control Operacional (Dashboard)
*   **Nombre de la Pantalla:** Tablero de Control de Operaciones.
*   **Ruta exacta:** `/src/views/AdminView.tsx` (Pestaña `id === 'dashboard'`, renderiza el subcomponente `/src/components/DashboardTab.tsx`).
*   **Objetivo principal:** Brindar un resumen holístico, rápido y en tiempo real del estado de la plataforma al inicio de la jornada 
administrativa.
*   **Problema que resuelve:** Evita que el administrador tenga que consultar bases de datos manualmente brindando alarmas rápidas si 
existen vehículos pendientes por habilitación o incidentes violentados.
*   **Datos que consume:**
    *   Métricas de conteo general (total de usuarios, conductores, vehículos, solicitudes).
    *   Listas rápidas de auditorías y logs de auditoría general de cambios.
*   **Datos que modifica:** Ninguno directamente (es de carácter informativo).
*   **APIs que utiliza:** `GET /api/routes/admin/analytics/stats`.
*   **Consultas PostgreSQL asociadas:**
    ```sql
    -- Total de usuarios registrados
    SELECT COUNT(*), role FROM users GROUP BY role;
    -- Conteo de vehículos pendientes de habilitación vial
    SELECT COUNT(*) FROM vehicles WHERE verified_status = 'pending';
    -- Total de rutas viales activadas
    SELECT COUNT(*) FROM routes WHERE status = 'scheduled' OR status = 'in_progress';
    ```
*   **Permisos requeridos:** Rol `admin` o `admin_master` firmados en el Bearer token JWT de la cabecera.
*   **Riesgo estratégico de no existencia:** Demoras críticas en la incorporación de conductores corporativos y falta de visibilidad del 
volumen operativo del carpooling.

---

### PANTALLA 3.2: Supervisión de Rutas Públicas
*   **Nombre de la Pantalla:** Rutas del Sistema.
*   **Ruta exacta:** `/src/views/AdminView.tsx` (Pestaña `id === 'routes'`).
*   **Objetivo principal:** Monitorear todos los trayectos metropolitanos (origen, destino, horarios, cupos) publicados colectivamente.
*   **Problema que resuelve:** Control de sobrecupos, desvíos inusuales o rutas que coincidan con bloqueos de vías o emergencias metropolitanas.
*   **Datos que consume:**
    *   `routes.driverName`, `routes.origin`, `routes.destination`, `routes.vehiclePlate`, `routes.availableSeats`, `routes.departureTime`,
     `routes.status`.
*   **Datos que modifica:** Ninguno directamente (el conductor edita/cancela sus propios trayectos).
*   **APIs que utiliza:** Consume el almacén unificado del frontend (`useAppStore`), el cual sincroniza a través de: `GET /api/routes`.
*   **Consultas PostgreSQL asociadas:**
    ```sql
    SELECT r.*, u.profile_data->>'displayName' as "driverName", v.plate as "vehiclePlate"
    FROM routes r
    LEFT JOIN users u ON r.driver_id = u.id
    LEFT JOIN vehicles v ON r.vehicle_id = v.id
    WHERE r.is_active = true ORDER BY r.departure_time DESC;
    ```
*   **Permisos requeridos:** Rol `admin` o `admin_master`.
*   **Riesgo estratégico de no existencia:** Imposibilidad de auditar y garantizar la transparencia del cobro de tarifas de carpooling ni 
de responder ante incidentes en carretera.

---

### PANTALLA 3.3: Panel de Gestión de Usuarios y Roles
*   **Nombre de la Pantalla:** Gestión de Usuarios.
*   **Ruta exacta:** `/src/views/AdminView.tsx` (Pestaña `id === 'users'`).
*   **Objetivo principal:** Administrar de principio a fin los datos corporativos, accesos de rol y suspensiones temporales de cuentas.
*   **Problema que resuelve:** Retiro o despidos de colaboradores de SYC (eliminando o bloqueando accesos de inmediato), y prevención de 
fraude de cuentas.
*   **Datos que consume:**
    *   Colección completa de la entidad `users` (id, email, displayName, phone, rating, role, isDisabled).
*   **Datos que modifica:**
    *   Atributos `email`, `role`, `displayName`, `phone`, `password` (hasheado).
    *   Booleano de mitigación `isDisabled` en la tabla `users`.
*   **APIs que utiliza:**
    *   `GET /api/routes/admin/users/all`
    *   `POST /api/routes/admin/users/create`
    *   `PATCH /api/routes/admin/users/:id/edit`
    *   `PATCH /api/routes/admin/users/:id/toggle-status`
*   **Consultas PostgreSQL asociadas:**
    ```sql
    -- Creación de usuario corporativo
    INSERT INTO users (email, password, role, created_at) VALUES ($1, $2, $3, NOW());
    -- Suspensión o reactivación atómica de cuenta
    UPDATE users SET is_disabled = NOT is_disabled WHERE id = $1 RETURNING is_disabled;
    ```
*   **Permisos requeridos:**
    *   Para crear usuarios: Rol `admin` o `admin_master`.
    *   Para editar/suspender administradores: **Exclusiva de `admin_master`**. El sistema invalida por código si un admin estándar 
    intenta bloquear a un par.
*   **Riesgo estratégico de no existencia:** Fuga de información por cuentas huérfanas de ex-empleados y vulneración de la seguridad 

---

### PANTALLA 3.4: Aprobación del Parque Vehicular (Garaje General)
*   **Nombre de la Pantalla:** Habilitación de Vehículos.
*   **Ruta exacta:** `/src/views/AdminView.tsx` (Pestaña `id === 'vehicles'`).
*   **Objetivo principal:** Verificar las características mecánicas y placas de los carros/motos inscritos antes de darles vía libre 
de publicación de trayectos.
*   **Problema que resuelve:** Evita que se ofrezcan viajes en vehículos en mal estado, con placas no registradas o tipos de automotores
 inapropiados para la seguridad laboral.
*   **Datos que consume:**
    *   Registros de la tabla `vehicles` (brand, model, plate, color, type, verifiedStatus, rejectReason).
*   **Datos que modifica:** Atributo `verified_status` ('approved' | 'rejected') y `reject_reason`.
*   **APIs que utiliza:**
    *   `GET /api/routes/admin/vehicles/all`
    *   `POST /api/routes/admin/vehicles/:id/verify`
*   **Consultas PostgreSQL asociadas:**
    ```sql
    -- Aprobación física del vehículo en tránsito
    UPDATE vehicles SET verified_status = 'approved', verified_at = NOW(), verified_by = $1 WHERE id = $2;
    -- Rechazo catalogado con motivo descriptivo
    UPDATE vehicles SET verified_status = 'rejected', reject_reason = $1, verified_by = $2 WHERE id = $3;
    ```
*   **Permisos requeridos:** Rol `admin` o `admin_master`.
*   **Riesgo estratégico de no existencia:** Tránsito de vehículos ilegales o inadecuados, derivando en eventuales accidentes sin 
cobertura corporativa de seguros.

---

### PANTALLA 3.5: Auditoría Documental Contextual (SOAT, Licencias y Tecnomecánica)
*   **Nombre de la Pantalla:** Control Documental.
*   **Ruta exacta:** `/src/views/AdminView.tsx` (Pestaña `id === 'documents'`).
*   **Objetivo principal:** Revisar individualmente la veracidad y vigencia de las pólizas SOAT, las licencias de conducción de tránsito
 y los certificados tecnomecánicos de los choferes acreditados.
*   **Problema que resuelve:** Pasivos legales corporativos de Sistemas y Computadores SYC. Permite validar visual y digitalmente las 
fechas exactas de expiración de cada documento viales.
*   **Datos que consume:**
    *   Registros de `user_documents` (para licencias) y `vehicle_documents` (para SOAT/Tecno), incluyendo URL física del archivo 
    cargado, estado de OCR confianza, placa identificada y fechas.
*   **Datos que modifica:** `status` ('approved' | 'rejected') y `reject_reason` de los documentos viales.
*   **APIs que utiliza:**
    *   `GET /api/routes/admin/documents/all`
    *   `POST /api/routes/admin/documents/:sourceType/:id/verify`
*   **Consultas PostgreSQL asociadas:**
    ```sql
    -- Ejemplo para aprobar una Licencia de Conducir cargada
    UPDATE user_documents SET status = 'approved', verified_at = NOW(), verified_by = $1 WHERE id = $2;
    -- Registrar veredicto de rechazo en SOAT de un vehículo
    UPDATE vehicle_documents SET status = 'rejected', reject_reason = $1, verified_by = $2 WHERE id = $3;
    ```
*   **Permisos requeridos:** Rol `admin` o `admin_master`.
*   **Riesgo estratégico de no existencia:** Demanda civil o penal contra la empresa si un colaborador sufre un percance físico a 
bordo de un coche corporativo con SOAT o tecnomecánica vencida.

---

### PANTALLA 3.6: Moderación de Conductas e Incidentes (Gobernanza)
*   **Nombre de la Pantalla:** Moderación y Seguridad.
*   **Ruta exacta:** `/src/views/AdminView.tsx` (Pestaña `id === 'moderation'`).
*   **Objetivo principal:** Recibir denuncias de conductores o pasajeros, analizar los registros de uso y penalizar malas conductas.
*   **Problema que resuelve:** Acoso, cobros indebidos, retrasos recurrentes, comportamiento indecoroso o conducción imprudente en las 
rutas de carpooling.
*   **Datos que consume:**
    *   Colección `reports` (id, reporterId, reportedUserId, reason, description, status, createdAt).
    *   Colección `admin_logs` de auditoría interna de control.
*   **Datos que modifica:** Atributo `status` ('pending' | 'reviewing' | 'resolved' | 'dismissed') en el reporte seleccionado.
*   **APIs que utiliza:**
    *   `GET /api/routes/admin/reports/all`
    *   `POST /api/routes/admin/reports/create`
    *   `PATCH /api/routes/admin/reports/:id/status`
    *   `GET /api/routes/admin/logs/all`
*   **Consultas PostgreSQL asociadas:**
    ```sql
    -- Actualizar el estado de atención de la incidencia
    UPDATE reports SET status = 'resolved', updated_at = NOW() WHERE id = $1;
    -- Generar log administrativo para rendición de cuentas
    INSERT INTO admin_logs (admin_id, action, target_id, details) VALUES ($1, 'user_suspended', $2, $3);
    ```
*   **Permisos requeridos:** Rol `admin` o `admin_master`.
*   **Riesgo estratégico de no existencia:** Deterioro del clima corporativo, desconfianza en la plataforma, alta tasa de abandono de
 uso y desprotección física de colaboradores.

---

## 📊 4. Auditoría de Pantallas: Panel de Analítica (`AdminAnalyticsView.tsx`)

### PANTALLA 4.1: Dashboard General de Inteligencia de Negocio
*   **Nombre de la Pantalla:** Reporte Analítico de Movilidad.
*   **Ruta exacta:** `/src/views/AdminAnalyticsView.tsx`.
*   **Objetivo principal:** Presentar cifras globales de rendimiento operacional a través de cartas ejecutivas y mapas dinámicos.
*   **Problema que resuelve:** Descoordinación de datos. Suministra indicadores clave listos para presentaciones grupales de junta directiva.
*   **Datos que consume:** Métricas agrupadas en memoria del servidor (promedio de rating, emisiones CO2 mitigadas, pasajeros únicos).
*   **APIs que utiliza:** `GET /api/routes/admin/analytics/stats`.
*   **Consultas PostgreSQL asociadas:**
    ```sql
    -- SQL para el cálculo matemático aproximado de CO2 mitigado
    -- Se estima un ahorro promedio de 2.4 kg de CO2 por cada trayecto de carpooling completado con tripulación
    SELECT count(id) * 2.4 as "co2Ahorrado" FROM routes WHERE status = 'completed';
    ```
*   **Permisos requeridos:** Rol `admin` o `admin_master`.

---

### PANTALLA 4.2: Descarga de Reportes y Cierre de Auditorías (Alta Dirección)
*   **Nombre de la Pantalla:** Centro de Reportes Ejecutivos.
*   **Ruta exacta:** `/src/views/AdminAnalyticsView.tsx` (Pilar `selectedPillar === 'reports'`).
*   **Objetivo principal:** Exportar reportes detallados y consolidados de la base operativa a formatos físicos universales (Excel `.xlsx`
 y PDF de alta calidad).
*   **Problema que resuelve:** Facilita la rendición de cuentas formal de movilidad corporativa frente a auditores externos, Ministerio de
 Transporte o Comité de Tránsito Vial Colombiano.
*   **Datos que consume:** Consolida el total acumulado de las tablas `users`, `vehicles`, `vehicle_documents`, `user_documents`, `routes`
 y `reports` estructuradamente.
*   **APIs que utiliza:** `GET /api/routes/admin/reports/executive`.
*   **Librerías involucradas:** `jspdf` para diagramar y compilar los folios de PDF vectoriales, y `xlsx` para la conversión tabular limpia.
*   **Riesgo de no existencia:** Bloqueo de auditorías empresariales, imposibilidad de respaldar datos operativos fuera de línea y flujos
 de trabajo burocráticos engorrosos.

---

## 🔘 5. Catálogo Detallado de Acciones y Controles (Auditoría de Botones)

| Elemento Visual (Nombre) | Función del Control | Redirección / Componente | Proceso en Servidor | Cambio de Estado Realizado | Beneficio
 Operacional |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **"Crear Nuevo Usuario"** | Registra cuentas corporativas | Abre modal `showCreateUserModal` | `POST /admin/users/create` | Inserta 
nueva fila en la tabla `users` | Permite alta rápida sin depender de auto-registro del empleado. |
| **"Editar"** (Usuario) | Modifica nombres, teléfonos o asignación de rol | Abre modal `showEditUserModal` | `PATCH /admin/users/:id/edit` 
| Modifica perfil del usuario | Corrige imprecisiones de datos en campo. |
| **"Suspender" / "Reactivar"** | Bloquea o reactiva el ingreso seguro de un usuario | Ninguno (Notificación rápida Toast) 
| `PATCH /admin/users/:id/toggle-status` | Alterna booleano `isDisabled` | Elimina amenazas e infractores del sistema JIT. |
| **"Habilitar Vehículo"** | Aprueba coche para entrar a circulación | Modal detalles del vehículo | `POST /admin/vehicles/:id/verify` 
| Cambia `verified_status` a `approved` | Amplía la flota de carpooling de manera legal. |
| **"Rechazar Vehículo"** | Declara no apto un coche especificando motivo | Modal detalles del vehículo | `POST /admin/vehicles/:id/verify` 
| Cambia estatus a `rejected`, asigna `reject_reason` | Aísla coches de baja seguridad de manera asertiva. |
| **"Aprobar"** (Documento) | Valida visualmente SOAT, Licencia o Tecnomecánica | Modal de previsualización 
| `POST /admin/documents/:sourceType/:id/verify` | Cambia estado a `approved` en `user_documents` 
| Garantiza viabilidad de seguros estatales en las vías. |
| **"Rechazar"** (Documento) | Rechaza credencial ilegible o expirada con motivo | Modal de previsualización 
| `POST /admin/documents/:sourceType/:id/verify` | Cambia a `rejected` en `user_documents` | Obliga al colaborador a corregir la carga subida. 
|
| **"Resolver"** (Incidencia) | Cierra un caso registrado por la comunidad | Ficha de Moderación | `PATCH /admin/reports/:id/status` 
| Cambia `status` a `resolved` | Descongestiona el buzón de quejas laborales. |
| **"Descargar PDF"** | Genera acta formal de movilidad | Descarga asíncrona local | Ejecuta backend JIT executive | Genera reporte de 
3 páginas con sello corporativo | Suministra balances listos para comités de transportes. |

---

## 📈 6. Taxonomía de Métricas de Negocio y Fórmulas de Cálculo

Las siguientes métricas alimentan la inteligencia vial de Sistemas y Computadores SYC S.A. en el panel `AdminAnalyticsView`:

### 6.1. Tasa de Cumplimiento Documental Flota (Semaforización)
*   **Origen de Datos:** Tablas `user_documents` (licencias) y `vehicle_documents` (SOAT y revisiones tecnomecánicas).
*   **Significado:** Porcentaje de credenciales obligatorias para conducir que están aprobadas y vigentes en el sistema con respecto 
a todas las que se han cargado.
*   **Fórmula Matemática:**
    $$\text{Tasa de Cumplimiento} = \left( \frac{\text{Docs Aprobados y Vigentes}}{\text{Total de Documentos Registrados}} \right) \times 100$$
*   **Propósito Gerencial:** Determinar la exposición civil de la empresa ante accidentes y el rigor administrativo y regulatorio de 
la aplicación.

### 6.2. Estimado de Huella Ecológica (Mitigación CO2)
*   **Origen de Datos:** Tabla `routes` (rutas viales completadas en estado `completed`).
*   **Significado:** Cantidad acumulada de emisiones de dióxido de carbono que se evitaron liberar al aire gracias a que los 
colaboradores viajaron compartiendo vehículo en lugar de hacerlo en automóviles separados (calculado sobre el promedio de 16 km por
 trayecto metropolitano en el AMB).
*   **Fórmula Matemática:**
    $$\text{CO}_2\text{ Evitado (kg)} = \text{Viajes Completados} \times 2.4 \text{ kg}$$
*   **Propósito Gerencial:** Aportar datos duros y cuantificables al Balance de Sostenibilidad de la empresa y los planes de 
Responsabilidad Social Empresarial (RSE).

### 6.3. Índice de Ocupación Promedio de Rutas
*   **Origen de Datos:** Tabla `routes` y `join_requests`.
*   **Significado:** Nivel medio de eficiencia de uso de los asientos disponibles provistos por los conductores comunitarios. 
Simboliza qué tan optimizado va cada viaje promedio.
*   **Fórmula Matemática:**
    $$\text{Eficiencia Ocupación} = \frac{\sum (\text{Cupos Totales} - \text{Cupos Disponibles})}{\sum \text{Cupos Totales}}$$
*   **Propósito Gerencial:** Diseñar incentivos para que más empleados se postulen a un mismo coche, rentabilizando al máximo cada
 gota de gasolina invertida.

---

## 🔄 7. Flujo de Trabajo Completo del Administrador

Para entender la correspondencia de responsabilidades del rol, a continuación se grafica secuencia a secuencia el caso de un conductor
 postulante:

```
[ Colaborador ] Registra vehículo e ingresa fotografías físicas de licencia y SOAT.
       │
       ▼ (El estado entra como 'pending')
[ Servidor ] Almacena en ./uploads y corre OCR de lectura de placas colombianas viales.
       │
       ▼ (Notificación de alerta en el Tablero del Administrador)
[ Administrador ] Accede a "Documentos", abre previsualizador y constata los datos legibles.
       │
       ├─► [ RECHAZO ]: Especifica falla (ej. "SOAT Expitado") ──► Re-postulación requerida.
       │
       └─► [ APROBACIÓN ]: Habilita el carro atómicamente.
               │
               ▼
[ Servidor ] Permite al Conductor programar su primera ruta metropolitana Rivo.
               │
               ▼ (Evaluación en tiempo de ejecución del Pico y Placa)
[ Servidor ] Emite diagnóstico de tránsitos locales del AMB en America/Bogota.
```

---

## 🔍 8. Funcionalidades Redundantes o Poco Utilizadas

*   **Doble paso de verificación (Vehículo vs. Documento del Vehículo):** El sistema exige aprobar el vehículo (`vehicles`) y por
 separado el SOAT del vehículo (`vehicle_documents`). En un flujo más eficiente, la aprobación de la entidad del auto debería 
 autogestionarse al momento de dar visto bueno al SOAT, reduciendo a la mitad los clics requeridos para habilitar un nuevo conductor.
*   **Modo Admin vs. Panel de Analítica en Rutas Separadas:** Actualmente, el control de la analítica se visualiza en un componente
 alterno (`AdminAnalyticsView`) mientras que la operación general está en `AdminView`. Una integración armónica unificaría los KPI
  consolidados directamente bajo una sección o pestaña central de Analítica de `AdminView` para no forzar la redirección horizontal.

---

## 💡 9. Propuestas de Nuevas Funcionalidades (Oportunidades de Negocio)

*   **Aprobación OCR Asistida por Inteligencia Artificial:** Integrar un pipeline OCR en tiempo de revisión que coteje la información
 leída del PDF con los campos tipados, marcando discrepancias de nombres o fechas de forma completamente automática con semáforos 
 inteligentes de control.
*   **Alertas Tempranas Push de Expiración Próxima:** Generar notificaciones automáticas y alertas SMS para conductores viales cuyas pólizas
 o licencias expiren en menos de 7 días, notificándoles que de no actualizarse, su perfil y vehículo serán degradados preventivamente de
  forma sistemática.
*   **Consolidación de Liquidación de Compartidos Corporativos:** Un módulo contable para calcular las cuotas viales compartidas
 acumuladas por mes para cada colaborador y generar outputs para descuento de nómina directa, eliminando las transferencias
  individuales de efectivo viales.
