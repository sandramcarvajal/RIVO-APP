# ⚙️ Diagrama de Actividad - Creación de Ruta

Este documento modela el core del subsistema de tránsitos de Rivo: la programación segura de trayectos de carpooling evaluando el Pico y Placa de forma activa y en tiempo de ejecución.

---

## 📋 1. Ficha del Registro de Rutas

*   **Objetivo:** Agendar el trayecto de carpooling, verificar que se realice en un coche habilitado y certificar el cumplimiento de normativas de Pico y Placa del Área Metropolitana de Bucaramanga.
*   **Actores:** Conductor, Backend Express, PostgreSQL.
*   **Tabla implicada:** `routes`, con zona horaria estricta `America/Bogota`.

---

## 🗺️ 2. Diagrama de Actividad (Mermaid)

```mermaid
flowchart TD
    Start([Inicio: Conductor pulsa Crear Ruta]) --> SelectCar[Seleccionar vehículo del garaje]
    SelectCar --> CarStatusCheck{¿El vehículo está en estado approved?}
    
    CarStatusCheck -- No --> AlertDeny[Alerta: El vehículo debe estar aprobado de forma administrativa] --> SelectCar
    CarStatusCheck -- Sí --> InputRoute[Suministrar origen, destino, precio, asientos, fecha y hora]
    
    InputRoute --> TimeCheck{¿La fecha de salida es futura?}
    TimeCheck -- No --> AlertFuture[Alerta: Programe con al menos 30 minutos de antelación] --> InputRoute
    
    TimeCheck -- Sí --> InterceptAPI[Llamar Use Case CheckCirculation en Backend]
    
    InterceptAPI --> ExtractPlate[Identificar último dígito de la placa de PostgreSQL]
    ExtractPlate --> RunPolicies[Consultar Restricción BucaramangaMetroPolicy]
    
    RunPolicies --> PyP_Cruce{¿Infracciona restricción Pico y Placa del AMB?}
    
    PyP_Cruce -- Sí --> DB_Deny[Rechazar Inserción: Vehículo restringido por Pico y Placa] --> AlertDeny
    
    PyP_Cruce -- No --> SaveRouteDB[Insertar Ruta en routes status = 'scheduled']
    
    SaveRouteDB --> NotifyCommunity[Disparar alerta a pasajeros en zonas aledañas]
    NotifyCommunity --> RenderOnMap[Publicar trayecto en el buscador del MapContainer] --> End([Ruta Publicada Exitosamente])
```

---

## 📝 3. Explicación de la Lógica "BucaramangaMetroPolicy"

1.  **Sincronización del Huso Horario:** Toda la valuación se somete de forma estricta a la zona horaria colombiana `America/Bogota` (`src/shared/timezone.ts`), solucionando inconsistencias si el backend procesa fechas en hora UTC tradicional de la nube.
2.  **Sábado Rotativo:** Se calcula el día de la semana. Especial atención se presta al sábado, donde la restricción del AMB rota y opera en horarios distintos al ciclo tradicional de lunes a viernes (ej. de 9:00 a.m. a 1:00 p.m.).
3.  **Prevención de API Directa:** No es posible sortear esta lógica realizando peticiones directas HTTPS con librerías ajenas (como curl o Postman), pues el middleware de persistencia en el backend re-comprueba la política antes de ejecutar el bloque de inserción SQL.
