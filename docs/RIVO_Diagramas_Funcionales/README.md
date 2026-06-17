# 🚗 RIVO - Biblioteca Completa de Diagramas Funcionales

Bienvenidos a la biblioteca de documentación y diagramación funcional de **Rivo**, la solución corporativa de carpooling de **Sistemas y Computadores SYC S.A.** Este repositorio de diagramas proporciona una referencia exhaustiva, técnica y visual sobre el comportamiento, los procesos viales, los estados lógicos y las responsabilidades integradas en toda la plataforma.

---

## 📂 Estructura de la Biblioteca

La documentación está organizada de forma modular en las siguientes carpetas especializadas de descripción técnica:

| Carpeta | Descripción Técnica | Enlace Directo |
| :--- | :--- | :--- |
| **01_Arquitectura_General** | Flujo macro, capas técnicas, infraestructura, transaccionalidad robusta, control de condiciones de carrera y polling. | [Arquitectura_General.md](./01_Arquitectura_General/Arquitectura_General.md) |
| **02_Casos_De_Uso** | Modelado formal de las funciones y límites de los actores: Pasajero, Conductor y Administrador. | - [Pasajero](./02_Casos_De_Uso/Casos_Uso_Pasajero.md)<br>- [Conductor](./02_Casos_De_Uso/Casos_Uso_Conductor.md)<br>- [Administrador](./02_Casos_De_Uso/Casos_Uso_Administrador.md) |
| **03_Diagramas_Actividades** | Flujos de control, bifurcaciones de negocio, rutas de error, pre-validaciones del sistema y lógicas alternas de procesos. | - [Login](./03_Diagramas_Actividades/Actividad_Login.md)<br>- [Recuperación Contraseña](./03_Diagramas_Actividades/Actividad_Recuperacion_Contrasena.md)<br>- [Aprobación Documental](./03_Diagramas_Actividades/Actividad_Aprobacion_Documentos.md)<br>- [Habilitación Vehículo](./03_Diagramas_Actividades/Actividad_Aprobacion_Vehiculo.md)<br>- [Creación de Ruta](./03_Diagramas_Actividades/Actividad_Crear_Ruta.md)<br>- [Solicitud de Viaje](./03_Diagramas_Actividades/Actividad_Solicitud_Viaje.md)<br>- [Moderación Incidencias](./03_Diagramas_Actividades/Actividad_Moderacion_Reportes.md) |
| **04_Diagramas_Secuencia** | Ciclo de vida cronológico de peticiones, capas MVC, paso de tokens JWT, transacciones PostgreSQL y respuestas HTTP. | - [Login](./04_Diagramas_Secuencia/Secuencia_Login.md)<br>- [Reset Password](./04_Diagramas_Secuencia/Secuencia_ResetPassword.md)<br>- [Aprobación Documentos](./04_Diagramas_Secuencia/Secuencia_Aprobacion_Documentos.md)<br>- [Crear Ruta](./04_Diagramas_Secuencia/Secuencia_Crear_Ruta.md)<br>- [Solicitud Viaje](./04_Diagramas_Secuencia/Secuencia_Solicitud_Viaje.md) |
| **05_Diagramas_Estado** | Máquinas de estado finito de las entidades críticas de Rivo y sus transiciones. | - [Usuario](./05_Diagramas_Estado/Estado_Usuario.md)<br>- [Vehículo](./05_Diagramas_Estado/Estado_Vehiculo.md)<br>- [Documento](./05_Diagramas_Estado/Estado_Documento.md)<br>- [Ruta](./05_Diagramas_Estado/Estado_Ruta.md)<br>- [Reporte](./05_Diagramas_Estado/Estado_Reporte.md) |
| **06_BPMN** | Flujos formales de proceso de negocio cruzando carriles de Conductor, Pasajero, Sistema y Administrador. | - [Proceso General](./06_BPMN/BPMN_Rivo_Completo.md)<br>- [Registro Conductor](./06_BPMN/BPMN_Registro_Conductor.md)<br>- [Aprobación Documental](./06_BPMN/BPMN_Aprobacion_Documental.md)<br>- [Viaje Completo](./06_BPMN/BPMN_Viaje_Completo.md) |
| **07_Mapa_Procesos** | Jerarquía de Procesos del Monolito Modular: Estratégicos, Operativos y de Soporte de Rivo. | [Mapa_Procesos_Rivo.md](./07_Mapa_Procesos/Mapa_Procesos_Rivo.md) |
| **08_Matriz_RACI** | Cuadro de asignación de responsabilidades de tareas clave cruzando roles de la plataforma. | [Matriz_RACI_Rivo.md](./08_Matriz_RACI/Matriz_RACI_Rivo.md) |

---

## 🛠️ Tecnologías y Estándares de Diagramación

*   **UML 2.5 / BPMN 2.0:** Todas las especificaciones se alinean a las convenciones internacionales de diagramación de procesos y modelado UML.
*   **Mermaid.js:** Los diagramas se encuentran embebidos directamente mediante código renderizable compatible con el visor de Markdown de GitHub, facilitando su actualización en ramas de desarrollo sin romper formatos binarios.
*   **Consistencia de Datos:** Todos los nombres de campos (ej. `verified_status`), estados (ej. `scheduled`, `in_progress`), rutas de API (ej. `/api/routes/admin/users/create`) y tablas se corresponden rigurosamente con el código físico y la persistencia del monolito de Rivo.
