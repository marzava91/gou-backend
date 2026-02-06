# Prisma Schema – Arquitectura y Convenciones

Este proyecto utiliza una **arquitectura Prisma modular**, donde el schema se mantiene dividido por dominios y luego se **consolida automáticamente** en un único `schema.prisma` para que Prisma CLI pueda operar.

Este README documenta:
- cómo funciona la arquitectura
- por qué está organizada así
- qué comandos usar
- qué **no** hacer

---

## 📁 Estructura del directorio

```text
prisma/
├─ migrations/                 # Migraciones generadas por Prisma
├─ schema_parts/               # 🔹 Fuente del schema (NO usar con Prisma CLI)
│  ├─ 00_header.prisma         # generator + datasource
│  ├─ 01_enums.prisma          # enums globales
│  ├─ 10_tenancy.prisma        # Tenant / Store
│  ├─ 20_identity.prisma       # User / Role / UserRole
│  ├─ 30_catalog.prisma        # Productos, categorías, variantes
│  ├─ 35_pricing.prisma        # Listas de precios y tiers
│  ├─ 40_inventory.prisma     # Stock, batches, movimientos
│  ├─ 50_orders.prisma        # Pedidos
│  ├─ 60_pos.prisma           # POS
│  └─ 70_audit.prisma         # Auditoría
└─ schema.prisma               # ⚠️ Schema final (GENERADO, no editar)

## 🚨 Regla principal (muy importante)

❌ Nunca edites schema.prisma a mano.

- schema_parts/*.prisma → fuente de verdad
- schema.prisma → artefacto de build

Editar el archivo final puede provocar:

- duplicación de enums o modelos
- errores falsos en VS Code
- migraciones inconsistentes

## 🧩 Responsabilidades

| Parte                   | Rol                                   |
| ----------------------- | ------------------------------------- |
| `schema_parts/*.prisma` | Diseño del dominio (fuente de verdad) |
| `schema.prisma`         | Artefacto de build para Prisma CLI    |
| `.vscode/settings.json` | Evita errores falsos del editor       |
| Prisma CLI              | Autoridad final del schema            |

## ▶️ Comandos Prisma

Ejecutar desde packages/api.

# 1. Build del schema 
Get-Content .\prisma\schema_parts\*.prisma | Set-Content .\prisma\schema.prisma 

# 2. Validar 
npx prisma validate --schema prisma/schema.prisma 

# 3. Generar client 
npx prisma generate --schema prisma/schema.prisma 

# 4. Migrar (cuando toque) 
npx prisma migrate dev --schema prisma/schema.prisma

❌ Nunca ejecutar Prisma apuntando a schema_parts.

## 🧠 VS Code / Prisma Extension

Para evitar errores falsos (duplicación de enums, models, etc.),
VS Code debe analizar solo el schema generado.

Archivo:

packages/api/.vscode/settings.json

Contenido:

{
  "prisma.schemaPath": "prisma/schema.prisma"
}

## 🧪 Diagnóstico rápido

Si ves errores en VS Code pero:

- prisma validate ✅
-prisma generate ✅

👉 El schema está correcto
👉 El problema es del editor, no de Prisma

## 📏 Convenciones

- Prefijos numéricos definen el orden de concatenación
- Enums siempre van en 01_enums.prisma
- Nuevos dominios → nuevo archivo (80_xxx.prisma)
- Todos los modelos multi-tenant incluyen tenantId

✅ TL;DR

- Editar solo schema_parts/*.prisma
- Generar schema.prisma
- Prisma CLI usa solo schema.prisma
- VS Code apunta a schema.prisma
- Si Prisma valida → todo está bien


