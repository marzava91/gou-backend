# MIJI Architecture

Este documento describe la arquitectura objetivo de MIJI y las decisiones estructurales que guían el diseño del sistema: plataforma **multi-app, multi-rol y multi-tenant**, con un **Core Platform API** como corazón transaccional.

## 1. Objetivo del sistema
Construir una plataforma omnicanal que soporte:
- Múltiples frontends por rol (usuario, partner/tienda, rider, owner/backoffice, soporte).
- Operación multi-tenant (múltiples comercios/tiendas) con aislamiento sólido.
- Evolución incremental: comenzar como **monolito modular** y extraer servicios cuando el dominio lo requiera.
- Observabilidad end-to-end, seguridad por diseño y capacidad de escalar.

---

## 2. Vista de alto nivel (HLA)

### 2.1 Frontends (consumen el Core Platform API)
- App Mobile Usuario
- App Mobile Rider
- App Web Usuario / Marketplace Web
- App Web Partner (POS + Panel Comercios)
- Owner Console / Backoffice Interno
- Web Chat / Portal Chat IA
- (Potenciales) App Mobile Partner, App Mobile Backoffice

### 2.2 Backends / Servicios
- **Core Platform API** (SSOT de negocio: catálogo, precios, stock, órdenes, pagos, etc.)
- Orquestador IA operacional (multicanal)
- Servicio de notificaciones y campañas
- Servicio de facturación & cumplimiento tributario
- Tracking / Analytics / Event Collector
- (Potencial) Servicio de identidad/seguridad/gestión de tenants

### 2.3 Infraestructura transversal (capabilities)
- DB transaccional multi-tenant (PostgreSQL)
- Colas / workers / jobs asíncronos
- Observabilidad: logs, métricas y trazas
- CI/CD y gestión de releases
- Edge/CDN/networking/seguridad perimetral
- Gestión de secretos, config e IAM
- Storage de archivos/media
- Data Warehouse & BI

> Diagramas recomendados: ver `docs/architecture/diagrams/` (HLA + C4).

---

## 3. Principios de arquitectura (no negociables)
1) **SSOT (Single Source of Truth)**  
   La lógica de negocio vive en el backend (Core Platform API). Los frontends orquestan UI, no reglas.

2) **Multi-tenant by design**  
   Todo dato transaccional se modela con `tenant_id` (y cuando aplique `store_id`). El aislamiento y control de acceso se define como política central (ver ADRs).

3) **Evolución incremental (monolito modular → servicios)**  
   Empezamos con un monolito modular en NestJS. Extraemos servicios cuando:  
   - haya límites de escala claros,  
   - el dominio esté maduro,  
   - exista ownership y observabilidad suficientes.

4) **Seguridad y compliance primero**  
   Autenticación, autorización, auditoría, y protección de datos sensibles se diseñan desde el inicio.

5) **Observabilidad end-to-end**  
   Cada request y job debe ser rastreable con `trace_id`/`request_id` y logs estructurados.

6) **Idempotencia en operaciones críticas**  
   Órdenes, pagos, webhooks y reintentos deben ser idempotentes.

---

## 4. Core Platform API (contexto y límites)
### 4.1 Responsabilidades
- Dominios transaccionales: catálogo, pricing, inventario, órdenes, clientes, proveedores, settings operativos.
- Exponer APIs para múltiples frontends/roles.
- Proveer “capabilities” para servicios transversales: eventos, auditoría, notificaciones, IA.

### 4.2 No responsabilidades (por defecto)
- Envío masivo de notificaciones (delegado a servicio especializado).
- Analítica/BI (delegado a event collector + DW).
- Facturación/tributación (delegado a billing service).
- Orquestación IA (delegado al orquestador IA).

---

## 5. Multi-tenancy (modelo conceptual)
MIJI opera múltiples comercios/tiendas en una misma plataforma.

- Entidades “scope global”: tenants, planes, features, catálogos base (si aplica).
- Entidades “tenant scope”: usuarios, roles, reglas, configuraciones, catálogos de tenant.
- Entidades “store scope”: inventario, precios locales, órdenes, cajas/POS, horarios, etc.

> La estrategia concreta (RLS/shared schema vs otras) se formaliza en ADRs.

---

## 6. Integración por eventos (event-driven como columna vertebral)
Para desacoplar módulos y habilitar escalabilidad:
- El Core Platform API publica eventos (p.ej. `order.created`, `stock.updated`).
- Workers procesan tareas asíncronas (notificaciones, facturación, sync, analítica).
- El Event Collector consolida eventos para BI y analítica avanzada.

> La implementación (cola/worker, retries, DLQ) se detalla en ADRs y runbooks.

---

## 7. Seguridad (visión)
- Autenticación: proveedor definido (ver ADR).
- Autorización: RBAC/ABAC por scope (`GLOBAL`, `TENANT`, `STORE`) y roles.
- Auditoría: registrar cambios relevantes (quién, qué, cuándo, desde dónde).
- Gestión de secretos/config: nunca hardcode; rotación y mínimo privilegio.

---

## 8. Ambientes y estrategia de despliegue
- `dev` (local)
- `staging` (pre-prod)
- `prod`

Requisitos por ambiente:
- Configuración por variables de entorno
- Observabilidad básica habilitada
- Migraciones controladas (ver ADR/runbook)

---

## 9. Decisiones arquitectónicas (ADRs)
Las decisiones no viven en este documento. Se registran en:
- `docs/adr/`

Ejemplos de ADRs clave:
- Conectividad Prisma/Supabase (Session Mode vs Direct DB)
- Estrategia multi-tenant (shared schema + RLS)
- Autenticación/identidad
- Eventos y colas (tecnología y contratos)
- Versionado de API y políticas de compatibilidad

---

## 10. Operación (runbooks)
Los procedimientos operativos viven en:
- `docs/runbooks/`

Ejemplos:
- DB connectivity / Prisma
- Deploy/rollback
- Incidentes (5xx, latencia, jobs atascados)
- Rotación de secretos y respuesta a incidentes

---

## 11. Roadmap técnico (evolución)
- Fase 1: Core Platform API modular (dominios MVP), DB multi-tenant, observabilidad base.
- Fase 2: eventos + jobs asíncronos, notificaciones/campañas.
- Fase 3: analytics/event collector + BI.
- Fase 4: extracción selectiva de servicios (billing, identity, IA) según necesidad.

