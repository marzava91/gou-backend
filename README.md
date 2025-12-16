# MIJI Core Platform (Monorepo)

MIJI evoluciona hacia una plataforma **multi-app, multi-rol y multi-tenant** con un **Core Platform API** como corazón transaccional, consumido por múltiples frontends (usuario, partner, rider, owner) y complementado por servicios transversales (notificaciones, billing, IA, sync, analytics).  

## Componentes (visión)
### Frontends (consumen Core API)
- App Mobile Usuario
- App Mobile Rider
- App Web Usuario / Marketplace Web
- App Web Partner (POS + Panel Comercios)
- Owner Console / Backoffice Interno
- Web Chat / Portal Chat IA
- (Potenciales) App Mobile Partner, App Mobile Backoffice

### Backends / Servicios
- **Core Platform API** (NestJS + Prisma + PostgreSQL multi-tenant)
- Orquestador IA operacional (multicanal)
- Servicio de notificaciones y campañas
- Servicio de facturación & cumplimiento tributario
- Tracking / Analytics / Event Collector
- (Potencial) Servicio de identidad/seguridad/gestión de tenants

### Infraestructura transversal (capabilities)
- DB transaccional multi-tenant
- Colas / workers / jobs asíncronos
- Observabilidad (logs, métricas, trazas)
- CI/CD & gestión de releases
- Edge/CDN/networking/seguridad perimetral
- Secrets/config/IAM
- Storage de media
- Data Warehouse & BI

> Detalle completo: ver `/docs/architecture`.

---

## Repo structure

- `packages/api` → Core Platform API (NestJS + Prisma)
- `docs/architecture` → visión de arquitectura (HLA, C4, principios)
- `docs/adr` → decisiones arquitectónicas (ADRs)
- `docs/runbooks` → operación y troubleshooting (playbooks)

---

## Quick start (desarrollo local)

1) Requisitos
- Node.js (LTS)
- pnpm
- Variables en `.env` (ver `.env.example`)

2) Instalar dependencias
```bash
pnpm install
