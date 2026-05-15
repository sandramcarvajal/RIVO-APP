# 🚗 Rivo

Rivo es una plataforma de movilidad colaborativa diseñada para conectar conductores y pasajeros de forma segura, moderna y automatizada, enfocada inicialmente en el área metropolitana de Bucaramanga (Colombia).

La aplicación busca transformar la experiencia del transporte corporativo y urbano mediante:

* rutas compartidas
* gestión inteligente de viajes
* reputación basada en confianza real
* automatización de reglas de movilidad
* arquitectura escalable de nivel producción

---

# 🌎 Visión del Proyecto

Rivo no busca ser solamente una aplicación de rutas.

El objetivo es evolucionar hacia una plataforma inteligente de movilidad urbana capaz de integrar:

* carpooling corporativo
* validaciones de tránsito
* reputación comunitaria
* geolocalización
* notificaciones en tiempo real
* automatización de Pico y Placa
* lifecycle completo de viajes
* seguridad operacional
* analytics de movilidad

---

# 🏗️ Arquitectura

Rivo está construido siguiendo principios modernos de ingeniería de software:

## Backend

* Node.js
* Express
* PostgreSQL
* Drizzle ORM

## Frontend

* React
* TypeScript
* Vite

## Arquitectura Aplicada

* Clean Architecture
* Modular Monolith
* Strong Typing
* Shared Enums
* Separation of Responsibilities
* Domain-Oriented Design

---

# ✅ Funcionalidades Implementadas

# 🔐 Autenticación y Seguridad

* Registro de usuarios
* Inicio de sesión
* Persistencia de sesión
* Refresh Tokens
* Roles:

  * Conductor
  * Pasajero
* Logout seguro
* Protección de rutas
* Manejo centralizado de autenticación

---

# 👤 Gestión de Perfil

* Edición de perfil
* Persistencia real en PostgreSQL
* Gestión de vehículos
* Avatar y datos personales
* Historial de actividad
* Estadísticas reales dinámicas

---

# 🚘 Sistema de Vehículos

* Registro de vehículo
* Validaciones de placa
* Persistencia centralizada
* Integración automática con Pico y Placa

---

# 🛣️ Gestión de Rutas

* Publicación de rutas
* Rutas activas
* Lifecycle completo de viajes
* Restricción:

  * un conductor no puede tener múltiples rutas activas
* Gestión de estados:

  * SCHEDULED
  * ACTIVE
  * IN_PROGRESS
  * COMPLETED
  * CANCELLED

---

# 👥 Sistema de Solicitudes

* Solicitudes de unión a rutas
* Aceptar pasajeros
* Rechazar pasajeros
* Estados sincronizados
* Actualización de cupos
* Persistencia real
* Protección contra race conditions

---

# 🔔 Sistema de Notificaciones

* Persistencia en PostgreSQL
* Notificaciones automáticas
* Polling inteligente
* Estados de lectura
* Navegación contextual
* Tipos de eventos:

  * nueva solicitud
  * solicitud aceptada
  * solicitud rechazada
  * viaje iniciado
  * viaje finalizado
  * cancelación

---

# ⭐ Sistema de Reputación

* Calificación mutua
* Persistencia real
* Rating dinámico
* Protección contra:

  * auto-calificación
  * calificaciones falsas
* Validación de participantes reales

---

# 📍 Geolocalización

* Integración Google Maps
* Visualización de rutas
* Gestión de origen/destino
* Soporte inicial para Bucaramanga

---

# 🚦 Sistema Pico y Placa

* API propia desarrollada desde cero
* Integración automática con vehículos registrados
* Validación de circulación
* Restricciones metropolitanas:

  * Bucaramanga
  * Floridablanca
  * Girón
  * Piedecuesta

---

# 🧠 Mejoras Arquitectónicas Logradas

## Consistencia de Estados

Se eliminaron inconsistencias entre:

* frontend
* backend
* enums
* lifecycle

---

## Eliminación de Datos Mock

Toda la aplicación ahora funciona sobre:

* PostgreSQL
* datos reales
* sincronización persistente

---

## Hardening de Seguridad

* validaciones backend obligatorias
* protección contra estados inválidos
* sincronización robusta
* persistencia segura

---

## Optimización UX/UI

* dashboards diferenciados
* responsibilities claras por vista
* empty states
* feedback visual
* navegación consistente

---

# 🧪 Problemas Críticos Ya Solucionados

* Hooks dentro de `.map`
* Inconsistencias string vs number
* Estados `approved` vs `accepted`
* Sesiones fantasma
* White screen en Google Maps
* Desincronización AppContext/AuthContext
* Notificaciones sin persistencia
* Rutas antiguas visibles incorrectamente
* Errores Drizzle schema/database
* Gestión incorrecta de lifecycle

---

# 🚧 Funcionalidades en Evolución

## 🔄 Tiempo Real Real

Actualmente:

* polling cada 30 segundos

Próximo objetivo:

* WebSockets
* sincronización instantánea
* eventos realtime

---

# 🚦 Evolución Inteligente Pico y Placa

Objetivo:

* consumir fuentes oficiales
* automatizar restricciones
* evitar hardcodes manuales

Posible integración:

* scraping resiliente
* APIs oficiales
* cache inteligente

---

# ⭐ Reputación Avanzada

Próximamente:

* rangos reputacionales
* badges
* niveles de confianza
* reputación tipo inDrive/Uber

Ejemplo:

* Bronze
* Silver
* Gold
* Elite
* Trusted Driver

---

# 📱 Experiencia Mobile First

Objetivo:

* experiencia tipo app nativa
* UX moderna
* navegación fluida
* diseño premium

---

# 💳 Futuras Integraciones

* pagos
* wallets
* analytics
* tracking GPS
* IA para matching de rutas
* optimización de movilidad
* reportes administrativos
* seguridad avanzada

---

# 🎯 Objetivo Final

Rivo apunta a convertirse en una plataforma inteligente de movilidad urbana y corporativa, enfocada en:

* confianza
* seguridad
* automatización
* escalabilidad
* experiencia premium
* eficiencia operacional

No solo una app de rutas.

Sino un ecosistema moderno de movilidad compartida.

---

# 👨‍💻 Estado Actual del Proyecto

## Estado:

🟢 Desarrollo activo avanzado

## Nivel actual:

* Arquitectura sólida
* Backend robusto
* Persistencia real
* Lifecycle operativo
* Escalabilidad preparada

---

# 📌 Filosofía de Desarrollo

Cada módulo de Rivo busca cumplir:

* responsabilidad clara
* separación de capas
* sincronización consistente
* datos reales
* UX intuitiva
* estabilidad operacional
* mantenibilidad a largo plazo

---

# 🚀 Rivo

Comparte tu ruta, a tu ritmo.
